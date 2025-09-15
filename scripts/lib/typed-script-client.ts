import createClient from 'openapi-fetch';
import type { paths as IdentityPaths, components as IdentityComponents } from '@btshift/identity-types';
import type { paths as TenantPaths, components as TenantComponents } from '@btshift/tenant-management-types';
import type { paths as ClientPaths, components as ClientComponents } from '@btshift/client-management-types';
import * as dotenv from 'dotenv';

dotenv.config();

// Type aliases for better readability
type IdentityClient = ReturnType<typeof createClient<IdentityPaths>>;
type TenantClient = ReturnType<typeof createClient<TenantPaths>>;
type ClientManagementClient = ReturnType<typeof createClient<ClientPaths>>;

// Extract schema types
type AuthenticateRequest = IdentityComponents['schemas']['identityAuthenticateRequest'];
type AuthenticateResponse = IdentityComponents['schemas']['identityAuthenticateResponse'];
type RegisterRequest = IdentityComponents['schemas']['identityRegisterUserRequest'];
type RegisterResponse = IdentityComponents['schemas']['identityRegisterUserResponse'];
// type TokenInfo = IdentityComponents['schemas']['identityTokenInfo'];
// type UserInfo = IdentityComponents['schemas']['identityUserInfo'];

type CreateTenantRequest = TenantComponents['schemas']['tenantCreateTenantRequest'];
type CreateTenantResponse = TenantComponents['schemas']['tenantCreateTenantResponse'];
type TenantInfo = TenantComponents['schemas']['tenantTenantInfo'];
type TenantListResponse = TenantComponents['schemas']['tenantListTenantsResponse'];

type CreateClientRequest = ClientComponents['schemas']['clientmanagementCreateClientRequest'];
type CreateClientResponse = { clientId?: string; companyName?: string; };
type ClientInfo = ClientComponents['schemas']['clientmanagementClientInfo'];
type ClientListResponse = { clients?: ClientInfo[]; totalCount?: number; };

