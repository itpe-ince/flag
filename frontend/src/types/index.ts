export interface Country {
  code: string;
  name: string;
  imageUrl: string;
  region: string;
  colors: string[];
  difficulty: number;
}

export interface Question {
  id: string;
  gameId: string;
  round: number;
  correctCountry: Country;
  choices: Country[];
  timeLimit: number;
  createdAt: Date;
}

export interface GameState {
  id: string;
  mode: 'single' | 'timeattack' | 'multiplayer';
  status: 'waiting' | 'active' | 'completed';
  currentQuestion?: Question;
  score: number;
  level: number;
  timeRemaining: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: Country;
  score: number;
  timeBonus: number;
  totalScore: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  accuracy: number;
}

export interface Player {
  userId: string;
  username: string;
  isReady: boolean;
  score: number;
  correctAnswers: number;
  totalResponseTime?: number; // For tie-breaking
}

export interface Room {
  id: string;
  gameId: string;
  hostUserId: string;
  maxPlayers: number;
  currentPlayers: Player[];
  state: 'lobby' | 'playing' | 'finished';
  currentQuestion?: Question;
  scores: Record<string, number>;
}

export interface RoomSettings {
  maxPlayers: number;
  roundCount: number;
  timeLimit: number;
}

// Authentication types
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

export interface UserStats {
  totalGames: number;
  totalCorrect: number;
  bestStreak: number;
  averageResponseTime: number;
  highestLevel: number;
  totalScore: number;
  accuracyPercentage?: number;
  completedGames?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

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