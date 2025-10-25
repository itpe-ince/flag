import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { GameModel, UserModel } from '../models';
import { CreateGameSchema, GameResultSchema, validateData } from '../schemas/validation';
import { ApiResponse, Game, GameResult } from '../types';
import { gameService } from '../services/game-service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function to create API response
const createResponse = <T>(success: boolean, data?: T, error?: any): ApiResponse<T> => {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId: uuidv4()
  };
};

// POST /api/games - Create a new game
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const gameData = validateData(CreateGameSchema, req.body);
    
    // Verify that the creator user exists
    const userQuery = 'SELECT id FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [gameData.createdBy]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'Creator user not found'
      }));
    }

    // Create new game
    const gameId = uuidv4();
    const insertQuery = `
      INSERT INTO games (id, mode, settings, status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      gameId,
      gameData.mode,
      JSON.stringify(gameData.settings),
      'waiting',
      gameData.createdBy
    ]);

    const game = GameModel.fromRow(result.rows[0]);
    
    res.status(201).json(createResponse(true, game));
  } catch (error) {
    console.error('Error creating game:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to create game'
    }));
  }
});

// POST /api/games/:id/start - Start a game
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      }));
    }

    // Start the game using game service
    const startedGame = await gameService.startGame(gameId);
    
    res.json(createResponse(true, startedGame));
  } catch (error) {
    console.error('Error starting game:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Game not found')) {
        return res.status(404).json(createResponse(false, null, {
          code: 'GAME_NOT_FOUND',
          message: 'Game not found'
        }));
      }
      
      if (error.message.includes('Cannot start game')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'INVALID_GAME_STATE',
          message: error.message
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to start game'
    }));
  }
});

// GET /api/games/:id - Get game details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      }));
    }

    // Get game from database with creator information
    const query = `
      SELECT 
        g.*,
        u.username as creator_username
      FROM games g
      JOIN users u ON g.created_by = u.id
      WHERE g.id = $1
    `;
    const result = await pool.query(query, [gameId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found'
      }));
    }

    const gameRow = result.rows[0];
    const game = GameModel.fromRow(gameRow);
    
    // Add creator username to response
    const gameWithCreator = {
      ...game,
      creatorUsername: gameRow.creator_username
    };
    
    res.json(createResponse(true, gameWithCreator));
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch game'
    }));
  }
});

// GET /api/games/:id/question - Generate a question for the game
router.get('/:id/question', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      }));
    }

    // Get query parameters
    const round = parseInt(req.query.round as string) || 1;
    const level = parseInt(req.query.level as string) || 1;

    // Validate parameters
    if (round < 1 || level < 1) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_PARAMETERS',
        message: 'Round and level must be positive integers'
      }));
    }

    // Generate question using game service
    const question = await gameService.generateGameQuestion(gameId, round, level);
    
    res.json(createResponse(true, question));
  } catch (error) {
    console.error('Error generating question:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Game not found')) {
        return res.status(404).json(createResponse(false, null, {
          code: 'GAME_NOT_FOUND',
          message: 'Game not found'
        }));
      }
      
      if (error.message.includes('Game is not active')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'GAME_NOT_ACTIVE',
          message: 'Game is not active'
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate question'
    }));
  }
});

// POST /api/games/:id/answer - Validate an answer and calculate score
router.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const gameId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      }));
    }

    // Validate request body
    const { questionId, userId, selectedChoice, responseTime, question } = req.body;
    
    if (!questionId || !userId || typeof selectedChoice !== 'number' || typeof responseTime !== 'number' || !question) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: questionId, userId, selectedChoice, responseTime, question'
      }));
    }

    // Validate answer using game service
    const answerResult = await gameService.validateAnswer(
      questionId,
      gameId,
      userId,
      selectedChoice,
      responseTime,
      question
    );
    
    res.json(createResponse(true, answerResult));
  } catch (error) {
    console.error('Error validating answer:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Game not found')) {
        return res.status(404).json(createResponse(false, null, {
          code: 'GAME_NOT_FOUND',
          message: 'Game not found'
        }));
      }
      
      if (error.message.includes('Game is not active')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'GAME_NOT_ACTIVE',
          message: 'Game is not active'
        }));
      }
      
      if (error.message.includes('validation failed') || error.message.includes('Invalid')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: error.message
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to validate answer'
    }));
  }
});

// POST /api/games/:id/results - Submit game results
router.post('/:id/results', async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const gameId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_GAME_ID',
        message: 'Invalid game ID format'
      }));
    }

    // Validate request body
    const resultData = validateData(GameResultSchema, req.body);
    
    // Verify game ID matches
    if (resultData.gameId !== gameId) {
      return res.status(400).json(createResponse(false, null, {
        code: 'GAME_ID_MISMATCH',
        message: 'Game ID in URL does not match game ID in request body'
      }));
    }

    await client.query('BEGIN');

    // Verify that the game exists and is not already completed
    const gameQuery = 'SELECT * FROM games WHERE id = $1';
    const gameQueryResult = await client.query(gameQuery, [gameId]);
    
    if (gameQueryResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json(createResponse(false, null, {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found'
      }));
    }

    const game = GameModel.fromRow(gameQueryResult.rows[0]);
    
    // Verify that the user exists
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [resultData.userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json(createResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }));
    }

    // Check if result already exists for this user and game
    const existingResultQuery = 'SELECT id FROM game_results WHERE game_id = $1 AND user_id = $2';
    const existingResult = await client.query(existingResultQuery, [gameId, resultData.userId]);
    
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json(createResponse(false, null, {
        code: 'RESULT_EXISTS',
        message: 'Result already submitted for this game and user'
      }));
    }

    // Insert game result
    const resultId = uuidv4();
    const insertResultQuery = `
      INSERT INTO game_results (id, game_id, user_id, score, correct_answers, total_questions, completion_time, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const insertResult = await client.query(insertResultQuery, [
      resultId,
      resultData.gameId,
      resultData.userId,
      resultData.score,
      resultData.correctAnswers,
      resultData.totalQuestions,
      resultData.completionTime || null
    ]);

    // Update user statistics
    const currentUser = UserModel.fromRow(userResult.rows[0]);
    const newTotalGames = currentUser.stats.totalGames + 1;
    const newTotalCorrect = currentUser.stats.totalCorrect + resultData.correctAnswers;
    const newTotalScore = currentUser.stats.totalScore + resultData.score;
    const newBestStreak = Math.max(currentUser.stats.bestStreak, resultData.correctAnswers);
    
    // For single player mode, update highest level based on correct answers
    let newHighestLevel = currentUser.stats.highestLevel;
    if (game.mode === 'single' && resultData.correctAnswers > 0) {
      // In single player, level = correct answers + 1 (since you start at level 1)
      const achievedLevel = resultData.correctAnswers + 1;
      newHighestLevel = Math.max(newHighestLevel, achievedLevel);
    }

    const updateUserQuery = `
      UPDATE users 
      SET total_games = $1, total_correct = $2, total_score = $3, best_streak = $4, highest_level = $5
      WHERE id = $6
    `;
    
    await client.query(updateUserQuery, [
      newTotalGames,
      newTotalCorrect,
      newTotalScore,
      newBestStreak,
      newHighestLevel,
      resultData.userId
    ]);

    // Update game status to completed if it's a single player game
    if (game.mode === 'single' || game.mode === 'timeattack') {
      const updateGameQuery = `
        UPDATE games 
        SET status = 'completed', ended_at = NOW()
        WHERE id = $1
      `;
      await client.query(updateGameQuery, [gameId]);
    }

    await client.query('COMMIT');

    const submittedGameResult = {
      id: insertResult.rows[0].id,
      gameId: insertResult.rows[0].game_id,
      userId: insertResult.rows[0].user_id,
      score: insertResult.rows[0].score,
      correctAnswers: insertResult.rows[0].correct_answers,
      totalQuestions: insertResult.rows[0].total_questions,
      completionTime: insertResult.rows[0].completion_time,
      createdAt: insertResult.rows[0].created_at
    };
    
    res.status(201).json(createResponse(true, submittedGameResult));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting game result:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to submit game result'
    }));
  } finally {
    client.release();
  }
});

export default router;