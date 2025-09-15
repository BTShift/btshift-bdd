import { TypedScriptClient } from '../../scripts/lib/typed-script-client';
import * as dotenv from 'dotenv';
import { TestContextManager } from './test-context-manager';
import {
  LoginResponse,
  TenantCreateRequest,
  TenantCreateResponse,
  ClientCreateRequest,
  ClientCreateResponse,
  UserCreateRequest,
  UserCreateResponse,
  TestTenant,
  TestClient,
  UserType
} from '../types/test-types';

dotenv.config();

/**
 * ApiClient - Production-ready wrapper around TypedScriptClient for backward compatibility
 * This provides the old ApiClient interface while using the new openapi-fetch based TypedScriptClient
 */
export class ApiClient {
  private typedClient: TypedScriptClient;
  private lastRequestHeaders: Record<string, any> = {};

  constructor() {
    this.typedClient = new TypedScriptClient();
  }

  setAuthToken(token: string): void {
    this.typedClient.setAuthToken(token);
  }

  clearAuthToken(): void {
    this.typedClient.clearAuthToken();
  }

  setOperationalContext(context: { tenantId?: string; clientId?: string }): void {
    // Store operational context for headers
    if (context.tenantId) {
      this.lastRequestHeaders['X-Operation-Tenant-Id'] = context.tenantId;
    }
    if (context.clientId) {
      this.lastRequestHeaders['X-Operation-Client-Id'] = context.clientId;
    }
  }

  clearOperationalContext(): void {
    delete this.lastRequestHeaders['X-Operation-Tenant-Id'];
    delete this.lastRequestHeaders['X-Operation-Client-Id'];
  }

  getLastRequestHeaders(): Record<string, any> {
    return { ...this.lastRequestHeaders };
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    // Add test context if available
    const testContext = TestContextManager.getInstance().getContextHeader();
    if (testContext) {
      this.lastRequestHeaders['X-Test-Context'] = testContext;
    }

    const result = await this.typedClient.login(email, password);
    // Wrap in success format
    const response: LoginResponse = {
      success: true,
      tokenInfo: result.tokenInfo ? {
        accessToken: result.tokenInfo.accessToken || '',
        refreshToken: result.tokenInfo.refreshToken || '',
        expiresIn: parseInt(result.tokenInfo.expiresIn || '3600'),
        tokenType: result.tokenInfo.tokenType || 'Bearer'
      } : undefined,
      userInfo: result.userInfo ? {
        userId: result.userInfo.id || '',
        email: result.userInfo.email || email,
        userType: (result.userInfo.userType as UserType) || 'ClientUser'
      } : undefined
    };
    return response;
  }

  async register(userData: UserCreateRequest): Promise<UserCreateResponse> {
    const result = await this.typedClient.register(userData);
    return {
      success: true,
      data: { userId: (result as any).userId || '', email: userData.email, userType: userData.userType }
    };
  }

  async createTenant(tenantData: TenantCreateRequest): Promise<TenantCreateResponse> {
    const result = await this.typedClient.createTenant(tenantData);
    return {
      success: true,
      tenantId: (result as any).tenantId,
      data: {
        id: (result as any).tenantId || '',
        name: tenantData.name,
        companyName: tenantData.companyName,
        domain: tenantData.domain,
        status: 'Pending',
        databaseName: (result as any).databaseName || ''
      }
    };
  }

  async getTenant(tenantId: string): Promise<TestTenant> {
    const result = await this.typedClient.getTenant(tenantId);
    if (!result) throw new Error('Tenant not found');
    return {
      id: result.id || tenantId,
      name: result.name || '',
      companyName: result.companyName || '',
      domain: result.domain || '',
      status: (result.status as any) || 'Active',
      databaseName: result.databaseName || ''
    };
  }

