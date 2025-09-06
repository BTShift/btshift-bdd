import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';

describe('Identity Service - Role Management Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('Role Management') Access');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTest();
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

    ctx.cleanup.addRole((response as any).roleId);

    expect(response).toBeDefined();
    expect((response as any).roleId).toBeTruthy();
    expect((response as any).name).toBe(roleData.name);
    expect((response as any).description).toBe(roleData.description);
    expect((response as any).permissions).toEqual(roleData.permissions);
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
    ctx.cleanup.addRole((created as any).roleId);

    const retrieved = await ctx.client.identity(`/api/roles/${(created as any).roleId}`, 'get');

    expect((retrieved as any).roleId).toBe((created as any).roleId);
    expect((retrieved as any).name).toBe(roleData.name);
    expect((retrieved as any).description).toBe(roleData.description);
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
    ctx.cleanup.addRole((created as any).roleId);

    const updateData = {
      description: 'Updated description',
      permissions: ['read:users', 'write:users', 'delete:users']
    };

    const updated = await ctx.client.identity(`/api/roles/${(created as any).roleId}`, 'put', {
      body: updateData
    });

    expect((updated as any).roleId).toBe((created as any).roleId);
    expect((updated as any).description).toBe(updateData.description);
    expect((updated as any).permissions).toEqual(updateData.permissions);
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

    const deleteResponse = await ctx.client.identity(`/api/roles/${(created as any).roleId}`, 'delete');
    
    expect((deleteResponse as any).success).toBe(true);

    await expect(
      ctx.client.identity(`/api/roles/${(created as any).roleId}`, 'get')
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
    ctx.cleanup.addRole((created1 as any).roleId);

    const created2 = await ctx.client.identity('/api/roles', 'post', {
      body: roleData2
    });
    ctx.cleanup.addRole((created2 as any).roleId);

    const response = await ctx.client.identity('/api/roles', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 50
        } 
      }
    });

    expect((response as any).roles).toBeDefined();
    expect(Array.isArray((response as any).roles)).toBe(true);
    
    const roleIds = (response as any).roles.map((r: any) => r.roleId);
    expect(roleIds).toContain((created1 as any).roleId);
    expect(roleIds).toContain((created2 as any).roleId);
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
    ctx.cleanup.addRole((role as any).roleId);

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
    ctx.cleanup.addUser((user as any).userId);

    const assignResponse = await ctx.client.identity(`/api/users/${(user as any).userId}/roles`, 'post', {
      body: {
        roleId: (role as any).roleId
      }
    });

    expect((assignResponse as any).success).toBe(true);
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
    ctx.cleanup.addRole((role as any).roleId);

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
    ctx.cleanup.addUser((user as any).userId);

    await ctx.client.identity(`/api/users/${(user as any).userId}/roles`, 'post', {
      body: {
        roleId: (role as any).roleId
      }
    });

    const removeResponse = await ctx.client.identity(`/api/users/${(user as any).userId}/roles/${(role as any).roleId}`, 'delete');

    expect((removeResponse as any).success).toBe(true);
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
    ctx.cleanup.addRole((role as any).roleId);

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
    ctx.cleanup.addUser((user as any).userId);

    await ctx.client.identity(`/api/users/${(user as any).userId}/roles`, 'post', {
      body: {
        roleId: (role as any).roleId
      }
    });

    const response = await ctx.client.identity(`/api/roles/${(role as any).roleId}/users`, 'get');

    expect((response as any).users).toBeDefined();
    expect(Array.isArray((response as any).users)).toBe(true);
    
    const userIds = (response as any).users.map((u: any) => u.userId);
    expect(userIds).toContain((user as any).userId);
  });
});