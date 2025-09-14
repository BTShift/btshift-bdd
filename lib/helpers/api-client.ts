import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import { TestContextManager } from './test-context-manager';

dotenv.config();

export class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private operationalContext: any = {};
  private lastRequestHeaders: any = {};

  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_GATEWAY_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token, operational context, and test context
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add operational context headers
        if (this.operationalContext.tenantId) {
          config.headers['X-Operation-Tenant-Id'] = this.operationalContext.tenantId;
        }

        if (this.operationalContext.clientId) {
          config.headers['X-Operation-Client-Id'] = this.operationalContext.clientId;
        }

        // Add test context header if available
        const testContext = TestContextManager.getInstance().getContextHeader();
        if (testContext) {
          config.headers['X-Test-Context'] = testContext;
          console.log(`🧪 Adding test context to ${config.method?.toUpperCase()} ${config.url}`);
        }

        // Store headers for validation
        this.lastRequestHeaders = { ...config.headers };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async login(email: string, password: string): Promise<any> {
    const response = await this.client.post('/api/authentication/login', {
      email,
      password,
    });

    if (response.data.success && response.data.tokenInfo) {
      this.setAuthToken(response.data.tokenInfo.accessToken);
      return response.data;
    }

    throw new Error(`Login failed: ${response.data.message}`);
  }

  async register(userData: any): Promise<any> {
    const response = await this.client.post('/api/authentication/register', userData);
    return response.data;
  }

  async createTenant(tenantData: any): Promise<any> {
    const response = await this.client.post('/api/tenants', tenantData);
    return response.data;
  }

  async getTenant(tenantId: string): Promise<any> {
    const response = await this.client.get(`/api/tenants/${tenantId}`);
    return response.data;
  }

  async activateTenant(tenantId: string): Promise<any> {
    const response = await this.client.post(`/api/tenants/${tenantId}/activate`);
    return response.data;
  }

  async resendWelcomeEmail(tenantId: string): Promise<any> {
    const response = await this.client.post(`/api/tenants/${tenantId}/resend-welcome`);
    return response.data;
  }

  async createClient(clientData: any): Promise<any> {
    const response = await this.client.post('/api/clients', clientData);
    return response.data;
  }

  async getClients(): Promise<any> {
    const response = await this.client.get('/api/clients');
    return response.data;
  }

  async createClientGroup(groupData: any): Promise<any> {
    const response = await this.client.post('/api/groups', groupData);
    return response.data;
  }

  async associateUserWithClient(userId: string, clientId: string): Promise<any> {
    const response = await this.client.post('/api/user-client-associations', {
      userId,
      clientId,
    });
    return response.data;
  }

  async inviteUser(userData: any): Promise<any> {
    const response = await this.client.post('/api/users/invite', userData);
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const response = await this.client.post('/api/authentication/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  }

  async validateToken(token: string): Promise<any> {
    const response = await this.client.get(`/api/authentication/validate-token?token=${token}`);
    return response.data;
  }

  // New authorization methods
  async loginWithUserType(userType: string, email: string, tenantId?: string, clientId?: string): Promise<any> {
    const loginData: any = {
      email,
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
      userType
    };

    if (tenantId) loginData.tenantId = tenantId;
    if (clientId) loginData.clientId = clientId;

    const response = await this.client.post('/api/authentication/login-with-usertype', loginData);

    if (response.data.success && response.data.tokenInfo) {
      this.setAuthToken(response.data.tokenInfo.accessToken);

      // Set operational context based on user type
      if (tenantId) {
        this.operationalContext.tenantId = tenantId;
      }
      if (clientId) {
        this.operationalContext.clientId = clientId;
      }

      return response.data;
    }

    throw new Error(`Login with UserType failed: ${response.data.message}`);
  }

  setOperationalContext(context: { tenantId?: string; clientId?: string }): void {
    this.operationalContext = { ...this.operationalContext, ...context };
  }

  clearOperationalContext(): void {
    this.operationalContext = {};
  }

  getLastRequestHeaders(): any {
    return this.lastRequestHeaders;
  }

  async getTenants(): Promise<any> {
    const response = await this.client.get('/api/tenants');
    return response.data;
  }

  async getTenantInfo(tenantId: string): Promise<any> {
    const response = await this.client.get(`/api/tenants/${tenantId}/info`);
    return response.data;
  }

  async getClientInfo(clientId: string): Promise<any> {
    const response = await this.client.get(`/api/clients/${clientId}`);
    return response.data;
  }

  async updateClient(clientId: string, updateData: any): Promise<any> {
    const response = await this.client.put(`/api/clients/${clientId}`, updateData);
    return response.data;
  }

  async getClientGroup(groupId: string): Promise<any> {
    const response = await this.client.get(`/api/groups/${groupId}`);
    return response.data;
  }

  async getClients(filters?: any): Promise<any> {
    let url = '/api/clients';
    if (filters) {
      const params = new URLSearchParams(filters).toString();
      url += `?${params}`;
    }
    const response = await this.client.get(url);
    return response.data;
  }

  async associateUserWithClient(clientId: string, userEmail: string): Promise<any> {
    const response = await this.client.post('/api/user-client-associations', {
      clientId,
      userEmail,
    });
    return response.data;
  }
}