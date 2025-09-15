import { describe, beforeAll, afterAll, expect } from '../../../../support/test-imports';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Business Feature: Tenant Onboarding', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.feature('Tenant Management');
    allure.parentSuite('🏢 Business Operations');
    allure.suite('Tenant Lifecycle Management');
    allure.subSuite('New Tenant Onboarding');
    
    ctx = await setupApiTestWithContext('SuperAdmin');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('Super Admin can successfully onboard a new accounting firm', async () => {
    allure.story('As a Super Admin, I want to onboard new accounting firms so they can start using our platform');
    allure.description('This test validates the complete tenant creation workflow from a business perspective, ensuring all required data is captured and the tenant is properly initialized.');
    allure.tag('critical-path');
    allure.tag('business-flow');
    allure.owner('Super Admin');
    allure.severity('critical');
    
    let tenantData: any;
    let response: any;

    await allure.step('📋 Given: I have prepared new tenant registration data', async () => {
      tenantData = TestDataFactory.tenant();
      allure.attachment('Tenant Registration Data', JSON.stringify(tenantData, null, 2), 'application/json');
    });

    // Use the enhanced correlation tracking for automatic Allure reporting
    response = await ctx.correlation.callAndReport(
      '🚀 When: I submit the tenant registration request',
      () => ctx.client.tenant('/api/tenants', 'post', { body: tenantData }),
      {
        endpoint: '/api/tenants',
        method: 'POST',
        serviceName: 'Tenant Management'
      }
    );
    ctx.cleanup.addTenant(response.data.id);

    await allure.step('✅ Then: The tenant should be created successfully', async () => {
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeTruthy();
      allure.attachment('Created Tenant Response', JSON.stringify(response.data, null, 2), 'application/json');
    });

    await allure.step('🔍 And: The tenant data should match the request', async () => {
      expect(response.data.companyName).toBe(tenantData.companyName);
      expect(response.data.tenantName).toBe(tenantData.tenantName);
    });

    await allure.step('📊 And: The tenant status should be Pending', async () => {
      expect(response.data.status).toBe('Pending');
    });
  });

  test('should retrieve the created tenant by ID', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.correlation.callAndReport(
      'Create tenant for retrieval test',
      () => ctx.client.tenant('/api/tenants', 'post', { body: tenantData }),
      { endpoint: '/api/tenants', method: 'POST', serviceName: 'Tenant Management' }
    );
    ctx.cleanup.addTenant(created.data.id);

    const retrieved = await ctx.correlation.callAndReport(
      'Retrieve tenant by ID',
      () => ctx.client.tenant(`/api/tenants/${created.data.id}` as any, 'get'),
      { endpoint: `/api/tenants/${created.data.id}`, method: 'GET', serviceName: 'Tenant Management' }
    );

    expect(retrieved.data.id).toBe(created.data.id);
    expect(retrieved.data.tenantName).toBe(tenantData.tenantName);
  });

  test('should retrieve the created tenant by name', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.correlation.callAndReport(
      'Create tenant for name retrieval test',
      () => ctx.client.tenant('/api/tenants', 'post', { body: tenantData }),
      { endpoint: '/api/tenants', method: 'POST', serviceName: 'Tenant Management' }
    );
    ctx.cleanup.addTenant(created.data.id);

    const retrieved = await ctx.correlation.callAndReport(
      'Retrieve tenant by name',
      () => ctx.client.tenant(`/api/tenants/by-name/${tenantData.tenantName}` as any, 'get'),
      { endpoint: `/api/tenants/by-name/${tenantData.tenantName}`, method: 'GET', serviceName: 'Tenant Management' }
    );

    expect(retrieved.data.id).toBe(created.data.id);
    expect(retrieved.data.tenantName).toBe(tenantData.tenantName);
  });

  test('should successfully activate a pending tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const activationTestData = ctx.getData(created);
    ctx.cleanup.addTenant(activationTestData.id);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const activated = await ctx.client.tenant(`/api/tenants/${activationTestData.id}/activate` as any, 'post');
    const activatedData = ctx.getData(activated);

    expect(activatedData.id).toBe(activationTestData.id);
    expect(activatedData.status).toBe('Active');
  });

  test('should successfully send welcome email after tenant activation', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const welcomeEmailTestData = ctx.getData(created);
    ctx.cleanup.addTenant(welcomeEmailTestData.id);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await ctx.client.tenant(`/api/tenants/${welcomeEmailTestData.id}/activate` as any, 'post');

    await expect(
      ctx.client.tenant(`/api/tenants/${welcomeEmailTestData.id}/resend-welcome` as any, 'post')
    ).resolves.toBeDefined();
  });

  test('should list tenants and include the created tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const listTenantTestData = ctx.getData(created);
    ctx.cleanup.addTenant(listTenantTestData.id);

    const response = await ctx.client.tenant('/api/tenants', 'get', {
      params: { query: { pageSize: 50, page: 1 } }
    });

    const listResponseData = ctx.getData(response);
    expect(listResponseData.tenants).toBeDefined();
    expect(Array.isArray(listResponseData.tenants)).toBe(true);
    
    const found = listResponseData.tenants.find((t: any) => t.id === listTenantTestData.id);
    expect(found).toBeDefined();
    expect(found.tenantName).toBe(tenantData.tenantName);
  });
});