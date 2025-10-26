import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema, validateData } from '../schemas/validation';
import { ApiResponse } from '../types';
import { authenticateToken } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function to create API response
const createResponse = <T>(success: boolean, data?: T, error?: any): ApiResponse<T> => {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId: uuidv4()
  };
};

// POST /api/auth/register - Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData = validateData(RegisterSchema, req.body);
    
    const result = await AuthService.register(
      userData.username,
      userData.email,
      userData.password,
      userData.avatarUrl
    );
    
    res.status(201).json(createResponse(true, {
      user: result.user,
      tokens: result.tokens
    }));
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Validation error')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: error.message
        }));
      }
      
      if (error.message.includes('already exists')) {
        return res.status(409).json(createResponse(false, null, {
          code: 'USER_EXISTS',
          message: 'Username or email already exists'
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'REGISTRATION_ERROR',
      message: 'Failed to register user'
    }));
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData = validateData(LoginSchema, req.body);
    
    const result = await AuthService.login(loginData.email, loginData.password);
    
    res.json(createResponse(true, {
      user: result.user,
      tokens: result.tokens
    }));
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Validation error')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: error.message
        }));
      }
      
      if (error.message.includes('Invalid email or password')) {
        return res.status(401).json(createResponse(false, null, {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'LOGIN_ERROR',
      message: 'Failed to login'
    }));
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshData = validateData(RefreshTokenSchema, req.body);
    
    const result = await AuthService.refreshTokens(refreshData.refreshToken);
    
    res.json(createResponse(true, {
      user: result.user,
      tokens: result.tokens
    }));
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Validation error')) {
        return res.status(400).json(createResponse(false, null, {
          code: 'VALIDATION_ERROR',
          message: error.message
        }));
      }
      
      if (error.message.includes('Invalid refresh token') || error.message.includes('User not found')) {
        return res.status(401).json(createResponse(false, null, {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }));
      }
    }
    
    res.status(500).json(createResponse(false, null, {
      code: 'REFRESH_ERROR',
      message: 'Failed to refresh token'
    }));
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json(createResponse(false, null, {
        code: 'NO_USER',
        message: 'User not authenticated'
      }));
    }

    const user = await AuthService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json(createResponse(false, null, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }));
    }
    
    res.json(createResponse(true, user));
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json(createResponse(false, null, {
      code: 'PROFILE_ERROR',
      message: 'Failed to get user profile'
    }));
  }
});

// POST /api/auth/logout - Logout user (client-side token removal)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // by removing the tokens from storage. This endpoint exists for consistency
  // and could be extended to maintain a token blacklist if needed.
  
  res.json(createResponse(true, {
    message: 'Logged out successfully'
  }));
});

export default router;