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
        console.log(`🔐 [Identity] Getting auth token: ${this.authToken ? 'Bearer ' + this.authToken.substring(0, 20) + '...' : 'null'}`);
        return this.authToken ? `Bearer ${this.authToken}` : undefined;
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
        console.log(`🔐 [Tenant] Getting auth token: ${this.authToken ? 'Bearer ' + this.authToken.substring(0, 20) + '...' : 'null'}`);
        return this.authToken ? `Bearer ${this.authToken}` : undefined;
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
        const authHeader = this.authToken ? `Bearer ${this.authToken}` : undefined;
        console.log(`🔐 [ClientManagement] Getting auth token: ${authHeader ? authHeader.substring(0, 30) + '...' : 'NO TOKEN'}`);
        if (!authHeader && this.authToken === null) {
          console.warn('⚠️ [ClientManagement] Auth token is null - authentication may be required');
        }
        return authHeader;
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
      
      // Add correlation ID to headers
      const enhancedOptions = {
        ...options,
        headers: {
          'X-Correlation-ID': correlationId,
          ...options.headers
        }
      };
      
      console.log(`🔍 [${serviceName}] ${method?.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId}`);
      
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
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.identity('/api/authentication/login', 'post', {
      body: { email, password }
    });
    
    // Check both the wrapped response data and direct response for token info
    // This handles both the correlation-wrapped response and direct API response
    const responseData = response.data || response;
    
    // Debug logging
    console.log('🔐 Login response structure:', {
      hasData: !!response.data,
      hasTokenInfo: !!responseData?.tokenInfo,
      hasAccessToken: !!responseData?.accessToken,
      hasToken: !!responseData?.token,
      tokenInfoAccessToken: responseData?.tokenInfo?.accessToken ? 'present' : 'missing'
    });
    
    if (responseData?.tokenInfo?.accessToken) {
      this.setAuthToken(responseData.tokenInfo.accessToken);
      console.log('✅ Token set from tokenInfo.accessToken');
    } else if (responseData?.accessToken) {
      this.setAuthToken(responseData.accessToken);
      console.log('✅ Token set from accessToken');
    } else if (responseData?.token) {
      this.setAuthToken(responseData.token);
      console.log('✅ Token set from token');
    } else {
      console.error('❌ No token found in login response!', JSON.stringify(responseData, null, 2));
    }
    
    // Verify token was set
    if (!this.authToken) {
      throw new Error('Failed to set authentication token after login');
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