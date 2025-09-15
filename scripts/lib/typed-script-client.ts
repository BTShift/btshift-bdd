import createClient from 'openapi-fetch';
import type { paths as IdentityPaths } from '@btshift/identity-types';
import type { paths as TenantPaths } from '@btshift/tenant-management-types';
import type { paths as ClientPaths } from '@btshift/client-management-types';
import * as dotenv from 'dotenv';

dotenv.config();

export class TypedScriptClient {
  private identityClient: ReturnType<typeof createClient<IdentityPaths>>;
  private tenantClient: ReturnType<typeof createClient<TenantPaths>>;
  private clientManagementClient: ReturnType<typeof createClient<ClientPaths>>;
  private authToken: string | null = null;
  private operationalContext: { tenantId?: string; clientId?: string } = {};
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:5000';

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    this.identityClient = createClient<IdentityPaths>({
      baseUrl: this.baseUrl,
      headers: defaultHeaders,
    });

    this.tenantClient = createClient<TenantPaths>({
      baseUrl: this.baseUrl,
      headers: defaultHeaders,
    });

    this.clientManagementClient = createClient<ClientPaths>({
      baseUrl: this.baseUrl,
      headers: defaultHeaders,
    });

    // Add middleware for auth and operational context
    [this.identityClient, this.tenantClient, this.clientManagementClient].forEach(client => {
      client.use({
        onRequest: ({ request }) => {
          if (this.authToken) {
            request.headers.set('Authorization', `Bearer ${this.authToken}`);
          }

          if (this.operationalContext.tenantId) {
            request.headers.set('X-Operation-Tenant-Id', this.operationalContext.tenantId);
          }

          if (this.operationalContext.clientId) {
            request.headers.set('X-Operation-Client-Id', this.operationalContext.clientId);
          }

          // Log the request
          console.log(`API Request: ${request.method} ${request.url}`);
          return request;
        },
        onResponse: ({ response }) => {
          console.log(`API Response: ${response.status} ${response.url}`);
          return response;
        },
      });
    });
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  setOperationalContext(context: { tenantId?: string; clientId?: string }): void {
    this.operationalContext = { ...this.operationalContext, ...context };
  }

  clearOperationalContext(): void {
    this.operationalContext = {};
  }

  // Authentication methods
  async login(email: string, password: string): Promise<any> {
    const response = await this.identityClient.POST('/api/authentication/login', {
      body: { email, password }
    });

    if (response.error) {
      throw new Error(`Login failed: ${response.error}`);
    }

    const data = response.data as any;
    if (data?.success && data?.tokenInfo) {
      this.setAuthToken(data.tokenInfo.accessToken);
      return data;
    }

    throw new Error('Login failed: Invalid response');
  }

