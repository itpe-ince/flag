import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    lazyConnect: true,
  },
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redisClient: RedisClientType = createClient(redisConfig);

// Error handling
redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis client disconnected');
});

// Connect to Redis
export const connectRedis = async (): Promise<boolean> => {
  try {
    await redisClient.connect();
    console.log('Redis connection successful');
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
};

// Test Redis connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    console.log('Redis ping successful');
    return true;
  } catch (error) {
    console.error('Redis ping failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeRedis);
process.on('SIGTERM', closeRedis);