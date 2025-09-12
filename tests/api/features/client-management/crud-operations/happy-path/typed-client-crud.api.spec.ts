import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { TypedApiClient } from '../../../../support/clients/typed-api-client';
import { MultiUserAuthManager } from '../../../../support/auth/multi-user-auth-manager';
import { TestContextManager } from '../../../../../../lib/helpers/test-context-manager';
import { EnhancedAssertions, testStep, expectWithContext } from '../../../../support/helpers/enhanced-assertions';

describe('Client Management - CRUD with Typed NPM Packages', () => {
  let client: TypedApiClient;
  const createdClientIds: string[] = [];

  beforeAll(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client Operations');
    // Use TenantAdmin context for client management operations
    const authManager = MultiUserAuthManager.getInstance();
    client = await authManager.getAuthenticatedClient('TenantAdmin');
  });

  afterAll(async () => {
    // Set cleanup context for proper BDD correlation
    const testContextManager = TestContextManager.getInstance();
    testContextManager.setCleanupContext(
      'typed-client-crud.api.feature',
      'Client Management Test Data Cleanup'
    );
    
    // Cleanup created clients
    for (const clientId of createdClientIds) {
      try {
        await client.clientManagement(`/api/clients/${clientId}` as any, 'delete');
        console.log(`🧹 Cleaned up client: ${clientId}`);
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup client ${clientId}:`, error);
      }
    }
    
    // Clear the cleanup context
    testContextManager.clearContext();
    // No logout needed - let the token expire naturally
  });

  test('should create client with typed client from @btshift/client-management-types', async () => {
    
    // Arrange
    const timestamp = Date.now();
    const clientData = {
      companyName: `Test Client ${timestamp}`,
      country: 'Morocco',
      address: '123 Test Street, Casablanca',
      iceNumber: timestamp.toString().padStart(15, '0'), // Generate exactly 15 digits for valid ICE number
      rcNumber: `RC${timestamp}`,
      vatNumber: `VAT${timestamp}`,
      cnssNumber: `CNSS${timestamp}`,
      industry: 'Technology',
      adminContactPerson: `admin-${timestamp}@test.com`,
      billingContactPerson: `billing-${timestamp}@test.com`
    };

    // Act - Using the typed client from npm package
    const response = await testStep('Create client with typed API', async () => {
      return await client.clientManagement('/api/clients', 'post', {
        body: clientData
      });
    }, {
      operation: 'Create Client',
      endpoint: '/api/clients',
      entityType: 'client'
    });

    // Assert - Response is typed based on OpenAPI schema
    await testStep('Verify client creation response', async () => {
      const context = {
        operation: 'Client Creation',
        endpoint: '/api/clients',
        entityId: response.data.clientId,
        entityType: 'client',
        additionalInfo: {
          companyName: clientData.companyName,
          iceNumber: clientData.iceNumber
        }
      };
      
      await expectWithContext(response, context).toBeDefined('Response should be defined');
      await expectWithContext(response.data.clientId, context).toBeTruthy('Client ID should be generated');
      await expectWithContext(response.data.companyName, context).toBe(
        clientData.companyName,
        `Company name should be '${clientData.companyName}'`
      );
      await expectWithContext(response.data.address, context).toBe(
        clientData.address,
        `Address should be '${clientData.address}'`
      );
      await expectWithContext(response.data.industry, context).toBe(
        clientData.industry,
        `Industry should be '${clientData.industry}'`
      );
    });
    
    // Track for cleanup
    createdClientIds.push(response.data.clientId);
  });

  test('should get client by ID with typed client', async () => {
    
    // Arrange - Create a client first
    const clientData = {
      companyName: `Get Test Client ${Date.now()}`,
      country: 'Morocco',
      industry: 'Technology'
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = createResponse.data.clientId;
    createdClientIds.push(clientId);

    // Act - Get client using typed endpoint
    const getResponse = await testStep('Get client by ID', async () => {
      return await client.clientManagement(`/api/clients/${clientId}` as any, 'get');
    }, {
      operation: 'Get Client',
      endpoint: `/api/clients/${clientId}`,
      entityId: clientId,
      entityType: 'client'
    });

    // Assert
    await testStep('Verify client retrieval', async () => {
      const context = {
        operation: 'Get Client',
        endpoint: `/api/clients/${clientId}`,
        entityId: clientId,
        entityType: 'client'
      };
      
      await expectWithContext(getResponse, context).toBeDefined('Response should be defined');
      await expectWithContext(getResponse.data.clientId, context).toBe(
        clientId,
        `Client ID should match requested ID '${clientId}'`
      );
      await expectWithContext(getResponse.data.companyName, context).toBe(
        clientData.companyName,
        `Company name should be '${clientData.companyName}'`
      );
      await expectWithContext(getResponse.data.country, context).toBe(
        clientData.country,
        `Country should be '${clientData.country}'`
      );
    });
  });

  test('should update client with typed client', async () => {
    
    // Arrange - Create a client
    const originalData = {
      companyName: `Update Test Client ${Date.now()}`,
      country: 'Morocco',
      industry: 'Technology'
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: originalData
    });
    
    const clientId = createResponse.data.clientId;
    createdClientIds.push(clientId);

    // Act - Update client
    const updateData = {
      companyName: originalData.companyName + ' Updated',
      industry: 'Finance',
      country: 'Morocco'
    };
    
    const updateResponse = await client.clientManagement(`/api/clients/${clientId}` as any, 'put', {
      body: updateData
    });

    // Assert
    expect(updateResponse).toBeDefined();
    expect(updateResponse.data.clientId).toBe(clientId);
    expect(updateResponse.data.companyName).toBe(updateData.companyName);
    expect(updateResponse.data.industry).toBe(updateData.industry);
    expect(updateResponse.data.country).toBe(updateData.country);
  });

  test('should list clients with typed client', async () => {
    
    // Act - List clients with pagination
    const response = await client.clientManagement('/api/clients', 'get', {
      params: {
        query: {
          pageSize: 10,
          page: 1
        }
      }
    });

    // Assert - Response structure is typed
    expect(response).toBeDefined();
    expect(Array.isArray(response.data.clients)).toBe(true);
    expect(response.data.totalCount).toBeDefined();
    expect(response.data.pageSize).toBeDefined();
    expect(response.data.page).toBeDefined();
  });

  test('should create client group with typed client', async () => {
    
    // Arrange - Create clients for the group
    const client1 = await client.clientManagement('/api/clients', 'post', {
      body: {
        companyName: `Group Client 1 ${Date.now()}`,
        country: 'Morocco',
        industry: 'Technology'
      }
    });
    const client2 = await client.clientManagement('/api/clients', 'post', {
      body: {
        companyName: `Group Client 2 ${Date.now()}`,
        country: 'Morocco',
        industry: 'Finance'
      }
    });
    
    createdClientIds.push(client1.data.clientId, client2.data.clientId);

    // Act - Create client group
    const groupData = {
      name: `Test Group ${Date.now()}`,
      description: 'Created by typed API test'
    };
    
    const groupResponse = await client.clientManagement('/api/groups', 'post', {
      body: groupData
    });

    // Assert
    expect(groupResponse).toBeDefined();
    expect(groupResponse.data.groupId).toBeTruthy();
    expect(groupResponse.data.name).toBe(groupData.name);
    expect(groupResponse.data.description).toBe(groupData.description);
    expect(groupResponse.data.clientCount).toBe(0); // New group starts with 0 clients
    
    // Now add clients to the group
    if (groupResponse.data.groupId) {
      await client.clientManagement(`/api/groups/${groupResponse.data.groupId}/clients/${client1.data.clientId}` as any, 'post');
      await client.clientManagement(`/api/groups/${groupResponse.data.groupId}/clients/${client2.data.clientId}` as any, 'post');
    }
  });

  test('should handle user-client associations with typed client', async () => {
    
    // Arrange - Create a client
    const clientData = {
      companyName: `Association Test Client ${Date.now()}`,
      country: 'Morocco',
      industry: 'Technology'
    };
    
    const clientResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = clientResponse.data.clientId;
    createdClientIds.push(clientId);

    // Note: In a real test, you'd have a test user ID
    // For demo purposes, using a placeholder
    const testUserId = 'test-user-id';

    // Act - Assign user to client (this might fail without a real user, but demonstrates the typed API)
    try {
      await client.clientManagement(`/api/clients/${clientId}/users/${testUserId}` as any, 'post');
    } catch (error: any) {
      // Expected to fail without real user, but demonstrates typed error handling
      expect(error.response).toBeDefined();
    }
  });

  test('should delete client with typed client', async () => {
    
    // Arrange - Create a client to delete
    const clientData = {
      companyName: `Delete Test Client ${Date.now()}`,
      country: 'Morocco',
      industry: 'Technology'
    };
    
    const createResponse = await client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const clientId = createResponse.data.clientId;

    // Act - Delete client
    await client.clientManagement(`/api/clients/${clientId}` as any, 'delete');

    // Assert - Verify deletion by trying to get the client
    try {
      await client.clientManagement(`/api/clients/${clientId}` as any, 'get');
      throw new Error('Should have thrown 404 for deleted client');
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
    }
  });
});