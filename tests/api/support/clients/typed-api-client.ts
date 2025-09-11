/**
 * Typed API client using the published npm packages
 * This provides full type safety using the auto-generated types from the services
 */

import { makeClient as makeIdentityClient } from '@btshift/identity-types';
import { makeClient as makeTenantClient } from '@btshift/tenant-management-types';
import { makeClient as makeClientManagementClient } from '@btshift/client-management-types';
import type { paths as IdentityPaths } from '@btshift/identity-types';
import type { paths as TenantPaths } from '@btshift/tenant-management-types';
import type { paths as ClientPaths } from '@btshift/client-management-types';
import { randomUUID } from 'crypto';
import { TestContextManager } from '../../../../lib/helpers/test-context-manager';

// Enhanced response type that includes correlation ID metadata
export interface ApiResponse<T = any> {
  data: T;
  correlationId: string;
  requestCorrelationId: string;
}

export class TypedApiClient {
  private authToken: string | null = null;
  private baseUrl: string;
  private lastCorrelationId: string | null = null;
  
  public identity: ReturnType<typeof makeIdentityClient>['api'];
  public tenant: ReturnType<typeof makeTenantClient>['api'];
  public clientManagement: ReturnType<typeof makeClientManagementClient>['api'];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_GATEWAY_URL || 'http://localhost:8080';
    
    // Initialize identity client with correlation tracking
    const identityClient = makeIdentityClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        // Return just the token, the client library adds 'Bearer' prefix
        return this.authToken || undefined;
      },
      headers: () => {
        // Don't generate correlation ID here, let the wrapper handle it
        return {};
      }
    });
    
    // Wrap the API to add correlation logging
    this.identity = this.wrapApiWithCorrelation(identityClient.api, 'Identity');

    // Initialize tenant management client
    const tenantClient = makeTenantClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        // Return just the token, the client library adds 'Bearer' prefix
        return this.authToken || undefined;
      },
      headers: () => {
        // Don't generate correlation ID here, let the wrapper handle it
        return {};
      }
    });
    this.tenant = this.wrapApiWithCorrelation(tenantClient.api, 'Tenant');

    // Initialize client management client
    const clientClient = makeClientManagementClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        // Return just the token, the client library adds 'Bearer' prefix
        return this.authToken || undefined;
      },
      headers: () => {
        // Don't generate correlation ID here, let the wrapper handle it
        return {};
      }
    });
    this.clientManagement = this.wrapApiWithCorrelation(clientClient.api, 'ClientManagement');
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getLastCorrelationId(): string | null {
    return this.lastCorrelationId;
  }

  // Wrap API calls with correlation ID logging and capture
  private wrapApiWithCorrelation(api: any, serviceName: string): any {
    
    // Since the API is a function, we need to wrap the function call directly
    return async (...args: any[]): Promise<ApiResponse> => {
      const [path, method, options = {}] = args;
      
      // Generate correlation ID for this request
      const correlationId = randomUUID();
      this.lastCorrelationId = correlationId;
      
      // Get test context from TestContextManager
      const testContext = TestContextManager.getInstance().getContextHeader();
      
      // Add correlation ID and test context to headers
      const enhancedOptions = {
        ...options,
        headers: {
          'X-Correlation-ID': correlationId,
          ...(testContext && { 'X-Test-Context': testContext }),
          ...options.headers
        }
      };
      
      // Log test context if available
      if (testContext) {
        console.log(`🧪 Adding test context to ${method?.toUpperCase()} ${path}`);
        console.log(`🧪 Test context JSON:`, testContext);
      }
      
      // Debug: Check if Authorization header is present
      const hasAuth = options.headers?.Authorization || this.authToken;
      console.log(`🔍 [${serviceName}] ${method?.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Auth: ${hasAuth ? 'Yes' : 'No'}`);
      
      try {
        const result = await api(path, method, enhancedOptions);
        
        console.log(`✅ [${serviceName}] ${method?.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Success`);
        
        // Create enhanced response with correlation ID metadata
        const enhancedResponse = {
          data: result,
          correlationId: correlationId,
          requestCorrelationId: correlationId
        };
        
        return enhancedResponse;
      } catch (error) {
        console.error(`❌ [${serviceName}] ${method?.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Error:`, error.message);
        
        // Re-throw error but preserve correlation ID context
        const enhancedError = error as any;
        enhancedError.correlationId = correlationId;
        enhancedError.requestCorrelationId = correlationId;
        throw enhancedError;
      }
    };
  }

  // Helper method to login and set token automatically
  async login(email: string, password: string, tenantId?: string, portalType?: string): Promise<ApiResponse> {
    // Build login body with optional tenant context
    const loginBody: any = { email, password };
    
    // Add tenant context if provided
    if (tenantId) {
      loginBody.tenantId = tenantId;
    }
    if (portalType) {
      loginBody.portalType = portalType;
    }
    
    const response = await this.identity('/api/authentication/login', 'post', {
      body: loginBody
    });
    
    // Check both the wrapped response data and direct response for token info
    // This handles both the correlation-wrapped response and direct API response
    const responseData = response.data || response;
    if (responseData?.tokenInfo?.accessToken) {
      this.setAuthToken(responseData.tokenInfo.accessToken);
    } else if (responseData?.accessToken) {
      this.setAuthToken(responseData.accessToken);
    } else if (responseData?.token) {
      this.setAuthToken(responseData.token);
    }
    
    return response;
  }

  // Helper method to logout
  async logout(): Promise<void> {
    if (this.authToken) {
      try {
        await this.identity('/api/authentication/logout', 'post', {
          body: {}
        });
      } catch (error) {
        // Ignore logout errors - token will be cleared anyway
        console.warn('Logout failed:', error);
      } finally {
        this.clearAuthToken();
      }
    }
  }
}

// Export types for use in tests
export type { IdentityPaths, TenantPaths, ClientPaths };