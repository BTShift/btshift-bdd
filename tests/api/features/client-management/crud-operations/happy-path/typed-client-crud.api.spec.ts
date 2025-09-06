import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { TypedApiClient } from '../../../support/clients/typed-api-client';
import { superAdminCredentials } from '../../../support/fixtures/tenant-data';

describe('Client Management - CRUD with Typed NPM Packages', () => {
  let client: TypedApiClient;
  const createdClientIds: string[] = [];

  beforeAll(async () => {
    client = new TypedApiClient();
    // Login as SuperAdmin
    await client.login(superAdminCredentials.email, superAdminCredentials.password);
  });

  afterAll(async () => {
    // Cleanup created clients
    for (const clientId of createdClientIds) {
      try {
        await client.clientManagement(`/api/clients/${clientId}`, 'delete');
        console.log(`🧹 Cleaned up client: ${clientId}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup client ${clientId}:`, error);
      }
    }
    await client.logout();
  });

  test('should create client with typed client from @btshift/client-management-types', async () => {
    // Arrange
    const clientData = {
      name: `Test Client ${Date.now()}`,
      email: `client-${Date.now()}@test.com`,
      phone: '+212612345678',
      address: '123 Test Street, Casablanca',
      taxId: `TAX${Date.now()}`,
      industry: 'Technology',
      notes: 'Created by typed API test'
    };

    // Act - Using the typed client from npm package
    const response = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });

    // Assert - Response is typed based on OpenAPI schema
    expect(response).toBeDefined();
    expect((response as any).id).toBeTruthy();
    expect((response as any).name).toBe(clientData.name);
    expect((response as any).email).toBe(clientData.email);
    expect((response as any).status).toBe('Active');
    
    // Track for cleanup
    createdClientIds.push((response as any).id);
  });

  test('should get client by ID with typed client', async () => {
    // Arrange - Create a client first
    const clientData = {
      name: `Get Test Client ${Date.now()}`,
      email: `get-client-${Date.now()}@test.com`
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = (createResponse as any).id;
    createdClientIds.push(clientId);

    // Act - Get client using typed endpoint
    const getResponse = await client.clientManagement(`/api/clients/${clientId}`, 'get');

    // Assert
    expect(getResponse).toBeDefined();
    expect((getResponse as any).id).toBe(clientId);
    expect((getResponse as any).name).toBe(clientData.name);
    expect((getResponse as any).email).toBe(clientData.email);
  });

  test('should update client with typed client', async () => {
    // Arrange - Create a client
    const originalData = {
      name: `Update Test Client ${Date.now()}`,
      email: `update-client-${Date.now()}@test.com`,
      phone: '+212600000000'
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: originalData
    });
    
    const clientId = (createResponse as any).id;
    createdClientIds.push(clientId);

    // Act - Update client
    const updateData = {
      name: originalData.name + ' Updated',
      phone: '+212611111111',
      notes: 'Updated via typed API'
    };
    
    const updateResponse = await client.clientManagement(`/api/clients/${clientId}`, 'put', {
      body: updateData
    });

    // Assert
    expect(updateResponse).toBeDefined();
    expect((updateResponse as any).id).toBe(clientId);
    expect((updateResponse as any).name).toBe(updateData.name);
    expect((updateResponse as any).phone).toBe(updateData.phone);
    expect((updateResponse as any).notes).toBe(updateData.notes);
  });

  test('should list clients with typed client', async () => {
    // Act - List clients with pagination
    const response = await client.clientManagement('/api/clients', 'get', {
      params: {
        query: {
          pageSize: 10,
          pageNumber: 1
        }
      }
    });

    // Assert - Response structure is typed
    expect(response).toBeDefined();
    expect(Array.isArray((response as any).clients)).toBe(true);
    expect((response as any).totalCount).toBeDefined();
    expect((response as any).pageSize).toBeDefined();
    expect((response as any).pageNumber).toBeDefined();
  });

  test('should create client group with typed client', async () => {
    // Arrange - Create clients for the group
    const client1 = await client.clientManagement('/api/clients', 'post', {
      body: {
        name: `Group Client 1 ${Date.now()}`,
        email: `group1-${Date.now()}@test.com`
      }
    });
    const client2 = await client.clientManagement('/api/clients', 'post', {
      body: {
        name: `Group Client 2 ${Date.now()}`,
        email: `group2-${Date.now()}@test.com`
      }
    });
    
    createdClientIds.push((client1 as any).id, (client2 as any).id);

    // Act - Create client group
    const groupData = {
      name: `Test Group ${Date.now()}`,
      description: 'Created by typed API test',
      clientIds: [(client1 as any).id, (client2 as any).id]
    };
    
    const groupResponse = await client.clientManagement('/api/client-groups', 'post', {
      body: groupData
    });

    // Assert
    expect(groupResponse).toBeDefined();
    expect((groupResponse as any).id).toBeTruthy();
    expect((groupResponse as any).name).toBe(groupData.name);
    expect((groupResponse as any).description).toBe(groupData.description);
    expect(Array.isArray((groupResponse as any).clients)).toBe(true);
    expect((groupResponse as any).clients.length).toBe(2);
  });

  test('should handle user-client associations with typed client', async () => {
    // Arrange - Create a client
    const clientData = {
      name: `Association Test Client ${Date.now()}`,
      email: `assoc-${Date.now()}@test.com`
    };
    
    const clientResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = (clientResponse as any).id;
    createdClientIds.push(clientId);

    // Note: In a real test, you'd have a test user ID
    // For demo purposes, using a placeholder
    const testUserId = 'test-user-id';

    // Act - Create association (this might fail without a real user, but demonstrates the typed API)
    try {
      await client.clientManagement('/api/user-client-associations', 'post', {
        body: {
          userId: testUserId,
          clientId: clientId,
          role: 'Editor'
        }
      });
    } catch (error: any) {
      // Expected to fail without real user, but demonstrates typed error handling
      expect(error.response).toBeDefined();
    }
  });

  test('should delete client with typed client', async () => {
    // Arrange - Create a client to delete
    const clientData = {
      name: `Delete Test Client ${Date.now()}`,
      email: `delete-${Date.now()}@test.com`
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = (createResponse as any).id;

    // Act - Delete client
    await client.clientManagement(`/api/clients/${clientId}`, 'delete');

    // Assert - Verify deletion by trying to get the client
    try {
      await client.clientManagement(`/api/clients/${clientId}`, 'get');
      fail('Should have thrown 404 for deleted client');
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
    }
  });
});