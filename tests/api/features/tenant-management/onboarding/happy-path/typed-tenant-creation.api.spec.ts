import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { TypedApiClient } from '../../../support/clients/typed-api-client';
import { generateUniqueTenantData, superAdminCredentials } from '../../../support/fixtures/tenant-data';

describe('Tenant Creation - Using Typed NPM Packages', () => {
  let client: TypedApiClient;
  const createdTenantIds: string[] = [];

  beforeAll(async () => {
    client = new TypedApiClient();
    // Login as SuperAdmin
    await client.login(superAdminCredentials.email, superAdminCredentials.password);
  });

  afterAll(async () => {
    // Cleanup created tenants
    for (const tenantId of createdTenantIds) {
      try {
        await client.tenant(`/api/tenants/${tenantId}`, 'delete');
        console.log(`🧹 Cleaned up tenant: ${tenantId}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup tenant ${tenantId}:`, error);
      }
    }
    await client.logout();
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
    expect((response as any).id).toBeTruthy();
    expect((response as any).tenantName).toBe(tenantData.tenantName);
    expect((response as any).status).toBe('Pending');
    
    // Track for cleanup
    createdTenantIds.push((response as any).id);
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
    
    const tenantId = (createResponse as any).id;
    createdTenantIds.push(tenantId);

    // Act - Get tenant using typed endpoint
    const getResponse = await client.tenant(`/api/tenants/${tenantId}`, 'get');

    // Assert
    expect(getResponse).toBeDefined();
    expect((getResponse as any).id).toBe(tenantId);
    expect((getResponse as any).tenantName).toBe(tenantData.tenantName);
  });

  test('should list tenants with typed client', async () => {
    // Act - List tenants with pagination parameters
    const response = await client.tenant('/api/tenants', 'get', {
      params: {
        query: {
          pageSize: 10,
          pageNumber: 1
        }
      }
    });

    // Assert - Response structure is typed
    expect(response).toBeDefined();
    expect(Array.isArray((response as any).tenants)).toBe(true);
    expect((response as any).totalCount).toBeDefined();
    expect((response as any).pageSize).toBeDefined();
    expect((response as any).pageNumber).toBeDefined();
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
    
    const tenantId = (createResponse as any).id;
    createdTenantIds.push(tenantId);

    // Wait for tenant to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Act - Activate tenant
    const activateResponse = await client.tenant(`/api/tenants/${tenantId}/activate`, 'post');

    // Assert
    expect(activateResponse).toBeDefined();
    expect((activateResponse as any).id).toBe(tenantId);
    expect((activateResponse as any).status).toBe('Active');
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
    createdTenantIds.push((firstResponse as any).id);

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
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});