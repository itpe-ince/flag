import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { UserModel } from '../models';
import { CreateUserSchema, validateData } from '../schemas/validation';
import { ApiResponse, User, UserStats } from '../types';
import { authenticateToken, optionalAuth } from '../middleware/auth';
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

// POST /api/users - Create a new user
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const userData = validateData(CreateUserSchema, req.body);
    
    // Check if username already exists
    const existingUserQuery = 'SELECT id FROM users WHERE username = $1';
    const existingUser = await pool.query(existingUserQuery, [userData.username]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json(createResponse(false, null, {
        code: 'USERNAME_EXISTS',
        message: 'Username already exists'
      }));
    }

    // Create new user
    const userId = uuidv4();
    const insertQuery = `
      INSERT INTO users (id, username, avatar_url, created_at, total_games, total_correct, best_streak, highest_level, total_score)
      VALUES ($1, $2, $3, NOW(), 0, 0, 0, 0, 0)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      userId,
      userData.username,
      userData.avatarUrl || null
    ]);

    const user = UserModel.fromRow(result.rows[0]);
    
    res.status(201).json(createResponse(true, user));
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to create user'
    }));
  }
});

// GET /api/users/:id - Get user profile (optional auth for privacy)
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID format'
      }));
    }

    // Get user from database
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }));
    }

    const user = UserModel.fromRow(result.rows[0]);
    
    res.json(createResponse(true, user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user'
    }));
  }
});

// GET /api/users/:id/stats - Get user statistics (optional auth for privacy)
router.get('/:id/stats', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json(createResponse(false, null, {
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID format'
      }));
    }

    // Check if user exists
    const userQuery = 'SELECT id FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json(createResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }));
    }

    // Get detailed user statistics
    const statsQuery = `
      SELECT 
        u.total_games,
        u.total_correct,
        u.best_streak,
        u.highest_level,
        u.total_score,
        COALESCE(AVG(gr.completion_time), 0) as average_response_time,
        COUNT(gr.id) as completed_games,
        CASE 
          WHEN u.total_games > 0 THEN ROUND((u.total_correct::decimal / u.total_games) * 100, 2)
          ELSE 0 
        END as accuracy_percentage
      FROM users u
      LEFT JOIN game_results gr ON u.id = gr.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.total_games, u.total_correct, u.best_streak, u.highest_level, u.total_score
    `;
    
    const result = await pool.query(statsQuery, [userId]);
    const row = result.rows[0];
    
    const stats: UserStats & { accuracyPercentage: number; completedGames: number } = {
      totalGames: row.total_games,
      totalCorrect: row.total_correct,
      bestStreak: row.best_streak,
      averageResponseTime: parseFloat(row.average_response_time) || 0,
      highestLevel: row.highest_level,
      totalScore: row.total_score,
      accuracyPercentage: parseFloat(row.accuracy_percentage) || 0,
      completedGames: parseInt(row.completed_games) || 0
    };
    
    res.json(createResponse(true, stats));
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user statistics'
    }));
  }
});

export default router;