import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Tenant Creation - Happy Path API Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should successfully create a new tenant with valid data', async () => {
    const tenantData = TestDataFactory.tenant();
    
    const response = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    
    ctx.cleanup.addTenant((response as any).id);
    
    expect(response).toBeDefined();
    expect((response as any).id).toBeTruthy();
    expect((response as any).companyName).toBe(tenantData.companyName);
    expect((response as any).tenantName).toBe(tenantData.tenantName);
    expect((response as any).status).toBe('Pending');
  });

  test('should retrieve the created tenant by ID', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    const retrieved = await ctx.client.tenant(`/api/tenants/${(created as any).id}`, 'get');

    expect((retrieved as any).id).toBe((created as any).id);
    expect((retrieved as any).tenantName).toBe(tenantData.tenantName);
  });

  test('should retrieve the created tenant by name', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    const retrieved = await ctx.client.tenant(`/api/tenants/by-name/${tenantData.tenantName}`, 'get');

    expect((retrieved as any).id).toBe((created as any).id);
    expect((retrieved as any).tenantName).toBe(tenantData.tenantName);
  });

  test('should successfully activate a pending tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const activated = await ctx.client.tenant(`/api/tenants/${(created as any).id}/activate`, 'post');

    expect((activated as any).id).toBe((created as any).id);
    expect((activated as any).status).toBe('Active');
  });

  test('should successfully send welcome email after tenant activation', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${(created as any).id}/activate`, 'post');

    await expect(
      ctx.client.tenant(`/api/tenants/${(created as any).id}/resend-welcome`, 'post')
    ).resolves.toBeDefined();
  });

  test('should list tenants and include the created tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    ctx.cleanup.addTenant((created as any).id);

    const response = await ctx.client.tenant('/api/tenants', 'get', {
      params: { query: { pageSize: 50, pageNumber: 1 } }
    });

    expect((response as any).tenants).toBeDefined();
    expect(Array.isArray((response as any).tenants)).toBe(true);
    
    const found = (response as any).tenants.find((t: any) => t.id === (created as any).id);
    expect(found).toBeDefined();
    expect(found.tenantName).toBe(tenantData.tenantName);
  });
});