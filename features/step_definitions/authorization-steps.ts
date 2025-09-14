import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AuthorizationTestContext } from '../../lib/helpers/authorization-test-context';
import { TestDataFactory } from '../../lib/helpers/test-data-factory';
import { UserType, TestUser, TestValidationError, ApiErrorResponse, TestApiResponse } from '../../lib/types/test-types';

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
      tenantId: currentContext.tenantId,
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
    const response: TestApiResponse = await apiClient.getTenants();
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
    const response: TestApiResponse = await apiClient.getTenantInfo(userContext.tenantId);
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
    const response: TestApiResponse = await apiClient.getClientInfo(userContext.clientId);
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to create a new tenant', async function() {
  const apiClient = testContext.getApiClient();
  const testTenant = TestDataFactory.createTenant({
    name: 'unauthorized-tenant-attempt'
  });

  try {
    const response: TestApiResponse = await apiClient.createTenant(testTenant);
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to access client {string} data', async function(clientId: string) {
  const apiClient = testContext.getApiClient();

  try {
    const response: TestApiResponse = await apiClient.getClientInfo(clientId);
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I attempt to access tenant {string} data', async function(tenantId: string) {
  const apiClient = testContext.getApiClient();

  try {
    const response: TestApiResponse = await apiClient.getTenantInfo(tenantId);
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

  const testClient = TestDataFactory.createClient(operationalContext.tenantId);

  try {
    const response: TestApiResponse = await apiClient.createClient(testClient);
    testContext.setLastApiResponse(response);
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
    const response: TestApiResponse = await apiClient.updateClient(userContext.clientId, {
      companyName: 'Updated Client Name'
    });
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
    const response: TestApiResponse = await apiClient.getTenants();
    testContext.setLastApiResponse(response);
  } catch (error) {
    testContext.setLastApiError(error as ApiErrorResponse);
  }
});

When('I perform any tenant operation', async function() {
  // Delegate to existing tenant request
  await this.step('When I request tenant information');
});

When('I perform any client operation', async function() {
  // Delegate to existing client request
  await this.step('When I request client information');
});

// Enhanced validation steps
Then('I should see all tenants', async function() {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  expect(response?.tenants).toBeDefined();
  expect(Array.isArray(response?.tenants)).toBe(true);
});

Then('each request should include proper authorization headers', async function() {
  const apiClient = testContext.getApiClient();
  const lastHeaders = apiClient.getLastRequestHeaders();
  expect(lastHeaders.Authorization).toMatch(/^Bearer /);
});

Then('I should only see {string} data', async function(scope: string) {
  const response = testContext.getLastApiResponse();
  const userContext = testContext.getUserContext();

  expect(response).toBeTruthy();

  if (userContext?.userType === 'TenantAdmin') {
    expect(response?.tenantId || response?.data?.tenantId).toBe(scope);
  } else if (userContext?.userType === 'ClientUser') {
    expect(response?.clientId || response?.data?.clientId).toBe(scope);
  }
});

Then('I should not be able to access {string} data', async function(restrictedScope: string) {
  testContext.validateApiError(403);
});

Then('requests should include {string}', async function(expectedHeader: string) {
  const [headerName, expectedValue] = expectedHeader.split(': ');
  testContext.validateOperationalHeaders({ [headerName]: expectedValue });
});

Then('the request should include {string}', async function(expectedHeader: string) {
  await this.step(`Then requests should include "${expectedHeader}"`);
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

Then('no client-{int} data should be returned', async function(clientNumber: number) {
  testContext.validateApiError(403);
});

Then('no tenant-b data should be returned', async function() {
  testContext.validateApiError(403);
});

Then('the client should be created in {string}', async function(tenantId: string) {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  expect(response?.tenantId || response?.data?.tenantId).toBe(tenantId);
});

Then('I should receive confirmation within tenant context', async function() {
  const response = testContext.getLastApiResponse();
  const operationalContext = testContext.getOperationalContext();

  expect(response).toBeTruthy();
  expect(response?.tenantId || response?.data?.tenantId).toBe(operationalContext.tenantId);
});

Then('only {string} data should be updated', async function(clientId: string) {
  const response = testContext.getLastApiResponse();
  expect(response).toBeTruthy();
  expect(response?.clientId || response?.data?.clientId).toBe(clientId);
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
  expect(response?.tenants).toBeDefined();
  expect(Array.isArray(response?.tenants)).toBe(true);
});

Then('requests should automatically include {string}', async function(expectedHeader: string) {
  await this.step(`Then requests should include "${expectedHeader}"`);
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