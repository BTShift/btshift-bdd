import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AuthorizationTestContext } from '../../lib/helpers/authorization-test-context';
import { TestDataFactory } from '../../lib/helpers/test-data-factory';
import { UserType, TestUser, TestValidationError, ApiErrorResponse, TestApiResponse, TestTenant, TestClient } from '../../lib/types/test-types';

let testContext: AuthorizationTestContext;

// Test lifecycle hooks
Before({ tags: '@authorization or @context' }, async function(scenario) {
  const testId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  testContext = AuthorizationTestContext.getInstance(testId);
  await testContext.initialize();

  console.log(`🔐 Starting authorization test: ${scenario.pickle.name}`);
});

After({ tags: '@authorization or @context' }, async function() {
  if (testContext) {
    await testContext.cleanup();
    console.log('🧹 Authorization test cleanup completed');
  }
});

// User setup and authentication steps
Given('the following users exist:', async function(dataTable: any) {
  const users = dataTable.hashes();
  const dbManager = testContext.getDatabaseManager();

  for (const user of users) {
    const testUser: TestUser = {
      userType: user.UserType as UserType,
      email: user.Email,
      tenantId: user.TenantId === 'null' ? null : user.TenantId,
      clientIds: user.ClientIds === 'null' ? null : user.ClientIds?.split(',')
    };

    await dbManager.createTestUser(testUser);
  }
});

Given('I am logged in as UserType {string}', async function(userType: string) {
  const apiClient = testContext.getApiClient();
  const testUser = TestDataFactory.createSuperAdminUser({
    userType: userType as UserType
  });

  testContext.setUserContext({
    userType: userType as UserType,
    email: testUser.email,
    tenantId: null,
    clientId: null
  });

  await apiClient.loginWithUserType(userType, testUser.email);
});

Given('I am logged in as UserType {string} for tenant {string}',
  async function(userType: string, tenantId: string) {
  const apiClient = testContext.getApiClient();
  const testUser = TestDataFactory.createTenantAdminUser(tenantId, {
    userType: userType as UserType
  });

  testContext.setUserContext({
    userType: userType as UserType,
    email: testUser.email,
    tenantId: tenantId,
    clientId: null
  });

  await apiClient.loginWithUserType(userType, testUser.email, tenantId);
});

Given('I am logged in as UserType {string} for client {string} in tenant {string}',
  async function(userType: string, clientId: string, tenantId: string) {
  const apiClient = testContext.getApiClient();
  const testUser = TestDataFactory.createClientUser(tenantId, clientId, {
    userType: userType as UserType
  });

  testContext.setUserContext({
    userType: userType as UserType,
    email: testUser.email,
    tenantId: tenantId,
    clientId: clientId
  });

  await apiClient.loginWithUserType(userType, testUser.email, tenantId, clientId);
});

Given('I have platform-wide permissions', async function() {
  testContext.validateAuthorizationBoundary('SuperAdmin');
});

Given('I have tenant-scoped permissions for {string}', async function(tenantId: string) {
  testContext.validateAuthorizationBoundary('TenantAdmin', tenantId);
});

// Operational context steps
Given('I select operational context tenant {string}', async function(tenantId: string) {
  try {
    testContext.setOperationalContext({ tenantId });
  } catch (error) {
    throw new TestValidationError(`Failed to set tenant context: ${error}`, { tenantId });
  }
});

Given('I select operational context client {string}', async function(clientId: string) {
  try {
    const currentContext = testContext.getOperationalContext();
    testContext.setOperationalContext({
      tenantId: currentContext.tenantId || '',
      clientId
    });
  } catch (error) {
    throw new TestValidationError(`Failed to set client context: ${error}`, { clientId });
  }
});

