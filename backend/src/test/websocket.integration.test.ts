import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { socketAuthMiddleware } from '../middleware/socket-auth';
import { SocketManager } from '../services/socket-manager';
import { roomService } from '../services/room-service';

describe('WebSocket Integration Tests', () => {
  let httpServer: Server;
  let io: SocketIOServer;
  let socketManager: SocketManager;
  let clientSockets: ClientSocket[] = [];
  let serverUrl: string;

  beforeAll(async () => {
    // Create Express app and HTTP server
    const app = express();
    httpServer = new Server(app);
    
    // Create Socket.IO server
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Set up authentication middleware
    io.use(socketAuthMiddleware);

    // Create socket manager
    socketManager = new SocketManager(io);

    // Handle connections
    io.on('connection', (socket) => {
      socketManager.handleConnection(socket as any);
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        const port = typeof address === 'object' && address ? address.port : 3001;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Close all client connections
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });

    // Close server
    io.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Clear any existing rooms before each test
    roomService.getAllRooms().then(rooms => {
      rooms.forEach(room => roomService.deleteRoom(room.id));
    });
  });

  afterEach(() => {
    // Disconnect all client sockets after each test
    clientSockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    clientSockets = [];
  });

  const createClientSocket = (username?: string): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const socket = Client(serverUrl, {
        auth: {
          // No token for anonymous connection
        }
      });

      socket.on('connect', () => {
        clientSockets.push(socket);
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        reject(error);
      });

      // Set timeout for connection
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  };

  describe('Connection Management', () => {
    it('should handle client connection and emit connected event', async () => {
      const socket = await createClientSocket();
      
      expect(socket.connected).toBe(true);
      
      // Wait for connected event
      await new Promise<void>((resolve) => {
        socket.on('connected', (data) => {
          expect(data).toHaveProperty('userId');
          expect(data).toHaveProperty('username');
          expect(data).toHaveProperty('socketId');
          expect(data.username).toMatch(/^Guest_/);
          resolve();
        });
      });
    });

    it('should handle multiple client connections', async () => {
      const socket1 = await createClientSocket();
      const socket2 = await createClientSocket();
      
      expect(socket1.connected).toBe(true);
      expect(socket2.connected).toBe(true);
      expect(socket1.id).not.toBe(socket2.id);
    });

    it('should handle client disconnection', async () => {
      const socket = await createClientSocket();
      expect(socket.connected).toBe(true);
      
      socket.disconnect();
      
      // Wait for disconnection
      await new Promise<void>((resolve) => {
        socket.on('disconnect', () => {
          expect(socket.connected).toBe(false);
          resolve();
        });
      });
    });
  });

  describe('Room Management', () => {
    it('should create a room successfully', async () => {
      const socket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 10,
        timePerQuestion: 30
      };

      await new Promise<void>((resolve, reject) => {
        socket.emit('create_room', { settings: roomSettings }, (response: any) => {
          try {
            expect(response.success).toBe(true);
            expect(response.room).toHaveProperty('id');
            expect(response.room).toHaveProperty('hostUserId');
            expect(response.room.maxPlayers).toBe(4);
            expect(response.room.currentPlayers).toHaveLength(1);
            expect(response.room.state).toBe('lobby');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should allow multiple players to join a room', async () => {
      const hostSocket = await createClientSocket();
      const playerSocket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 10,
        timePerQuestion: 30
      };

      // Host creates room
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Player joins room
      await new Promise<void>((resolve, reject) => {
        playerSocket.emit('join_room', { roomId: room.id }, (response: any) => {
          try {
            expect(response.success).toBe(true);
            expect(response.room.currentPlayers).toHaveLength(2);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Host should receive player_joined event
      await new Promise<void>((resolve) => {
        hostSocket.on('player_joined', (data) => {
          expect(data.player).toHaveProperty('userId');
          expect(data.room.currentPlayers).toHaveLength(2);
          resolve();
        });
      });
    });

    it('should handle player leaving room', async () => {
      const hostSocket = await createClientSocket();
      const playerSocket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 10,
        timePerQuestion: 30
      };

      // Create room and join
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        playerSocket.emit('join_room', { roomId: room.id }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Player leaves room
      await new Promise<void>((resolve, reject) => {
        playerSocket.emit('leave_room', { roomId: room.id }, (response: any) => {
          try {
            expect(response.success).toBe(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Host should receive player_left event
      await new Promise<void>((resolve) => {
        hostSocket.on('player_left', (data) => {
          expect(data.room.currentPlayers).toHaveLength(1);
          resolve();
        });
      });
    });

    it('should handle ready status changes', async () => {
      const hostSocket = await createClientSocket();
      const playerSocket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 10,
        timePerQuestion: 30
      };

      // Create room and join
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      await new Promise<void>((resolve, reject) => {
        playerSocket.emit('join_room', { roomId: room.id }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Set player ready
      playerSocket.emit('ready_status', { roomId: room.id, isReady: true });

      // Host should receive ready status change
      await new Promise<void>((resolve) => {
        hostSocket.on('player_ready_changed', (data) => {
          expect(data.isReady).toBe(true);
          expect(data.room).toHaveProperty('currentPlayers');
          resolve();
        });
      });
    });
  });

  describe('Real-time Synchronization', () => {
    it('should synchronize room state across multiple clients', async () => {
      const hostSocket = await createClientSocket();
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 5,
        timePerQuestion: 30
      };

      // Host creates room
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Players join room
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          player1Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        }),
        new Promise<void>((resolve, reject) => {
          player2Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        })
      ]);

      // Track events received by each client
      const hostEvents: any[] = [];
      const player1Events: any[] = [];
      const player2Events: any[] = [];

      hostSocket.on('player_joined', (data) => hostEvents.push(data));
      player1Socket.on('player_joined', (data) => player1Events.push(data));
      player2Socket.on('player_joined', (data) => player2Events.push(data));

      // Wait for synchronization
      await new Promise(resolve => setTimeout(resolve, 100));

      // All clients should have received the same events
      expect(hostEvents.length).toBeGreaterThan(0);
      expect(player1Events.length).toBeGreaterThan(0);
      expect(player2Events.length).toBeGreaterThan(0);
    });

    it('should handle concurrent ready status changes', async () => {
      const hostSocket = await createClientSocket();
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 5,
        timePerQuestion: 30
      };

      // Create room and join players
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          player1Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        }),
        new Promise<void>((resolve, reject) => {
          player2Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        })
      ]);

      // Set up event listeners
      const readyEvents: any[] = [];
      [hostSocket, player1Socket, player2Socket].forEach(socket => {
        socket.on('player_ready_changed', (data) => {
          readyEvents.push(data);
        });
      });

      // Simultaneously set ready status
      hostSocket.emit('ready_status', { roomId: room.id, isReady: true });
      player1Socket.emit('ready_status', { roomId: room.id, isReady: true });
      player2Socket.emit('ready_status', { roomId: room.id, isReady: true });

      // Wait for all events to be processed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have received multiple ready events
      expect(readyEvents.length).toBeGreaterThan(0);
      
      // All events should contain valid room data
      readyEvents.forEach(event => {
        expect(event).toHaveProperty('isReady');
        expect(event).toHaveProperty('room');
        expect(event.room).toHaveProperty('currentPlayers');
      });
    });

    it('should maintain room state consistency during player disconnections', async () => {
      const hostSocket = await createClientSocket();
      const player1Socket = await createClientSocket();
      const player2Socket = await createClientSocket();
      
      const roomSettings = {
        maxPlayers: 4,
        roundCount: 5,
        timePerQuestion: 30
      };

      // Create room and join players
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          player1Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        }),
        new Promise<void>((resolve, reject) => {
          player2Socket.emit('join_room', { roomId: room.id }, (response: any) => {
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.error));
            }
          });
        })
      ]);

      // Set up disconnect event listener
      const disconnectEvents: any[] = [];
      [hostSocket, player2Socket].forEach(socket => {
        socket.on('player_disconnected', (data) => {
          disconnectEvents.push(data);
        });
      });

      // Disconnect player1
      player1Socket.disconnect();

      // Wait for disconnect event processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Remaining players should be notified of disconnection
      expect(disconnectEvents.length).toBeGreaterThan(0);
      
      // Get current room state
      await new Promise<void>((resolve, reject) => {
        hostSocket.emit('get_room_state', { roomId: room.id }, (response: any) => {
          try {
            expect(response.success).toBe(true);
            expect(response.room).toHaveProperty('currentPlayers');
            // Room should still exist with remaining players
            expect(response.room.currentPlayers.length).toBeGreaterThan(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid room creation data', async () => {
      const socket = await createClientSocket();
      
      await new Promise<void>((resolve, reject) => {
        socket.emit('create_room', { settings: {} }, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle joining non-existent room', async () => {
      const socket = await createClientSocket();
      
      await new Promise<void>((resolve, reject) => {
        socket.emit('join_room', { roomId: 'non-existent-room' }, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle missing required parameters', async () => {
      const socket = await createClientSocket();
      
      // Test missing roomId for join_room
      await new Promise<void>((resolve, reject) => {
        socket.emit('join_room', {}, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.error).toContain('Room ID is required');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      // Test missing roomId for leave_room
      await new Promise<void>((resolve, reject) => {
        socket.emit('leave_room', {}, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.error).toContain('Room ID is required');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle room capacity limits', async () => {
      const roomSettings = {
        maxPlayers: 2,
        roundCount: 5,
        timePerQuestion: 30
      };

      // Create room with max 2 players
      const hostSocket = await createClientSocket();
      const room = await new Promise<any>((resolve, reject) => {
        hostSocket.emit('create_room', { settings: roomSettings }, (response: any) => {
          if (response.success) {
            resolve(response.room);
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // First player joins successfully
      const player1Socket = await createClientSocket();
      await new Promise<void>((resolve, reject) => {
        player1Socket.emit('join_room', { roomId: room.id }, (response: any) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      });

      // Second player should be rejected (room full)
      const player2Socket = await createClientSocket();
      await new Promise<void>((resolve, reject) => {
        player2Socket.emit('join_room', { roomId: room.id }, (response: any) => {
          try {
            expect(response.success).toBe(false);
            expect(response.error).toContain('Room is full');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});