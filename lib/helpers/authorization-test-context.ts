import { TestUserContext, TestOperationalContext, ApiErrorResponse, TestApiResponse } from '../types/test-types';
import { ApiClient } from './api-client';
import { DatabaseManager } from '../db/database-manager';

export class AuthorizationTestContext {
  private userContext: TestUserContext | null = null;
  private operationalContext: TestOperationalContext = {};
  private lastApiResponse: TestApiResponse | null = null;
  private lastApiError: ApiErrorResponse | null = null;
  private apiClient: ApiClient | null = null;
  private dbManager: DatabaseManager | null = null;

  // Singleton pattern for test isolation
  private static instances = new Map<string, AuthorizationTestContext>();

  static getInstance(testId?: string): AuthorizationTestContext {
    const id = testId || 'default';
    if (!this.instances.has(id)) {
      this.instances.set(id, new AuthorizationTestContext());
    }
    return this.instances.get(id)!;
  }

  static clearInstance(testId?: string): void {
    const id = testId || 'default';
    this.instances.delete(id);
  }

  async initialize(): Promise<void> {
    if (!this.apiClient) {
      this.apiClient = new ApiClient();
    }

    if (!this.dbManager) {
      this.dbManager = new DatabaseManager();
      await this.dbManager.connect();
    }
  }

  async cleanup(): Promise<void> {
    if (this.dbManager) {
      await this.dbManager.disconnect();
      this.dbManager = null;
    }

    this.userContext = null;
    this.operationalContext = {};
    this.lastApiResponse = null;
    this.lastApiError = null;
    this.apiClient = null;
  }

  // User context management
  setUserContext(context: TestUserContext): void {
    this.userContext = context;

    // Automatically set operational context based on user type
    if (context.tenantId) {
      this.operationalContext.tenantId = context.tenantId;
    }
    if (context.clientId) {
      this.operationalContext.clientId = context.clientId;
    }
  }

  getUserContext(): TestUserContext | null {
    return this.userContext;
  }

  // Operational context management
  setOperationalContext(context: TestOperationalContext): void {
    // Validate context changes based on user type
    if (this.userContext) {
      this.validateContextChange(context);
    }

    this.operationalContext = { ...this.operationalContext, ...context };

    if (this.apiClient) {
      this.apiClient.setOperationalContext(this.operationalContext);
    }
  }

  getOperationalContext(): TestOperationalContext {
    return { ...this.operationalContext };
  }

  clearOperationalContext(): void {
    this.operationalContext = {};
    if (this.apiClient) {
      this.apiClient.clearOperationalContext();
    }
  }

  // API response management
  setLastApiResponse(response: TestApiResponse | null): void {
    this.lastApiResponse = response;
    this.lastApiError = null;
  }

  setLastApiError(error: ApiErrorResponse): void {
    this.lastApiError = error;
    this.lastApiResponse = null;
  }

  getLastApiResponse(): TestApiResponse | null {
    return this.lastApiResponse;
  }

  getLastApiError(): ApiErrorResponse | null {
    return this.lastApiError;
  }

  // Client access
  getApiClient(): ApiClient {
    if (!this.apiClient) {
      throw new Error('ApiClient not initialized. Call initialize() first.');
    }
    return this.apiClient;
  }

  getDatabaseManager(): DatabaseManager {
    if (!this.dbManager) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.');
    }
    return this.dbManager;
  }

  // Validation helpers
  private validateContextChange(newContext: TestOperationalContext): void {
    if (!this.userContext) {
      return;
    }

    const { userType, tenantId, clientId } = this.userContext;

    // TenantAdmin cannot change tenant context
    if (userType === 'TenantAdmin') {
      if (newContext.tenantId && newContext.tenantId !== tenantId) {
        throw new Error('TenantAdmin cannot change tenant context');
      }
    }

    // ClientUser cannot change tenant or client context
    if (userType === 'ClientUser') {
      if (newContext.tenantId && newContext.tenantId !== tenantId) {
        throw new Error('ClientUser cannot change tenant context');
      }
      if (newContext.clientId && newContext.clientId !== clientId) {
        throw new Error('ClientUser cannot change client context');
      }
    }
  }

  // Validation methods for tests
  validateAuthorizationBoundary(expectedUserType: string, expectedScope?: string): void {
    if (!this.userContext) {
      throw new Error('No user context set for authorization validation');
    }

    if (this.userContext.userType !== expectedUserType) {
      throw new Error(`Expected user type ${expectedUserType}, got ${this.userContext.userType}`);
    }

    if (expectedScope) {
      const actualScope = this.userContext.tenantId || this.userContext.clientId;
      if (actualScope !== expectedScope) {
        throw new Error(`Expected scope ${expectedScope}, got ${actualScope}`);
      }
    }
  }

  validateOperationalHeaders(expectedHeaders: Record<string, string>): void {
    if (!this.apiClient) {
      throw new Error('ApiClient not available for header validation');
    }

    const lastHeaders = this.apiClient.getLastRequestHeaders();

    for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
      if (lastHeaders[headerName] !== expectedValue) {
        throw new Error(
          `Expected header ${headerName}: ${expectedValue}, got ${lastHeaders[headerName]}`
        );
      }
    }
  }

  validateApiError(expectedStatus: number, expectedMessage?: string): void {
    if (!this.lastApiError) {
      throw new Error('No API error recorded for validation');
    }

    if (this.lastApiError.response?.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${this.lastApiError.response?.status}`
      );
    }

    if (expectedMessage && this.lastApiError.response?.data?.message !== expectedMessage) {
      throw new Error(
        `Expected message "${expectedMessage}", got "${this.lastApiError.response?.data?.message}"`
      );
    }
  }
}