/**
 * Enhanced TypedApiClient with full type safety
 * This is a drop-in replacement for the existing TypedApiClient
 * It maintains the same API but adds compile-time type checking
 */

import { makeClient as makeIdentityClient } from '@btshift/identity-types';
import { makeClient as makeTenantClient } from '@btshift/tenant-management-types';
import { makeClient as makeClientManagementClient } from '@btshift/client-management-types';
import type { paths as IdentityPaths, components as IdentityComponents } from '@btshift/identity-types';
import type { paths as TenantPaths, components as TenantComponents } from '@btshift/tenant-management-types';
import type { paths as ClientPaths, components as ClientComponents } from '@btshift/client-management-types';
import { randomUUID } from 'crypto';
import { TestContextManager } from '../../../../lib/helpers/test-context-manager';

// Type-safe fetch options
interface TypedFetchOptions {
  body?: Record<string, any>;
  params?: {
    query?: Record<string, any>;
    path?: Record<string, any>;
  };
  headers?: Record<string, string>;
}

// Enhanced response type
export interface ApiResponse<T = any> {
  data: T;
  correlationId: string;
  requestCorrelationId: string;
}

// Generic API function type
type ApiFunction<Paths> = <P extends keyof Paths>(
  path: P,
  method: keyof Paths[P],
  options?: TypedFetchOptions
) => Promise<any>;

// Wrapped API function with correlation
type WrappedApiFunction<Paths> = <P extends keyof Paths>(
  path: P,
  method: keyof Paths[P],
  options?: TypedFetchOptions
) => Promise<ApiResponse>;

export class TypedApiClient {
  private authToken: string | null = null;
  private baseUrl: string;
  private lastCorrelationId: string | null = null;
  
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
    this.identity = this.createTypedWrapper<IdentityPaths>(
      identityClient.api as ApiFunction<IdentityPaths>,
      'Identity'
    );

    // Initialize tenant management client
    const tenantClient = makeTenantClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken || undefined,
    });
    this.tenant = this.createTypedWrapper<TenantPaths>(
      tenantClient.api as ApiFunction<TenantPaths>,
      'Tenant'
    );

    // Initialize client management client
    const clientClient = makeClientManagementClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken || undefined,
    });
    this.clientManagement = this.createTypedWrapper<ClientPaths>(
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
   * Creates a type-safe wrapper with correlation tracking
   * This preserves all type information while adding correlation IDs
   */
  private createTypedWrapper<Paths>(
    api: ApiFunction<Paths>,
    serviceName: string
  ): WrappedApiFunction<Paths> {
    return async <P extends keyof Paths>(
      path: P,
      method: keyof Paths[P],
      options?: TypedFetchOptions
    ): Promise<ApiResponse> => {
      
      // Runtime validation for common mistakes
      if (options?.body) {
        if (typeof options.body === 'string') {
          throw new TypeError(
            `[${serviceName}] Body must be an object, not a string. ` +
            `Remove JSON.stringify() - the client handles serialization internally. ` +
            `Path: ${String(path)}, Method: ${String(method)}`
          );
        }
        
        // Check for snake_case fields and warn
        const bodyKeys = Object.keys(options.body);
        const snakeCaseFields = bodyKeys.filter(key => key.includes('_'));
        if (snakeCaseFields.length > 0) {
          console.warn(
            `⚠️  [${serviceName}] Warning: Snake_case fields detected in request body: ${snakeCaseFields.join(', ')}. ` +
            `The API expects camelCase fields. Consider renaming: ` +
            snakeCaseFields.map(f => `${f} → ${f.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`).join(', ')
          );
        }
      }

      // Generate correlation ID
      const correlationId = randomUUID();
      this.lastCorrelationId = correlationId;
      
      // Get test context
      const testContext = TestContextManager.getInstance().getContextHeader();
      
      // Enhance options with headers
      const enhancedOptions: TypedFetchOptions = {
        ...options,
        headers: {
          'X-Correlation-ID': correlationId,
          ...(testContext && { 'X-Test-Context': testContext }),
          ...options?.headers
        }
      };
      
      // Debug logging
      if (testContext) {
        console.log(`🧪 Test context: ${String(method).toUpperCase()} ${String(path)}`);
      }
      
      const hasAuth = this.authToken !== null;
      console.log(
        `🔍 [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
        `Correlation: ${correlationId} | Auth: ${hasAuth ? '✓' : '✗'}`
      );
      
      // Log request body for debugging
      if (options?.body && Object.keys(options.body).length > 0) {
        console.log(`📦 [${serviceName}] Request body:`, JSON.stringify(options.body, null, 2));
      }
      
      try {
        const result = await api(path, method, enhancedOptions);
        
        console.log(
          `✅ [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
          `Correlation: ${correlationId} | Success`
        );
        
        return {
          data: result,
          correlationId: correlationId,
          requestCorrelationId: correlationId
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [${serviceName}] ${String(method).toUpperCase()} ${String(path)} | ` +
          `Correlation: ${correlationId} | Error: ${errorMessage}`
        );
        
        // Add correlation to error
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
    const loginBody = {
      email,
      password,
      ...(tenantId && { tenantId }),
      ...(portalType && { portalType })
    };
    
    const response = await this.identity('/api/authentication/login', 'post', {
      body: loginBody
    });
    
    // Handle token extraction
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

// Export types for tests
export type { 
  IdentityPaths, 
  IdentityComponents,
  TenantPaths, 
  TenantComponents,
  ClientPaths, 
  ClientComponents,
  TypedFetchOptions
};

// Type helpers for tests
export type ClientRequest = ClientComponents['schemas']['clientmanagementCreateClientRequest'];
export type ClientResponse = ClientComponents['schemas']['clientmanagementClientResponse'];
export type GroupRequest = ClientComponents['schemas']['clientmanagementCreateGroupRequest'];
export type GroupResponse = ClientComponents['schemas']['clientmanagementGroupResponse'];