  async getTenants(): Promise<TestTenant[]> {
    const results = await this.typedClient.getTenants();
    return results.map(t => ({
      id: t.id || '',
      name: t.name || '',
      companyName: t.companyName || '',
      domain: t.domain || '',
      status: (t.status as any) || 'Active',
      databaseName: t.databaseName || ''
    }));
  }

  async activateTenant(tenantId: string): Promise<any> {
    return await this.typedClient.activateTenant(tenantId);
  }

  async resendWelcomeEmail(tenantId: string): Promise<any> {
    return await this.typedClient.resendWelcomeEmail(tenantId);
  }

  async inviteUser(userData: any): Promise<any> {
    return await this.typedClient.inviteUser(userData);
  }

  async createUser(userData: any): Promise<any> {
    return await this.typedClient.createUser(userData);
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    return await this.typedClient.resetPassword(token, newPassword);
  }

  async validateToken(token: string): Promise<any> {
    return await this.typedClient.validateToken(token);
  }

  async createClient(clientData: ClientCreateRequest): Promise<ClientCreateResponse> {
    const result = await this.typedClient.createClient(clientData);
    return {
      success: true,
      data: {
        id: (result as any).clientId || '',
        companyName: clientData.companyName,
        taxId: clientData.taxId,
        email: clientData.email,
        tenantId: ''
      }
    };
  }

  async getClient(clientId: string): Promise<TestClient> {
    const result = await this.typedClient.getClient(clientId);
    if (!result) throw new Error('Client not found');
    return {
      id: (result as any).clientId || clientId,
      companyName: (result as any).companyName || '',
      taxId: (result as any).iceNumber || '',
      email: '',
      tenantId: ''
    };
  }

  async getClients(filters?: Record<string, unknown>): Promise<TestClient[]> {
    const results = await this.typedClient.getClients(filters);
    return results.map(c => ({
      id: (c as any).clientId || '',
      companyName: (c as any).companyName || '',
      taxId: (c as any).iceNumber || '',
      email: '',
      tenantId: ''
    }));
  }

  async updateClient(clientId: string, updateData: Partial<ClientCreateRequest>): Promise<TestClient> {
    await this.typedClient.updateClient(clientId, updateData);
    return {
      id: clientId,
      companyName: updateData.companyName || '',
      taxId: updateData.taxId || '',
      email: updateData.email || '',
      tenantId: ''
    };
  }

  async createClientGroup(groupData: any): Promise<any> {
    return await this.typedClient.createClientGroup(groupData);
  }

  async getClientGroup(groupId: string): Promise<any> {
    return await this.typedClient.getClientGroup(groupId);
  }

  async associateUserWithClient(clientId: string, userEmail: string): Promise<any> {
    return await this.typedClient.associateUserWithClient(clientId, userEmail);
  }

  // Add any other methods that were used in the old ApiClient
  async getTenantInfo(tenantId: string): Promise<any> {
    return await this.typedClient.getTenant(tenantId);
  }

  async getClientInfo(clientId: string): Promise<any> {
    return await this.typedClient.getClient(clientId);
  }

  async loginWithUserType(userType: string, email: string, tenantId?: string, clientId?: string): Promise<any> {
    // This method needs custom implementation
    const loginData: any = {
      email,
      password: process.env['TEST_USER_PASSWORD'] || 'TestPassword123!',
      userType
    };

    if (tenantId) {
      loginData.tenantId = tenantId;
      this.setOperationalContext({ tenantId });
    }
    if (clientId) {
      loginData.clientId = clientId;
      this.setOperationalContext({ clientId });
    }

    // Use the identity client directly for custom endpoints
    const response = await this.typedClient.identity.POST('/api/authentication/login-with-usertype' as any, {
      body: loginData
    } as any);

    if (!response.error && response.data) {
      const data = response.data as any;
      if (data.success && data.tokenInfo?.accessToken) {
        this.setAuthToken(data.tokenInfo.accessToken);
        return data;
      }
    }

    throw new Error(`Login with UserType failed: ${response.error || 'Unknown error'}`);
  }
}

export default ApiClient;