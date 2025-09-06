import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Client Management - Group Operations', () => {
  let ctx: TestContext;
  let testTenantId: string = 'test-tenant-123';

  beforeAll(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client Organization');
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should create a new client group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Test group for API testing',
      tenant_id: testTenantId
    };

    const response = await ctx.client.clientManagement('/api/groups', 'post', {
      body: groupData
    });

    const responseData = ctx.getData(response);
    ctx.cleanup.addGroup(responseData.group_id);

    expect(response).toBeDefined();
    expect(responseData.group_id).toBeTruthy();
    expect(responseData.name).toBe(groupData.name);
    expect(responseData.description).toBe(groupData.description);
  });

  test('should update an existing group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Original description',
      tenant_id: testTenantId
    };

    const created = await ctx.client.clientManagement('/api/groups', 'post', {
      body: groupData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addGroup(createdData.group_id);

    const updateData = {
      name: `UpdatedGroup_${Date.now()}`,
      description: 'Updated description'
    };

    const response = await ctx.client.clientManagement(`/api/groups/${createdData.group_id}`, 'put', {
      body: updateData
    });

    const updateResponseData = ctx.getData(response);
    expect(updateResponseData.group_id).toBe(createdData.group_id);
    expect(updateResponseData.name).toBe(updateData.name);
    expect(updateResponseData.description).toBe(updateData.description);
  });

  test('should delete a group', async () => {
    const groupData = {
      name: `TestGroup_${Date.now()}`,
      description: 'Group to be deleted',
      tenant_id: testTenantId
    };

    const created = await ctx.client.clientManagement('/api/groups', 'post', {
      body: groupData
    });
    const deleteCreatedData = ctx.getData(created);

    const response = await ctx.client.clientManagement(`/api/groups/${deleteCreatedData.group_id}`, 'delete');

    const deleteResponseData = ctx.getData(response);
    expect(deleteResponseData.success).toBe(true);
  });

  test('should list all groups for a tenant', async () => {
    // Create multiple groups
    const group1 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup1_${Date.now()}`,
        description: 'First test group',
        tenant_id: testTenantId
      }
    });
    const group1Data = ctx.getData(group1);
    ctx.cleanup.addGroup(group1Data.group_id);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second test group',
        tenant_id: testTenantId
      }
    });
    const group2Data = ctx.getData(group2);
    ctx.cleanup.addGroup(group2Data.group_id);

    const response = await ctx.client.clientManagement('/api/groups', 'get', {
      params: {
        query: {
          tenant_id: testTenantId,
          page: 1,
          page_size: 10
        }
      }
    });

    const listResponseData = ctx.getData(response);
    expect(listResponseData.groups).toBeDefined();
    expect(Array.isArray(listResponseData.groups)).toBe(true);
    expect(listResponseData.groups.length).toBeGreaterThanOrEqual(2);
  });

  test('should add a client to a group', async () => {
    // Create a group
    const group = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup_${Date.now()}`,
        description: 'Group for client association',
        tenant_id: testTenantId
      }
    });
    const groupData = ctx.getData(group);
    ctx.cleanup.addGroup(groupData.group_id);

    // Create a client
    const clientRequestData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientRequestData
    });
    const clientData = ctx.getData(client);
    ctx.cleanup.addClient(clientData.client_id);

    // Add client to group
    const response = await ctx.client.clientManagement(
      `/api/groups/${groupData.group_id}/clients/${clientData.client_id}`,
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
        description: 'Group for client removal',
        tenant_id: testTenantId
      }
    });
    const removeGroupData = ctx.getData(group);
    ctx.cleanup.addGroup(removeGroupData.group_id);

    const removeClientRequestData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: removeClientRequestData
    });
    const removeClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(removeClientResponseData.client_id);

    // Add client to group first
    await ctx.client.clientManagement(
      `/api/groups/${removeGroupData.group_id}/clients/${removeClientResponseData.client_id}`,
      'post'
    );

    // Remove client from group
    const response = await ctx.client.clientManagement(
      `/api/groups/${removeGroupData.group_id}/clients/${removeClientResponseData.client_id}`,
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
        description: 'Group for client listing',
        tenant_id: testTenantId
      }
    });
    const listGroupData = ctx.getData(group);
    ctx.cleanup.addGroup(listGroupData.group_id);

    // Create and add multiple clients
    const listClient1RequestData = TestDataFactory.client();
    const client1 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: listClient1RequestData
    });
    const client1ResponseData = ctx.getData(client1);
    ctx.cleanup.addClient(client1ResponseData.client_id);

    const listClient2RequestData = TestDataFactory.client();
    const client2 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: listClient2RequestData
    });
    const client2ResponseData = ctx.getData(client2);
    ctx.cleanup.addClient(client2ResponseData.client_id);

    await ctx.client.clientManagement(
      `/api/groups/${listGroupData.group_id}/clients/${client1ResponseData.client_id}`,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${listGroupData.group_id}/clients/${client2ResponseData.client_id}`,
      'post'
    );

    // Get group clients
    const response = await ctx.client.clientManagement(
      `/api/groups/${listGroupData.group_id}/clients`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId
          }
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
    ctx.cleanup.addClient(clientGroupsClientData.client_id);

    // Create and assign multiple groups
    const group1 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup1_${Date.now()}`,
        description: 'First group',
        tenant_id: testTenantId
      }
    });
    const clientGroup1Data = ctx.getData(group1);
    ctx.cleanup.addGroup(clientGroup1Data.group_id);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second group',
        tenant_id: testTenantId
      }
    });
    const clientGroup2Data = ctx.getData(group2);
    ctx.cleanup.addGroup(clientGroup2Data.group_id);

    await ctx.client.clientManagement(
      `/api/groups/${clientGroup1Data.group_id}/clients/${clientGroupsClientData.client_id}`,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${clientGroup2Data.group_id}/clients/${clientGroupsClientData.client_id}`,
      'post'
    );

    // Get client groups
    const response = await ctx.client.clientManagement(
      `/api/clients/${clientGroupsClientData.client_id}/groups`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId
          }
        }
      }
    );

    const clientGroupsResponseData = ctx.getData(response);
    expect(clientGroupsResponseData.groups).toBeDefined();
    expect(Array.isArray(clientGroupsResponseData.groups)).toBe(true);
    expect(clientGroupsResponseData.groups.length).toBe(2);
  });
});