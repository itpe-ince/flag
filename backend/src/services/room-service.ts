import { v4 as uuidv4 } from 'uuid';
import { Room, Player, RoomSettings, JoinResult, RoomState } from '../types';
import { redisClient } from '../config/redis';

export class RoomService {
  private static instance: RoomService;
  private rooms: Map<string, Room> = new Map();

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  public async createRoom(hostUserId: string, hostUsername: string, settings: RoomSettings): Promise<Room> {
    const roomId = uuidv4();
    const gameId = uuidv4();

    const hostPlayer: Player = {
      userId: hostUserId,
      username: hostUsername,
      isReady: false,
      score: 0,
      correctAnswers: 0,
      isConnected: true
    };

    const room: Room = {
      id: roomId,
      gameId,
      hostUserId,
      maxPlayers: settings.maxPlayers,
      currentPlayers: [hostPlayer],
      state: 'lobby',
      scores: { [hostUserId]: 0 },
      settings
    };

    // Store in memory
    this.rooms.set(roomId, room);

    // Store in Redis for persistence and scaling
    await this.saveRoomToRedis(room);

    console.log(`Room created: ${roomId} by ${hostUsername}`);
    return room;
  }

  public async joinRoom(roomId: string, userId: string, username: string): Promise<JoinResult> {
    const room = await this.getRoom(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.state !== 'lobby') {
      return { success: false, error: 'Game already in progress' };
    }

    if (room.currentPlayers.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Check if user is already in the room
    const existingPlayer = room.currentPlayers.find(p => p.userId === userId);
    if (existingPlayer) {
      // User reconnecting
      existingPlayer.isConnected = true;
      await this.saveRoomToRedis(room);
      return { success: true, room };
    }

    // Add new player
    const newPlayer: Player = {
      userId,
      username,
      isReady: false,
      score: 0,
      correctAnswers: 0,
      isConnected: true
    };

    room.currentPlayers.push(newPlayer);
    room.scores[userId] = 0;

    await this.saveRoomToRedis(room);

    console.log(`User ${username} joined room ${roomId}`);
    return { success: true, room };
  }

  public async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    
    if (!room) {
      return false;
    }

    // Remove player from room
    room.currentPlayers = room.currentPlayers.filter(p => p.userId !== userId);
    delete room.scores[userId];

    // If host left and there are other players, assign new host
    if (room.hostUserId === userId && room.currentPlayers.length > 0) {
      room.hostUserId = room.currentPlayers[0].userId;
      console.log(`New host assigned for room ${roomId}: ${room.currentPlayers[0].username}`);
    }

    // If no players left, delete the room
    if (room.currentPlayers.length === 0) {
      await this.deleteRoom(roomId);
      console.log(`Room ${roomId} deleted - no players remaining`);
      return true;
    }

    await this.saveRoomToRedis(room);
    console.log(`User ${userId} left room ${roomId}`);
    return true;
  }

  public async setPlayerReady(roomId: string, userId: string, isReady: boolean): Promise<Room | null> {
    const room = await this.getRoom(roomId);
    
    if (!room) {
      return null;
    }

    const player = room.currentPlayers.find(p => p.userId === userId);
    if (!player) {
      return null;
    }

    player.isReady = isReady;
    await this.saveRoomToRedis(room);

    console.log(`Player ${userId} ready status: ${isReady} in room ${roomId}`);
    return room;
  }

  public async setPlayerConnectionStatus(roomId: string, userId: string, isConnected: boolean): Promise<Room | null> {
    const room = await this.getRoom(roomId);
    
    if (!room) {
      return null;
    }

    const player = room.currentPlayers.find(p => p.userId === userId);
    if (!player) {
      return null;
    }

    player.isConnected = isConnected;
    await this.saveRoomToRedis(room);

    return room;
  }

  public async updateRoomState(roomId: string, newState: RoomState): Promise<Room | null> {
    const room = await this.getRoom(roomId);
    
    if (!room) {
      return null;
    }

    room.state = newState;
    await this.saveRoomToRedis(room);

    console.log(`Room ${roomId} state changed to: ${newState}`);
    return room;
  }

  public async getRoom(roomId: string): Promise<Room | null> {
    // Try memory first
    let room = this.rooms.get(roomId);
    
    if (!room) {
      // Try Redis
      const redisRoom = await this.loadRoomFromRedis(roomId);
      if (redisRoom) {
        room = redisRoom;
        this.rooms.set(roomId, room);
      }
    }

    return room || null;
  }

  public async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  public async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    await this.deleteRoomFromRedis(roomId);
  }

  public areAllPlayersReady(room: Room): boolean {
    return room.currentPlayers.length >= 2 && 
           room.currentPlayers.every(player => player.isReady);
  }

  public getConnectedPlayersCount(room: Room): number {
    return room.currentPlayers.filter(player => player.isConnected).length;
  }

  // Redis persistence methods
  private async saveRoomToRedis(room: Room): Promise<void> {
    try {
      if (redisClient.isReady) {
        await redisClient.setEx(`room:${room.id}`, 3600, JSON.stringify(room)); // 1 hour TTL
        await redisClient.sAdd('active_rooms', room.id);
      }
    } catch (error) {
      console.error('Error saving room to Redis:', error);
    }
  }

  private async loadRoomFromRedis(roomId: string): Promise<Room | null> {
    try {
      if (redisClient.isReady) {
        const roomData = await redisClient.get(`room:${roomId}`);
        if (roomData) {
          return JSON.parse(roomData) as Room;
        }
      }
    } catch (error) {
      console.error('Error loading room from Redis:', error);
    }
    return null;
  }

  private async deleteRoomFromRedis(roomId: string): Promise<void> {
    try {
      if (redisClient.isReady) {
        await redisClient.del(`room:${roomId}`);
        await redisClient.sRem('active_rooms', roomId);
      }
    } catch (error) {
      console.error('Error deleting room from Redis:', error);
    }
  }

  // Cleanup method for disconnected rooms
  public async cleanupInactiveRooms(): Promise<void> {
    const rooms = Array.from(this.rooms.values());
    
    for (const room of rooms) {
      const connectedCount = this.getConnectedPlayersCount(room);
      
      // Delete rooms with no connected players for more than 5 minutes
      if (connectedCount === 0) {
        await this.deleteRoom(room.id);
        console.log(`Cleaned up inactive room: ${room.id}`);
      }
    }
  }
}

export const roomService = RoomService.getInstance();