export class TypedScriptClient {
  private identityClient: IdentityClient;
  private tenantClient: TenantClient;
  private clientManagementClient: ClientManagementClient;
  private authToken: string | null = null;
  private operationalContext: { tenantId?: string; clientId?: string } = {};
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['API_GATEWAY_URL'] || 'http://localhost:5000';

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
  async login(email: string, password: string, portalType?: string): Promise<AuthenticateResponse> {
    const response = await this.identityClient.POST('/api/authentication/login', {
      body: {
        email,
        password,
        portalType
      } as AuthenticateRequest
    });

    if (response.error) {
      throw new Error(`Login failed: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      throw new Error('Login failed: No response data');
    }

    const data = response.data as AuthenticateResponse;

    if (data.tokenInfo?.accessToken) {
      this.setAuthToken(data.tokenInfo.accessToken);
    }

    return data;
  }

  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.identityClient.POST('/api/authentication/register', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Registration failed: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      throw new Error('Registration failed: No response data');
    }

    return response.data as RegisterResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<unknown> {
    const response = await this.identityClient.POST('/api/authentication/reset-password', {
      body: { accessToken: token, newPassword } as any
    });

    if (response.error) {
      throw new Error(`Reset password failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async validateToken(token: string): Promise<unknown> {
    const response = await this.identityClient.POST('/api/authentication/validate', {
      body: { accessToken: token } as any
    });

    if (response.error) {
      throw new Error(`Token validation failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  // Tenant management methods
  async createTenant(tenantData: CreateTenantRequest): Promise<CreateTenantResponse> {
    const response = await this.tenantClient.POST('/api/tenants', {
      body: tenantData
    });

    if (response.error) {
      throw new Error(`Create tenant failed: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      throw new Error('Create tenant failed: No response data');
    }

    return response.data as CreateTenantResponse;
  }

  async getTenant(tenantId: string): Promise<TenantInfo | undefined> {
    const response = await this.tenantClient.GET('/api/tenants/{id}', {
      params: { path: { id: tenantId } }
    });

    if (response.error) {
      throw new Error(`Get tenant failed: ${JSON.stringify(response.error)}`);
    }

    const data = response.data as { tenant?: TenantInfo };
    return data?.tenant;
  }

  async getTenants(): Promise<TenantInfo[]> {
    const response = await this.tenantClient.GET('/api/tenants', {});

    if (response.error) {
      throw new Error(`Get tenants failed: ${JSON.stringify(response.error)}`);
    }

    const data = response.data as TenantListResponse;
    return data?.tenants || [];
  }

  async activateTenant(tenantId: string): Promise<unknown> {
    const response = await this.tenantClient.POST('/api/tenants/{tenantId}/activate', {
      params: { path: { tenantId } },
      body: {}
    });

    if (response.error) {
      throw new Error(`Activate tenant failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async resendWelcomeEmail(tenantId: string): Promise<unknown> {
    const response = await this.tenantClient.POST('/api/tenants/{tenantId}/resend-welcome', {
      params: { path: { tenantId } },
      body: {}
    });

    if (response.error) {
      throw new Error(`Resend welcome email failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  // User management methods
  async inviteUser(userData: unknown): Promise<unknown> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.identityClient.POST('/api/users/invite' as any, {
      body: userData
    } as any);

    if (response.error) {
      throw new Error(`Invite user failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async acceptInvitation(token: string, password: string, confirmPassword: string): Promise<unknown> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.identityClient.POST('/api/users/accept-invitation' as any, {
      body: { token, password, confirmPassword }
    } as any);

    if (response.error) {
      throw new Error(`Accept invitation failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async createUser(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.identityClient.POST('/api/users', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Create user failed: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      throw new Error('Create user failed: No response data');
    }

    return response.data as RegisterResponse;
  }

  // Client management methods
  async createClient(clientData: CreateClientRequest): Promise<CreateClientResponse> {
    const response = await this.clientManagementClient.POST('/api/clients', {
      body: clientData
    });

    if (response.error) {
      throw new Error(`Create client failed: ${JSON.stringify(response.error)}`);
    }

    if (!response.data) {
      throw new Error('Create client failed: No response data');
    }

    return response.data as CreateClientResponse;
  }

  async getClient(clientId: string): Promise<ClientInfo | undefined> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.clientManagementClient.GET('/api/clients/{id}' as any, {
      params: { path: { id: clientId } }
    } as any);

    if (response.error) {
      throw new Error(`Get client failed: ${JSON.stringify(response.error)}`);
    }

    const data = response.data as { client?: ClientInfo };
    return data?.client;
  }

  async getClients(filters?: Record<string, unknown>): Promise<ClientInfo[]> {
    const response = await this.clientManagementClient.GET('/api/clients', filters ? {
      params: { query: filters as any }
    } : {});

    if (response.error) {
      throw new Error(`Get clients failed: ${JSON.stringify(response.error)}`);
    }

    const data = response.data as ClientListResponse;
    return data?.clients || [];
  }

  async updateClient(clientId: string, updateData: Partial<ClientComponents['schemas']['ClientManagementUpdateClientBody']>): Promise<unknown> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.clientManagementClient.PUT('/api/clients/{id}' as any, {
      params: { path: { id: clientId } },
      body: updateData
    } as any);

    if (response.error) {
      throw new Error(`Update client failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async createClientGroup(groupData: unknown): Promise<unknown> {
    const response = await this.clientManagementClient.POST('/api/groups', {
      body: groupData as any
    });

    if (response.error) {
      throw new Error(`Create client group failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async getClientGroup(groupId: string): Promise<unknown> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.clientManagementClient.GET('/api/groups/{id}' as any, {
      params: { path: { id: groupId } }
    } as any);

    if (response.error) {
      throw new Error(`Get client group failed: ${JSON.stringify(response.error)}`);
    }

    return response.data;
  }

  async associateUserWithClient(clientId: string, userEmail: string): Promise<unknown> {
    // Note: This endpoint might not be in the OpenAPI spec yet
    const response = await this.clientManagementClient.POST('/api/user-client-associations' as any, {
      body: { clientId, userEmail }
    } as any);

    if (response.error) {
      throw new Error(`Associate user with client failed: ${JSON.stringify(response.error)}`);
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