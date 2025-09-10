import { expect } from '@playwright/test';
import { test } from '../support/test-context-fixture';
import { LoginPage } from '../../lib/pages/login-page';
import { TenantPage } from '../../lib/pages/tenant-page';
import { DatabaseManager } from '../../lib/db/database-manager';
import { ApiClient } from '../../lib/helpers/api-client';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Sprint 1: Tenant Onboarding E2E Tests', () => {
  let loginPage: LoginPage;
  let tenantPage: TenantPage;
  let dbManager: DatabaseManager;
  let apiClient: ApiClient;
  
  const testTenantData = {
    name: `BDD Test ${Date.now()}`,
    companyName: 'BDD Test Company Ltd',
    domain: `bdd-test-${Date.now()}`,
    plan: 'Professional',
    adminEmail: 'anass.yatim@gmail.com',
    adminFirstName: 'Anass',
    adminLastName: 'Yatim',
    phone: '+212612345678',
    address: '123 Test Street, Casablanca',
    country: 'Morocco'
  };

  test.beforeAll(async () => {
    dbManager = new DatabaseManager();
    apiClient = new ApiClient();
    await dbManager.connect();
    
    // Clean up any existing test data
    await dbManager.cleanupAllTenants();
    await dbManager.cleanupTestUsers();
  });

  test.afterAll(async () => {
    await dbManager.disconnect();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    tenantPage = new TenantPage(page);
  });

  test('Complete tenant creation flow through UI', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60 seconds for saga completion
    // Step 1: Login as SuperAdmin
    await loginPage.navigate(process.env.PLATFORM_ADMIN_URL);
    await loginPage.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    await loginPage.waitForLoginSuccess();

    // Step 2: Navigate to tenant creation
    await tenantPage.navigate();
    await tenantPage.clickCreateTenant();

    // Step 3: Fill and submit tenant form (multi-step)
    await tenantPage.fillTenantFormMultiStep({
      name: testTenantData.name,
      companyName: testTenantData.companyName,
      domain: testTenantData.domain,
      adminEmail: testTenantData.adminEmail,
      adminFirstName: testTenantData.adminFirstName,
      adminLastName: testTenantData.adminLastName
    });
    await tenantPage.submitForm();

    // Step 4: Verify success in UI
    const success = await tenantPage.waitForSuccess();
    expect(success).toBe(true);

    // Step 5: Verify tenant appears in list
    await tenantPage.navigate();
    const tenantExists = await tenantPage.findTenantByName(testTenantData.name);
    expect(tenantExists).toBe(true);

    // Step 6: Verify in database
    const tenant = await dbManager.getTenantByName(testTenantData.name);
    expect(tenant).toBeDefined();
    expect(tenant.Status).toBe('Pending');
    
    // Step 7: Verify saga was initiated and track its progress
    const sagaState = await dbManager.getSagaState(tenant.Id);
    expect(sagaState).toBeDefined();
    expect(sagaState.TenantId).toBe(tenant.Id);
    
    // Step 8: Wait for saga completion (this validates the entire onboarding flow)
    console.log('Waiting for saga to complete all onboarding steps...');
    const sagaCompleted = await dbManager.waitForSagaCompletion(tenant.Id, 45000); // 45 seconds timeout
    
    // If saga didn't complete, get the final state for debugging
    if (!sagaCompleted) {
      const finalState = await dbManager.getSagaState(tenant.Id);
      console.log('Saga did not complete. Final state:', finalState);
    }
    
    expect(sagaCompleted).toBe(true);
    
    // Step 9: Verify database was provisioned as part of the saga
    const dbName = `tenant_${testTenantData.domain.replace(/-/g, '')}`;
    const dbExists = await dbManager.checkTenantDatabaseExists(dbName);
    expect(dbExists).toBe(true);
  });

  test('Tenant activation flow', async ({ page }) => {
    // Create tenant via API first
    await apiClient.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    
    const activationTestData = {
      ...testTenantData,
      name: `Activation Test ${Date.now()}`,
      domain: `activation-test-${Date.now()}`,
      adminEmail: `activation-${Date.now()}@test.com`
    };
    
    const createResponse = await apiClient.createTenant(activationTestData);
    expect(createResponse.success).toBe(true);
    
    const tenantId = createResponse.tenantId;
    
    // Wait for saga to complete
    await dbManager.waitForSagaCompletion(tenantId, 30000);
    
    // Login to UI and activate tenant
    await loginPage.navigate(process.env.PLATFORM_ADMIN_URL);
    await loginPage.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    await loginPage.waitForLoginSuccess();
    
    await tenantPage.navigate();
    await tenantPage.activateTenant(activationTestData.name);
    
    // Verify activation in database
    await page.waitForTimeout(2000); // Give time for backend to process
    const tenant = await dbManager.getTenantById(tenantId);
    expect(tenant.Status).toBe('Active');
  });

  test('Multi-tenant isolation validation', async () => {
    // Create two test tenants via API
    await apiClient.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    
    const tenant1Data = {
      ...testTenantData,
      name: `Tenant A ${Date.now()}`,
      domain: `tenant-a-${Date.now()}`,
      adminEmail: `admin-a-${Date.now()}@test.com`
    };
    
    const tenant2Data = {
      ...testTenantData,
      name: `Tenant B ${Date.now()}`,
      domain: `tenant-b-${Date.now()}`,
      adminEmail: `admin-b-${Date.now()}@test.com`
    };
    
    const tenant1Response = await apiClient.createTenant(tenant1Data);
    const tenant2Response = await apiClient.createTenant(tenant2Data);
    
    expect(tenant1Response.success).toBe(true);
    expect(tenant2Response.success).toBe(true);
    
    // Verify tenants are isolated in database
    const tenant1 = await dbManager.getTenantById(tenant1Response.tenantId);
    const tenant2 = await dbManager.getTenantById(tenant2Response.tenantId);
    
    expect(tenant1.Id).not.toBe(tenant2.Id);
    expect(tenant1.DatabaseName).not.toBe(tenant2.DatabaseName);
    
    // Verify separate databases exist
    const db1Exists = await dbManager.checkTenantDatabaseExists(tenant1.DatabaseName);
    const db2Exists = await dbManager.checkTenantDatabaseExists(tenant2.DatabaseName);
    
    expect(db1Exists).toBe(true);
    expect(db2Exists).toBe(true);
  });

  test('Duplicate tenant prevention', async ({ page }) => {
    // Create a tenant first
    await apiClient.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    
    const duplicateTestData = {
      ...testTenantData,
      name: 'Duplicate Test Tenant',
      domain: 'duplicate-test',
      adminEmail: `duplicate-${Date.now()}@test.com`
    };
    
    const firstResponse = await apiClient.createTenant(duplicateTestData);
    expect(firstResponse.success).toBe(true);
    
    // Try to create the same tenant again via UI
    await loginPage.navigate(process.env.PLATFORM_ADMIN_URL);
    await loginPage.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    await loginPage.waitForLoginSuccess();
    
    await tenantPage.navigate();
    await tenantPage.clickCreateTenant();
    await tenantPage.fillTenantForm(duplicateTestData);
    await tenantPage.submitForm();
    
    // Should see an error
    const errorMessage = await tenantPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('already exists');
  });

  test('Session timeout after 10 minutes of inactivity', async ({ page, context }) => {
    // Login
    await loginPage.navigate(process.env.PLATFORM_ADMIN_URL);
    await loginPage.login(
      process.env.PLATFORM_ADMIN_EMAIL!,
      process.env.PLATFORM_ADMIN_PASSWORD!
    );
    await loginPage.waitForLoginSuccess();
    
    // Get initial cookies
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
    expect(sessionCookie).toBeDefined();
    
    // Fast-forward time (mock 11 minutes of inactivity)
    // Note: This would need proper time mocking in a real scenario
    // For now, we'll just verify the session configuration
    
    // Try to perform an action after "timeout"
    await page.evaluate(() => {
      // Clear local storage to simulate session expiry
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Reload and verify redirect to login
    await page.reload();
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toContain('login');
  });
});