import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { TypedApiClient } from '../../../../support/clients/typed-api-client-enhanced';
import { generateUniqueTenantData } from '../../../../support/fixtures/tenant-data';
import { GlobalAuthManager } from '../../../../support/auth/global-auth-manager';

describe('Tenant Creation - Using Typed NPM Packages', () => {
  let client: TypedApiClient;
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    allure.parentSuite('🏢 Business Operations');
    allure.feature('Tenant Management');
    // Use GlobalAuthManager to avoid multiple logins
    const authManager = GlobalAuthManager.getInstance();
    client = await authManager.getAuthenticatedClient();
  });

  afterAll(async () => {
    // Cleanup created tenants
    for (const tenantId of createdTenantIds) {
      try {
        await client.tenant(`/api/tenants/${tenantId}` as any, 'delete');
        console.log(`🧹 Cleaned up tenant: ${tenantId}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup tenant ${tenantId}:`, error);
      }
    }
    // No logout needed - let the token expire naturally
  });

  test('should create tenant with typed client from @btshift/tenant-management-types', async () => {
    // Arrange
    const tenantData = generateUniqueTenantData('typed-test');

    // Act - Using the typed client from npm package
    const response = await client.tenant('/api/tenants', 'post', {
      body: {
        companyName: tenantData.companyName,
        tenantName: tenantData.tenantName,
        domain: tenantData.domain,
        plan: tenantData.plan,
        adminEmail: tenantData.adminEmail,
        adminFirstName: tenantData.adminFirstName,
        adminLastName: tenantData.adminLastName,
        phoneNumber: tenantData.phoneNumber,
        address: tenantData.address,
        country: tenantData.country
      }
    });

    // Assert - Response is typed based on OpenAPI schema
    expect(response).toBeDefined();
    expect(response.data.id).toBeTruthy();
    expect(response.data.tenantName).toBe(tenantData.tenantName);
    expect(response.data.status).toBe('Pending');
    
    // Track for cleanup
    createdTenantIds.push(response.data.id);
  });

  test('should get tenant by ID with typed client', async () => {
    // Arrange - Create a tenant first
    const tenantData = generateUniqueTenantData('get-typed-test');
    const createResponse = await client.tenant('/api/tenants', 'post', {
      body: {
        companyName: tenantData.companyName,
        tenantName: tenantData.tenantName,
        domain: tenantData.domain,
        plan: tenantData.plan,
        adminEmail: tenantData.adminEmail,
        adminFirstName: tenantData.adminFirstName,
        adminLastName: tenantData.adminLastName,
        phoneNumber: tenantData.phoneNumber,
        address: tenantData.address,
        country: tenantData.country
      }
    });
    
    const tenantId = createResponse.data.id;
    createdTenantIds.push(tenantId);

    // Act - Get tenant using typed endpoint
    const getResponse = await client.tenant(`/api/tenants/${tenantId}` as any, 'get');

    // Assert
    expect(getResponse).toBeDefined();
    expect(getResponse.data.id).toBe(tenantId);
    expect(getResponse.data.tenantName).toBe(tenantData.tenantName);
  });

  test('should list tenants with typed client', async () => {
    // Act - List tenants with pagination parameters
    const response = await client.tenant('/api/tenants', 'get', {
      params: {
        query: {
          pageSize: 10,
          page: 1
        }
      }
    });

    // Assert - Response structure is typed
    expect(response).toBeDefined();
    expect(Array.isArray(response.data.tenants)).toBe(true);
    expect(response.data.totalCount).toBeDefined();
    expect(response.data.pageSize).toBeDefined();
    expect(response.data.page).toBeDefined();
  });

  test('should activate tenant with typed client', async () => {
    // Arrange - Create a tenant
    const tenantData = generateUniqueTenantData('activate-typed');
    const createResponse = await client.tenant('/api/tenants', 'post', {
      body: {
        companyName: tenantData.companyName,
        tenantName: tenantData.tenantName,
        domain: tenantData.domain,
        plan: tenantData.plan,
        adminEmail: tenantData.adminEmail,
        adminFirstName: tenantData.adminFirstName,
        adminLastName: tenantData.adminLastName,
        phoneNumber: tenantData.phoneNumber,
        address: tenantData.address,
        country: tenantData.country
      }
    });
    
    const tenantId = createResponse.data.id;
    createdTenantIds.push(tenantId);

    // Wait for tenant to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Act - Activate tenant
    const activateResponse = await client.tenant(`/api/tenants/${tenantId}/activate` as any, 'post');

    // Assert
    expect(activateResponse).toBeDefined();
    expect(activateResponse.data.id).toBe(tenantId);
    expect(activateResponse.data.status).toBe('Active');
  });

  test('should handle typed error responses for duplicate tenant', async () => {
    // Arrange - Create first tenant
    const tenantData = generateUniqueTenantData('duplicate-typed');
    const firstResponse = await client.tenant('/api/tenants', 'post', {
      body: {
        companyName: tenantData.companyName,
        tenantName: tenantData.tenantName,
        domain: tenantData.domain,
        plan: tenantData.plan,
        adminEmail: tenantData.adminEmail,
        adminFirstName: tenantData.adminFirstName,
        adminLastName: tenantData.adminLastName,
        phoneNumber: tenantData.phoneNumber,
        address: tenantData.address,
        country: tenantData.country
      }
    });
    createdTenantIds.push(firstResponse.data.id);

    // Act & Assert - Try to create duplicate
    try {
      await client.tenant('/api/tenants', 'post', {
        body: {
          companyName: 'Different Company',
          tenantName: tenantData.tenantName, // Same tenant name
          domain: tenantData.domain, // Same domain
          plan: tenantData.plan,
          adminEmail: 'different@email.com',
          adminFirstName: tenantData.adminFirstName,
          adminLastName: tenantData.adminLastName,
          phoneNumber: tenantData.phoneNumber,
          address: tenantData.address,
          country: tenantData.country
        }
      });
      fail('Should have thrown an error for duplicate tenant');
    } catch (error: any) {
      // Error response is also typed
      expect(error).toBeDefined();
      // The typed client throws an error with message containing status
      // Extract status from error message "API Error: 400 - ..."
      const statusMatch = error.message.match(/API Error: (\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });
});