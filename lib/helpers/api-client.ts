import { TypedScriptClient } from '../../scripts/lib/typed-script-client';
import * as dotenv from 'dotenv';
import { TestContextManager } from './test-context-manager';

dotenv.config();

/**
 * ApiClient - Production-ready wrapper around TypedScriptClient for backward compatibility
 * This provides the old ApiClient interface while using the new openapi-fetch based TypedScriptClient
 */
export class ApiClient {
  private typedClient: TypedScriptClient;
  private lastRequestHeaders: Record<string, any> = {};
  private operationalContext: { tenantId?: string; clientId?: string } = {};

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
    this.operationalContext = context;
    // Store operational context for headers
    if (context.tenantId) {
      this.lastRequestHeaders['X-Operation-Tenant-Id'] = context.tenantId;
    }
    if (context.clientId) {
      this.lastRequestHeaders['X-Operation-Client-Id'] = context.clientId;
    }
  }

  clearOperationalContext(): void {
    this.operationalContext = {};
    delete this.lastRequestHeaders['X-Operation-Tenant-Id'];
    delete this.lastRequestHeaders['X-Operation-Client-Id'];
  }

  getLastRequestHeaders(): Record<string, any> {
    return { ...this.lastRequestHeaders };
  }

  async login(email: string, password: string): Promise<any> {
    // Add test context if available
    const testContext = TestContextManager.getInstance().getContextHeader();
    if (testContext) {
      this.lastRequestHeaders['X-Test-Context'] = testContext;
    }

    const result = await this.typedClient.login(email, password);
    return result;
  }

  async register(userData: any): Promise<any> {
    return await this.typedClient.register(userData);
  }

  async createTenant(tenantData: any): Promise<any> {
    return await this.typedClient.createTenant(tenantData);
  }

  async getTenant(tenantId: string): Promise<any> {
    return await this.typedClient.getTenant(tenantId);
  }

  async getTenants(): Promise<any> {
    return await this.typedClient.getTenants();
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

  async createClient(clientData: any): Promise<any> {
    return await this.typedClient.createClient(clientData);
  }

  async getClient(clientId: string): Promise<any> {
    return await this.typedClient.getClient(clientId);
  }

  async getClients(filters?: any): Promise<any> {
    return await this.typedClient.getClients(filters);
  }

  async updateClient(clientId: string, updateData: any): Promise<any> {
    return await this.typedClient.updateClient(clientId, updateData);
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
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
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