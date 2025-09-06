/**
 * Global Authentication Manager - Singleton pattern for shared authentication
 * This ensures we login once and reuse the token across all test suites
 * Reduces login calls from 20+ to 1, improving performance and avoiding rate limits
 * 
 * NOTE: Authentication/login feature tests should NOT use this manager
 * They need to test the actual login functionality with fresh clients
 */

import { TypedApiClient } from '../clients/typed-api-client';
import { TestDataFactory } from '../fixtures/test-data-factory';

interface AuthTokenInfo {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

export class GlobalAuthManager {
  private static instance: GlobalAuthManager;
  private authInfo: AuthTokenInfo | null = null;
  private authPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): GlobalAuthManager {
    if (!GlobalAuthManager.instance) {
      GlobalAuthManager.instance = new GlobalAuthManager();
    }
    return GlobalAuthManager.instance;
  }

  /**
   * Get authenticated client - ensures authentication before returning
   */
  async getAuthenticatedClient(): Promise<TypedApiClient> {
    await this.ensureAuthenticated();
    
    const client = new TypedApiClient();
    if (this.authInfo) {
      client.setAuthToken(this.authInfo.token);
    }
    
    return client;
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureAuthenticated(): Promise<void> {
    // If we have a valid token, return it
    if (this.authInfo && this.authInfo.expiresAt > new Date()) {
      return;
    }

    // If authentication is already in progress, wait for it
    if (this.authPromise) {
      return this.authPromise;
    }

    // Start new authentication process
    this.authPromise = this.performAuthentication();
    return this.authPromise;
  }

  /**
   * Perform the actual authentication
   */
  private async performAuthentication(): Promise<void> {
    try {
      const sessionId = `global-auth-${Date.now()}`;
      console.log(`🔑 [${sessionId}] Starting global authentication...`);
      
      const client = new TypedApiClient();
      const credentials = TestDataFactory.credentials();
      
      console.log(`🔐 [${sessionId}] Logging in as: ${credentials.email}`);
      const loginResponse = await client.login(credentials.email, credentials.password);
      
      // Extract token and set expiration (default to 10 minutes if not specified)
      const token = client.getAuthToken();
      if (!token) {
        console.error('🔍 Login response:', loginResponse);
        console.error('🔍 Client auth token:', client.getAuthToken());
        throw new Error('Login succeeded but no token was returned');
      }
      
      // Set expiration to 8 minutes (leaving 2-minute buffer for refresh)
      const expiresAt = new Date(Date.now() + 8 * 60 * 1000);
      
      // Extract refresh token from the new response format
      const responseData = (loginResponse as any)?.data;
      const refreshToken = responseData?.tokenInfo?.refreshToken;
      
      this.authInfo = {
        token,
        expiresAt,
        refreshToken: refreshToken
      };
      
      console.log(`✅ [${sessionId}] Global authentication successful`);
      console.log(`🕐 [${sessionId}] Token expires at: ${expiresAt.toISOString()}`);
      console.log(`🎫 [${sessionId}] Token preview: ${token.substring(0, 20)}...`);
      
    } catch (error) {
      console.error(`❌ Global authentication failed:`, error.message);
      this.authInfo = null;
      throw error;
    } finally {
      this.authPromise = null;
    }
  }

  /**
   * Clear authentication (for cleanup)
   */
  async clearAuthentication(): Promise<void> {
    if (this.authInfo?.token) {
      try {
        const client = new TypedApiClient();
        client.setAuthToken(this.authInfo.token);
        await client.logout();
      } catch (error) {
        console.warn('⚠️ Global logout failed:', error.message);
      }
    }
    
    this.authInfo = null;
    this.authPromise = null;
    console.log('🧹 Global authentication cleared');
  }

  /**
   * Get current token info (for debugging)
   */
  getTokenInfo(): AuthTokenInfo | null {
    return this.authInfo;
  }
}