import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Tenant Creation - Duplicate Prevention API Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('🏢 Business Operations');
    allure.feature('Tenant Management');
    ctx = await setupApiTestWithContext('SuperAdmin');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should prevent creating tenant with duplicate tenant name', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const duplicateNameTestData = ctx.getData(created);
    ctx.cleanup.addTenant(duplicateNameTestData.id);

    const duplicateData = {
      ...TestDataFactory.tenant(),
      tenantName: tenantData.tenantName,
      domain: tenantData.domain
    };

    await expect(
      ctx.client.tenant('/api/tenants', 'post', { body: duplicateData })
    ).rejects.toMatchObject({
      response: {
        status: expect.any(Number),
        data: { message: expect.stringContaining('already exists') }
      }
    });
  });

  test('should prevent creating tenant with duplicate domain', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const duplicateDomainTestData = ctx.getData(created);
    ctx.cleanup.addTenant(duplicateDomainTestData.id);

    const duplicateData = {
      ...TestDataFactory.tenant(),
      domain: tenantData.domain
    };

    await expect(
      ctx.client.tenant('/api/tenants', 'post', { body: duplicateData })
    ).rejects.toMatchObject({
      response: {
        status: expect.any(Number),
        data: { message: expect.stringContaining('domain') }
      }
    });
  });

  test('should prevent creating tenant with duplicate admin email', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const duplicateEmailTestData = ctx.getData(created);
    ctx.cleanup.addTenant(duplicateEmailTestData.id);

    const duplicateData = {
      ...TestDataFactory.tenant(),
      adminEmail: tenantData.adminEmail
    };

    await expect(
      ctx.client.tenant('/api/tenants', 'post', { body: duplicateData })
    ).rejects.toMatchObject({
      response: {
        status: expect.any(Number),
        data: { message: expect.stringContaining('email') }
      }
    });
  });

  test('should verify tenant exists check returns true for existing tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const created = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    const tenantExistsTestData = ctx.getData(created);
    ctx.cleanup.addTenant(tenantExistsTestData.id);

    const response = await ctx.client.tenant(`/api/tenants/by-name/${tenantData.tenantName}`, 'get');
    
    expect(response).toBeDefined();
    const responseData = ctx.getData(response);
    expect(responseData.id).toBe(tenantExistsTestData.id);
  });

  test('should verify tenant exists check returns false for non-existing tenant', async () => {
    const nonExistentName = `non-existent-${Date.now()}`;

    await expect(
      ctx.client.tenant(`/api/tenants/by-name/${nonExistentName}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should return 404 when getting tenant by non-existing name', async () => {
    const nonExistentName = `non-existent-${Date.now()}`;

    await expect(
      ctx.client.tenant(`/api/tenants/by-name/${nonExistentName}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should return 404 when getting tenant by non-existing ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await expect(
      ctx.client.tenant(`/api/tenants/${nonExistentId}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });
});