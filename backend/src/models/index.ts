import { 
  User, UserStats, UserRow, 
  Game, GameRow, GameSettings,
  Country, FlagRow,
  GameResult, GameResultRow,
  Room, Player, RoomSettings
} from '../types';

// User model transformations
export class UserModel {
  static fromRow(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      stats: {
        totalGames: row.total_games,
        totalCorrect: row.total_correct,
        bestStreak: row.best_streak,
        averageResponseTime: 0, // Will be calculated separately
        highestLevel: row.highest_level,
        totalScore: row.total_score
      }
    };
  }

  static toRow(user: Partial<User>): Partial<UserRow> {
    return {
      id: user.id,
      username: user.username,
      avatar_url: user.avatarUrl,
      created_at: user.createdAt,
      total_games: user.stats?.totalGames,
      total_correct: user.stats?.totalCorrect,
      best_streak: user.stats?.bestStreak,
      highest_level: user.stats?.highestLevel,
      total_score: user.stats?.totalScore
    };
  }

  static createDefault(username: string): Omit<User, 'id' | 'createdAt'> {
    return {
      username,
      stats: {
        totalGames: 0,
        totalCorrect: 0,
        bestStreak: 0,
        averageResponseTime: 0,
        highestLevel: 0,
        totalScore: 0
      }
    };
  }
}

// Game model transformations
export class GameModel {
  static fromRow(row: GameRow): Game {
    return {
      id: row.id,
      mode: row.mode as any,
      settings: row.settings as GameSettings,
      status: row.status as any,
      createdBy: row.created_by,
      createdAt: row.created_at,
      startedAt: row.started_at,
      endedAt: row.ended_at
    };
  }

  static toRow(game: Partial<Game>): Partial<GameRow> {
    return {
      id: game.id,
      mode: game.mode,
      settings: game.settings,
      status: game.status,
      created_by: game.createdBy,
      created_at: game.createdAt,
      started_at: game.startedAt,
      ended_at: game.endedAt
    };
  }

  static createDefault(mode: Game['mode'], createdBy: string, settings: GameSettings): Omit<Game, 'id' | 'createdAt'> {
    return {
      mode,
      settings,
      status: 'waiting',
      createdBy
    };
  }
}

// Country/Flag model transformations
export class CountryModel {
  static fromRow(row: FlagRow): Country {
    return {
      code: row.country_code,
      name: row.country_name,
      imageUrl: row.image_url,
      region: row.region,
      colors: row.colors,
      difficulty: row.difficulty_level
    };
  }

  static toRow(country: Country): FlagRow {
    return {
      country_code: country.code,
      country_name: country.name,
      image_url: country.imageUrl,
      region: country.region,
      colors: country.colors,
      difficulty_level: country.difficulty,
      updated_at: new Date()
    };
  }
}

// Game Result model transformations
export class GameResultModel {
  static fromRow(row: GameResultRow): GameResult {
    return {
      id: row.id,
      gameId: row.game_id,
      userId: row.user_id,
      score: row.score,
      correctAnswers: row.correct_answers,
      totalQuestions: row.total_questions,
      completionTime: row.completion_time,
      createdAt: row.created_at
    };
  }

  static toRow(result: Omit<GameResult, 'id' | 'createdAt'>): Omit<GameResultRow, 'id' | 'created_at'> {
    return {
      game_id: result.gameId,
      user_id: result.userId,
      score: result.score,
      correct_answers: result.correctAnswers,
      total_questions: result.totalQuestions,
      completion_time: result.completionTime
    };
  }
}

// Room model utilities
export class RoomModel {
  static createDefault(hostUserId: string, settings: RoomSettings): Omit<Room, 'id' | 'gameId'> {
    return {
      hostUserId,
      maxPlayers: settings.maxPlayers,
      currentPlayers: [],
      state: 'lobby',
      scores: {},
      settings
    };
  }

  static createPlayer(userId: string, username: string): Player {
    return {
      userId,
      username,
      isReady: false,
      score: 0,
      correctAnswers: 0,
      isConnected: true
    };
  }

  static addPlayer(room: Room, player: Player): Room {
    if (room.currentPlayers.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.currentPlayers.some(p => p.userId === player.userId)) {
      throw new Error('Player already in room');
    }

    return {
      ...room,
      currentPlayers: [...room.currentPlayers, player],
      scores: { ...room.scores, [player.userId]: 0 }
    };
  }

  static removePlayer(room: Room, userId: string): Room {
    return {
      ...room,
      currentPlayers: room.currentPlayers.filter(p => p.userId !== userId),
      scores: Object.fromEntries(
        Object.entries(room.scores).filter(([id]) => id !== userId)
      )
    };
  }

  static updatePlayerScore(room: Room, userId: string, score: number): Room {
    return {
      ...room,
      currentPlayers: room.currentPlayers.map(p => 
        p.userId === userId ? { ...p, score } : p
      ),
      scores: { ...room.scores, [userId]: score }
    };
  }

  static setPlayerReady(room: Room, userId: string, isReady: boolean): Room {
    return {
      ...room,
      currentPlayers: room.currentPlayers.map(p => 
        p.userId === userId ? { ...p, isReady } : p
      )
    };
  }

  static areAllPlayersReady(room: Room): boolean {
    return room.currentPlayers.length >= 2 && 
           room.currentPlayers.every(p => p.isReady);
  }

  static getWinner(room: Room): Player | null {
    if (room.currentPlayers.length === 0) return null;
    
    return room.currentPlayers.reduce((winner, player) => 
      player.score > winner.score ? player : winner
    );
  }
}

// Scoring utilities
export class ScoringModel {
  static calculateBaseScore(level: number): number {
    return 100 * Math.pow(2, level - 1);
  }

  static calculateTimeBonus(responseTime: number, timeLimit: number): number {
    const timeRatio = Math.max(0, (timeLimit - responseTime) / timeLimit);
    return Math.floor(50 * timeRatio);
  }

  static calculateTotalScore(baseScore: number, timeBonus: number): number {
    return baseScore + timeBonus;
  }

  static calculateLevelMultiplier(level: number): number {
    return Math.pow(2, level - 1);
  }
}

// Question generation utilities
export class QuestionModel {
  static generateChoices(correctCountry: Country, allCountries: Country[], choiceCount: number): Country[] {
    if (choiceCount < 2) throw new Error('Must have at least 2 choices');
    if (choiceCount > allCountries.length) throw new Error('Not enough countries for choice count');

    // Filter out the correct country from potential incorrect choices
    const incorrectCountries = allCountries.filter(c => c.code !== correctCountry.code);
    
    // Sort by similarity (region first, then difficulty)
    const sortedCountries = incorrectCountries.sort((a, b) => {
      // Prioritize same region
      if (a.region === correctCountry.region && b.region !== correctCountry.region) return -1;
      if (b.region === correctCountry.region && a.region !== correctCountry.region) return 1;
      
      // Then by difficulty similarity
      const aDifficultyDiff = Math.abs(a.difficulty - correctCountry.difficulty);
      const bDifficultyDiff = Math.abs(b.difficulty - correctCountry.difficulty);
      return aDifficultyDiff - bDifficultyDiff;
    });

    // Select the most similar countries for incorrect choices
    const incorrectChoices = sortedCountries.slice(0, choiceCount - 1);
    
    // Combine and shuffle
    const allChoices = [correctCountry, ...incorrectChoices];
    return this.shuffleArray(allChoices);
  }

  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static getCorrectChoiceIndex(choices: Country[], correctCountry: Country): number {
    return choices.findIndex(c => c.code === correctCountry.code);
  }
}