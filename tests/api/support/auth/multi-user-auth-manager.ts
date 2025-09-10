/**
 * Multi-User Authentication Manager
 * Manages authentication for different user contexts (SuperAdmin, TenantAdmin)
 * to properly test multi-tenant isolation and permissions
 */

import { TypedApiClient } from '../clients/typed-api-client';

export type UserContext = 'SuperAdmin' | 'TenantAdmin';

interface AuthTokenInfo {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  userEmail: string;
  context: UserContext;
}

interface UserCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export class MultiUserAuthManager {
  private static instance: MultiUserAuthManager;
  private authTokens: Map<UserContext, AuthTokenInfo> = new Map();
  private authPromises: Map<UserContext, Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): MultiUserAuthManager {
    if (!MultiUserAuthManager.instance) {
      MultiUserAuthManager.instance = new MultiUserAuthManager();
    }
    return MultiUserAuthManager.instance;
  }

  /**
   * Get authenticated client for specific user context
   */
  async getAuthenticatedClient(context: UserContext): Promise<TypedApiClient> {
    await this.ensureAuthenticated(context);
    
    const client = new TypedApiClient();
    const authInfo = this.authTokens.get(context);
    
    if (authInfo) {
      client.setAuthToken(authInfo.token);
      console.log(`🔐 Using ${context} authentication (${authInfo.userEmail})`);
    }
    
    return client;
  }

  /**
   * Ensure we have valid authentication for the context
   */
  private async ensureAuthenticated(context: UserContext): Promise<void> {
    const authInfo = this.authTokens.get(context);
    
    // If we have a valid token, return
    if (authInfo && authInfo.expiresAt > new Date()) {
      return;
    }

    // If authentication is already in progress, wait for it
    const authPromise = this.authPromises.get(context);
    if (authPromise) {
      return authPromise;
    }

    // Start new authentication process
    const newAuthPromise = this.performAuthentication(context);
    this.authPromises.set(context, newAuthPromise);
    
    try {
      await newAuthPromise;
    } finally {
      this.authPromises.delete(context);
    }
  }

  /**
   * Perform authentication for specific context
   */
  private async performAuthentication(context: UserContext): Promise<void> {
    try {
      const sessionId = `${context.toLowerCase()}-${Date.now()}`;
      console.log(`🔑 [${sessionId}] Starting ${context} authentication...`);
      
      const credentials = this.getCredentialsForContext(context);
      const client = new TypedApiClient();
      
      console.log(`🔐 [${sessionId}] Logging in as: ${credentials.email}`);
      const loginResponse = await client.login(credentials.email, credentials.password);
      
      const token = client.getAuthToken();
      if (!token) {
        throw new Error(`Login succeeded but no token was returned for ${context}`);
      }
      
      // Set expiration to 8 minutes (leaving 2-minute buffer)
      const expiresAt = new Date(Date.now() + 8 * 60 * 1000);
      
      const authInfo: AuthTokenInfo = {
        token,
        expiresAt,
        userEmail: credentials.email,
        context,
        refreshToken: (loginResponse as any)?.data?.tokenInfo?.refreshToken
      };
      
      this.authTokens.set(context, authInfo);
      
      console.log(`✅ [${sessionId}] ${context} authentication successful`);
      console.log(`🕐 [${sessionId}] Token expires at: ${expiresAt.toISOString()}`);
      
      // Log tenant context if applicable
      if (context === 'TenantAdmin' && credentials.tenantId) {
        console.log(`🏢 [${sessionId}] Tenant ID: ${credentials.tenantId}`);
      }
      
    } catch (error) {
      console.error(`❌ ${context} authentication failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get credentials based on context
   */
  private getCredentialsForContext(context: UserContext): UserCredentials {
    switch (context) {
      case 'SuperAdmin':
        return {
          email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@shift.ma',
          password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!'
        };
      
      case 'TenantAdmin':
        return {
          email: process.env.TENANT_ADMIN_EMAIL || 'anass.yatim+nstech2@gmail.com',
          password: process.env.TENANT_ADMIN_PASSWORD || 'TenantAdmin@123!',
          tenantId: process.env.TENANT_ID || 'aef1fb0d-84fb-412d-97c8-06f7eb7f3846'
        };
      
      default:
        throw new Error(`Unknown user context: ${context}`);
    }
  }

  /**
   * Clear authentication for specific context or all contexts
   */
  async clearAuthentication(context?: UserContext): Promise<void> {
    if (context) {
      const authInfo = this.authTokens.get(context);
      if (authInfo?.token) {
        try {
          const client = new TypedApiClient();
          client.setAuthToken(authInfo.token);
          await client.logout();
          console.log(`🧹 ${context} authentication cleared`);
        } catch (error) {
          console.warn(`⚠️ ${context} logout failed:`, error.message);
        }
      }
      this.authTokens.delete(context);
      this.authPromises.delete(context);
    } else {
      // Clear all contexts
      for (const ctx of ['SuperAdmin', 'TenantAdmin'] as UserContext[]) {
        await this.clearAuthentication(ctx);
      }
    }
  }

  /**
   * Get current token info for debugging
   */
  getTokenInfo(context: UserContext): AuthTokenInfo | null {
    return this.authTokens.get(context) || null;
  }

  /**
   * Get tenant ID for current tenant admin
   */
  getTenantId(): string {
    return process.env.TENANT_ID || 'aef1fb0d-84fb-412d-97c8-06f7eb7f3846';
  }
}