import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Client Management - Group Operations', () => {
  let ctx: TestContext;
  let testTenantId: string = 'test-tenant-123';

  beforeAll(async () => {
    allure.parentSuite('Client Management Service');
    allure.suite('Group Management');
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

    ctx.cleanup.addGroup((response as any).group_id);

    expect(response).toBeDefined();
    expect((response as any).group_id).toBeTruthy();
    expect((response as any).name).toBe(groupData.name);
    expect((response as any).description).toBe(groupData.description);
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
    ctx.cleanup.addGroup((created as any).group_id);

    const updateData = {
      name: `UpdatedGroup_${Date.now()}`,
      description: 'Updated description'
    };

    const response = await ctx.client.clientManagement(`/api/groups/${(created as any).group_id}`, 'put', {
      body: updateData
    });

    expect((response as any).group_id).toBe((created as any).group_id);
    expect((response as any).name).toBe(updateData.name);
    expect((response as any).description).toBe(updateData.description);
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

    const response = await ctx.client.clientManagement(`/api/groups/${(created as any).group_id}`, 'delete');

    expect((response as any).success).toBe(true);
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
    ctx.cleanup.addGroup((group1 as any).group_id);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second test group',
        tenant_id: testTenantId
      }
    });
    ctx.cleanup.addGroup((group2 as any).group_id);

    const response = await ctx.client.clientManagement('/api/groups', 'get', {
      params: {
        query: {
          tenant_id: testTenantId,
          page: 1,
          page_size: 10
        }
      }
    });

    expect((response as any).groups).toBeDefined();
    expect(Array.isArray((response as any).groups)).toBe(true);
    expect((response as any).groups.length).toBeGreaterThanOrEqual(2);
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
    ctx.cleanup.addGroup((group as any).group_id);

    // Create a client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Add client to group
    const response = await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients/${(client as any).client_id}`,
      'post'
    );

    expect((response as any).success).toBe(true);
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
    ctx.cleanup.addGroup((group as any).group_id);

    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Add client to group first
    await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients/${(client as any).client_id}`,
      'post'
    );

    // Remove client from group
    const response = await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients/${(client as any).client_id}`,
      'delete'
    );

    expect((response as any).success).toBe(true);
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
    ctx.cleanup.addGroup((group as any).group_id);

    // Create and add multiple clients
    const client1Data = TestDataFactory.client();
    const client1 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: client1Data
    });
    ctx.cleanup.addClient((client1 as any).client_id);

    const client2Data = TestDataFactory.client();
    const client2 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: client2Data
    });
    ctx.cleanup.addClient((client2 as any).client_id);

    await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients/${(client1 as any).client_id}`,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients/${(client2 as any).client_id}`,
      'post'
    );

    // Get group clients
    const response = await ctx.client.clientManagement(
      `/api/groups/${(group as any).group_id}/clients`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId
          }
        }
      }
    );

    expect((response as any).clients).toBeDefined();
    expect(Array.isArray((response as any).clients)).toBe(true);
    expect((response as any).clients.length).toBe(2);
  });

  test('should get all groups for a client', async () => {
    // Create client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Create and assign multiple groups
    const group1 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup1_${Date.now()}`,
        description: 'First group',
        tenant_id: testTenantId
      }
    });
    ctx.cleanup.addGroup((group1 as any).group_id);

    const group2 = await ctx.client.clientManagement('/api/groups', 'post', {
      body: {
        name: `TestGroup2_${Date.now()}`,
        description: 'Second group',
        tenant_id: testTenantId
      }
    });
    ctx.cleanup.addGroup((group2 as any).group_id);

    await ctx.client.clientManagement(
      `/api/groups/${(group1 as any).group_id}/clients/${(client as any).client_id}`,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${(group2 as any).group_id}/clients/${(client as any).client_id}`,
      'post'
    );

    // Get client groups
    const response = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/groups`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId
          }
        }
      }
    );

    expect((response as any).groups).toBeDefined();
    expect(Array.isArray((response as any).groups)).toBe(true);
    expect((response as any).groups.length).toBe(2);
  });
});