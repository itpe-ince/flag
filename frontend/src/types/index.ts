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