import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { connectRedis, testRedisConnection } from './config/redis';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/socket-auth';
import { SocketManager } from './services/socket-manager';

// Import route handlers
import usersRouter from './routes/users';
import gamesRouter from './routes/games';
import leaderboardsRouter from './routes/leaderboards';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3500",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3501;

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Import services for cleanup
import { roomService } from './services/room-service';
import { multiplayerGameService } from './services/multiplayer-game-service';

// Set up cleanup intervals
setInterval(async () => {
  try {
    await roomService.cleanupInactiveRooms();
    multiplayerGameService.cleanupInactiveGames();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/leaderboards', leaderboardsRouter);

// Basic health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Flag Guessing Game API is running',
    connectedUsers: socketManager.getConnectedUsersCount(),
    timestamp: new Date().toISOString()
  });
});

// Socket.io middleware and connection handling
io.use(socketAuthMiddleware);

io.on('connection', (socket: AuthenticatedSocket) => {
  socketManager.handleConnection(socket);
});

// Initialize connections and start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Connect to Redis
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('Failed to connect to Redis. Some features may not work properly.');
    } else {
      await testRedisConnection();
    }

    // Start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3500"}`);
      console.log('Database: Connected');
      console.log(`Redis: ${redisConnected ? 'Connected' : 'Disconnected'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();