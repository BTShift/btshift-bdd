import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Client Management - User-Client Associations', () => {
  let ctx: TestContext;
  let testTenantId: string = 'test-tenant-123';

  beforeAll(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client-User Relationships');
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should assign a user to a client', async () => {
    // Create a client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Create a user
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    // Assign user to client
    const response = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    expect((response as any).success).toBe(true);
    expect((response as any).association_id).toBeTruthy();
  });

  test('should remove a user from a client', async () => {
    // Create client and user
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    // Assign user to client first
    await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    // Remove user from client
    const response = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user as any).userId}`,
      'delete',
      {
        body: {
          tenant_id: testTenantId
        }
      }
    );

    expect((response as any).success).toBe(true);
  });

  test('should get all users assigned to a client', async () => {
    // Create a client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Create and assign multiple users
    const user1Data = TestDataFactory.user();
    const user1 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: user1Data.email,
        firstName: user1Data.firstName,
        lastName: user1Data.lastName,
        phoneNumber: user1Data.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user1 as any).userId);

    const user2Data = TestDataFactory.user();
    const user2 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: user2Data.email,
        firstName: user2Data.firstName,
        lastName: user2Data.lastName,
        phoneNumber: user2Data.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user2 as any).userId);

    // Assign both users to the client
    await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user1 as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user2 as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    // Get client users
    const response = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId,
            page: 1,
            page_size: 10
          }
        }
      }
    );

    expect((response as any).users).toBeDefined();
    expect(Array.isArray((response as any).users)).toBe(true);
    expect((response as any).users.length).toBe(2);
    expect((response as any).total_count).toBe(2);
  });

  test('should get all clients assigned to a user', async () => {
    // Create a user
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    // Create and assign multiple clients
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

    // Assign user to both clients
    await ctx.client.clientManagement(
      `/api/clients/${(client1 as any).client_id}/users/${(user as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    await ctx.client.clientManagement(
      `/api/clients/${(client2 as any).client_id}/users/${(user as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: 'admin-user-id'
        }
      }
    );

    // Get user clients
    const response = await ctx.client.clientManagement(
      `/api/users/${(user as any).userId}/clients`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId,
            page: 1,
            page_size: 10
          }
        }
      }
    );

    expect((response as any).clients).toBeDefined();
    expect(Array.isArray((response as any).clients)).toBe(true);
    expect((response as any).clients.length).toBe(2);
    expect((response as any).total_count).toBe(2);
  });

  test('should handle pagination for user-client associations', async () => {
    // Create a client
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    // Create multiple users (more than page size)
    const users = [];
    for (let i = 0; i < 5; i++) {
      const userData = TestDataFactory.user();
      const user = await ctx.client.identity('/api/users', 'post', {
        body: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber,
          role: 'User'
        }
      });
      users.push(user);
      ctx.cleanup.addUser((user as any).userId);

      // Assign user to client
      await ctx.client.clientManagement(
        `/api/clients/${(client as any).client_id}/users/${(user as any).userId}`,
        'post',
        {
          body: {
            tenant_id: testTenantId,
            assigned_by: 'admin-user-id'
          }
        }
      );
    }

    // Get first page
    const page1 = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId,
            page: 1,
            page_size: 3
          }
        }
      }
    );

    expect((page1 as any).users.length).toBe(3);
    expect((page1 as any).total_count).toBe(5);
    expect((page1 as any).page).toBe(1);
    expect((page1 as any).page_size).toBe(3);

    // Get second page
    const page2 = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId,
            page: 2,
            page_size: 3
          }
        }
      }
    );

    expect((page2 as any).users.length).toBe(2);
    expect((page2 as any).page).toBe(2);
  });

  test('should track assignment metadata', async () => {
    // Create client and user
    const clientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    ctx.cleanup.addClient((client as any).client_id);

    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    // Assign with metadata
    const assignedBy = 'admin-user-123';
    await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users/${(user as any).userId}`,
      'post',
      {
        body: {
          tenant_id: testTenantId,
          assigned_by: assignedBy
        }
      }
    );

    // Get client users and verify metadata
    const response = await ctx.client.clientManagement(
      `/api/clients/${(client as any).client_id}/users`,
      'get',
      {
        params: {
          query: {
            tenant_id: testTenantId
          }
        }
      }
    );

    const assignedUser = (response as any).users[0];
    expect(assignedUser.assigned_by).toBe(assignedBy);
    expect(assignedUser.assigned_at).toBeTruthy();
  });
});