  async register(userData: any): Promise<any> {
    const response = await this.identityClient.POST('/api/authentication/register', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Registration failed: ${response.error}`);
    }

    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const response = await this.identityClient.POST('/api/authentication/reset-password', {
      body: { token, newPassword }
    });

    if (response.error) {
      throw new Error(`Reset password failed: ${response.error}`);
    }

    return response.data;
  }

  async validateToken(token: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.identityClient.GET('/api/authentication/validate-token' as any, {
      params: { query: { token } }
    } as any);

    if (response.error) {
      throw new Error(`Token validation failed: ${response.error}`);
    }

    return response.data;
  }

  // Tenant management methods
  async createTenant(tenantData: any): Promise<any> {
    const response = await this.tenantClient.POST('/api/tenants', {
      body: tenantData
    });

    if (response.error) {
      throw new Error(`Create tenant failed: ${response.error}`);
    }

    return response.data;
  }

  async getTenant(tenantId: string): Promise<any> {
    const response = await this.tenantClient.GET('/api/tenants/{id}', {
      params: { path: { id: tenantId } }
    });

    if (response.error) {
      throw new Error(`Get tenant failed: ${response.error}`);
    }

    return response.data;
  }

  async getTenants(): Promise<any> {
    const response = await this.tenantClient.GET('/api/tenants', {});

    if (response.error) {
      throw new Error(`Get tenants failed: ${response.error}`);
    }

    return response.data;
  }

  async activateTenant(tenantId: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.tenantClient.POST('/api/tenants/{id}/activate' as any, {
      params: { path: { id: tenantId } }
    } as any);

    if (response.error) {
      throw new Error(`Activate tenant failed: ${response.error}`);
    }

    return response.data;
  }

  async resendWelcomeEmail(tenantId: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.tenantClient.POST('/api/tenants/{id}/resend-welcome' as any, {
      params: { path: { id: tenantId } }
    } as any);

    if (response.error) {
      throw new Error(`Resend welcome email failed: ${response.error}`);
    }

    return response.data;
  }

  // User management methods
  async inviteUser(userData: any): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.identityClient.POST('/api/users/invite' as any, {
      body: userData
    } as any);

    if (response.error) {
      throw new Error(`Invite user failed: ${response.error}`);
    }

    return response.data;
  }

  async acceptInvitation(token: string, password: string, confirmPassword: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.identityClient.POST('/api/users/accept-invitation' as any, {
      body: { token, password, confirmPassword }
    } as any);

    if (response.error) {
      throw new Error(`Accept invitation failed: ${response.error}`);
    }

    return response.data;
  }

  async createUser(userData: any): Promise<any> {
    const response = await this.identityClient.POST('/api/users', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Create user failed: ${response.error}`);
    }

    return response.data;
  }

  // Client management methods
  async createClient(clientData: any): Promise<any> {
    const response = await this.clientManagementClient.POST('/api/clients', {
      body: clientData
    });

    if (response.error) {
      throw new Error(`Create client failed: ${response.error}`);
    }

    return response.data;
  }

  async getClient(clientId: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.clientManagementClient.GET('/api/clients/{id}' as any, {
      params: { path: { id: clientId } }
    } as any);

    if (response.error) {
      throw new Error(`Get client failed: ${response.error}`);
    }

    return response.data;
  }

  async getClients(filters?: any): Promise<any> {
    const response = await this.clientManagementClient.GET('/api/clients', {
      params: { query: filters }
    });

    if (response.error) {
      throw new Error(`Get clients failed: ${response.error}`);
    }

    return response.data;
  }

  async updateClient(clientId: string, updateData: any): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.clientManagementClient.PUT('/api/clients/{id}' as any, {
      params: { path: { id: clientId } },
      body: updateData
    } as any);

    if (response.error) {
      throw new Error(`Update client failed: ${response.error}`);
    }

    return response.data;
  }

  async createClientGroup(groupData: any): Promise<any> {
    const response = await this.clientManagementClient.POST('/api/groups', {
      body: groupData
    });

    if (response.error) {
      throw new Error(`Create client group failed: ${response.error}`);
    }

    return response.data;
  }

  async getClientGroup(groupId: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.clientManagementClient.GET('/api/groups/{id}' as any, {
      params: { path: { id: groupId } }
    } as any);

    if (response.error) {
      throw new Error(`Get client group failed: ${response.error}`);
    }

    return response.data;
  }

  async associateUserWithClient(clientId: string, userEmail: string): Promise<any> {
    // Note: This endpoint might not be in the OpenAPI spec
    const response = await this.clientManagementClient.POST('/api/user-client-associations' as any, {
      body: { clientId, userEmail }
    } as any);

    if (response.error) {
      throw new Error(`Associate user with client failed: ${response.error}`);
    }

    return response.data;
  }

  // Direct client accessors for more complex operations
  get identity() {
    return this.identityClient;
  }

  get tenant() {
    return this.tenantClient;
  }

  get clientManagement() {
    return this.clientManagementClient;
  }
}

// Export a singleton instance for scripts
export const scriptClient = new TypedScriptClient();