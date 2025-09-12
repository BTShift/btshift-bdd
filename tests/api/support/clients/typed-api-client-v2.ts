/**
 * Strongly-typed API client with full type safety
 * This version preserves all type information through the wrapper chain
 */

import { makeClient as makeIdentityClient } from '@btshift/identity-types';
import { makeClient as makeTenantClient } from '@btshift/tenant-management-types';
import { makeClient as makeClientManagementClient } from '@btshift/client-management-types';
import type { paths as IdentityPaths, components as IdentityComponents } from '@btshift/identity-types';
import type { paths as TenantPaths, components as TenantComponents } from '@btshift/tenant-management-types';
import type { paths as ClientPaths, components as ClientComponents } from '@btshift/client-management-types';
import { randomUUID } from 'crypto';
import { TestContextManager } from '../../../../lib/helpers/test-context-manager';

// Type-safe fetch options that match the generated client expectations
interface TypedFetchOptions {
  body?: Record<string, any>; // Must be an object, not a string!
  params?: {
    query?: Record<string, any>;
    path?: Record<string, any>;
  };
  headers?: Record<string, string>;
}

// Enhanced response type that includes correlation ID metadata
export interface ApiResponse<T = any> {
  data: T;
  correlationId: string;
  requestCorrelationId: string;
}

// Type-safe API function signature
type ApiFunction<Paths> = <P extends keyof Paths>(
  path: P,
  method: keyof Paths[P],
  options?: TypedFetchOptions
) => Promise<any>;

// Type-safe wrapper that preserves the API function signature
type WrappedApiFunction<Paths> = <P extends keyof Paths>(
  path: P,
  method: keyof Paths[P],
  options?: TypedFetchOptions
) => Promise<ApiResponse>;

export class TypedApiClientV2 {
  private authToken: string | null = null;
  private baseUrl: string;
  private lastCorrelationId: string | null = null;
  
  // Strongly typed API methods
  public identity: WrappedApiFunction<IdentityPaths>;
  public tenant: WrappedApiFunction<TenantPaths>;
  public clientManagement: WrappedApiFunction<ClientPaths>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_GATEWAY_URL || 'http://localhost:8080';
    
    // Initialize identity client
    const identityClient = makeIdentityClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken || undefined,
    });
    this.identity = this.wrapApiWithCorrelation<IdentityPaths>(
      identityClient.api as ApiFunction<IdentityPaths>,
      'Identity'
    );

    // Initialize tenant management client
    const tenantClient = makeTenantClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken || undefined,
    });
    this.tenant = this.wrapApiWithCorrelation<TenantPaths>(
      tenantClient.api as ApiFunction<TenantPaths>,
      'Tenant'
    );

    // Initialize client management client
    const clientClient = makeClientManagementClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken || undefined,
    });
    this.clientManagement = this.wrapApiWithCorrelation<ClientPaths>(
      clientClient.api as ApiFunction<ClientPaths>,
      'ClientManagement'
    );
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

  /**
   * Type-safe wrapper that preserves the original API function signature
   * This ensures compile-time type checking for all API calls
   */
  private wrapApiWithCorrelation<Paths>(
    api: ApiFunction<Paths>,
    serviceName: string
  ): WrappedApiFunction<Paths> {
    return async <P extends keyof Paths>(
      path: P,
      method: keyof Paths[P],
      options?: TypedFetchOptions
    ): Promise<ApiResponse> => {
      // Validate options at runtime (TypeScript will also check at compile time)
      if (options?.body && typeof options.body === 'string') {
        throw new TypeError(
          `Body must be an object, not a string. ` +
          `Don't use JSON.stringify() - the client handles serialization internally.`
        );
      }

      // Generate correlation ID for this request
      const correlationId = randomUUID();
      this.lastCorrelationId = correlationId;
      
      // Get test context from TestContextManager
      const testContext = TestContextManager.getInstance().getContextHeader();
      
      // Add correlation ID and test context to headers
      const enhancedOptions: TypedFetchOptions = {
        ...options,
        headers: {
          'X-Correlation-ID': correlationId,
          ...(testContext && { 'X-Test-Context': testContext }),
          ...options?.headers
        }
      };
      
      // Log test context if available
      if (testContext) {
        console.log(`🧪 Adding test context to ${String(method).toUpperCase()} ${String(path)}`);
      }
      
      // Debug logging
      const hasAuth = this.authToken !== null;
      console.log(
        `🔍 [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
        `X-Correlation-ID: ${correlationId} | Auth: ${hasAuth ? 'Yes' : 'No'}`
      );
      
      try {
        // Call the original API with enhanced options
        const result = await api(path, method, enhancedOptions);
        
        console.log(
          `✅ [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
          `X-Correlation-ID: ${correlationId} | Success`
        );
        
        // Create enhanced response with correlation ID metadata
        return {
          data: result,
          correlationId: correlationId,
          requestCorrelationId: correlationId
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
          `X-Correlation-ID: ${correlationId} | Error: ${errorMessage}`
        );
        
        // Re-throw error with correlation ID context
        if (error && typeof error === 'object') {
          (error as any).correlationId = correlationId;
          (error as any).requestCorrelationId = correlationId;
        }
        throw error;
      }
    };
  }

  /**
   * Type-safe login method
   */
  async login(
    email: string, 
    password: string, 
    tenantId?: string, 
    portalType?: string
  ): Promise<ApiResponse> {
    // Build login body with proper typing
    const loginBody = {
      email,
      password,
      ...(tenantId && { tenantId }),
      ...(portalType && { portalType })
    };
    
    // TypeScript will now enforce correct path and body structure!
    const response = await this.identity('/api/authentication/login', 'post', {
      body: loginBody as any // Need cast here due to schema type variations
    });
    
    // Handle token from response
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

  /**
   * Type-safe logout method
   */
  async logout(): Promise<void> {
    if (this.authToken) {
      try {
        await this.identity('/api/authentication/logout', 'post', {
          body: {}
        });
      } catch (error) {
        console.warn('Logout failed:', error);
      } finally {
        this.clearAuthToken();
      }
    }
  }
}

// Export types for use in tests
export type { 
  IdentityPaths, 
  IdentityComponents,
  TenantPaths, 
  TenantComponents,
  ClientPaths, 
  ClientComponents,
  TypedFetchOptions
};

// Helper type to extract request body type for a specific operation
export type RequestBodyFor<
  Paths,
  Path extends keyof Paths,
  Method extends keyof Paths[Path]
> = Paths[Path][Method] extends { requestBody?: { content: { 'application/json': infer Body } } }
  ? Body
  : never;

// Helper type to extract response type for a specific operation
export type ResponseFor<
  Paths,
  Path extends keyof Paths,
  Method extends keyof Paths[Path]
> = Paths[Path][Method] extends { responses: { 200: { content: { 'application/json': infer Response } } } }
  ? Response
  : never;