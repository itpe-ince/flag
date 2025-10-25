import { v4 as uuidv4 } from 'uuid';
import { Room, Question, Answer, AnswerResult, Player } from '../types';
import { roomService } from './room-service';
import { questionGenerator } from './question-generator';
import { gameService } from './game-service';

export interface MultiplayerGameState {
  roomId: string;
  currentRound: number;
  totalRounds: number;
  currentQuestion?: Question;
  roundStartTime?: Date;
  roundAnswers: Map<string, Answer>; // userId -> Answer
  roundResults: Map<string, AnswerResult>; // userId -> AnswerResult
  gameStartTime?: Date;
  isGameActive: boolean;
}

export class MultiplayerGameService {
  private static instance: MultiplayerGameService;
  private activeGames: Map<string, MultiplayerGameState> = new Map();

  public static getInstance(): MultiplayerGameService {
    if (!MultiplayerGameService.instance) {
      MultiplayerGameService.instance = new MultiplayerGameService();
    }
    return MultiplayerGameService.instance;
  }

  public async startGame(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const room = await roomService.getRoom(roomId);
      
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.state !== 'lobby') {
        return { success: false, error: 'Game already in progress' };
      }

      if (!roomService.areAllPlayersReady(room)) {
        return { success: false, error: 'Not all players are ready' };
      }

      // Initialize game state
      const gameState: MultiplayerGameState = {
        roomId,
        currentRound: 0,
        totalRounds: room.settings.roundCount,
        roundAnswers: new Map(),
        roundResults: new Map(),
        gameStartTime: new Date(),
        isGameActive: true
      };

      this.activeGames.set(roomId, gameState);

      // Update room state
      await roomService.updateRoomState(roomId, 'playing');

      // Start first round
      await this.startNextRound(roomId);

