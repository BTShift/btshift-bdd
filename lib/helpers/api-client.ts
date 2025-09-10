import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import { TestContextManager } from './test-context-manager';

dotenv.config();

export class ApiClient {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_GATEWAY_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token and test context
    this.client.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // Add test context header if available
        const testContext = TestContextManager.getInstance().getContextHeader();
        if (testContext) {
          config.headers['X-Test-Context'] = testContext;
          console.log(`🧪 Adding test context to ${config.method?.toUpperCase()} ${config.url}`);
        }
        
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
    const response = await this.client.post('/api/client-groups', groupData);
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
}