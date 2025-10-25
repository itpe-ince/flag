import { redisClient } from '../config/redis';
import { Room, Player, LeaderboardEntry } from '../types';

// Redis key generators
export const RedisKeys = {
  room: (roomId: string) => `rooms:${roomId}`,
  roomPlayers: (roomId: string) => `room_players:${roomId}`,
  roomScores: (roomId: string) => `room_scores:${roomId}`,
  userSession: (userId: string) => `user_session:${userId}`,
  gameSession: (sessionId: string) => `session:${sessionId}`,
  leaderboard: (timeframe: string) => `leaderboard:${timeframe}`,
  userStats: (userId: string) => `user_stats:${userId}`,
  activeRooms: () => 'active_rooms',
  roomExpiry: (roomId: string) => `room_expiry:${roomId}`
};

// Room management helpers
export class RoomCache {
  // Store room data
  static async setRoom(roomId: string, room: Room, ttl: number = 3600): Promise<void> {
    const key = RedisKeys.room(roomId);
    await redisClient.setEx(key, ttl, JSON.stringify(room));
    
    // Add to active rooms set
    await redisClient.sAdd(RedisKeys.activeRooms(), roomId);
  }

  // Get room data
  static async getRoom(roomId: string): Promise<Room | null> {
    const key = RedisKeys.room(roomId);
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Update room data
  static async updateRoom(roomId: string, room: Room, ttl: number = 3600): Promise<void> {
    await this.setRoom(roomId, room, ttl);
  }

  // Delete room
  static async deleteRoom(roomId: string): Promise<void> {
    const roomKey = RedisKeys.room(roomId);
    const playersKey = RedisKeys.roomPlayers(roomId);
    const scoresKey = RedisKeys.roomScores(roomId);
    
    await Promise.all([
      redisClient.del(roomKey),
      redisClient.del(playersKey),
      redisClient.del(scoresKey),
      redisClient.sRem(RedisKeys.activeRooms(), roomId)
    ]);
  }

  // Add player to room
  static async addPlayerToRoom(roomId: string, player: Player): Promise<void> {
    const playersKey = RedisKeys.roomPlayers(roomId);
    await redisClient.sAdd(playersKey, JSON.stringify(player));
  }

  // Remove player from room
  static async removePlayerFromRoom(roomId: string, userId: string): Promise<void> {
    const playersKey = RedisKeys.roomPlayers(roomId);
    const players = await redisClient.sMembers(playersKey);
    
    for (const playerData of players) {
      const player: Player = JSON.parse(playerData);
      if (player.userId === userId) {
        await redisClient.sRem(playersKey, playerData);
        break;
      }
    }
  }

  // Get all players in room
  static async getRoomPlayers(roomId: string): Promise<Player[]> {
    const playersKey = RedisKeys.roomPlayers(roomId);
    const playersData = await redisClient.sMembers(playersKey);
    return playersData.map(data => JSON.parse(data));
  }

  // Update player score
  static async updatePlayerScore(roomId: string, userId: string, score: number): Promise<void> {
    const scoresKey = RedisKeys.roomScores(roomId);
    await redisClient.zAdd(scoresKey, { score, value: userId });
  }

  // Get room scores (sorted by score descending)
  static async getRoomScores(roomId: string): Promise<Array<{ userId: string; score: number }>> {
    const scoresKey = RedisKeys.roomScores(roomId);
    const scores = await redisClient.zRangeWithScores(scoresKey, 0, -1, { REV: true });
    return scores.map(item => ({ userId: item.value, score: item.score }));
  }

  // Get all active rooms
  static async getActiveRooms(): Promise<string[]> {
    return await redisClient.sMembers(RedisKeys.activeRooms());
  }

  // Set room expiry
  static async setRoomExpiry(roomId: string, seconds: number): Promise<void> {
    const key = RedisKeys.room(roomId);
    await redisClient.expire(key, seconds);
  }
}

// Leaderboard management helpers
export class LeaderboardCache {
  // Add score to leaderboard
  static async addScore(timeframe: string, userId: string, score: number): Promise<void> {
    const key = RedisKeys.leaderboard(timeframe);
    await redisClient.zAdd(key, { score, value: userId });
  }

