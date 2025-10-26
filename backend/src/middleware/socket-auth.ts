import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { JWTPayload } from '../types';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  email?: string;
  isAuthenticated?: boolean;
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // Allow anonymous connections for now, but mark them as such
      socket.userId = `anonymous_${socket.id}`;
      socket.username = `Guest_${socket.id.substring(0, 6)}`;
      socket.isAuthenticated = false;
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('JWT_SECRET not set, allowing anonymous connection');
      socket.userId = `anonymous_${socket.id}`;
      socket.username = `Guest_${socket.id.substring(0, 6)}`;
      socket.isAuthenticated = false;
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.email = decoded.email;
    socket.isAuthenticated = true;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    // Still allow connection but as anonymous user
    socket.userId = `anonymous_${socket.id}`;
    socket.username = `Guest_${socket.id.substring(0, 6)}`;
    socket.isAuthenticated = false;
    next();
  }
};