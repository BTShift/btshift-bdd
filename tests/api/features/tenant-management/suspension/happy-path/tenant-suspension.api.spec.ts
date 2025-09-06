import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Tenant Management - Suspension Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('Tenant Management Service');
    allure.suite('Tenant Lifecycle');
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should suspend an active tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    // Activate tenant first
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${(created as any).id}/activate`, 'post');

    // Now suspend it
    const response = await ctx.client.tenant(`/api/tenants/${(created as any).id}/suspend`, 'post', {
      body: {
        reason: 'Non-payment'
      }
    });

    expect(response).toBeDefined();

    // Verify tenant is suspended
    const tenant = await ctx.client.tenant(`/api/tenants/${(created as any).id}`, 'get');
    expect((tenant as any).tenant.status).toBe('Suspended');
  });

  test('should reactivate a suspended tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    // Activate, then suspend
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${(created as any).id}/activate`, 'post');
    await ctx.client.tenant(`/api/tenants/${(created as any).id}/suspend`, 'post', {
      body: { reason: 'Test suspension' }
    });

    // Reactivate
    const response = await ctx.client.tenant(`/api/tenants/${(created as any).tenant_id}/activate`, 'post', {
      body: {}
    });

    expect((response as any).tenant.status).toBe('Active');
  });

  test('should delete a tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });

    const response = await ctx.client.tenant(`/api/tenants/${(created as any).id}`, 'delete', {
      body: {
        reason: 'Test deletion'
      }
    });

    expect(response).toBeDefined();

    // Verify tenant is deleted (soft delete)
    const tenant = await ctx.client.tenant(`/api/tenants/${(created as any).id}`, 'get');
    expect((tenant as any).tenant.status).toBe('Deleted');
  });
});