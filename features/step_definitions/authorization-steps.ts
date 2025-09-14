import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ApiClient } from '../../lib/helpers/api-client';
import { DatabaseManager } from '../../lib/db/database-manager';

let apiClient: ApiClient;
let dbManager: DatabaseManager;
let currentUserContext: any = {};
let operationalContext: any = {};
let lastApiResponse: any = null;
let lastApiError: any = null;

// User setup and authentication steps
Given('the following users exist:', async function(dataTable: any) {
  const users = dataTable.hashes();

  if (!dbManager) {
    dbManager = new DatabaseManager();
    await dbManager.connect();
  }

  for (const user of users) {
    await dbManager.createTestUser({
      userType: user.UserType,
      email: user.Email,
      tenantId: user.TenantId === 'null' ? null : user.TenantId,
      clientIds: user.ClientIds === 'null' ? null : user.ClientIds?.split(',')
    });
  }
});

Given('I am logged in as UserType {string}', async function(userType: string) {
  if (!apiClient) {
    apiClient = new ApiClient();
  }

  // Set user context for SuperAdmin
  currentUserContext = {
    userType: userType,
    email: 'super@btshift.com',
    tenantId: null,
    clientId: null
  };

  await apiClient.loginWithUserType(userType, 'super@btshift.com');
});

Given('I am logged in as UserType {string} for tenant {string}',
  async function(userType: string, tenantId: string) {
  if (!apiClient) {
    apiClient = new ApiClient();
  }

  // Set user context for TenantAdmin
  currentUserContext = {
    userType: userType,
    email: `admin@${tenantId}.com`,
    tenantId: tenantId,
    clientId: null
  };

  await apiClient.loginWithUserType(userType, `admin@${tenantId}.com`, tenantId);
});

Given('I am logged in as UserType {string} for client {string} in tenant {string}',
  async function(userType: string, clientId: string, tenantId: string) {
  if (!apiClient) {
    apiClient = new ApiClient();
  }

  // Set user context for ClientUser
  currentUserContext = {
    userType: userType,
    email: `user@${clientId}.com`,
    tenantId: tenantId,
    clientId: clientId
  };

  await apiClient.loginWithUserType(userType, `user@${clientId}.com`, tenantId, clientId);
});

Given('I have platform-wide permissions', async function() {
  // Verify SuperAdmin has platform-wide access
  expect(currentUserContext.userType).toBe('SuperAdmin');
  expect(currentUserContext.tenantId).toBeNull();
});

Given('I have tenant-scoped permissions for {string}', async function(tenantId: string) {
  // Verify TenantAdmin has correct tenant scope
  expect(currentUserContext.userType).toBe('TenantAdmin');
  expect(currentUserContext.tenantId).toBe(tenantId);
});

// Operational context steps
Given('I select operational context tenant {string}', async function(tenantId: string) {
  operationalContext.tenantId = tenantId;
  apiClient.setOperationalContext({ tenantId });
});

Given('I select operational context client {string}', async function(clientId: string) {
  operationalContext.clientId = clientId;
  apiClient.setOperationalContext({
    tenantId: operationalContext.tenantId || currentUserContext.tenantId,
    clientId
  });
});