      return { success: true };
    } catch (error) {
      console.error('Error starting multiplayer game:', error);
      return { success: false, error: 'Failed to start game' };
    }
  }

  public async startNextRound(roomId: string): Promise<Question | null> {
    try {
      const gameState = this.activeGames.get(roomId);
      const room = await roomService.getRoom(roomId);

      if (!gameState || !room) {
        return null;
      }

      gameState.currentRound++;

      // Check if game is complete
      if (gameState.currentRound > gameState.totalRounds) {
        await this.endGame(roomId);
        return null;
      }

      // Clear previous round data
      gameState.roundAnswers.clear();
      gameState.roundResults.clear();

      // Generate new question using the question generator
      const difficulty = Math.min(gameState.currentRound, 4); // Cap difficulty at 4
      const choiceCount = Math.min(4 + Math.floor(gameState.currentRound / 2), 8); // 4-8 choices based on round
      
      const generatedQuestion = await questionGenerator.generateQuestion(
        choiceCount,
        [], // No excluded countries for now
        difficulty
      );

      // Create question with room-specific data
      const question: Question = {
        ...generatedQuestion,
        id: uuidv4(),
        gameId: room.gameId,
        round: gameState.currentRound,
        timeLimit: room.settings.timePerQuestion,
        createdAt: new Date()
      };

      // Update game state
      gameState.currentQuestion = question;
      gameState.roundStartTime = new Date();

      // Store question in room for reference
      room.currentQuestion = question;
      await roomService.getRoom(roomId); // This will update the room in storage

      console.log(`Round ${gameState.currentRound} started for room ${roomId}`);
      return question;
    } catch (error) {
      console.error('Error starting next round:', error);
      return null;
    }
  }

  public async submitAnswer(roomId: string, userId: string, answer: Answer): Promise<AnswerResult | null> {
    try {
      const gameState = this.activeGames.get(roomId);
      const room = await roomService.getRoom(roomId);

      if (!gameState || !room || !gameState.currentQuestion) {
        return null;
      }

      // Check if player already answered this round
      if (gameState.roundAnswers.has(userId)) {
        return null;
      }

      // Validate answer timing
      if (!gameState.roundStartTime) {
        return null;
      }

      const responseTime = (new Date().getTime() - gameState.roundStartTime.getTime()) / 1000;
      if (responseTime > room.settings.timePerQuestion) {
        // Answer submitted too late
        return null;
      }

      // Update answer with actual response time
      answer.responseTime = responseTime;
      answer.timestamp = new Date();

      // Store the answer
      gameState.roundAnswers.set(userId, answer);

      // Validate the answer
      const isCorrect = gameState.currentQuestion.choices[answer.selectedChoice]?.code === 
                       gameState.currentQuestion.correctCountry.code;

      // Calculate score
      const baseScore = 100;
      const timeBonus = Math.max(0, Math.floor((room.settings.timePerQuestion - responseTime) * 10));
      const roundMultiplier = gameState.currentRound;
      const totalScore = isCorrect ? (baseScore + timeBonus) * roundMultiplier : 0;

      const result: AnswerResult = {
        isCorrect,
        correctAnswer: gameState.currentQuestion.correctCountry,
        score: totalScore,
        timeBonus,
        totalScore: (room.scores[userId] || 0) + totalScore
      };

      // Update player score
      if (isCorrect) {
        room.scores[userId] = (room.scores[userId] || 0) + totalScore;
        const player = room.currentPlayers.find(p => p.userId === userId);
        if (player) {
          player.score = room.scores[userId];
          player.correctAnswers++;
        }
      }

      // Store the result
      gameState.roundResults.set(userId, result);

      console.log(`Player ${userId} answered round ${gameState.currentRound} in room ${roomId}: ${isCorrect ? 'correct' : 'incorrect'}`);

      return result;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return null;
    }
  }

  public async checkRoundComplete(roomId: string): Promise<boolean> {
    const gameState = this.activeGames.get(roomId);
    const room = await roomService.getRoom(roomId);

    if (!gameState || !room) {
      return false;
    }

    const connectedPlayers = room.currentPlayers.filter(p => p.isConnected);
    const answeredCount = gameState.roundAnswers.size;

    // Round is complete when all connected players have answered or time is up
    const timeElapsed = gameState.roundStartTime ? 
      (new Date().getTime() - gameState.roundStartTime.getTime()) / 1000 : 0;

    return answeredCount >= connectedPlayers.length || timeElapsed >= room.settings.timePerQuestion;
  }

  public async getRoundResults(roomId: string): Promise<Map<string, AnswerResult> | null> {
    const gameState = this.activeGames.get(roomId);
    return gameState ? gameState.roundResults : null;
  }

  public async endGame(roomId: string): Promise<{ winner: Player | null; finalScores: Record<string, number> } | null> {
    try {
      const gameState = this.activeGames.get(roomId);
      const room = await roomService.getRoom(roomId);

      if (!gameState || !room) {
        return null;
      }

      // Mark game as inactive
      gameState.isGameActive = false;

      // Update room state
      await roomService.updateRoomState(roomId, 'finished');

      // Determine winner
      let winner: Player | null = null;
      let highestScore = -1;
      let tiedPlayers: Player[] = [];

      for (const player of room.currentPlayers) {
        const score = room.scores[player.userId] || 0;
        if (score > highestScore) {
          highestScore = score;
          winner = player;
          tiedPlayers = [player];
        } else if (score === highestScore) {
          tiedPlayers.push(player);
        }
      }

      // Handle ties by checking correct answers count
      if (tiedPlayers.length > 1) {
        let maxCorrect = -1;
        for (const player of tiedPlayers) {
          if (player.correctAnswers > maxCorrect) {
            maxCorrect = player.correctAnswers;
            winner = player;
          }
        }
      }

      const result = {
        winner,
        finalScores: room.scores
      };

      // Clean up game state
      this.activeGames.delete(roomId);

      console.log(`Game ended for room ${roomId}. Winner: ${winner?.username || 'Tie'}`);
      return result;
    } catch (error) {
      console.error('Error ending game:', error);
      return null;
    }
  }

  public getGameState(roomId: string): MultiplayerGameState | null {
    return this.activeGames.get(roomId) || null;
  }

  public isGameActive(roomId: string): boolean {
    const gameState = this.activeGames.get(roomId);
    return gameState ? gameState.isGameActive : false;
  }

  // Utility method to shuffle array
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Cleanup method for abandoned games
  public cleanupInactiveGames(): void {
    const now = new Date().getTime();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, gameState] of this.activeGames.entries()) {
      if (gameState.gameStartTime) {
        const gameAge = now - gameState.gameStartTime.getTime();
        if (gameAge > maxInactiveTime) {
          console.log(`Cleaning up inactive game for room ${roomId}`);
          this.activeGames.delete(roomId);
        }
      }
    }
  }
}

export const multiplayerGameService = MultiplayerGameService.getInstance();