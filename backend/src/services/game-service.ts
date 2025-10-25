import { pool } from '../config/database';
import { 
  Game, GameSettings, GameMode, GameStatus, Question, Answer, AnswerResult,
  GameResult, Country, User
} from '../types';
import { GameModel, ScoringModel } from '../models';
import { questionGenerator } from './question-generator';
import { flagService } from './flag-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Core game logic service handling game session management, scoring, and answer validation
 * Supports single-player, time attack, and multiplayer game modes
 */
export class GameService {
  
  /**
   * Creates a new game session
   * @param mode Game mode (single, timeattack, multiplayer)
   * @param createdBy User ID who created the game
   * @param settings Game configuration settings
   * @returns Created game instance
   */
  async createGame(mode: GameMode, createdBy: string, settings: GameSettings): Promise<Game> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Validate settings based on game mode
      this.validateGameSettings(mode, settings);
      
      // Create game record
      const gameData = GameModel.createDefault(mode, createdBy, settings);
      const gameId = this.generateGameId();
      
      const insertQuery = `
        INSERT INTO games (id, mode, settings, status, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        gameId,
        gameData.mode,
        JSON.stringify(gameData.settings),
        gameData.status,
        gameData.createdBy
      ]);
      
      await client.query('COMMIT');
      
      const game = GameModel.fromRow(result.rows[0]);
      console.log(`Created ${mode} game ${gameId} for user ${createdBy}`);
      
      return game;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating game:', error);
      throw new Error(`Failed to create game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Starts a game session
   * @param gameId Game identifier
   * @returns Updated game with started status
   */
  async startGame(gameId: string): Promise<Game> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current game
      const game = await this.getGameById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      if (game.status !== 'waiting') {
        throw new Error(`Cannot start game in ${game.status} status`);
      }
      
