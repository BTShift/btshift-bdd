import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';
import { EnhancedAssertions, testStep, expectWithContext } from '../../../../support/helpers/enhanced-assertions';

describe('Client Management - Group Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTestWithContext('TenantAdmin');
  });

  // Set Allure metadata for each test to ensure all tests are properly categorized
  test.beforeEach(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client Organization');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should create a new client group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Test group for API testing'
    };

    const response = await testStep('Create new client group', async () => {
      return await ctx.client.clientManagement('/api/groups', 'post', {
        body: groupData
      });
    }, {
      operation: 'Create Group',
      endpoint: '/api/groups',
      entityType: 'group'
    });

    const responseData = ctx.getData(response);
    ctx.cleanup.addGroup(responseData.groupId);

    await testStep('Verify group creation response', async () => {
      const context = {
        operation: 'Group Creation',
        endpoint: '/api/groups',
        entityId: responseData.groupId,
        entityType: 'group'
      };
      
      await expectWithContext(response, context).toBeDefined();
      await expectWithContext(responseData.groupId, context).toBeTruthy();
      await expectWithContext(responseData.name, context).toBe(groupData.name);
      await expectWithContext(responseData.description, context).toBe(groupData.description);
    });
  });

  test('should update an existing group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Original description'
    };

    const created = await ctx.client.clientManagement('/api/groups', 'post', {
      body: groupData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addGroup(createdData.groupId);

    const updateData = {
      name: `UpdatedGroup_${Date.now()}`,
      description: 'Updated description'
    };

    const response = await ctx.client.clientManagement(`/api/groups/${createdData.groupId}` as any, 'put', {
      body: updateData
    });

    const updateResponseData = ctx.getData(response);
    expect(updateResponseData.groupId).toBe(createdData.groupId);
    expect(updateResponseData.name).toBe(updateData.name);
    expect(updateResponseData.description).toBe(updateData.description);
  });

  test('should delete a group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Group to be deleted'
    };

    // Step 1: Create group to be deleted
    const created = await testStep('Create group for deletion', async () => {
      return await ctx.client.clientManagement('/api/groups', 'post', {
        body: groupData
      });
    }, {
      operation: 'Create Group',
      endpoint: '/api/groups',
      entityType: 'group'
    });
    
    const deleteCreatedData = ctx.getData(created);
    const groupId = deleteCreatedData.groupId;
    
    // Step 2: Delete the group
    const response = await testStep('Delete the group', async () => {
      return await ctx.client.clientManagement(`/api/groups/${groupId}` as any, 'delete');
    }, {
      operation: 'Delete Group',
      endpoint: `/api/groups/${groupId}`,
      entityId: groupId,
      entityType: 'group'
    });

    const deleteResponseData = ctx.getData(response);
    
    // Step 3: Verify deletion was successful
    await testStep('Verify deletion response', async () => {
      await EnhancedAssertions.assertOperationSuccess(
        deleteResponseData.success,
        {
          operation: 'Group Deletion',
          endpoint: `/api/groups/${groupId}`,
          entityId: groupId,
          entityType: 'group',
          additionalInfo: {
            response: deleteResponseData,
            groupName: groupData.name
          }
        }
      );
    });
    
    // Optional: Verify group no longer exists (if API supports checking)
    // This would make the failure even clearer
    try {
      const checkExists = await ctx.client.clientManagement(`/api/groups/${groupId}` as any, 'get');
      const exists = checkExists && ctx.getData(checkExists);
      
      await EnhancedAssertions.assertDeleted(!exists, {
        operation: 'Group Deletion Verification',
        endpoint: `/api/groups/${groupId}`,
        entityId: groupId,
        entityType: 'group',
        additionalInfo: {
          groupName: groupData.name,
          checkResponse: exists
        }
      });
    } catch (error: any) {
      // If GET returns 404, that's expected - group was deleted
      // The typed client throws an error with message containing status
      if (error.message.includes('404')) {
        console.log('✅ Group successfully deleted (GET returned 404)');
      } else {
        throw error; // Re-throw if it's not a 404
      }
    }
  });

  test('should list all groups for a tenant', async () => {
    // Create multiple groups
    const group1 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup1_${Date.now()}`,
        description: 'First test group'
      }
    });
    const group1Data = ctx.getData(group1);
    ctx.cleanup.addGroup(group1Data.groupId);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second test group'
      }
    });
    const group2Data = ctx.getData(group2);
    ctx.cleanup.addGroup(group2Data.groupId);

    const response = await testStep('List all groups for tenant', async () => {
      return await ctx.client.clientManagement('/api/groups', 'get', {
        params: {
          query: {
            page: 1,
            pageSize: 10
          }
        }
      });
    }, {
      operation: 'List Groups',
      endpoint: '/api/groups',
      entityType: 'group'
    });

    const listResponseData = ctx.getData(response);
    
    await testStep('Verify groups list response', async () => {
      const context = {
        operation: 'List Groups',
        endpoint: '/api/groups',
        entityType: 'groups',
        additionalInfo: {
          createdGroups: [group1Data.groupId, group2Data.groupId]
        }
      };
      
      await expectWithContext(listResponseData.groups, context).toBeDefined();
      
      expect(Array.isArray(listResponseData.groups)).toBe(
        true,
        `Response should contain an array of groups but got: ${typeof listResponseData.groups}`
      );
      
      expect(listResponseData.groups.length).toBeGreaterThanOrEqual(
        2,
        `Should have at least 2 groups (created: ${group1Data.name}, ${group2Data.name}) but found ${listResponseData.groups.length}`
      );
    });
  });

  test('should add a client to a group', async () => {
    // Create a group
    const group = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup_${Date.now()}`,
        description: 'Group for client association'
      }
    });
    const groupData = ctx.getData(group);
    ctx.cleanup.addGroup(groupData.groupId);

    // Create a client
    const clientRequestData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientRequestData
    });
    const clientData = ctx.getData(client);
    ctx.cleanup.addClient(clientData.clientId);

    // Add client to group
    const response = await ctx.client.clientManagement(
      `/api/groups/${groupData.groupId}/clients/${clientData.clientId}` as any,
      'post'
    );

    const addClientResponseData = ctx.getData(response);
    expect(addClientResponseData.success).toBe(true);
  });

  test('should remove a client from a group', async () => {
    // Create group and client
    const group = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup_${Date.now()}`,
        description: 'Group for client removal'
      }
    });
    const removeGroupData = ctx.getData(group);
    ctx.cleanup.addGroup(removeGroupData.groupId);

    const removeClientRequestData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: removeClientRequestData
    });
    const removeClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(removeClientResponseData.clientId);

    // Add client to group first
    await ctx.client.clientManagement(
      `/api/groups/${removeGroupData.groupId}/clients/${removeClientResponseData.clientId}` as any,
      'post'
    );

    // Remove client from group
    const response = await ctx.client.clientManagement(
      `/api/groups/${removeGroupData.groupId}/clients/${removeClientResponseData.clientId}` as any,
      'delete'
    );

    const removeResponseData = ctx.getData(response);
    expect(removeResponseData.success).toBe(true);
  });

  test('should get all clients in a group', async () => {
    // Create group
    const group = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup_${Date.now()}`,
        description: 'Group for client listing'
      }
    });
    const listGroupData = ctx.getData(group);
    ctx.cleanup.addGroup(listGroupData.groupId);

    // Create and add multiple clients
    const listClient1RequestData = TestDataFactory.client();
    const client1 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: listClient1RequestData
    });
    const client1ResponseData = ctx.getData(client1);
    ctx.cleanup.addClient(client1ResponseData.clientId);

    const listClient2RequestData = TestDataFactory.client();
    const client2 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: listClient2RequestData
    });
    const client2ResponseData = ctx.getData(client2);
    ctx.cleanup.addClient(client2ResponseData.clientId);

    await ctx.client.clientManagement(
      `/api/groups/${listGroupData.groupId}/clients/${client1ResponseData.clientId}` as any,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${listGroupData.groupId}/clients/${client2ResponseData.clientId}` as any,
      'post'
    );

    // Get group clients
    const response = await ctx.client.clientManagement(
      `/api/groups/${listGroupData.groupId}/clients` as any,
      'get',
      {
        params: {
          query: {}
        }
      }
    );

    const groupClientsResponseData = ctx.getData(response);
    expect(groupClientsResponseData.clients).toBeDefined();
    expect(Array.isArray(groupClientsResponseData.clients)).toBe(true);
    expect(groupClientsResponseData.clients.length).toBe(2);
  });

  test('should get all groups for a client', async () => {
    // Create client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    const clientGroupsClientData = ctx.getData(client);
    ctx.cleanup.addClient(clientGroupsClientData.clientId);

    // Create and assign multiple groups
    const group1 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup1_${Date.now()}`,
        description: 'First group'
      }
    });
    const clientGroup1Data = ctx.getData(group1);
    ctx.cleanup.addGroup(clientGroup1Data.groupId);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second group'
      }
    });
    const clientGroup2Data = ctx.getData(group2);
    ctx.cleanup.addGroup(clientGroup2Data.groupId);

    await ctx.client.clientManagement(
      `/api/groups/${clientGroup1Data.groupId}/clients/${clientGroupsClientData.clientId}` as any,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${clientGroup2Data.groupId}/clients/${clientGroupsClientData.clientId}` as any,
      'post'
    );

    // Get client groups
    const response = await ctx.client.clientManagement(
      `/api/clients/${clientGroupsClientData.clientId}/groups` as any,
      'get',
      {
        params: {
          query: {}
        }
      }
    );

    const clientGroupsResponseData = ctx.getData(response);
    expect(clientGroupsResponseData.groups).toBeDefined();
    expect(Array.isArray(clientGroupsResponseData.groups)).toBe(true);
    expect(clientGroupsResponseData.groups.length).toBe(2);
  });
});