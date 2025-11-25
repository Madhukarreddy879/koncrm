import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { TOKEN_KEY, REFRESH_TOKEN_KEY } from './ApiService';
import { authEvents } from '../utils/authEvents';

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  /**
   * Authenticate user with username and password
   * @param username - User's username
   * @param password - User's password
   * @returns Promise with login response containing tokens and user data
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      console.log('[AuthService] Attempting login for:', username);
      
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username,
        password,
      });

      console.log('[AuthService] Login response received:', response.status);
      console.log('[AuthService] Response data structure:', JSON.stringify(response.data));

      const { access_token, refresh_token } = response.data.data;

      console.log('[AuthService] Tokens extracted, storing...');
      
      // Store tokens securely
      await this.setToken(access_token, refresh_token);

      console.log('[AuthService] Login successful! Tokens stored.');

      // Emit auth event to trigger navigation update
      authEvents.emit();
      console.log('[AuthService] Auth event emitted');

      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Login failed:', error);
      console.error('[AuthService] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Logout user by revoking token and clearing local storage
   */
  async logout(): Promise<void> {
    try {
      const token = await this.getToken();

      if (token) {
        // Call logout endpoint to revoke token on server
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.error('[AuthService] Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Clear all stored tokens
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
      
      // Emit auth event to trigger navigation update
      authEvents.emit();
      console.log('[AuthService] Logout complete, auth event emitted');
    }
  }

  /**
   * Get stored JWT access token
   * @returns Promise with token string or null if not found
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   * @returns Promise with refresh token string or null if not found
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Store JWT tokens securely in AsyncStorage
   * @param token - JWT access token
   * @param refreshToken - JWT refresh token
   */
  async setToken(token: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (error) {
      console.error('[AuthService] Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns Promise with new tokens
   */
  async refreshToken(): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const refreshToken = await this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<{ data: { access_token: string; refresh_token: string } }>(
        '/auth/refresh',
        {
          refresh_token: refreshToken,
        }
      );

      const { access_token, refresh_token } = response.data.data;

      // Store new tokens
      await this.setToken(access_token, refresh_token);

      return response.data.data;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      // Clear tokens on refresh failure
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
      throw error;
    }
  }

  /**
   * Check if user is authenticated by verifying token exists
   * @returns Promise with boolean indicating authentication status
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}

export default new AuthService();
