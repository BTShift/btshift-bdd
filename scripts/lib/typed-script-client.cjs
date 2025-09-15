const createClient = require('openapi-fetch').default;
const dotenv = require('dotenv');

dotenv.config();

class TypedScriptClient {
  constructor() {
    this.authToken = null;
    this.operationalContext = {};
    this.baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:5000';

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    this.identityClient = createClient({
      baseUrl: this.baseUrl,
      headers: defaultHeaders,
    });

    this.tenantClient = createClient({
      baseUrl: this.baseUrl,
      headers: defaultHeaders,
    });

    this.clientManagementClient = createClient({
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

  setAuthToken(token) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  setOperationalContext(context) {
    this.operationalContext = { ...this.operationalContext, ...context };
  }

  clearOperationalContext() {
    this.operationalContext = {};
  }

  async login(email, password) {
    const response = await this.identityClient.POST('/api/authentication/login', {
      body: { email, password }
    });

    if (response.error) {
      throw new Error(`Login failed: ${response.error}`);
    }

    const data = response.data;
    if (data?.success && data?.tokenInfo) {
      this.setAuthToken(data.tokenInfo.accessToken);
      return data;
    }

    if (data?.tokenInfo?.accessToken) {
      this.setAuthToken(data.tokenInfo.accessToken);
      return data;
    }

    throw new Error('Login failed: Invalid response');
  }

  async inviteUser(userData) {
    const response = await this.identityClient.POST('/api/users/invite', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Invite user failed: ${response.error}`);
    }

    return response.data;
  }

  async createUser(userData) {
    const response = await this.identityClient.POST('/api/users', {
      body: userData
    });

    if (response.error) {
      throw new Error(`Create user failed: ${response.error}`);
    }

    return response.data;
  }

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

module.exports = { TypedScriptClient };