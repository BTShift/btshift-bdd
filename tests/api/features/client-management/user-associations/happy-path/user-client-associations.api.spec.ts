import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';
import { EnhancedAssertions, testStep, expectWithContext } from '../../../../support/helpers/enhanced-assertions';

describe('Client Management - User-Client Associations', () => {
  let ctx: TestContext;
  let testTenantId: string = 'test-tenant-123';

  beforeAll(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Client-User Relationships');
    ctx = await setupApiTestWithContext('TenantAdmin');
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
    const clientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(clientResponseData.clientId);

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
    const userResponseData = ctx.getData(user);
    ctx.cleanup.addUser(userResponseData.userId);

    // Assign user to client
    const response = await ctx.client.clientManagement(
      `/api/clients/${clientResponseData.clientId}/users/${userResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    const assignResponseData = ctx.getData(response);
    
    await testStep('Verify user assignment', async () => {
      await EnhancedAssertions.assertOperationSuccess(
        assignResponseData.success,
        {
          operation: 'User-Client Assignment',
          endpoint: `/api/clients/${clientResponseData.clientId}/users/${userResponseData.userId}`,
          entityType: 'user-client association',
          additionalInfo: {
            clientId: clientResponseData.clientId,
            userId: userResponseData.userId,
            clientName: clientData.name,
            userEmail: userData.email
          }
        }
      );
      
      await expectWithContext(assignResponseData.associationId, {
        operation: 'User-Client Assignment',
        entityType: 'association'
      }).toBeTruthy();
    });
  });

  test('should remove a user from a client', async () => {
    // Create client and user
    const removeClientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: removeClientData
    });
    const removeClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(removeClientResponseData.clientId);

    const removeUserData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: removeUserData.email,
        firstName: removeUserData.firstName,
        lastName: removeUserData.lastName,
        phoneNumber: removeUserData.phoneNumber,
        role: 'User'
      }
    });
    const removeUserResponseData = ctx.getData(user);
    ctx.cleanup.addUser(removeUserResponseData.userId);

    // Assign user to client first
    await ctx.client.clientManagement(
      `/api/clients/${removeClientResponseData.clientId}/users/${removeUserResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    // Remove user from client
    const response = await ctx.client.clientManagement(
      `/api/clients/${removeClientResponseData.clientId}/users/${removeUserResponseData.userId}` as any,
      'delete',
      {
        body: {
          tenantId: testTenantId
        }
      }
    );

    const removeAssociationResponseData = ctx.getData(response);
    
    await testStep('Verify user removal from client', async () => {
      await EnhancedAssertions.assertOperationSuccess(
        removeAssociationResponseData.success,
        {
          operation: 'User-Client Removal',
          endpoint: `/api/clients/${removeClientResponseData.clientId}/users/${removeUserResponseData.userId}`,
          entityType: 'user-client association',
          additionalInfo: {
            clientId: removeClientResponseData.clientId,
            userId: removeUserResponseData.userId,
            clientName: removeClientData.name,
            userEmail: removeUserData.email
          }
        }
      );
    });
  });

  test('should get all users assigned to a client', async () => {
    // Create a client
    const listUsersClientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: listUsersClientData
    });
    const listUsersClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(listUsersClientResponseData.clientId);

    // Create and assign multiple users
    const listUser1Data = TestDataFactory.user();
    const user1 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: listUser1Data.email,
        firstName: listUser1Data.firstName,
        lastName: listUser1Data.lastName,
        phoneNumber: listUser1Data.phoneNumber,
        role: 'User'
      }
    });
    const listUser1ResponseData = ctx.getData(user1);
    ctx.cleanup.addUser(listUser1ResponseData.userId);

    const listUser2Data = TestDataFactory.user();
    const user2 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: listUser2Data.email,
        firstName: listUser2Data.firstName,
        lastName: listUser2Data.lastName,
        phoneNumber: listUser2Data.phoneNumber,
        role: 'User'
      }
    });
    const listUser2ResponseData = ctx.getData(user2);
    ctx.cleanup.addUser(listUser2ResponseData.userId);

    // Assign both users to the client
    await ctx.client.clientManagement(
      `/api/clients/${listUsersClientResponseData.clientId}/users/${listUser1ResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    await ctx.client.clientManagement(
      `/api/clients/${listUsersClientResponseData.clientId}/users/${listUser2ResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    // Get client users
    const response = await ctx.client.clientManagement(
      `/api/clients/${listUsersClientResponseData.clientId}/users` as any,
      'get',
      {
        params: {
          query: {
            tenantId: testTenantId,
            page: 1,
            pageSize: 10
          }
        }
      }
    );

    const clientUsersResponseData = ctx.getData(response);
    expect(clientUsersResponseData.users).toBeDefined();
    expect(Array.isArray(clientUsersResponseData.users)).toBe(true);
    expect(clientUsersResponseData.users.length).toBe(2);
    expect(clientUsersResponseData.totalCount).toBe(2);
  });

  test('should get all clients assigned to a user', async () => {
    // Create a user
    const userClientsUserData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userClientsUserData.email,
        firstName: userClientsUserData.firstName,
        lastName: userClientsUserData.lastName,
        phoneNumber: userClientsUserData.phoneNumber,
        role: 'User'
      }
    });
    const userClientsUserResponseData = ctx.getData(user);
    ctx.cleanup.addUser(userClientsUserResponseData.userId);

    // Create and assign multiple clients
    const userClient1Data = TestDataFactory.client();
    const client1 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: userClient1Data
    });
    const userClient1ResponseData = ctx.getData(client1);
    ctx.cleanup.addClient(userClient1ResponseData.clientId);

    const userClient2Data = TestDataFactory.client();
    const client2 = await ctx.client.clientManagement('/api/clients', 'post', {
      body: userClient2Data
    });
    const userClient2ResponseData = ctx.getData(client2);
    ctx.cleanup.addClient(userClient2ResponseData.clientId);

    // Assign user to both clients
    await ctx.client.clientManagement(
      `/api/clients/${userClient1ResponseData.clientId}/users/${userClientsUserResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    await ctx.client.clientManagement(
      `/api/clients/${userClient2ResponseData.clientId}/users/${userClientsUserResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: 'admin-user-id'
        }
      }
    );

    // Get user clients
    const response = await ctx.client.clientManagement(
      `/api/users/${userClientsUserResponseData.userId}/clients` as any,
      'get',
      {
        params: {
          query: {
            tenantId: testTenantId,
            page: 1,
            pageSize: 10
          }
        }
      }
    );

    const userClientsResponseData = ctx.getData(response);
    expect(userClientsResponseData.clients).toBeDefined();
    expect(Array.isArray(userClientsResponseData.clients)).toBe(true);
    expect(userClientsResponseData.clients.length).toBe(2);
    expect(userClientsResponseData.totalCount).toBe(2);
  });

  test('should handle pagination for user-client associations', async () => {
    // Create a client
    const paginationClientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: paginationClientData
    });
    const paginationClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(paginationClientResponseData.clientId);

    // Create multiple users (more than page size)
    const users = [];
    for (let i = 0; i < 5; i++) {
      const paginationUserData = TestDataFactory.user();
      const user = await ctx.client.identity('/api/users', 'post', {
        body: {
          email: paginationUserData.email,
          firstName: paginationUserData.firstName,
          lastName: paginationUserData.lastName,
          phoneNumber: paginationUserData.phoneNumber,
          role: 'User'
        }
      });
      const paginationUserResponseData = ctx.getData(user);
      users.push(paginationUserResponseData);
      ctx.cleanup.addUser(paginationUserResponseData.userId);

      // Assign user to client
      await ctx.client.clientManagement(
        `/api/clients/${paginationClientResponseData.clientId}/users/${paginationUserResponseData.userId}` as any,
        'post',
        {
          body: {
            tenantId: testTenantId,
            assignedBy: 'admin-user-id'
          }
        }
      );
    }

    // Get first page
    const page1 = await ctx.client.clientManagement(
      `/api/clients/${paginationClientResponseData.clientId}/users` as any,
      'get',
      {
        params: {
          query: {
            tenantId: testTenantId,
            page: 1,
            pageSize: 3
          }
        }
      }
    );

    const page1ResponseData = ctx.getData(page1);
    expect(page1ResponseData.users.length).toBe(3);
    expect(page1ResponseData.totalCount).toBe(5);
    expect(page1ResponseData.page).toBe(1);
    expect(page1ResponseData.pageSize).toBe(3);

    // Get second page
    const page2 = await ctx.client.clientManagement(
      `/api/clients/${paginationClientResponseData.clientId}/users` as any,
      'get',
      {
        params: {
          query: {
            tenantId: testTenantId,
            page: 2,
            pageSize: 3
          }
        }
      }
    );

    const page2ResponseData = ctx.getData(page2);
    expect(page2ResponseData.users.length).toBe(2);
    expect(page2ResponseData.page).toBe(2);
  });

  test('should track assignment metadata', async () => {
    // Create client and user
    const metadataClientData = TestDataFactory.client();
    const client = await ctx.client.clientManagement('/api/clients', 'post', {
      body: metadataClientData
    });
    const metadataClientResponseData = ctx.getData(client);
    ctx.cleanup.addClient(metadataClientResponseData.clientId);

    const metadataUserData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: metadataUserData.email,
        firstName: metadataUserData.firstName,
        lastName: metadataUserData.lastName,
        phoneNumber: metadataUserData.phoneNumber,
        role: 'User'
      }
    });
    const metadataUserResponseData = ctx.getData(user);
    ctx.cleanup.addUser(metadataUserResponseData.userId);

    // Assign with metadata
    const assignedBy = 'admin-user-123';
    await ctx.client.clientManagement(
      `/api/clients/${metadataClientResponseData.clientId}/users/${metadataUserResponseData.userId}` as any,
      'post',
      {
        body: {
          tenantId: testTenantId,
          assignedBy: assignedBy
        }
      }
    );

    // Get client users and verify metadata
    const response = await ctx.client.clientManagement(
      `/api/clients/${metadataClientResponseData.clientId}/users` as any,
      'get',
      {
        params: {
          query: {
            tenantId: testTenantId
          }
        }
      }
    );

    const metadataResponseData = ctx.getData(response);
    const assignedUser = metadataResponseData.users[0];
    expect(assignedUser.assignedBy).toBe(assignedBy);
    expect(assignedUser.assignedAt).toBeTruthy();
  });
});