/**
 * Multi-User Authentication Manager
 * Manages authentication for different user contexts (SuperAdmin, TenantAdmin)
 * to properly test multi-tenant isolation and permissions
 */

import { TypedApiClient } from '../clients/typed-api-client';
import { TestContextManager } from '../../../../lib/helpers/test-context-manager';
import * as crypto from 'crypto';

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
    // Initialize test context for BDD correlation
    const testContextManager = TestContextManager.getInstance();
    const testSessionId = `test-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    
    // Use a descriptive feature name based on the test context
    const featureFile = `api-${context.toLowerCase()}-multiauth.feature`;
    const scenarioName = `API Test with ${context} (MultiUserAuth)`;
    const testIntent = 'positive'; // Most API tests are positive unless specified otherwise
    
    testContextManager.startTestSession(featureFile);
    testContextManager.setScenario(featureFile, scenarioName, testIntent as 'positive' | 'negative');
    testContextManager.setCurrentStep('Test Execution', '2xx_success');
    
    console.log(`🎬 Starting test session: ${testSessionId} for feature: ${featureFile}`);
    console.log(`📋 Test context set: ${featureFile} :: ${scenarioName} (${testIntent})`);
    
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
      
      // Tenant context is now extracted from JWT automatically - no tenant_id needed
      let loginResponse: any;
      if (context === 'TenantAdmin') {
        console.log(`🏢 [${sessionId}] Tenant context will be extracted from email domain automatically`);
        loginResponse = await client.login(
          credentials.email, 
          credentials.password,
          'Tenant'  // Specify Tenant portal for tenant users
        );
      } else {
        // SuperAdmin doesn't need tenant context
        loginResponse = await client.login(credentials.email, credentials.password);
      }
      
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
      if (context === 'TenantAdmin') {
        console.log(`🏢 [${sessionId}] Tenant context derived from JWT token automatically`);
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
          email: process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@shift.ma',
          password: process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123!'
        };
      
      case 'TenantAdmin':
        return {
          email: process.env['TENANT_ADMIN_EMAIL'] || 'test.tenantadmin@btshift.ma',
          password: process.env['TENANT_ADMIN_PASSWORD'] || 'SuperAdmin@123!'
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
   * Get tenant context info for logging (actual tenant ID is extracted from JWT by backend)
   * This method is kept for backward compatibility with existing test code
   */
  getTenantId(): string {
    // Note: Tenant ID is no longer sent in requests - it's extracted from JWT
    // This returns a placeholder for logging purposes only
    const tenantAuth = this.authTokens.get('TenantAdmin');
    if (tenantAuth) {
      return `tenant-from-jwt-${tenantAuth.userEmail.split('@')[0]}`;
    }
    return 'tenant-from-jwt-default';
  }
}