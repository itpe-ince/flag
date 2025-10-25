// Core type definitions for the Flag Guessing Game

export type GameMode = 'single' | 'timeattack' | 'multiplayer';
export type GameStatus = 'waiting' | 'active' | 'completed';
export type RoomState = 'lobby' | 'playing' | 'finished';
export type TimeFrame = 'daily' | 'weekly' | 'alltime';

// User related interfaces
export interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
  stats: UserStats;
}

export interface UserStats {
  totalGames: number;
  totalCorrect: number;
  bestStreak: number;
  averageResponseTime: number;
  highestLevel: number;
  totalScore: number;
}

// Game related interfaces
export interface Game {
  id: string;
  mode: GameMode;
  settings: GameSettings;
  status: GameStatus;
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface GameSettings {
  maxPlayers?: number;
  timeLimit?: number;
  roundCount?: number;
  difficultyProgression: boolean;
}

export interface GameResult {
  id: string;
  gameId: string;
  userId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completionTime?: number; // in seconds
  createdAt: Date;
}

// Question and Country interfaces
export interface Question {
  id: string;
  gameId: string;
  round: number;
  correctCountry: Country;
  choices: Country[];
  timeLimit: number;
  createdAt: Date;
}

export interface Country {
  code: string;
  name: string;
  imageUrl: string;
  region: string;
  colors: string[];
  difficulty: number;
}

// Answer and scoring interfaces
export interface Answer {
  questionId: string;
  selectedChoice: number;
  responseTime: number;
  timestamp: Date;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: Country;
  score: number;
  timeBonus: number;
  totalScore: number;
}

// Multiplayer room interfaces
export interface Room {
  id: string;
  gameId: string;
  hostUserId: string;
  maxPlayers: number;
  currentPlayers: Player[];
  state: RoomState;
  currentQuestion?: Question;
  scores: Record<string, number>;
  settings: RoomSettings;
}

export interface Player {
  userId: string;
  username: string;
  isReady: boolean;
  score: number;
  correctAnswers: number;
  isConnected: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  roundCount: number;
  timePerQuestion: number;
  difficultyLevel: number;
}

// Leaderboard interfaces
export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  accuracy: number;
}

// WebSocket event interfaces
export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  username: string;
}

export interface JoinResult {
  success: boolean;
  room?: Room;
  error?: string;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}

// Database row interfaces (matching SQL schema)
export interface UserRow {
  id: string;
  username: string;
  avatar_url?: string;
  created_at: Date;
  total_games: number;
  total_correct: number;
  best_streak: number;
  highest_level: number;
  total_score: number;
}

export interface FlagRow {
  country_code: string;
  country_name: string;
  image_url: string;
  region: string;
  colors: string[];
  difficulty_level: number;
  updated_at: Date;
}

export interface GameRow {
  id: string;
  mode: string;
  settings: any; // JSONB
  status: string;
  created_by: string;
  created_at: Date;
  started_at?: Date;
  ended_at?: Date;
}

export interface GameResultRow {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  completion_time?: number;
  created_at: Date;
}