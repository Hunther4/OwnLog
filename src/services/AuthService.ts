import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { getConfig } from '../utils/config';

// Constants for SecureStore keys
const TOKENS_KEY = 'google_auth_tokens';

export class AuthService {
  /**
   * Initiates the Google Login flow.
   * @param promptAsync The prompt function provided by useAuthRequest hook.
   * Returns the access token on success.
   */
  static async login(
    promptAsync: () => Promise<AuthSession.AuthSessionResult>
  ): Promise<string | null> {
    try {
      const result = await promptAsync();

      if (result?.type === 'success') {
        const { accessToken, refreshToken, expiresIn } = result.params;

        await this.saveTokens({
          accessToken,
          refreshToken: refreshToken || null,
          expiresAt: Date.now() + (expiresIn ? parseInt(expiresIn) * 1000 : 3600 * 1000),
        });

        return accessToken;
      }

      return null;
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      throw error;
    }
  }

  /**
   * Clears the session from SecureStore.
   */
  static async logout(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKENS_KEY);
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  /**
   * Retrieves a valid access token.
   * If the token is expired, it attempts to refresh it using the refreshToken.
   */
  static async getToken(): Promise<string | null> {
    try {
      const tokensJson = await SecureStore.getItemAsync(TOKENS_KEY);
      if (!tokensJson) return null;

      const tokens = JSON.parse(tokensJson);

      // Check if token is still valid (with a 5-minute grace period)
      if (Date.now() < tokens.expiresAt - 300000) {
        return tokens.accessToken;
      }

      // Token expired: Try to refresh
      if (tokens.refreshToken) {
        console.log('[AuthService] Token expired, attempting silent refresh...');
        const refreshedToken = await this.refreshAccessToken(tokens.refreshToken);
        if (refreshedToken) return refreshedToken;
      }

      // If refresh failed or no refresh token, clear session
      await this.logout();
      return null;
    } catch (error) {
      console.error('[AuthService] getToken failed:', error);
      return null;
    }
  }

  /**
   * Checks if a valid session currently exists.
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Performs the OAuth2 refresh token flow.
   */
  private static async refreshAccessToken(refreshToken: string): Promise<string | null> {
    const clientId = getConfig('EXPO_PUBLIC_GOOGLE_CLIENT_ID', true);
    if (!clientId) return null;

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: '', // Google Drive appData usually doesn't require secret for mobile clients
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const data = await response.json();

      if (data.access_token) {
        const newTokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || (await this.getStoredRefreshToken()),
          expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000),
        };
        await this.saveTokens(newTokens);
        return data.access_token;
      }
    } catch (error) {
      console.error('[AuthService] refreshAccessToken failed:', error);
    }
    return null;
  }

  private static async getStoredRefreshToken(): Promise<string | null> {
    const tokensJson = await SecureStore.getItemAsync(TOKENS_KEY);
    return tokensJson ? JSON.parse(tokensJson).refreshToken : null;
  }

  private static async saveTokens(tokens: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number;
  }): Promise<void> {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  }
}
