import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { LeaderboardQuerySchema, validateData } from '../schemas/validation';
import { ApiResponse, LeaderboardEntry } from '../types';
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

// Helper function to get date range for timeframe
const getDateRange = (timeframe: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (timeframe) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0); // Start of today
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7); // 7 days ago
      break;
    case 'alltime':
    default:
      startDate = new Date('1970-01-01'); // Beginning of time
      break;
  }

  return { startDate, endDate };
};

// Helper function to build leaderboard query
const buildLeaderboardQuery = (timeframe: string, limit: number, offset: number): { query: string; params: any[] } => {
  const { startDate, endDate } = getDateRange(timeframe);
  
  let query = `
    SELECT 
      u.id as user_id,
      u.username,
      COUNT(gr.id) as games_played,
      SUM(gr.score) as total_score,
      SUM(gr.correct_answers) as total_correct,
      SUM(gr.total_questions) as total_questions,
      CASE 
        WHEN SUM(gr.total_questions) > 0 
        THEN ROUND((SUM(gr.correct_answers)::decimal / SUM(gr.total_questions)) * 100, 2)
        ELSE 0 
      END as accuracy,
      MAX(gr.score) as best_score,
      ROW_NUMBER() OVER (ORDER BY SUM(gr.score) DESC, SUM(gr.correct_answers) DESC, u.username ASC) as rank
    FROM users u
    INNER JOIN game_results gr ON u.id = gr.user_id
  `;
  
  const params: any[] = [];
  
  if (timeframe !== 'alltime') {
    query += ` WHERE gr.created_at >= $1 AND gr.created_at <= $2`;
    params.push(startDate, endDate);
  }
  
  query += `
    GROUP BY u.id, u.username
    HAVING COUNT(gr.id) > 0
    ORDER BY total_score DESC, total_correct DESC, u.username ASC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  
  params.push(limit, offset);
  
  return { query, params };
};

// GET /api/leaderboards/daily - Get daily leaderboard
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const queryParams = {
      timeframe: 'daily' as const,
      limit: parseInt(req.query.limit as string) || 10,
      offset: parseInt(req.query.offset as string) || 0
    };
    
    // Validate query parameters
    const validatedParams = validateData(LeaderboardQuerySchema, queryParams);
    const limit = validatedParams.limit || 10;
    const offset = validatedParams.offset || 0;
    
    const { query, params } = buildLeaderboardQuery(
      validatedParams.timeframe,
      limit,
      offset
    );
    
    const result = await pool.query(query, params);
    
    const leaderboard: LeaderboardEntry[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: parseInt(row.total_score) || 0,
      rank: parseInt(row.rank),
      gamesPlayed: parseInt(row.games_played),
      accuracy: parseFloat(row.accuracy) || 0
    }));
    
    // Get total count for pagination
    const { startDate, endDate } = getDateRange('daily');
    const countQuery = `SELECT COUNT(DISTINCT u.id) as total FROM users u INNER JOIN game_results gr ON u.id = gr.user_id WHERE gr.created_at >= $1 AND gr.created_at <= $2`;
    const countResult = await pool.query(countQuery, [startDate, endDate]);
    const totalCount = parseInt(countResult.rows[0]?.total) || 0;
    
    const response = {
      leaderboard,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      timeframe: 'daily'
    };
    
    res.json(createResponse(true, response));
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch daily leaderboard'
    }));
  }
});

// GET /api/leaderboards/weekly - Get weekly leaderboard
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const queryParams = {
      timeframe: 'weekly' as const,
      limit: parseInt(req.query.limit as string) || 10,
      offset: parseInt(req.query.offset as string) || 0
    };
    
    // Validate query parameters
    const validatedParams = validateData(LeaderboardQuerySchema, queryParams);
    const limit = validatedParams.limit || 10;
    const offset = validatedParams.offset || 0;
    
    const { query, params } = buildLeaderboardQuery(
      validatedParams.timeframe,
      limit,
      offset
    );
    
    const result = await pool.query(query, params);
    
    const leaderboard: LeaderboardEntry[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: parseInt(row.total_score) || 0,
      rank: parseInt(row.rank),
      gamesPlayed: parseInt(row.games_played),
      accuracy: parseFloat(row.accuracy) || 0
    }));
    
    // Get total count for pagination
    const { startDate, endDate } = getDateRange('weekly');
    const countQuery = `SELECT COUNT(DISTINCT u.id) as total FROM users u INNER JOIN game_results gr ON u.id = gr.user_id WHERE gr.created_at >= $1 AND gr.created_at <= $2`;
    const countResult = await pool.query(countQuery, [startDate, endDate]);
    const totalCount = parseInt(countResult.rows[0]?.total) || 0;
    
    const response = {
      leaderboard,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      timeframe: 'weekly'
    };
    
    res.json(createResponse(true, response));
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch weekly leaderboard'
    }));
  }
});

// GET /api/leaderboards/alltime - Get all-time leaderboard
router.get('/alltime', async (req: Request, res: Response) => {
  try {
    const queryParams = {
      timeframe: 'alltime' as const,
      limit: parseInt(req.query.limit as string) || 10,
      offset: parseInt(req.query.offset as string) || 0
    };
    
    // Validate query parameters
    const validatedParams = validateData(LeaderboardQuerySchema, queryParams);
    const limit = validatedParams.limit || 10;
    const offset = validatedParams.offset || 0;
    
    const { query, params } = buildLeaderboardQuery(
      validatedParams.timeframe,
      limit,
      offset
    );
    
    const result = await pool.query(query, params);
    
    const leaderboard: LeaderboardEntry[] = result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      score: parseInt(row.total_score) || 0,
      rank: parseInt(row.rank),
      gamesPlayed: parseInt(row.games_played),
      accuracy: parseFloat(row.accuracy) || 0
    }));
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(DISTINCT u.id) as total FROM users u INNER JOIN game_results gr ON u.id = gr.user_id`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0]?.total) || 0;
    
    const response = {
      leaderboard,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      },
      timeframe: 'alltime'
    };
    
    res.json(createResponse(true, response));
  } catch (error) {
    console.error('Error fetching all-time leaderboard:', error);
    
    if (error instanceof Error && error.message.includes('Validation error')) {
      return res.status(400).json(createResponse(false, null, {
        code: 'VALIDATION_ERROR',
        message: error.message
      }));
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch all-time leaderboard'
    }));
  }
});

export default router;