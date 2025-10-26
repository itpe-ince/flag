import { User, UserStats, ApiResponse } from '../types';
import authService from './auth-service';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3501/api';

class UserService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if we have an access token
    const accessToken = authService.getAccessToken();
    if (accessToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // If we get a 401, try to refresh token
      if (response.status === 401 && authService.getRefreshToken()) {
        const refreshResult = await authService.refreshAccessToken();
        if (refreshResult.success) {
          // Retry the original request with new token
          const newAccessToken = authService.getAccessToken();
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${newAccessToken}`,
          };
          const retryResponse = await fetch(url, config);
          return await retryResponse.json();
        }
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw new Error('Network error occurred');
    }
  }

  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(`/users/${userId}`);
  }

  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    return this.makeRequest<UserStats>(`/users/${userId}/stats`);
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
}

// Export a singleton instance
export const userService = new UserService();
export default userService;