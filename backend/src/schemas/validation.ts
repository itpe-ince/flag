import { z } from 'zod';

// User validation schemas
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  avatarUrl: z.string().url().optional()
});

export const UpdateUserStatsSchema = z.object({
  totalGames: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  bestStreak: z.number().int().min(0),
  averageResponseTime: z.number().min(0),
  highestLevel: z.number().int().min(1),
  totalScore: z.number().int().min(0)
});

// Game validation schemas
export const GameModeSchema = z.enum(['single', 'timeattack', 'multiplayer']);
export const GameStatusSchema = z.enum(['waiting', 'active', 'completed']);

export const GameSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(10).optional(),
  timeLimit: z.number().int().min(30).max(300).optional(), // 30 seconds to 5 minutes
  roundCount: z.number().int().min(5).max(50).optional(),
  difficultyProgression: z.boolean()
});

export const CreateGameSchema = z.object({
  mode: GameModeSchema,
  settings: GameSettingsSchema,
  createdBy: z.string().uuid()
});

// Country/Flag validation schemas
export const CountrySchema = z.object({
  code: z.string().length(3, 'Country code must be exactly 3 characters'),
  name: z.string().min(1).max(100),
  imageUrl: z.string().url(),
  region: z.string().min(1).max(50),
  colors: z.array(z.string()).min(1),
  difficulty: z.number().int().min(1).max(5)
});

export const CreateFlagSchema = z.object({
  countryCode: z.string().length(3),
  countryName: z.string().min(1).max(100),
  imageUrl: z.string().url(),
  region: z.string().min(1).max(50),
  colors: z.array(z.string()).min(1),
  difficultyLevel: z.number().int().min(1).max(5)
});

// Question validation schemas
export const QuestionSchema = z.object({
  id: z.string().uuid(),
  gameId: z.string().uuid(),
  round: z.number().int().min(1),
  correctCountry: CountrySchema,
  choices: z.array(CountrySchema).min(2).max(16),
  timeLimit: z.number().int().min(5).max(60),
  createdAt: z.date()
});

// Answer validation schemas
export const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedChoice: z.number().int().min(0),
  responseTime: z.number().min(0).max(60000), // max 60 seconds in milliseconds
  timestamp: z.string().datetime()
});

export const AnswerResultSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: CountrySchema,
  score: z.number().int().min(0),
  timeBonus: z.number().int().min(0),
  totalScore: z.number().int().min(0)
});

// Room validation schemas
export const RoomStateSchema = z.enum(['lobby', 'playing', 'finished']);

export const PlayerSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(3).max(50),
  isReady: z.boolean(),
  score: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  isConnected: z.boolean()
});

export const RoomSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(10),
  roundCount: z.number().int().min(5).max(50),
  timePerQuestion: z.number().int().min(10).max(60),
  difficultyLevel: z.number().int().min(1).max(5)
});

export const CreateRoomSchema = z.object({
  hostUserId: z.string().uuid(),
  settings: RoomSettingsSchema
});

export const JoinRoomSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string().min(3).max(50)
});

// Game result validation schemas
export const GameResultSchema = z.object({
  gameId: z.string().uuid(),
  userId: z.string().uuid(),
  score: z.number().int().min(0),
  correctAnswers: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  completionTime: z.number().int().min(0).optional()
});

// Leaderboard validation schemas
export const TimeFrameSchema = z.enum(['daily', 'weekly', 'alltime']);

export const LeaderboardQuerySchema = z.object({
  timeframe: TimeFrameSchema,
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0)
});

// API Response validation schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional()
});

// Utility function to validate and parse data
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Type inference helpers
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserStatsInput = z.infer<typeof UpdateUserStatsSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type CreateFlagInput = z.infer<typeof CreateFlagSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type GameResultInput = z.infer<typeof GameResultSchema>;
export type LeaderboardQueryInput = z.infer<typeof LeaderboardQuerySchema>;