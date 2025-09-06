import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';

describe('Identity Service - Permission Management Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should create a new permission', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Test permission for API testing',
      resource: 'test-resource',
      action: 'read'
    };

    const response = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });

    ctx.cleanup.addPermission((response as any).permissionId);

    expect(response).toBeDefined();
    expect((response as any).permissionId).toBeTruthy();
    expect((response as any).name).toBe(permissionData.name);
    expect((response as any).description).toBe(permissionData.description);
    expect((response as any).resource).toBe(permissionData.resource);
    expect((response as any).action).toBe(permissionData.action);
  });

  test('should retrieve permission by ID', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission for retrieval test',
      resource: 'test-resource',
      action: 'write'
    };

    const created = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((created as any).permissionId);

    const retrieved = await ctx.client.identity(`/api/permissions/${(created as any).permissionId}`, 'get');

    expect((retrieved as any).permissionId).toBe((created as any).permissionId);
    expect((retrieved as any).name).toBe(permissionData.name);
    expect((retrieved as any).description).toBe(permissionData.description);
  });

  test('should update permission', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Original description',
      resource: 'test-resource',
      action: 'read'
    };

    const created = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((created as any).permissionId);

    const updateData = {
      description: 'Updated permission description',
      action: 'write'
    };

    const updated = await ctx.client.identity(`/api/permissions/${(created as any).permissionId}`, 'put', {
      body: updateData
    });

    expect((updated as any).permissionId).toBe((created as any).permissionId);
    expect((updated as any).description).toBe(updateData.description);
    expect((updated as any).action).toBe(updateData.action);
  });

  test('should delete permission', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission to be deleted',
      resource: 'test-resource',
      action: 'delete'
    };

    const created = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });

    const deleteResponse = await ctx.client.identity(`/api/permissions/${(created as any).permissionId}`, 'delete');
    
    expect((deleteResponse as any).success).toBe(true);

    await expect(
      ctx.client.identity(`/api/permissions/${(created as any).permissionId}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should list all permissions', async () => {
    const permission1 = {
      name: `test:permission1:${Date.now()}`,
      description: 'First test permission',
      resource: 'resource1',
      action: 'read'
    };

    const permission2 = {
      name: `test:permission2:${Date.now()}`,
      description: 'Second test permission',
      resource: 'resource2',
      action: 'write'
    };

    const created1 = await ctx.client.identity('/api/permissions', 'post', {
      body: permission1
    });
    ctx.cleanup.addPermission((created1 as any).permissionId);

    const created2 = await ctx.client.identity('/api/permissions', 'post', {
      body: permission2
    });
    ctx.cleanup.addPermission((created2 as any).permissionId);

    const response = await ctx.client.identity('/api/permissions', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 50
        } 
      }
    });

    expect((response as any).permissions).toBeDefined();
    expect(Array.isArray((response as any).permissions)).toBe(true);
    
    const permissionIds = (response as any).permissions.map((p: any) => p.permissionId);
    expect(permissionIds).toContain((created1 as any).permissionId);
    expect(permissionIds).toContain((created2 as any).permissionId);
  });

  test('should grant permission to user', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission for user grant',
      resource: 'test-resource',
      action: 'read'
    };

    const permission = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((permission as any).permissionId);

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

    const grantResponse = await ctx.client.identity(`/api/users/${(user as any).userId}/permissions`, 'post', {
      body: {
        permissionId: (permission as any).permissionId
      }
    });

    expect((grantResponse as any).success).toBe(true);
  });

  test('should revoke permission from user', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission for revocation',
      resource: 'test-resource',
      action: 'write'
    };

    const permission = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((permission as any).permissionId);

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

    await ctx.client.identity(`/api/users/${(user as any).userId}/permissions`, 'post', {
      body: {
        permissionId: (permission as any).permissionId
      }
    });

    const revokeResponse = await ctx.client.identity(`/api/users/${(user as any).userId}/permissions/${(permission as any).permissionId}`, 'delete');

    expect((revokeResponse as any).success).toBe(true);
  });

  test('should get user permissions', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission for user listing',
      resource: 'test-resource',
      action: 'read'
    };

    const permission = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((permission as any).permissionId);

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

    await ctx.client.identity(`/api/users/${(user as any).userId}/permissions`, 'post', {
      body: {
        permissionId: (permission as any).permissionId
      }
    });

    const response = await ctx.client.identity(`/api/users/${(user as any).userId}/permissions`, 'get');

    expect((response as any).permissions).toBeDefined();
    expect(Array.isArray((response as any).permissions)).toBe(true);
    
    const permissionIds = (response as any).permissions.map((p: any) => p.permissionId);
    expect(permissionIds).toContain((permission as any).permissionId);
  });

  test('should check if user has permission', async () => {
    const permissionData = {
      name: `test:permission:${Date.now()}`,
      description: 'Permission for checking',
      resource: 'test-resource',
      action: 'execute'
    };

    const permission = await ctx.client.identity('/api/permissions', 'post', {
      body: permissionData
    });
    ctx.cleanup.addPermission((permission as any).permissionId);

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

    await ctx.client.identity(`/api/users/${(user as any).userId}/permissions`, 'post', {
      body: {
        permissionId: (permission as any).permissionId
      }
    });

    const response = await ctx.client.identity(`/api/users/${(user as any).userId}/has-permission`, 'post', {
      body: {
        permissionName: permissionData.name
      }
    });

    expect((response as any).hasPermission).toBe(true);
  });
});