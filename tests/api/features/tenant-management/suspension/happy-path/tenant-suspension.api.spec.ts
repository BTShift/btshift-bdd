import { describe, beforeAll, afterAll, expect } from '../../../../support/test-imports';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Tenant Management - Suspension Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('🏢 Business Operations');
    allure.feature('Tenant Management');
    allure.suite('Tenant Lifecycle Management');
    ctx = await setupApiTestWithContext('SuperAdmin');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should suspend an active tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const createdTenantData = ctx.getData(created);
    ctx.cleanup.addTenant(createdTenantData.id);

    // Activate tenant first
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${createdTenantData.id}/activate`, 'post');

    // Now suspend it
    const response = await ctx.client.tenant(`/api/tenants/${createdTenantData.id}/suspend`, 'post', {
      body: {
        reason: 'Non-payment'
      }
    });

    expect(response).toBeDefined();

    // Verify tenant is suspended
    const tenant = await ctx.client.tenant(`/api/tenants/${createdTenantData.id}`, 'get');
    const suspendedTenantData = ctx.getData(tenant);
    expect(suspendedTenantData.tenant.status).toBe('Suspended');
  });

  test('should reactivate a suspended tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const reactivateTestData = ctx.getData(created);
    ctx.cleanup.addTenant(reactivateTestData.id);

    // Activate, then suspend
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${reactivateTestData.id}/activate`, 'post');
    await ctx.client.tenant(`/api/tenants/${reactivateTestData.id}/suspend`, 'post', {
      body: { reason: 'Test suspension' }
    });

    // Reactivate
    const response = await ctx.client.tenant(`/api/tenants/${reactivateTestData.tenant_id}/activate`, 'post', {
      body: {}
    });

    const reactivatedTenantData = ctx.getData(response);
    expect(reactivatedTenantData.tenant.status).toBe('Active');
  });

  test('should delete a tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const deleteTenantData = ctx.getData(created);

    const response = await ctx.client.tenant(`/api/tenants/${deleteTenantData.id}`, 'delete', {
      body: {
        reason: 'Test deletion'
      }
    });

    expect(response).toBeDefined();

    // Verify tenant is deleted (soft delete)
    const tenant = await ctx.client.tenant(`/api/tenants/${deleteTenantData.id}`, 'get');
    const deletedTenantData = ctx.getData(tenant);
    expect(deletedTenantData.tenant.status).toBe('Deleted');
  });
});