  // Get top scores from leaderboard
  static async getTopScores(timeframe: string, limit: number = 10): Promise<Array<{ userId: string; score: number; rank: number }>> {
    const key = RedisKeys.leaderboard(timeframe);
    const scores = await redisClient.zRangeWithScores(key, 0, limit - 1, { REV: true });
    
    return scores.map((item, index) => ({
      userId: item.value,
      score: item.score,
      rank: index + 1
    }));
  }

  // Get user rank in leaderboard
  static async getUserRank(timeframe: string, userId: string): Promise<number | null> {
    const key = RedisKeys.leaderboard(timeframe);
    const rank = await redisClient.zRevRank(key, userId);
    return rank !== null ? rank + 1 : null;
  }

  // Get user score in leaderboard
  static async getUserScore(timeframe: string, userId: string): Promise<number | null> {
    const key = RedisKeys.leaderboard(timeframe);
    return await redisClient.zScore(key, userId);
  }

  // Clear leaderboard (for daily/weekly resets)
  static async clearLeaderboard(timeframe: string): Promise<void> {
    const key = RedisKeys.leaderboard(timeframe);
    await redisClient.del(key);
  }

  // Set leaderboard expiry
  static async setLeaderboardExpiry(timeframe: string, seconds: number): Promise<void> {
    const key = RedisKeys.leaderboard(timeframe);
    await redisClient.expire(key, seconds);
  }
}

// Session management helpers
export class SessionCache {
  // Set user session
  static async setUserSession(userId: string, sessionId: string, ttl: number = 3600): Promise<void> {
    const key = RedisKeys.userSession(userId);
    await redisClient.setEx(key, ttl, sessionId);
  }

  // Get user session
  static async getUserSession(userId: string): Promise<string | null> {
    const key = RedisKeys.userSession(userId);
    return await redisClient.get(key);
  }

  // Delete user session
  static async deleteUserSession(userId: string): Promise<void> {
    const key = RedisKeys.userSession(userId);
    await redisClient.del(key);
  }

  // Set game session data
  static async setGameSession(sessionId: string, gameData: any, ttl: number = 3600): Promise<void> {
    const key = RedisKeys.gameSession(sessionId);
    await redisClient.setEx(key, ttl, JSON.stringify(gameData));
  }

  // Get game session data
  static async getGameSession(sessionId: string): Promise<any | null> {
    const key = RedisKeys.gameSession(sessionId);
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Delete game session
  static async deleteGameSession(sessionId: string): Promise<void> {
    const key = RedisKeys.gameSession(sessionId);
    await redisClient.del(key);
  }

  // Extend session TTL
  static async extendSessionTTL(sessionId: string, ttl: number): Promise<void> {
    const key = RedisKeys.gameSession(sessionId);
    await redisClient.expire(key, ttl);
  }
}

// User statistics caching
export class UserStatsCache {
  // Cache user statistics
  static async setUserStats(userId: string, stats: any, ttl: number = 300): Promise<void> {
    const key = RedisKeys.userStats(userId);
    await redisClient.setEx(key, ttl, JSON.stringify(stats));
  }

  // Get cached user statistics
  static async getUserStats(userId: string): Promise<any | null> {
    const key = RedisKeys.userStats(userId);
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Delete cached user statistics
  static async deleteUserStats(userId: string): Promise<void> {
    const key = RedisKeys.userStats(userId);
    await redisClient.del(key);
  }
}

// General cache utilities
export class CacheUtils {
  // Set with TTL
  static async set(key: string, value: any, ttl: number): Promise<void> {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  }

  // Get and parse JSON
  static async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Delete key
  static async delete(key: string): Promise<void> {
    await redisClient.del(key);
  }

  // Check if key exists
  static async exists(key: string): Promise<boolean> {
    return (await redisClient.exists(key)) === 1;
  }

  // Set expiry on existing key
  static async expire(key: string, seconds: number): Promise<void> {
    await redisClient.expire(key, seconds);
  }

  // Get TTL of key
  static async getTTL(key: string): Promise<number> {
    return await redisClient.ttl(key);
  }

  // Increment counter
  static async increment(key: string, by: number = 1): Promise<number> {
    return await redisClient.incrBy(key, by);
  }

  // Add to set
  static async addToSet(key: string, ...values: string[]): Promise<void> {
    await redisClient.sAdd(key, values);
  }

  // Remove from set
  static async removeFromSet(key: string, ...values: string[]): Promise<void> {
    await redisClient.sRem(key, values);
  }

  // Get set members
  static async getSetMembers(key: string): Promise<string[]> {
    return await redisClient.sMembers(key);
  }
}