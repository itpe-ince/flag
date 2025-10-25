import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: ExtendedError) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // Allow anonymous connections for now, but mark them as such
      socket.userId = `anonymous_${socket.id}`;
      socket.username = `Guest_${socket.id.substring(0, 6)}`;
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; username: string };
    
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    // Still allow connection but as anonymous user
    socket.userId = `anonymous_${socket.id}`;
    socket.username = `Guest_${socket.id.substring(0, 6)}`;
    next();
  }
};