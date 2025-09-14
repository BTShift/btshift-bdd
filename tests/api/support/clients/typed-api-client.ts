/**
 * Typed API client using the published npm packages
 * This provides full type safety using the auto-generated types from the services
 */

import createClient from 'openapi-fetch';
import type { paths as IdentityPaths } from '@btshift/identity-types';
import type { paths as TenantPaths } from '@btshift/tenant-management-types';
import type { paths as ClientPaths } from '@btshift/client-management-types';
import { randomUUID } from 'crypto';
import { TestContextManager } from '../../../../lib/helpers/test-context-manager';
import { ApiAllureReporter, ApiCallDetails } from '../helpers/api-allure-reporter';

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
  
  private identityClient: ReturnType<typeof createClient<IdentityPaths>>;
  private tenantClient: ReturnType<typeof createClient<TenantPaths>>;
  private clientManagementClient: ReturnType<typeof createClient<ClientPaths>>;

  // Public API maintains backward compatibility
  public identity: (path: string, method: string, options?: any) => Promise<ApiResponse>;
  public tenant: (path: string, method: string, options?: any) => Promise<ApiResponse>;
  public clientManagement: (path: string, method: string, options?: any) => Promise<ApiResponse>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_GATEWAY_URL || 'http://localhost:8080';
    
    // Initialize identity client with openapi-fetch
    this.identityClient = createClient<IdentityPaths>({
      baseUrl: this.baseUrl
    });

    // Initialize tenant management client with openapi-fetch
    this.tenantClient = createClient<TenantPaths>({
      baseUrl: this.baseUrl
    });

    // Initialize client management client with openapi-fetch
    this.clientManagementClient = createClient<ClientPaths>({
      baseUrl: this.baseUrl
    });

    // Create backward-compatible wrapper functions
    this.identity = this.createWrapper(this.identityClient, 'Identity');
    this.tenant = this.createWrapper(this.tenantClient, 'Tenant');
    this.clientManagement = this.createWrapper(this.clientManagementClient, 'ClientManagement');
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

  // Create a backward-compatible wrapper for openapi-fetch clients
  private createWrapper(client: any, serviceName: string): (path: string, method: string, options?: any) => Promise<ApiResponse> {

    return async (path: string, method: string, options: any = {}): Promise<ApiResponse> => {
      const startTime = Date.now();

      // Generate correlation ID for this request
      const correlationId = randomUUID();
      this.lastCorrelationId = correlationId;

      // Get test context from TestContextManager
      const testContext = TestContextManager.getInstance().getContextHeader();

      // Prepare headers
      const headers: Record<string, string> = {
        'X-Correlation-ID': correlationId,
        ...(testContext && { 'X-Test-Context': testContext }),
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
        ...options.headers
      };

      // Log test context if available
      if (testContext) {
        console.log(`🧪 Adding test context to ${method.toUpperCase()} ${path}`);
        console.log(`🧪 Test context JSON:`, testContext);
      }

      // Debug: Check if Authorization header is present
      const hasAuth = this.authToken;
      console.log(`🔍 [${serviceName}] ${method.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Auth: ${hasAuth ? 'Yes' : 'No'}`);

      // Prepare API call details for reporting
      const apiCallDetails: ApiCallDetails = {
        endpoint: path,
        method: method.toUpperCase(),
        request: {
          headers,
          body: options.body,
          params: options.params,
          query: options.params?.query
        },
        response: {},
        correlationId,
        timestamp: new Date()
      };

      try {
        // Call openapi-fetch client with the appropriate method
        let result: any;
        const upperMethod = method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

        // openapi-fetch uses uppercase method names
        if (upperMethod === 'GET') {
          result = await client.GET(path as any, { headers, params: options.params });
        } else if (upperMethod === 'POST') {
          result = await client.POST(path as any, { headers, body: options.body, params: options.params });
        } else if (upperMethod === 'PUT') {
          result = await client.PUT(path as any, { headers, body: options.body, params: options.params });
        } else if (upperMethod === 'DELETE') {
          result = await client.DELETE(path as any, { headers, params: options.params });
        } else if (upperMethod === 'PATCH') {
          result = await client.PATCH(path as any, { headers, body: options.body, params: options.params });
        } else {
          throw new Error(`Unsupported method: ${method}`);
        }

        const duration = Date.now() - startTime;

        // openapi-fetch returns { data, error, response }
        if (result.error) {
          // Handle error response
          console.error(`❌ [${serviceName}] ${method.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Error:`, result.error);

          apiCallDetails.response = {
            status: result.response?.status || 0,
            error: result.error
          };
          apiCallDetails.duration = duration;

          await ApiAllureReporter.reportApiCall(apiCallDetails);

          // Throw error with correlation ID
          // Format error message to match what tests expect (include status code in message)
          const statusCode = result.response?.status || 0;
          const statusText = result.response?.statusText || 'Unknown Error';
          const errorMessage = result.error?.message || `HTTP ${statusCode}: ${statusText}`;

          // Ensure status code is in the message for tests that check error.message.contains('404')
          const finalMessage = errorMessage.includes(statusCode.toString())
            ? errorMessage
            : `HTTP ${statusCode}: ${statusText}`;

          const error = new Error(finalMessage);
          (error as any).correlationId = correlationId;
          (error as any).requestCorrelationId = correlationId;
          (error as any).response = result.response;
          throw error;
        }

        console.log(`✅ [${serviceName}] ${method.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Success`);

        // Update API call details with response
        apiCallDetails.response = {
          status: result.response?.status || 200,
          body: result.data,
          headers: result.response?.headers || {}
        };
        apiCallDetails.duration = duration;

        // Report to Allure
        await ApiAllureReporter.reportApiCall(apiCallDetails);

        // Create enhanced response with correlation ID metadata
        // Handle cases where result.data might be undefined (e.g., 204 No Content)
        const enhancedResponse = {
          data: result.data || {},
          correlationId: correlationId,
          requestCorrelationId: correlationId
        };

        return enhancedResponse;
      } catch (error: any) {
        // If error wasn't already handled above, handle it here
        if (!error.correlationId) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${serviceName}] ${method.toUpperCase()} ${path} | X-Correlation-ID: ${correlationId} | Error:`, error.message);

          apiCallDetails.response = {
            status: 0,
            error: {
              message: error.message,
              stack: error.stack
            }
          };
          apiCallDetails.duration = duration;

          await ApiAllureReporter.reportApiCall(apiCallDetails);

          error.correlationId = correlationId;
          error.requestCorrelationId = correlationId;
        }
        throw error;
      }
    };
  }

  // Helper method to login and set token automatically
  async login(email: string, password: string, portalType?: string): Promise<ApiResponse> {
    // Build login body - tenant context extracted from JWT automatically
    const loginBody: any = { email, password };
    
    // Add portal type if provided
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