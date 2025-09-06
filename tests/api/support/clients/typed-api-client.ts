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
    
    // Initialize identity client
    const identityClient = makeIdentityClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        console.log(`🔐 [Identity] Getting auth token: ${this.authToken ? 'Bearer ' + this.authToken.substring(0, 20) + '...' : 'null'}`);
        return this.authToken ? `Bearer ${this.authToken}` : undefined;
      },
      headers: () => ({
        'X-Correlation-ID': randomUUID()
      })
    });
    this.identity = this.wrapWithCorrelationLogging(identityClient.api, 'Identity');

    // Initialize tenant management client
    const tenantClient = makeTenantClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        console.log(`🔐 [Tenant] Getting auth token: ${this.authToken ? 'Bearer ' + this.authToken.substring(0, 20) + '...' : 'null'}`);
        return this.authToken ? `Bearer ${this.authToken}` : undefined;
      },
      headers: () => ({
        'X-Correlation-ID': randomUUID()
      })
    });
    this.tenant = this.wrapWithCorrelationLogging(tenantClient.api, 'Tenant');

    // Initialize client management client
    const clientClient = makeClientManagementClient({
      baseUrl: this.baseUrl,
      getAuth: () => {
        console.log(`🔐 [ClientManagement] Getting auth token: ${this.authToken ? 'Bearer ' + this.authToken.substring(0, 20) + '...' : 'null'}`);
        return this.authToken ? `Bearer ${this.authToken}` : undefined;
      },
      headers: () => ({
        'X-Correlation-ID': randomUUID()
      })
    });
    this.clientManagement = this.wrapWithCorrelationLogging(clientClient.api, 'ClientManagement');
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
  private wrapWithCorrelationLogging(api: any, serviceName: string): any {
    return new Proxy(api, {
      get: (target, prop) => {
        const originalMethod = target[prop];
        if (typeof originalMethod === 'function') {
          return async (...args: any[]): Promise<ApiResponse> => {
            const requestCorrelationId = randomUUID();
            const [path, method, options = {}] = args;
            
            // Add correlation ID to headers
            const headers = {
              'X-Correlation-ID': requestCorrelationId,
              ...options.headers
            };
            
            console.log(`🔍 [${serviceName}] ${method?.toUpperCase()} ${path} | Correlation-ID: ${requestCorrelationId}`);
            
            try {
              const result = await originalMethod.apply(target, [path, method, { ...options, headers }]);
              
              // Extract correlation ID from response headers if available
              let responseCorrelationId = requestCorrelationId; // Default fallback
              if (result && typeof result === 'object' && result.headers) {
                responseCorrelationId = result.headers['x-correlation-id'] || 
                                     result.headers['X-Correlation-ID'] || 
                                     requestCorrelationId;
              }
              
              // Store the correlation ID for tracking
              this.lastCorrelationId = responseCorrelationId;
              
              console.log(`✅ [${serviceName}] ${method?.toUpperCase()} ${path} | Request-ID: ${requestCorrelationId} | Response-ID: ${responseCorrelationId} | Success`);
              
              // Create enhanced response with correlation ID metadata
              const enhancedResponse = {
                data: result,
                correlationId: responseCorrelationId,
                requestCorrelationId: requestCorrelationId
              };
              
              // Automatically report correlation ID to Allure
              const AllureCorrelationHelper = require('../helpers/allure-correlation').AllureCorrelationHelper;
              AllureCorrelationHelper.reportFromApiResponse(enhancedResponse, {
                endpoint: path,
                method: method?.toUpperCase(),
                serviceName
              });
              
              return enhancedResponse;
            } catch (error) {
              console.error(`❌ [${serviceName}] ${method?.toUpperCase()} ${path} | Correlation-ID: ${requestCorrelationId} | Error:`, error.message);
              
              // Store correlation ID even on error for debugging
              this.lastCorrelationId = requestCorrelationId;
              
              // Report correlation ID to Allure even on error
              const AllureCorrelationHelper = require('../helpers/allure-correlation').AllureCorrelationHelper;
              AllureCorrelationHelper.reportCorrelationId(requestCorrelationId, undefined, {
                endpoint: path,
                method: method?.toUpperCase(),
                serviceName
              });
              
              // Re-throw error but preserve correlation ID context
              const enhancedError = error as any;
              enhancedError.correlationId = requestCorrelationId;
              enhancedError.requestCorrelationId = requestCorrelationId;
              throw enhancedError;
            }
          };
        }
        return originalMethod;
      }
    });
  }

  // Helper method to login and set token automatically
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.identity('/api/authentication/login', 'post', {
      body: { email, password }
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