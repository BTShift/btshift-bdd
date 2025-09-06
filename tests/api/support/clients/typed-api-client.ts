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

export class TypedApiClient {
  private authToken: string | null = null;
  private baseUrl: string;
  
  public identity: ReturnType<typeof makeIdentityClient>['api'];
  public tenant: ReturnType<typeof makeTenantClient>['api'];
  public clientManagement: ReturnType<typeof makeClientManagementClient>['api'];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_GATEWAY_URL || 'http://localhost:8080';
    
    // Initialize identity client
    const identityClient = makeIdentityClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken ? `Bearer ${this.authToken}` : undefined
    });
    this.identity = identityClient.api;

    // Initialize tenant management client
    const tenantClient = makeTenantClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken ? `Bearer ${this.authToken}` : undefined
    });
    this.tenant = tenantClient.api;

    // Initialize client management client
    const clientClient = makeClientManagementClient({
      baseUrl: this.baseUrl,
      getAuth: () => this.authToken ? `Bearer ${this.authToken}` : undefined
    });
    this.clientManagement = clientClient.api;
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

  // Helper method to login and set token automatically
  async login(email: string, password: string): Promise<any> {
    const response = await this.identity('/api/authentication/login', 'post', {
      body: { email, password }
    });
    
    // Check if response has token info and set it
    if ((response as any)?.tokenInfo?.accessToken) {
      this.setAuthToken((response as any).tokenInfo.accessToken);
    } else if ((response as any)?.accessToken) {
      this.setAuthToken((response as any).accessToken);
    } else if ((response as any)?.token) {
      this.setAuthToken((response as any).token);
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