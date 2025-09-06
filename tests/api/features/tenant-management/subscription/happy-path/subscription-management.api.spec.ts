import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Tenant Management - Subscription Operations', () => {
  let ctx: TestContext;
  let testTenantId: string;

  beforeAll(async () => {
    ctx = await setupApiTest();
    
    // Create a test tenant
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    testTenantId = (created as any).id;
    ctx.cleanup.addTenant(testTenantId);
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should update tenant subscription plan', async () => {
    const response = await ctx.client.tenant(`/api/tenants/${testTenantId}/subscription`, 'put', {
      body: {
        plan: 'Professional',
        user_limit: 50,
        storage_limit_gb: 100,
        enabled_modules: ['accounting', 'invoicing', 'reporting'],
        billing_cycle: 'Monthly'
      }
    });

    expect(response).toBeDefined();

    // Verify subscription was updated
    const tenant = await ctx.client.tenant(`/api/tenants/${testTenantId}`, 'get');
    expect((tenant as any).tenant.subscription.plan).toBe('Professional');
    expect((tenant as any).tenant.subscription.user_limit).toBe(50);
  });

  test('should upgrade subscription from Starter to Professional', async () => {
    const tenantData = TestDataFactory.tenant();
    tenantData.plan = 'Starter';
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    const response = await ctx.client.tenant(`/api/tenants/${(created as any).id}/subscription`, 'put', {
      body: {
        plan: 'Professional',
        user_limit: 100,
        storage_limit_gb: 200,
        enabled_modules: ['accounting', 'invoicing', 'reporting', 'analytics'],
        billing_cycle: 'Yearly'
      }
    });

    expect(response).toBeDefined();
  });

  test('should downgrade subscription from Enterprise to Professional', async () => {
    const tenantData = TestDataFactory.tenant();
    tenantData.plan = 'Enterprise';
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    const response = await ctx.client.tenant(`/api/tenants/${(created as any).id}/subscription`, 'put', {
      body: {
        plan: 'Professional',
        user_limit: 50,
        storage_limit_gb: 100,
        enabled_modules: ['accounting', 'invoicing', 'reporting'],
        billing_cycle: 'Monthly'
      }
    });

    expect(response).toBeDefined();
  });

  test('should update billing cycle', async () => {
    const response = await ctx.client.tenant(`/api/tenants/${testTenantId}/subscription`, 'put', {
      body: {
        plan: 'Professional',
        billing_cycle: 'Yearly'
      }
    });

    expect(response).toBeDefined();

    const tenant = await ctx.client.tenant(`/api/tenants/${testTenantId}`, 'get');
    expect((tenant as any).tenant.subscription.billing_cycle).toBe('Yearly');
  });

  test('should enable additional modules', async () => {
    const response = await ctx.client.tenant(`/api/tenants/${testTenantId}/subscription`, 'put', {
      body: {
        plan: 'Professional',
        enabled_modules: ['accounting', 'invoicing', 'reporting', 'payroll', 'inventory']
      }
    });

    expect(response).toBeDefined();

    const tenant = await ctx.client.tenant(`/api/tenants/${testTenantId}`, 'get');
    expect((tenant as any).tenant.subscription.enabled_modules).toContain('payroll');
    expect((tenant as any).tenant.subscription.enabled_modules).toContain('inventory');
  });

  test('should increase user and storage limits', async () => {
    const response = await ctx.client.tenant(`/api/tenants/${testTenantId}/subscription`, 'put', {
      body: {
        plan: 'Enterprise',
        user_limit: 500,
        storage_limit_gb: 1000
      }
    });

    expect(response).toBeDefined();

    const tenant = await ctx.client.tenant(`/api/tenants/${testTenantId}`, 'get');
    expect((tenant as any).tenant.subscription.user_limit).toBe(500);
    expect((tenant as any).tenant.subscription.storage_limit_gb).toBe(1000);
  });
});