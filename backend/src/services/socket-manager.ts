import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socket-auth';

export class SocketManager {
  private io: Server;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userRooms: Map<string, string> = new Map(); // userId -> roomId

  constructor(io: Server) {
    this.io = io;
  }

  public handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const username = socket.username!;

    console.log(`User connected: ${username} (${userId})`);
    
    // Store the connection
    this.connectedUsers.set(userId, socket);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Send connection confirmation
    socket.emit('connected', {
      userId,
      username,
      socketId: socket.id
    });
  }

  private setupEventHandlers(socket: AuthenticatedSocket): void {
    // Room management events
    socket.on('create_room', (data, callback) => {
      this.handleCreateRoom(socket, data, callback);
    });

    socket.on('join_room', (data, callback) => {
      this.handleJoinRoom(socket, data, callback);
    });

    socket.on('leave_room', (data, callback) => {
      this.handleLeaveRoom(socket, data, callback);
    });

    socket.on('ready_status', (data) => {
      this.handleReadyStatus(socket, data);
    });

    // Game events
    socket.on('start_game', (data, callback) => {
      this.handleStartGame(socket, data, callback);
    });

    socket.on('submit_answer', (data, callback) => {
      this.handleSubmitAnswer(socket, data, callback);
    });

    // Game timeout handling
    socket.on('round_timeout', (data) => {
      this.handleRoundTimeout(socket, data);
    });

    socket.on('get_room_state', (data, callback) => {
      this.handleGetRoomState(socket, data, callback);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const username = socket.username!;
    
    console.log(`User disconnected: ${username} (${userId})`);
    
    // Remove from connected users
    this.connectedUsers.delete(userId);
    
    // Handle room cleanup if user was in a room
    const roomId = this.userRooms.get(userId);
    if (roomId) {
      this.handleUserLeaveRoom(userId, roomId);
    }
  }

  private async handleCreateRoom(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { settings } = data;
      const userId = socket.userId!;
      const username = socket.username!;

      // Validate settings
      if (!settings || !settings.maxPlayers || !settings.roundCount || !settings.timePerQuestion) {
        callback({ success: false, error: 'Invalid room settings' });
        return;
      }

      // Import room service
      const { roomService } = await import('./room-service');
      
      // Create the room
      const room = await roomService.createRoom(userId, username, settings);
      
      // Join the socket to the room
      socket.join(room.id);
      this.setUserRoom(userId, room.id);

      // Notify room creation
      callback({ success: true, room });
      
      console.log(`Room ${room.id} created by ${username}`);
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, error: 'Failed to create room' });
    }
  }

  private async handleJoinRoom(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { roomId } = data;
      const userId = socket.userId!;
      const username = socket.username!;

      if (!roomId) {
        callback({ success: false, error: 'Room ID is required' });
        return;
      }

      // Import room service
      const { roomService } = await import('./room-service');
      
      // Join the room
      const result = await roomService.joinRoom(roomId, userId, username);
      
      if (result.success && result.room) {
        // Join the socket to the room
        socket.join(roomId);
        this.setUserRoom(userId, roomId);

        // Notify all players in the room about the new player
        this.broadcastToRoom(roomId, 'player_joined', {
          player: result.room.currentPlayers.find(p => p.userId === userId),
          room: result.room
        });

        callback({ success: true, room: result.room });
        console.log(`${username} joined room ${roomId}`);
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { roomId } = data;
      const userId = socket.userId!;
      const username = socket.username!;

      if (!roomId) {
        callback({ success: false, error: 'Room ID is required' });
        return;
      }

      // Import room service
      const { roomService } = await import('./room-service');
      
      // Leave the room
      const success = await roomService.leaveRoom(roomId, userId);
      
      if (success) {
        // Leave the socket room
        socket.leave(roomId);
        this.removeUserFromRoom(userId);

        // Get updated room (might be null if deleted)
        const room = await roomService.getRoom(roomId);
        
        // Notify remaining players
        if (room) {
          this.broadcastToRoom(roomId, 'player_left', {
            userId,
            username,
            room
          });
        }

        callback({ success: true });
        console.log(`${username} left room ${roomId}`);
      } else {
        callback({ success: false, error: 'Failed to leave room' });
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      callback({ success: false, error: 'Failed to leave room' });
    }
  }

  private async handleReadyStatus(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { roomId, isReady } = data;
      const userId = socket.userId!;

      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      // Import room service
      const { roomService } = await import('./room-service');
      
      // Update ready status
      const room = await roomService.setPlayerReady(roomId, userId, isReady);
      
      if (room) {
        // Notify all players in the room
        this.broadcastToRoom(roomId, 'player_ready_changed', {
          userId,
          isReady,
          room,
          allReady: roomService.areAllPlayersReady(room)
        });

        console.log(`Player ${userId} ready status: ${isReady} in room ${roomId}`);
      } else {
        socket.emit('error', { message: 'Room not found or player not in room' });
      }
    } catch (error) {
      console.error('Error updating ready status:', error);
      socket.emit('error', { message: 'Failed to update ready status' });
    }
  }

  private async handleStartGame(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { roomId } = data;
      const userId = socket.userId!;

      if (!roomId) {
        callback({ success: false, error: 'Room ID is required' });
        return;
      }

      // Import services
      const { roomService } = await import('./room-service');
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      // Check if user is the host
      const room = await roomService.getRoom(roomId);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.hostUserId !== userId) {
        callback({ success: false, error: 'Only the host can start the game' });
        return;
      }

      // Start the game
      const result = await multiplayerGameService.startGame(roomId);
      
      if (result.success) {
        // Notify all players that the game has started
        this.broadcastToRoom(roomId, 'game_started', {
          roomId,
          message: 'Game has started!'
        });

        // Start broadcasting questions after a short delay
        setTimeout(() => {
          this.startGameQuestions(roomId);
        }, 2000); // 2 second delay to let players prepare

        callback({ success: true });
        console.log(`Game started for room ${roomId} by host ${userId}`);
      } else {
        callback({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      callback({ success: false, error: 'Failed to start game' });
    }
  }

  private async handleSubmitAnswer(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { roomId, questionId, selectedChoice, responseTime } = data;
      const userId = socket.userId!;

      if (!roomId || !questionId || selectedChoice === undefined) {
        callback({ success: false, error: 'Missing required fields' });
        return;
      }

      // Import services
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      // Create answer object
      const answer = {
        questionId,
        selectedChoice,
        responseTime: responseTime || 0,
        timestamp: new Date()
      };

      // Submit the answer
      const result = await multiplayerGameService.submitAnswer(roomId, userId, answer);
      
      if (result) {
        // Notify the player of their result
        callback({ success: true, result });

        // Notify all players that someone answered
        this.broadcastToRoom(roomId, 'player_answered', {
          userId,
          isCorrect: result.isCorrect,
          score: result.score
        });

        // Check if round is complete
        const isRoundComplete = await multiplayerGameService.checkRoundComplete(roomId);
        
        if (isRoundComplete) {
          await this.handleRoundComplete(roomId);
        }

        console.log(`Answer submitted by ${userId} in room ${roomId}: ${result.isCorrect ? 'correct' : 'incorrect'}`);
      } else {
        callback({ success: false, error: 'Failed to submit answer' });
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      callback({ success: false, error: 'Failed to submit answer' });
    }
  }

  private async handleUserLeaveRoom(userId: string, roomId: string): Promise<void> {
    try {
      // Import room service
      const { roomService } = await import('./room-service');
      
      // Mark player as disconnected first
      await roomService.setPlayerConnectionStatus(roomId, userId, false);
      
      // Get the room to check if we should remove the player entirely
      const room = await roomService.getRoom(roomId);
      if (room) {
        // For now, keep disconnected players in the room for potential reconnection
        // They will be cleaned up by the cleanup process if they don't reconnect
        
        // Notify other players about disconnection
        this.broadcastToRoom(roomId, 'player_disconnected', {
          userId,
          room
        });
        
        console.log(`User ${userId} disconnected from room ${roomId}`);
      }
      
      this.userRooms.delete(userId);
    } catch (error) {
      console.error('Error handling user leave room:', error);
      this.userRooms.delete(userId);
    }
  }

  // Utility methods
  public getConnectedUser(userId: string): AuthenticatedSocket | undefined {
    return this.connectedUsers.get(userId);
  }

  public getUserRoom(userId: string): string | undefined {
    return this.userRooms.get(userId);
  }

  public setUserRoom(userId: string, roomId: string): void {
    this.userRooms.set(userId, roomId);
  }

  public removeUserFromRoom(userId: string): void {
    this.userRooms.delete(userId);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public broadcastToRoom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  public emitToUser(userId: string, event: string, data: any): boolean {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Game event handlers
  private async handleRoundComplete(roomId: string): Promise<void> {
    try {
      // Import services
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      const { roomService } = await import('./room-service');
      
      // Get round results
      const roundResults = await multiplayerGameService.getRoundResults(roomId);
      const gameState = multiplayerGameService.getGameState(roomId);
      const room = await roomService.getRoom(roomId);

      if (!roundResults || !gameState || !room) {
        return;
      }

      // Broadcast round results to all players
      this.broadcastToRoom(roomId, 'round_complete', {
        round: gameState.currentRound,
        results: Array.from(roundResults.entries()).map(([userId, result]) => ({
          userId,
          result
        })),
        currentScores: room.scores,
        correctAnswer: gameState.currentQuestion?.correctCountry
      });

      // Wait a moment for players to see results
      setTimeout(async () => {
        // Check if game is complete
        if (gameState.currentRound >= gameState.totalRounds) {
          await this.handleGameComplete(roomId);
        } else {
          // Start next round
          const nextQuestion = await multiplayerGameService.startNextRound(roomId);
          if (nextQuestion) {
            this.broadcastToRoom(roomId, 'new_question', {
              question: {
                id: nextQuestion.id,
                round: nextQuestion.round,
                choices: nextQuestion.choices,
                timeLimit: nextQuestion.timeLimit
              },
              roundNumber: gameState.currentRound,
              totalRounds: gameState.totalRounds
            });
          }
        }
      }, 3000); // 3 second delay to show results

    } catch (error) {
      console.error('Error handling round complete:', error);
    }
  }

  private async handleGameComplete(roomId: string): Promise<void> {
    try {
      // Import services
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      // End the game and get final results
      const gameResult = await multiplayerGameService.endGame(roomId);
      
      if (gameResult) {
        // Broadcast final results to all players
        this.broadcastToRoom(roomId, 'game_complete', {
          winner: gameResult.winner,
          finalScores: gameResult.finalScores,
          message: gameResult.winner ? 
            `${gameResult.winner.username} wins!` : 
            'Game ended in a tie!'
        });

        console.log(`Game completed for room ${roomId}`);
      }
    } catch (error) {
      console.error('Error handling game complete:', error);
    }
  }

  // Method to start question broadcasting when game begins
  public async startGameQuestions(roomId: string): Promise<void> {
    try {
      // Import services
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      // Start first question
      const firstQuestion = await multiplayerGameService.startNextRound(roomId);
      
      if (firstQuestion) {
        // Broadcast first question to all players
        this.broadcastToRoom(roomId, 'new_question', {
          question: {
            id: firstQuestion.id,
            round: firstQuestion.round,
            choices: firstQuestion.choices,
            timeLimit: firstQuestion.timeLimit
          },
          roundNumber: 1,
          totalRounds: multiplayerGameService.getGameState(roomId)?.totalRounds || 10
        });

        console.log(`First question broadcasted to room ${roomId}`);
      }
    } catch (error) {
      console.error('Error starting game questions:', error);
    }
  }

  private async handleRoundTimeout(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        return;
      }

      // Import services
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      // Check if round should be completed due to timeout
      const isRoundComplete = await multiplayerGameService.checkRoundComplete(roomId);
      
      if (isRoundComplete) {
        await this.handleRoundComplete(roomId);
      }
    } catch (error) {
      console.error('Error handling round timeout:', error);
    }
  }

  private async handleGetRoomState(socket: AuthenticatedSocket, data: any, callback: Function): Promise<void> {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        callback({ success: false, error: 'Room ID is required' });
        return;
      }

      // Import services
      const { roomService } = await import('./room-service');
      const { multiplayerGameService } = await import('./multiplayer-game-service');
      
      const room = await roomService.getRoom(roomId);
      const gameState = multiplayerGameService.getGameState(roomId);
      
      if (room) {
        callback({ 
          success: true, 
          room,
          gameState: gameState ? {
            currentRound: gameState.currentRound,
            totalRounds: gameState.totalRounds,
            isGameActive: gameState.isGameActive,
            currentQuestion: gameState.currentQuestion
          } : null
        });
      } else {
        callback({ success: false, error: 'Room not found' });
      }
    } catch (error) {
      console.error('Error getting room state:', error);
      callback({ success: false, error: 'Failed to get room state' });
    }
  }
}