      // Update game status to active
      const updateQuery = `
        UPDATE games 
        SET status = 'active', started_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [gameId]);
      await client.query('COMMIT');
      
      const updatedGame = GameModel.fromRow(result.rows[0]);
      console.log(`Started game ${gameId}`);
      
      return updatedGame;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error starting game:', error);
      throw new Error(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Completes a game session
   * @param gameId Game identifier
   * @returns Updated game with completed status
   */
  async completeGame(gameId: string): Promise<Game> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current game
      const game = await this.getGameById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      if (game.status !== 'active') {
        throw new Error(`Cannot complete game in ${game.status} status`);
      }
      
      // Update game status to completed
      const updateQuery = `
        UPDATE games 
        SET status = 'completed', ended_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [gameId]);
      await client.query('COMMIT');
      
      const updatedGame = GameModel.fromRow(result.rows[0]);
      console.log(`Completed game ${gameId}`);
      
      return updatedGame;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error completing game:', error);
      throw new Error(`Failed to complete game: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets a game by ID
   * @param gameId Game identifier
   * @returns Game instance or null if not found
   */
  async getGameById(gameId: string): Promise<Game | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM games WHERE id = $1
      `, [gameId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return GameModel.fromRow(result.rows[0]);
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets games created by a specific user
   * @param userId User identifier
   * @param limit Maximum number of games to return
   * @returns Array of games
   */
  async getGamesByUser(userId: string, limit: number = 50): Promise<Game[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM games 
        WHERE created_by = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);
      
      return result.rows.map(row => GameModel.fromRow(row));
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets active games (for monitoring/admin purposes)
   * @param limit Maximum number of games to return
   * @returns Array of active games
   */
  async getActiveGames(limit: number = 100): Promise<Game[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM games 
        WHERE status = 'active' 
        ORDER BY started_at DESC 
        LIMIT $1
      `, [limit]);
      
      return result.rows.map(row => GameModel.fromRow(row));
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Generates a question for the current game state
   * @param gameId Game identifier
   * @param round Current round number
   * @param level Current level (for single-player mode)
   * @returns Generated question
   */
  async generateGameQuestion(gameId: string, round: number, level: number = 1): Promise<Question> {
    const game = await this.getGameById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active');
    }
    
    // Calculate choice count based on game mode and level
    let choiceCount: number;
    let difficultyLevel: number | undefined;
    
    switch (game.mode) {
      case 'single':
        // Single-player: 2^level choices (2, 4, 8, 16, etc.)
        choiceCount = Math.pow(2, level);
        difficultyLevel = Math.min(level, 4); // Cap difficulty at 4
        break;
        
      case 'timeattack':
        // Time attack: fixed 4 choices, progressive difficulty
        choiceCount = 4;
        difficultyLevel = Math.min(Math.floor(round / 5) + 1, 4);
        break;
        
      case 'multiplayer':
        // Multiplayer: configurable choices, fixed difficulty
        choiceCount = game.settings.roundCount || 4;
        difficultyLevel = 2; // Medium difficulty for fairness
        break;
        
      default:
        throw new Error(`Unsupported game mode: ${game.mode}`);
    }
    
    // Generate question using question generator
    const question = await questionGenerator.generateQuestion(
      choiceCount,
      [], // No exclusions for now
      difficultyLevel
    );
    
    // Set game-specific properties
    question.gameId = gameId;
    question.round = round;
    question.timeLimit = this.getTimeLimit(game.mode, game.settings);
    
    return question;
  }
  
  /**
   * Validates game settings based on mode
   * @param mode Game mode
   * @param settings Game settings to validate
   */
  private validateGameSettings(mode: GameMode, settings: GameSettings): void {
    switch (mode) {
      case 'single':
        // Single-player doesn't need special validation
        break;
        
      case 'timeattack':
        if (settings.timeLimit && settings.timeLimit !== 60) {
          throw new Error('Time attack mode must have 60-second time limit');
        }
        settings.timeLimit = 60; // Ensure it's set
        break;
        
      case 'multiplayer':
        if (!settings.maxPlayers || settings.maxPlayers < 2 || settings.maxPlayers > 8) {
          throw new Error('Multiplayer games must have 2-8 players');
        }
        if (!settings.roundCount || settings.roundCount < 5 || settings.roundCount > 20) {
          throw new Error('Multiplayer games must have 5-20 rounds');
        }
        break;
        
      default:
        throw new Error(`Unsupported game mode: ${mode}`);
    }
  }
  
  /**
   * Gets time limit for questions based on game mode
   * @param mode Game mode
   * @param settings Game settings
   * @returns Time limit in seconds
   */
  private getTimeLimit(mode: GameMode, settings: GameSettings): number {
    switch (mode) {
      case 'single':
        return 30; // 30 seconds per question
      case 'timeattack':
        return 10; // Fast-paced 10 seconds per question
      case 'multiplayer':
        return settings.timeLimit || 20; // Configurable, default 20 seconds
      default:
        return 30;
    }
  }
  
  /**
   * Generates a unique game ID
   * @returns Unique game identifier
   */
  private generateGameId(): string {
    return uuidv4();
  }
  
  /**
   * Calculates score for a correct answer
   * @param level Current level (for single-player mode)
   * @param responseTime Time taken to answer in seconds
   * @param timeLimit Maximum time allowed for the question
   * @param gameMode Game mode for mode-specific scoring
   * @returns Score calculation result
   */
  calculateScore(level: number, responseTime: number, timeLimit: number, gameMode: GameMode): {
    baseScore: number;
    levelMultiplier: number;
    timeBonus: number;
    totalScore: number;
  } {
    // Calculate base score based on game mode
    let baseScore: number;
    
    switch (gameMode) {
      case 'single':
        // Single-player: base score increases with level
        baseScore = ScoringModel.calculateBaseScore(level);
        break;
        
      case 'timeattack':
        // Time attack: fixed base score for consistency
        baseScore = 100;
        break;
        
      case 'multiplayer':
        // Multiplayer: moderate base score
        baseScore = 150;
        break;
        
      default:
        baseScore = 100;
    }
    
    // Calculate level multiplier
    const levelMultiplier = ScoringModel.calculateLevelMultiplier(level);
    
    // Calculate time bonus
    const timeBonus = ScoringModel.calculateTimeBonus(responseTime, timeLimit);
    
    // Calculate total score
    const totalScore = ScoringModel.calculateTotalScore(
      baseScore * levelMultiplier, 
      timeBonus
    );
    
    return {
      baseScore,
      levelMultiplier,
      timeBonus,
      totalScore
    };
  }
  
  /**
   * Records a game result and updates user statistics
   * @param gameResult Game result to record
   * @returns Recorded game result with ID
   */
  async recordGameResult(gameResult: Omit<GameResult, 'id' | 'createdAt'>): Promise<GameResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert game result
      const resultId = this.generateResultId();
      const insertQuery = `
        INSERT INTO game_results (id, game_id, user_id, score, correct_answers, total_questions, completion_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      
      const result = await client.query(insertQuery, [
        resultId,
        gameResult.gameId,
        gameResult.userId,
        gameResult.score,
        gameResult.correctAnswers,
        gameResult.totalQuestions,
        gameResult.completionTime
      ]);
      
      // Update user statistics
      await this.updateUserStats(client, gameResult.userId, gameResult);
      
      // Update leaderboards
      await this.updateLeaderboards(client, gameResult.userId, gameResult.score);
      
      await client.query('COMMIT');
      
      const recordedResult: GameResult = {
        id: result.rows[0].id,
        gameId: result.rows[0].game_id,
        userId: result.rows[0].user_id,
        score: result.rows[0].score,
        correctAnswers: result.rows[0].correct_answers,
        totalQuestions: result.rows[0].total_questions,
        completionTime: result.rows[0].completion_time,
        createdAt: result.rows[0].created_at
      };
      
      console.log(`Recorded game result ${resultId} for user ${gameResult.userId}`);
      return recordedResult;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording game result:', error);
      throw new Error(`Failed to record game result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }
  
  /**
   * Updates user statistics after a game
   * @param client Database client
   * @param userId User identifier
   * @param gameResult Game result data
   */
  private async updateUserStats(client: any, userId: string, gameResult: Omit<GameResult, 'id' | 'createdAt'>): Promise<void> {
    const accuracy = gameResult.correctAnswers / gameResult.totalQuestions;
    const avgResponseTime = gameResult.completionTime ? gameResult.completionTime / gameResult.totalQuestions : 0;
    
    // Calculate current streak (simplified - would need more complex logic for actual streak tracking)
    const currentStreak = gameResult.correctAnswers;
    
    const updateQuery = `
      UPDATE users SET
        total_games = total_games + 1,
        total_correct = total_correct + $2,
        total_score = total_score + $3,
        best_streak = GREATEST(best_streak, $4),
        highest_level = GREATEST(highest_level, $5)
      WHERE id = $1
    `;
    
    // For single-player, level is based on correct answers; for others, use 1
    const level = gameResult.correctAnswers;
    
    await client.query(updateQuery, [
      userId,
      gameResult.correctAnswers,
      gameResult.score,
      currentStreak,
      level
    ]);
  }
  
  /**
   * Updates leaderboards with new score
   * @param client Database client
   * @param userId User identifier
   * @param score Score to add to leaderboards
   */
  private async updateLeaderboards(client: any, userId: string, score: number): Promise<void> {
    // This would typically use Redis for real-time leaderboards
    // For now, we'll implement a simple database-based approach
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = this.getWeekStart(now).toISOString().split('T')[0];
    
    // Update daily leaderboard
    await client.query(`
      INSERT INTO leaderboard_entries (user_id, score, entry_date, timeframe)
      VALUES ($1, $2, $3, 'daily')
      ON CONFLICT (user_id, entry_date, timeframe)
      DO UPDATE SET score = leaderboard_entries.score + $2
    `, [userId, score, today]);
    
    // Update weekly leaderboard
    await client.query(`
      INSERT INTO leaderboard_entries (user_id, score, entry_date, timeframe)
      VALUES ($1, $2, $3, 'weekly')
      ON CONFLICT (user_id, entry_date, timeframe)
      DO UPDATE SET score = leaderboard_entries.score + $2
    `, [userId, score, weekStart]);
    
    // Update all-time leaderboard
    await client.query(`
      INSERT INTO leaderboard_entries (user_id, score, entry_date, timeframe)
      VALUES ($1, $2, $3, 'alltime')
      ON CONFLICT (user_id, entry_date, timeframe)
      DO UPDATE SET score = leaderboard_entries.score + $2
    `, [userId, score, '1970-01-01']); // Use epoch date for all-time
  }
  
  /**
   * Gets leaderboard entries for a specific timeframe
   * @param timeframe Timeframe for leaderboard (daily, weekly, alltime)
   * @param limit Maximum number of entries to return
   * @returns Leaderboard entries
   */
  async getLeaderboard(timeframe: 'daily' | 'weekly' | 'alltime', limit: number = 50): Promise<{
    userId: string;
    username: string;
    score: number;
    rank: number;
    gamesPlayed: number;
    accuracy: number;
  }[]> {
    const client = await pool.connect();
    try {
      let dateFilter = '';
      const params: any[] = [timeframe, limit];
      
      if (timeframe === 'daily') {
        dateFilter = 'AND l.entry_date = CURRENT_DATE';
      } else if (timeframe === 'weekly') {
        const weekStart = this.getWeekStart(new Date()).toISOString().split('T')[0];
        dateFilter = 'AND l.entry_date = $3';
        params.splice(2, 0, weekStart);
      }
      
      const query = `
        SELECT 
          l.user_id,
          u.username,
          l.score,
          ROW_NUMBER() OVER (ORDER BY l.score DESC) as rank,
          u.total_games as games_played,
          CASE 
            WHEN u.total_games > 0 THEN ROUND((u.total_correct::float / u.total_games) * 100, 1)
            ELSE 0 
          END as accuracy
        FROM leaderboard_entries l
        JOIN users u ON l.user_id = u.id
        WHERE l.timeframe = $1 ${dateFilter}
        ORDER BY l.score DESC
        LIMIT $${params.length}
      `;
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        score: row.score,
        rank: row.rank,
        gamesPlayed: row.games_played,
        accuracy: parseFloat(row.accuracy)
      }));
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Gets the start of the current week (Monday)
   * @param date Current date
   * @returns Start of week date
   */
  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  }
  
  /**
   * Validates and processes a player's answer
   * @param questionId Question identifier
   * @param gameId Game identifier
   * @param userId User identifier
   * @param selectedChoice Index of selected choice (0-based)
   * @param responseTime Time taken to answer in seconds
   * @param question Original question data for validation
   * @returns Answer validation result with scoring
   */
  async validateAnswer(
    questionId: string,
    gameId: string,
    userId: string,
    selectedChoice: number,
    responseTime: number,
    question: Question
  ): Promise<AnswerResult> {
    try {
      // Validate input parameters
      this.validateAnswerInput(questionId, gameId, userId, selectedChoice, responseTime, question);
      
      // Validate response time
      this.validateResponseTime(responseTime, question.timeLimit);
      
      // Get game for scoring context
      const game = await this.getGameById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      
      if (game.status !== 'active') {
        throw new Error('Game is not active');
      }
      
      // Determine if answer is correct
      const correctChoiceIndex = question.choices.findIndex(
        choice => choice.code === question.correctCountry.code
      );
      
      const isCorrect = selectedChoice === correctChoiceIndex;
      
      // Calculate score if correct
      let scoreResult = {
        baseScore: 0,
        levelMultiplier: 1,
        timeBonus: 0,
        totalScore: 0
      };
      
      if (isCorrect) {
        // Determine level based on game mode and round
        const level = this.calculateLevel(game.mode, question.round);
        scoreResult = this.calculateScore(level, responseTime, question.timeLimit, game.mode);
      }
      
      // Create answer result
      const answerResult: AnswerResult = {
        isCorrect,
        correctAnswer: question.correctCountry,
        score: scoreResult.totalScore,
        timeBonus: scoreResult.timeBonus,
        totalScore: scoreResult.totalScore
      };
      
      // Log answer for monitoring/analytics
      console.log(`Answer validation - User: ${userId}, Question: ${questionId}, Correct: ${isCorrect}, Score: ${scoreResult.totalScore}, Time: ${responseTime}s`);
      
      return answerResult;
      
    } catch (error) {
      console.error('Error validating answer:', error);
      throw new Error(`Answer validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validates answer input parameters
   * @param questionId Question identifier
   * @param gameId Game identifier
   * @param userId User identifier
   * @param selectedChoice Selected choice index
   * @param responseTime Response time in seconds
   * @param question Question data
   */
  private validateAnswerInput(
    questionId: string,
    gameId: string,
    userId: string,
    selectedChoice: number,
    responseTime: number,
    question: Question
  ): void {
    if (!questionId || typeof questionId !== 'string') {
      throw new Error('Invalid question ID');
    }
    
    if (!gameId || typeof gameId !== 'string') {
      throw new Error('Invalid game ID');
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }
    
    if (typeof selectedChoice !== 'number' || selectedChoice < 0) {
      throw new Error('Invalid selected choice');
    }
    
    if (typeof responseTime !== 'number' || responseTime < 0) {
      throw new Error('Invalid response time');
    }
    
    if (!question || !question.choices || question.choices.length === 0) {
      throw new Error('Invalid question data');
    }
    
    if (selectedChoice >= question.choices.length) {
      throw new Error('Selected choice index out of range');
    }
    
    if (question.id !== questionId) {
      throw new Error('Question ID mismatch');
    }
    
    if (question.gameId !== gameId) {
      throw new Error('Game ID mismatch');
    }
  }
  
  /**
   * Validates response time against time limits and cheating detection
   * @param responseTime Response time in seconds
   * @param timeLimit Maximum allowed time in seconds
   */
  private validateResponseTime(responseTime: number, timeLimit: number): void {
    // Check if response time exceeds limit
    if (responseTime > timeLimit + 1) { // Allow 1 second grace period for network latency
      throw new Error('Response time exceeds time limit');
    }
    
    // Check for suspiciously fast responses (potential cheating)
    const minimumHumanResponseTime = 0.5; // 500ms minimum
    if (responseTime < minimumHumanResponseTime) {
      console.warn(`Suspiciously fast response time: ${responseTime}s`);
      // Don't throw error, but log for monitoring
    }
    
    // Check for exact zero response time (likely cheating)
    if (responseTime === 0) {
      throw new Error('Invalid response time: zero seconds');
    }
  }
  
  /**
   * Calculates the current level based on game mode and round
   * @param gameMode Game mode
   * @param round Current round number
   * @returns Current level for scoring
   */
  private calculateLevel(gameMode: GameMode, round: number): number {
    switch (gameMode) {
      case 'single':
        // In single-player, level equals round number
        return round;
        
      case 'timeattack':
        // In time attack, level increases every 5 questions
        return Math.floor(round / 5) + 1;
        
      case 'multiplayer':
        // In multiplayer, use fixed level for fairness
        return 2;
        
      default:
        return 1;
    }
  }
  
  /**
   * Records an answer attempt for analytics and cheating detection
   * @param gameId Game identifier
   * @param userId User identifier
   * @param questionId Question identifier
   * @param selectedChoice Selected choice index
   * @param responseTime Response time in seconds
   * @param isCorrect Whether the answer was correct
   * @param score Score awarded
   */
  async recordAnswerAttempt(
    gameId: string,
    userId: string,
    questionId: string,
    selectedChoice: number,
    responseTime: number,
    isCorrect: boolean,
    score: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // This would typically go to an analytics table
      // For now, we'll just log it
      const attemptData = {
        gameId,
        userId,
        questionId,
        selectedChoice,
        responseTime,
        isCorrect,
        score,
        timestamp: new Date().toISOString()
      };
      
      console.log('Answer attempt recorded:', JSON.stringify(attemptData));
      
      // In a production system, you might want to store this in a separate table
      // for analytics, cheating detection, and performance monitoring
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Detects potential cheating patterns
   * @param userId User identifier
   * @param responseTime Response time in seconds
   * @param isCorrect Whether the answer was correct
   * @returns Cheating detection result
   */
  async detectCheating(userId: string, responseTime: number, isCorrect: boolean): Promise<{
    suspicious: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // Check for consistently fast response times
    if (responseTime < 1.0 && isCorrect) {
      reasons.push('Consistently fast correct responses');
      riskLevel = 'medium';
    }
    
    // Check for perfect accuracy with fast responses
    if (responseTime < 2.0 && isCorrect) {
      reasons.push('Very fast correct response');
      riskLevel = 'medium';
    }
    
    // In a real system, you would check historical patterns:
    // - Average response time for this user
    // - Accuracy patterns
    // - Comparison with other users
    // - Device/browser fingerprinting
    // - IP address patterns
    
    const suspicious = reasons.length > 0;
    
    if (suspicious) {
      console.warn(`Potential cheating detected for user ${userId}:`, reasons);
    }
    
    return {
      suspicious,
      reasons,
      riskLevel
    };
  }
  
  /**
   * Generates a unique result ID
   * @returns Unique result identifier
   */
  private generateResultId(): string {
    return uuidv4();
  }
  
  /**
   * Gets game statistics for monitoring
   * @returns Game statistics
   */
  async getGameStatistics(): Promise<{
    totalGames: number;
    activeGames: number;
    gamesByMode: Record<GameMode, number>;
    averageGameDuration: number;
  }> {
    const client = await pool.connect();
    try {
      // Total games
      const totalResult = await client.query('SELECT COUNT(*) FROM games');
      const totalGames = parseInt(totalResult.rows[0].count);
      
      // Active games
      const activeResult = await client.query("SELECT COUNT(*) FROM games WHERE status = 'active'");
      const activeGames = parseInt(activeResult.rows[0].count);
      
      // Games by mode
      const modeResult = await client.query(`
        SELECT mode, COUNT(*) as count 
        FROM games 
        GROUP BY mode
      `);
      
      const gamesByMode: Record<GameMode, number> = {
        single: 0,
        timeattack: 0,
        multiplayer: 0
      };
      
      modeResult.rows.forEach(row => {
        gamesByMode[row.mode as GameMode] = parseInt(row.count);
      });
      
      // Average game duration (for completed games)
      const durationResult = await client.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration
        FROM games 
        WHERE status = 'completed' AND started_at IS NOT NULL AND ended_at IS NOT NULL
      `);
      
      const averageGameDuration = parseFloat(durationResult.rows[0].avg_duration) || 0;
      
      return {
        totalGames,
        activeGames,
        gamesByMode,
        averageGameDuration
      };
      
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const gameService = new GameService();