// API operation steps
When('I request tenant list', async function() {
  try {
    lastApiResponse = await apiClient.getTenants();
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I request tenant information', async function() {
  try {
    lastApiResponse = await apiClient.getTenantInfo(currentUserContext.tenantId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I request client information', async function() {
  try {
    lastApiResponse = await apiClient.getClientInfo(currentUserContext.clientId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I attempt to create a new tenant', async function() {
  try {
    lastApiResponse = await apiClient.createTenant({
      name: 'unauthorized-tenant',
      companyName: 'Unauthorized Tenant Company',
      domain: 'unauthorized',
      plan: 'Basic'
    });
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I attempt to access client {string} data', async function(clientId: string) {
  try {
    lastApiResponse = await apiClient.getClientInfo(clientId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I attempt to access tenant {string} data', async function(tenantId: string) {
  try {
    lastApiResponse = await apiClient.getTenantInfo(tenantId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I create a new client for the selected tenant', async function() {
  try {
    lastApiResponse = await apiClient.createClient({
      companyName: 'Test Client Inc',
      taxId: '123456789',
      email: 'test@client.com'
    });
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I update client information', async function() {
  try {
    lastApiResponse = await apiClient.updateClient(currentUserContext.clientId, {
      companyName: 'Updated Client Name'
    });
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I perform operations without selecting operational context', async function() {
  // Clear operational context
  operationalContext = {};
  apiClient.clearOperationalContext();

  try {
    lastApiResponse = await apiClient.getTenants();
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I perform any tenant operation', async function() {
  try {
    lastApiResponse = await apiClient.getTenantInfo(currentUserContext.tenantId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

When('I perform any client operation', async function() {
  try {
    lastApiResponse = await apiClient.getClientInfo(currentUserContext.clientId);
    lastApiError = null;
  } catch (error) {
    lastApiError = error;
    lastApiResponse = null;
  }
});

// Validation steps
Then('I should see all tenants', async function() {
  expect(lastApiResponse).toBeTruthy();
  expect(lastApiResponse.tenants).toBeDefined();
  expect(Array.isArray(lastApiResponse.tenants)).toBe(true);
});

Then('each request should include proper authorization headers', async function() {
  // This would be validated by checking request interceptors
  const lastRequest = apiClient.getLastRequestHeaders();
  expect(lastRequest.Authorization).toMatch(/^Bearer /);
});

Then('I should only see {string} data', async function(scope: string) {
  expect(lastApiResponse).toBeTruthy();

  if (currentUserContext.userType === 'TenantAdmin') {
    expect(lastApiResponse.tenantId || lastApiResponse.tenant?.id).toBe(scope);
  } else if (currentUserContext.userType === 'ClientUser') {
    expect(lastApiResponse.clientId || lastApiResponse.client?.id).toBe(scope);
  }
});

Then('I should not be able to access {string} data', async function(restrictedScope: string) {
  // This should have triggered an error in the When step
  expect(lastApiError).toBeTruthy();
  expect(lastApiError.response?.status).toBe(403);
});

Then('requests should include {string}', async function(expectedHeader: string) {
  const lastRequest = apiClient.getLastRequestHeaders();
  const [headerName, expectedValue] = expectedHeader.split(': ');
  expect(lastRequest[headerName]).toBe(expectedValue);
});

Then('the request should include {string}', async function(expectedHeader: string) {
  const lastRequest = apiClient.getLastRequestHeaders();
  const [headerName, expectedValue] = expectedHeader.split(': ');
  expect(lastRequest[headerName]).toBe(expectedValue);
});

Then('I should receive a {int} Forbidden response', async function(statusCode: number) {
  expect(lastApiError).toBeTruthy();
  expect(lastApiError.response?.status).toBe(statusCode);
});

Then('no tenant should be created', async function() {
  expect(lastApiError).toBeTruthy();
  expect(lastApiResponse).toBeNull();
});

Then('no client-{int} data should be returned', async function(clientNumber: number) {
  expect(lastApiError).toBeTruthy();
  expect(lastApiResponse).toBeNull();
});

Then('no tenant-b data should be returned', async function() {
  expect(lastApiError).toBeTruthy();
  expect(lastApiResponse).toBeNull();
});

Then('the client should be created in {string}', async function(tenantId: string) {
  expect(lastApiResponse).toBeTruthy();
  expect(lastApiResponse.tenantId).toBe(tenantId);
});

Then('I should receive confirmation within tenant context', async function() {
  expect(lastApiResponse).toBeTruthy();
  expect(lastApiResponse.tenantId).toBe(operationalContext.tenantId);
});

Then('only {string} data should be updated', async function(clientId: string) {
  expect(lastApiResponse).toBeTruthy();
  expect(lastApiResponse.clientId || lastApiResponse.client?.id).toBe(clientId);
});

Then('requests should not include tenant or client context headers', async function() {
  const lastRequest = apiClient.getLastRequestHeaders();
  expect(lastRequest['X-Operation-Tenant-Id']).toBeUndefined();
  expect(lastRequest['X-Operation-Client-Id']).toBeUndefined();
});

Then('I should see platform-wide data by default', async function() {
  expect(lastApiResponse).toBeTruthy();
  expect(lastApiResponse.tenants).toBeDefined();
  expect(Array.isArray(lastApiResponse.tenants)).toBe(true);
});

Then('requests should automatically include {string}', async function(expectedHeader: string) {
  const lastRequest = apiClient.getLastRequestHeaders();
  const [headerName, expectedValue] = expectedHeader.split(': ');
  expect(lastRequest[headerName]).toBe(expectedValue);
});

Then('I should not be able to change the tenant context', async function() {
  // Attempt to change context should be ignored or throw error
  expect(() => {
    apiClient.setOperationalContext({ tenantId: 'different-tenant' });
  }).toThrow();
});

Then('I should not be able to change the client or tenant context', async function() {
  // Attempt to change context should be ignored or throw error
  expect(() => {
    apiClient.setOperationalContext({
      tenantId: 'different-tenant',
      clientId: 'different-client'
    });
  }).toThrow();
});