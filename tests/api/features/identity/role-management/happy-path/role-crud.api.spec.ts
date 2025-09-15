import { describe, beforeAll, afterAll, expect } from '../../../../api/support/test-imports';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';

describe('Identity Service - Role Management Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('Role Management');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should create a new role', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Test role for API testing',
      permissions: ['read:users', 'write:users']
    };

    const response = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });

    const responseData = ctx.getData(response);
    ctx.cleanup.addRole(responseData.roleId);

    expect(response).toBeDefined();
    expect(responseData.roleId).toBeTruthy();
    expect(responseData.name).toBe(roleData.name);
    expect(responseData.description).toBe(roleData.description);
    expect(responseData.permissions).toEqual(roleData.permissions);
  });

  test('should retrieve role by ID', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Test role for retrieval',
      permissions: ['read:clients']
    };

    const created = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addRole(createdData.roleId);

    const retrieved = await ctx.client.identity(`/api/roles/${createdData.roleId}`, 'get');
    const retrievedData = ctx.getData(retrieved);

    expect(retrievedData.roleId).toBe(createdData.roleId);
    expect(retrievedData.name).toBe(roleData.name);
    expect(retrievedData.description).toBe(roleData.description);
  });

  test('should update role', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Original description',
      permissions: ['read:users']
    };

    const created = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addRole(createdData.roleId);

    const updateData = {
      description: 'Updated description',
      permissions: ['read:users', 'write:users', 'delete:users']
    };

    const updated = await ctx.client.identity(`/api/roles/${createdData.roleId}`, 'put', {
      body: updateData
    });
    const updatedData = ctx.getData(updated);

    expect(updatedData.roleId).toBe(createdData.roleId);
    expect(updatedData.description).toBe(updateData.description);
    expect(updatedData.permissions).toEqual(updateData.permissions);
  });

  test('should delete role', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Role to be deleted',
      permissions: ['read:users']
    };

    const created = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });

    const createdData = ctx.getData(created);
    const deleteResponse = await ctx.client.identity(`/api/roles/${createdData.roleId}`, 'delete');
    const deleteData = ctx.getData(deleteResponse);
    
    expect(deleteData.success).toBe(true);

    await expect(
      ctx.client.identity(`/api/roles/${createdData.roleId}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should list all roles', async () => {
    const roleData1 = {
      name: `TestRole1_${Date.now()}`,
      description: 'First test role',
      permissions: ['read:users']
    };

    const roleData2 = {
      name: `TestRole2_${Date.now()}`,
      description: 'Second test role',
      permissions: ['write:users']
    };

    const created1 = await ctx.client.identity('/api/roles', 'post', {
      body: roleData1
    });
    const created1Data = ctx.getData(created1);
    ctx.cleanup.addRole(created1Data.roleId);

    const created2 = await ctx.client.identity('/api/roles', 'post', {
      body: roleData2
    });
    const created2Data = ctx.getData(created2);
    ctx.cleanup.addRole(created2Data.roleId);

    const response = await ctx.client.identity('/api/roles', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 50
        } 
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.roles).toBeDefined();
    expect(Array.isArray(responseData.roles)).toBe(true);
    
    const roleIds = responseData.roles.map((r: any) => r.roleId);
    expect(roleIds).toContain(created1Data.roleId);
    expect(roleIds).toContain(created2Data.roleId);
  });

  test('should assign role to user', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Role for assignment',
      permissions: ['read:users']
    };

    const role = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });
    const roleResponseData = ctx.getData(role);
    ctx.cleanup.addRole(roleResponseData.roleId);

    const userData = {
      email: `test.user${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+212600000000',
      role: 'User'
    };

    const user = await ctx.client.identity('/api/users', 'post', {
      body: userData
    });
    const userResponseData = ctx.getData(user);
    ctx.cleanup.addUser(userResponseData.userId);

    const assignResponse = await ctx.client.identity(`/api/users/${userResponseData.userId}/roles`, 'post', {
      body: {
        roleId: roleResponseData.roleId
      }
    });
    const assignData = ctx.getData(assignResponse);

    expect(assignData.success).toBe(true);
  });

  test('should remove role from user', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Role for removal',
      permissions: ['read:users']
    };

    const role = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });
    const roleResponseData = ctx.getData(role);
    ctx.cleanup.addRole(roleResponseData.roleId);

    const userData = {
      email: `test.user${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+212600000000',
      role: 'User'
    };

    const user = await ctx.client.identity('/api/users', 'post', {
      body: userData
    });
    const userResponseData = ctx.getData(user);
    ctx.cleanup.addUser(userResponseData.userId);

    await ctx.client.identity(`/api/users/${userResponseData.userId}/roles`, 'post', {
      body: {
        roleId: roleResponseData.roleId
      }
    });

    const removeResponse = await ctx.client.identity(`/api/users/${userResponseData.userId}/roles/${roleResponseData.roleId}`, 'delete');
    const removeData = ctx.getData(removeResponse);

    expect(removeData.success).toBe(true);
  });

  test('should get users by role', async () => {
    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Role for user listing',
      permissions: ['read:users']
    };

    const role = await ctx.client.identity('/api/roles', 'post', {
      body: roleData
    });
    const roleResponseData = ctx.getData(role);
    ctx.cleanup.addRole(roleResponseData.roleId);

    const userData = {
      email: `test.user${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+212600000000',
      role: 'User'
    };

    const user = await ctx.client.identity('/api/users', 'post', {
      body: userData
    });
    const userResponseData = ctx.getData(user);
    ctx.cleanup.addUser(userResponseData.userId);

    await ctx.client.identity(`/api/users/${userResponseData.userId}/roles`, 'post', {
      body: {
        roleId: roleResponseData.roleId
      }
    });

    const response = await ctx.client.identity(`/api/roles/${roleResponseData.roleId}/users`, 'get');
    const responseData = ctx.getData(response);

    expect(responseData.users).toBeDefined();
    expect(Array.isArray(responseData.users)).toBe(true);
    
    const userIds = responseData.users.map((u: any) => u.userId);
    expect(userIds).toContain(userResponseData.userId);
  });
});