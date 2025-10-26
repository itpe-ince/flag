import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { AuthTokens, AuthUser, JWTPayload, UserRow } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(payload: JWTPayload): AuthTokens {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'flag-guessing-game',
      audience: 'flag-guessing-game-users'
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      jwtSecret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'flag-guessing-game',
        audience: 'flag-guessing-game-users'
      }
    );

    return { accessToken, refreshToken };
  }

  static async verifyRefreshToken(refreshToken: string): Promise<{ userId: string } | null> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
      }

      const decoded = jwt.verify(refreshToken, jwtSecret) as any;
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }

  static async register(username: string, email: string, password: string, avatarUrl?: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const existingUser = await pool.query(existingUserQuery, [username, email]);
    
    if (existingUser.rows.length > 0) {
      throw new Error('Username or email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const userId = uuidv4();
    const insertQuery = `
      INSERT INTO users (id, username, email, password_hash, avatar_url, created_at, total_games, total_correct, best_streak, highest_level, total_score)
      VALUES ($1, $2, $3, $4, $5, NOW(), 0, 0, 0, 0, 0)
      RETURNING id, username, email, avatar_url, created_at
    `;
    
    const result = await pool.query(insertQuery, [
      userId,
      username,
      email,
      passwordHash,
      avatarUrl || null
    ]);

    const userRow = result.rows[0];
    const user: AuthUser = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      avatarUrl: userRow.avatar_url
    };

    // Generate tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };
    const tokens = this.generateTokens(jwtPayload);

    return { user, tokens };
  }

  static async login(email: string, password: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Find user by email
    const query = 'SELECT id, username, email, password_hash, avatar_url FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userRow = result.rows[0];
    
    // Verify password
    const isValidPassword = await this.comparePassword(password, userRow.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const user: AuthUser = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      avatarUrl: userRow.avatar_url
    };

    // Generate tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };
    const tokens = this.generateTokens(jwtPayload);

    return { user, tokens };
  }

  static async refreshTokens(refreshToken: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    // Get user details
    const query = 'SELECT id, username, email, avatar_url FROM users WHERE id = $1';
    const result = await pool.query(query, [decoded.userId]);
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const userRow = result.rows[0];
    const user: AuthUser = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      avatarUrl: userRow.avatar_url
    };

    // Generate new tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };
    const tokens = this.generateTokens(jwtPayload);

    return { user, tokens };
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const query = 'SELECT id, username, email, avatar_url FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0];
    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      avatarUrl: userRow.avatar_url
    };
  }
}