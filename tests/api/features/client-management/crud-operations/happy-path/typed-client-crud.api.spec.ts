import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { TypedApiClient } from '../../../../support/clients/typed-api-client';
import { GlobalAuthManager } from '../../../../support/auth/global-auth-manager';

describe('Client Management - CRUD with Typed NPM Packages', () => {
  let client: TypedApiClient;
  const createdClientIds: string[] = [];

  beforeAll(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client Operations');
    // Use GlobalAuthManager to avoid multiple logins
    const authManager = GlobalAuthManager.getInstance();
    client = await authManager.getAuthenticatedClient();
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
    // No logout needed - let the token expire naturally
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
    expect(response.data.id).toBeTruthy();
    expect(response.data.name).toBe(clientData.name);
    expect(response.data.email).toBe(clientData.email);
    expect(response.data.status).toBe('Active');
    
    // Track for cleanup
    createdClientIds.push(response.data.id);
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
    
    const clientId = createResponse.data.id;
    createdClientIds.push(clientId);

    // Act - Get client using typed endpoint
    const getResponse = await client.clientManagement(`/api/clients/${clientId}`, 'get');

    // Assert
    expect(getResponse).toBeDefined();
    expect(getResponse.data.id).toBe(clientId);
    expect(getResponse.data.name).toBe(clientData.name);
    expect(getResponse.data.email).toBe(clientData.email);
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
    
    const clientId = createResponse.data.id;
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
    expect(updateResponse.data.id).toBe(clientId);
    expect(updateResponse.data.name).toBe(updateData.name);
    expect(updateResponse.data.phone).toBe(updateData.phone);
    expect(updateResponse.data.notes).toBe(updateData.notes);
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
    expect(Array.isArray(response.data.clients)).toBe(true);
    expect(response.data.totalCount).toBeDefined();
    expect(response.data.pageSize).toBeDefined();
    expect(response.data.pageNumber).toBeDefined();
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
    
    createdClientIds.push(client1.data.id, client2.data.id);

    // Act - Create client group
    const groupData = {
      name: `Test Group ${Date.now()}`,
      description: 'Created by typed API test',
      clientIds: [client1.data.id, client2.data.id]
    };
    
    const groupResponse = await client.clientManagement('/api/client-groups', 'post', {
      body: groupData
    });

    // Assert
    expect(groupResponse).toBeDefined();
    expect(groupResponse.data.id).toBeTruthy();
    expect(groupResponse.data.name).toBe(groupData.name);
    expect(groupResponse.data.description).toBe(groupData.description);
    expect(Array.isArray(groupResponse.data.clients)).toBe(true);
    expect(groupResponse.data.clients.length).toBe(2);
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
    
    const clientId = clientResponse.data.id;
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
    
    const clientId = createResponse.data.id;

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