// API operation steps with proper error handling
When('I request tenant list', async function() {
  const apiClient = testContext.getApiClient();

  try {
    const tenants = await apiClient.getTenants();
    const response: TestApiResponse<TestTenant[]> = {
      success: true,
      data: tenants
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I request tenant information', async function() {
  const apiClient = testContext.getApiClient();
  const userContext = testContext.getUserContext();

  if (!userContext?.tenantId) {
    throw new TestValidationError('No tenant context available for request');
  }

  try {
    const tenant = await apiClient.getTenantInfo(userContext.tenantId);
    const response: TestApiResponse<TestTenant> = {
      success: true,
      data: tenant
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I request client information', async function() {
  const apiClient = testContext.getApiClient();
  const userContext = testContext.getUserContext();

  if (!userContext?.clientId) {
    throw new TestValidationError('No client context available for request');
  }

  try {
    const client = await apiClient.getClientInfo(userContext.clientId);
    const response: TestApiResponse<TestClient> = {
      success: true,
      data: client
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to create a new tenant', async function() {
  const apiClient = testContext.getApiClient();

  // Create proper TenantCreateRequest
  const tenantRequest = {
    name: 'unauthorized-tenant-attempt',
    companyName: 'Unauthorized Tenant Company',
    domain: 'unauthorized-tenant',
    adminEmail: 'admin@unauthorized.com'
  };

  try {
    const response = await apiClient.createTenant(tenantRequest);
    const wrappedResponse: TestApiResponse = {
      success: response.success,
      data: response.data
    };
    testContext.setLastApiResponse(wrappedResponse);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to access client {string} data', async function(clientId: string) {
  const apiClient = testContext.getApiClient();

  try {
    const client = await apiClient.getClientInfo(clientId);
    const response: TestApiResponse<TestClient> = {
      success: true,
      data: client
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to access tenant {string} data', async function(tenantId: string) {
  const apiClient = testContext.getApiClient();

  try {
    const tenant = await apiClient.getTenantInfo(tenantId);
    const response: TestApiResponse<TestTenant> = {
      success: true,
      data: tenant
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I create a new client for the selected tenant', async function() {
  const apiClient = testContext.getApiClient();
  const operationalContext = testContext.getOperationalContext();

  if (!operationalContext.tenantId) {
    throw new TestValidationError('No operational tenant context set');
  }

  // Create proper ClientCreateRequest
  const clientRequest = {
    companyName: 'Test Client Company',
    taxId: `TAX${Date.now()}`,
    email: `client${Date.now()}@test.com`
  };

  try {
    const response = await apiClient.createClient(clientRequest);
    const wrappedResponse: TestApiResponse = {
      success: response.success,
      data: response.data
    };
    testContext.setLastApiResponse(wrappedResponse);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I update client information', async function() {
  const apiClient = testContext.getApiClient();
  const userContext = testContext.getUserContext();

  if (!userContext?.clientId) {
    throw new TestValidationError('No client context available for update');
  }

  try {
    const updatedClient = await apiClient.updateClient(userContext.clientId, {
      companyName: 'Updated Client Name'
    });
    const response: TestApiResponse = {
      success: true,
      data: updatedClient
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

// Additional context operations
When('I perform operations without selecting operational context', async function() {
  testContext.clearOperationalContext();

  const apiClient = testContext.getApiClient();
  try {
    const tenants = await apiClient.getTenants();
    const response: TestApiResponse<TestTenant[]> = {
      success: true,
      data: tenants
    };
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I perform any tenant operation', async function() {
  // Delegate to existing tenant request
  await this['step']('When I request tenant information');
});

When('I perform any client operation', async function() {
  // Delegate to existing client request
  await this['step']('When I request client information');
});

// Enhanced validation steps
Then('I should see all tenants', async function() {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  expect(response?.data).toBeDefined();
  expect(Array.isArray(response?.data)).toBe(true);
});

Then('each request should include proper authorization headers', async function() {
  const apiClient = testContext.getApiClient();
  const lastHeaders = apiClient.getLastRequestHeaders();
  expect(lastHeaders['Authorization']).toMatch(/^Bearer /);
});

Then('I should only see {string} data', async function(scope: string) {
  const response = testContext.getLastApiResponse();
  const userContext = testContext.getUserContext();

  expect(response).toBeTruthy();

  if (userContext?.userType === 'TenantAdmin') {
    const data = response?.data as any;
    expect(response?.tenantId || data?.tenantId).toBe(scope);
  } else if (userContext?.userType === 'ClientUser') {
    const data = response?.data as any;
    expect(response?.clientId || data?.clientId).toBe(scope);
  }
});

Then('I should not be able to access {string} data', async function(_restrictedScope: string) {
  testContext.validateApiError(403);
});

Then('requests should include {string}', async function(expectedHeader: string) {
  const [headerName, expectedValue] = expectedHeader.split(': ');
  const headers: Record<string, string> = {};
  if (headerName) headers[headerName] = expectedValue || '';
  testContext.validateOperationalHeaders(headers);
});

Then('the request should include {string}', async function(expectedHeader: string) {
  await this['step'](`Then requests should include "${expectedHeader}"`);
});

Then('I should receive a {int} Forbidden response', async function(statusCode: number) {
  testContext.validateApiError(statusCode);
});

Then('no tenant should be created', async function() {
  const error = testContext.getLastApiError();
  const response = testContext.getLastApiResponse();

  expect(error).toBeTruthy();
  expect(response).toBeNull();
});

Then('no client-{int} data should be returned', async function(_clientNumber: number) {
  testContext.validateApiError(403);
});

Then('no tenant-b data should be returned', async function() {
  testContext.validateApiError(403);
});

Then('the client should be created in {string}', async function(tenantId: string) {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  const data = response?.data as any;
  expect(data?.tenantId).toBe(tenantId);
});

Then('I should receive confirmation within tenant context', async function() {
  const response = testContext.getLastApiResponse();
  const operationalContext = testContext.getOperationalContext();

  expect(response).toBeTruthy();
  const data = response?.data as any;
  expect(data?.tenantId).toBe(operationalContext.tenantId);
});

Then('only {string} data should be updated', async function(clientId: string) {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  const data = response?.data as any;
  expect(data?.clientId).toBe(clientId);
});

Then('requests should not include tenant or client context headers', async function() {
  const apiClient = testContext.getApiClient();
  const lastHeaders = apiClient.getLastRequestHeaders();
  expect(lastHeaders['X-Operation-Tenant-Id']).toBeUndefined();
  expect(lastHeaders['X-Operation-Client-Id']).toBeUndefined();
});

Then('I should see platform-wide data by default', async function() {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  expect(response?.data).toBeDefined();
  expect(Array.isArray(response?.data)).toBe(true);
});

Then('requests should automatically include {string}', async function(expectedHeader: string) {
  await this['step'](`Then requests should include "${expectedHeader}"`);
});

Then('I should not be able to change the tenant context', async function() {
  expect(() => {
    testContext.setOperationalContext({ tenantId: 'different-tenant' });
  }).toThrow('TenantAdmin cannot change tenant context');
});

Then('I should not be able to change the client or tenant context', async function() {
  expect(() => {
    testContext.setOperationalContext({
      tenantId: 'different-tenant',
      clientId: 'different-client'
    });
  }).toThrow(/ClientUser cannot change (tenant|client) context/);
});