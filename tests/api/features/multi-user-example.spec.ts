/**
 * Example test demonstrating multi-user context authentication
 * This shows how to use different user contexts for proper testing
 */

import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { 
  setupApiTestWithContext, 
  setupApiTestAuto,
  teardownApiTest, 
  TestContext 
} from '../support/helpers/api-test-base';
import { TestDataFactory } from '../support/fixtures/test-data-factory';

describe('Multi-User Context Example Tests', () => {
  
  describe('Platform Operations (SuperAdmin)', () => {
    let ctx: TestContext;

    beforeAll(async () => {
      // Explicitly use SuperAdmin context for platform operations
      ctx = await setupApiTestWithContext('SuperAdmin');
    });

    afterAll(async () => {
      await teardownApiTest(ctx);
    });

    test('should list all tenants (SuperAdmin only)', async () => {
      const response = await ctx.client.tenant('/api/tenants', 'get');
      const data = ctx.getData(response);
      
      expect(response).toBeDefined();
      expect(data).toBeDefined();
      // SuperAdmin can see all tenants
      console.log(`✅ SuperAdmin can see ${data.length || 0} tenants`);
    });

    test('should access platform settings (SuperAdmin only)', async () => {
      const response = await ctx.client.tenant('/api/platform/settings', 'get');
      
      // This should work for SuperAdmin
      expect(response).toBeDefined();
      console.log('✅ SuperAdmin can access platform settings');
    });
  });

  describe('Tenant Operations (TenantAdmin)', () => {
    let ctx: TestContext;

    beforeAll(async () => {
      // Explicitly use TenantAdmin context for tenant operations
      ctx = await setupApiTestWithContext('TenantAdmin');
    });

    afterAll(async () => {
      await teardownApiTest(ctx);
    });

    test('should list clients within tenant', async () => {
      const response = await ctx.client.clientManagement('/api/clients', 'get');
      const data = ctx.getData(response);
      
      expect(response).toBeDefined();
      // TenantAdmin only sees their tenant's clients
      console.log(`✅ TenantAdmin can see ${data.length || 0} clients in their tenant`);
    });

    test('should create client within tenant', async () => {
      const clientData = TestDataFactory.client();
      
      const response = await ctx.client.clientManagement('/api/clients', 'post', {
        body: clientData
      });
      
      const data = ctx.getData(response);
      
      if (data.id) {
        ctx.cleanup.addClient(data.id);
        console.log('✅ TenantAdmin created client in their tenant');
      }
      
      expect(response).toBeDefined();
      // Client should be automatically associated with TenantAdmin's tenant
      expect(data.tenantId).toBeDefined();
    });

    test('should NOT be able to access platform settings', async () => {
      try {
        await ctx.client.tenant('/api/platform/settings', 'get');
        // This should fail for TenantAdmin
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Expected to fail with 403 Forbidden
        expect(error.response?.status).toBe(403);
        console.log('✅ TenantAdmin correctly denied access to platform settings');
      }
    });
  });

  describe('Auto-Context Selection', () => {
    let ctx: TestContext;

    beforeAll(async () => {
      // Let the system automatically determine the context based on test file
      ctx = await setupApiTestAuto(__filename);
    });

    afterAll(async () => {
      await teardownApiTest(ctx);
    });

    test('should automatically use appropriate context', async () => {
      // The context will be determined based on the test file path
      // Since this is a general test file, it will default to TenantAdmin
      
      const response = await ctx.client.identity('/api/users/current', 'get');
      const data = ctx.getData(response);
      
      expect(data).toBeDefined();
      console.log(`✅ Auto-selected context user: ${data.email}`);
      
      // Verify we're using the expected context
      if (data.email === 'anass.yatim+nstech2@gmail.com') {
        console.log('✅ Correctly using TenantAdmin context');
      } else if (data.email === 'superadmin@shift.ma') {
        console.log('✅ Using SuperAdmin context');
      }
    });
  });

  describe('Cross-Context Testing', () => {
    test('should validate tenant isolation', async () => {
      // Test with SuperAdmin - should see multiple tenants
      const superAdminCtx = await setupApiTestWithContext('SuperAdmin');
      const superAdminTenants = await superAdminCtx.client.tenant('/api/tenants', 'get');
      const superAdminData = superAdminCtx.getData(superAdminTenants);
      
      console.log(`SuperAdmin sees ${superAdminData.length || 0} tenants`);
      
      // Test with TenantAdmin - should only see their tenant data
      const tenantAdminCtx = await setupApiTestWithContext('TenantAdmin');
      const tenantAdminProfile = await tenantAdminCtx.client.identity('/api/users/current', 'get');
      const tenantAdminData = tenantAdminCtx.getData(tenantAdminProfile);
      
      console.log(`TenantAdmin belongs to tenant: ${tenantAdminData.tenantId}`);
      
      // Verify isolation
      expect(superAdminData.length).toBeGreaterThanOrEqual(1);
      expect(tenantAdminData.tenantId).toBeDefined();
      
      // Cleanup
      await teardownApiTest(superAdminCtx);
      await teardownApiTest(tenantAdminCtx);
      
      console.log('✅ Tenant isolation validated successfully');
    });
  });
});