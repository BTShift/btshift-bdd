import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';

describe('Identity Service - Permission Management Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('Permission Management');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
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

    const createdPermissionData = ctx.getData(response);
    ctx.cleanup.addPermission(createdPermissionData.permissionId);

    expect(response).toBeDefined();
    expect(createdPermissionData.permissionId).toBeTruthy();
    expect(createdPermissionData.name).toBe(permissionData.name);
    expect(createdPermissionData.description).toBe(permissionData.description);
    expect(createdPermissionData.resource).toBe(permissionData.resource);
    expect(createdPermissionData.action).toBe(permissionData.action);
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
    const createdRetrievalData = ctx.getData(created);
    ctx.cleanup.addPermission(createdRetrievalData.permissionId);

    const retrieved = await ctx.client.identity(`/api/permissions/${createdRetrievalData.permissionId}`, 'get');
    const retrievedData = ctx.getData(retrieved);

    expect(retrievedData.permissionId).toBe(createdRetrievalData.permissionId);
    expect(retrievedData.name).toBe(permissionData.name);
    expect(retrievedData.description).toBe(permissionData.description);
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
    const createdUpdateData = ctx.getData(created);
    ctx.cleanup.addPermission(createdUpdateData.permissionId);

    const updateData = {
      description: 'Updated permission description',
      action: 'write'
    };

    const updated = await ctx.client.identity(`/api/permissions/${createdUpdateData.permissionId}`, 'put', {
      body: updateData
    });
    const updatedData = ctx.getData(updated);

    expect(updatedData.permissionId).toBe(createdUpdateData.permissionId);
    expect(updatedData.description).toBe(updateData.description);
    expect(updatedData.action).toBe(updateData.action);
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

    const createdDeleteData = ctx.getData(created);
    const deleteResponse = await ctx.client.identity(`/api/permissions/${createdDeleteData.permissionId}`, 'delete');
    const deleteResponseData = ctx.getData(deleteResponse);
    
    expect(deleteResponseData.success).toBe(true);

    await expect(
      ctx.client.identity(`/api/permissions/${createdDeleteData.permissionId}`, 'get')
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
    const created1Data = ctx.getData(created1);
    ctx.cleanup.addPermission(created1Data.permissionId);

    const created2 = await ctx.client.identity('/api/permissions', 'post', {
      body: permission2
    });
    const created2Data = ctx.getData(created2);
    ctx.cleanup.addPermission(created2Data.permissionId);

    const response = await ctx.client.identity('/api/permissions', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 50
        } 
      }
    });

    const listResponseData = ctx.getData(response);
    expect(listResponseData.permissions).toBeDefined();
    expect(Array.isArray(listResponseData.permissions)).toBe(true);
    
    const permissionIds = listResponseData.permissions.map((p: any) => p.permissionId);
    expect(permissionIds).toContain(created1Data.permissionId);
    expect(permissionIds).toContain(created2Data.permissionId);
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
    const permissionGrantData = ctx.getData(permission);
    ctx.cleanup.addPermission(permissionGrantData.permissionId);

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
    const userGrantData = ctx.getData(user);
    ctx.cleanup.addUser(userGrantData.userId);

    const grantResponse = await ctx.client.identity(`/api/users/${userGrantData.userId}/permissions`, 'post', {
      body: {
        permissionId: permissionGrantData.permissionId
      }
    });
    const grantResponseData = ctx.getData(grantResponse);

    expect(grantResponseData.success).toBe(true);
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
    const permissionRevokeData = ctx.getData(permission);
    ctx.cleanup.addPermission(permissionRevokeData.permissionId);

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
    const userRevokeData = ctx.getData(user);
    ctx.cleanup.addUser(userRevokeData.userId);

    await ctx.client.identity(`/api/users/${userRevokeData.userId}/permissions`, 'post', {
      body: {
        permissionId: permissionRevokeData.permissionId
      }
    });

    const revokeResponse = await ctx.client.identity(`/api/users/${userRevokeData.userId}/permissions/${permissionRevokeData.permissionId}`, 'delete');
    const revokeResponseData = ctx.getData(revokeResponse);

    expect(revokeResponseData.success).toBe(true);
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
    const permissionListData = ctx.getData(permission);
    ctx.cleanup.addPermission(permissionListData.permissionId);

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
    const userListData = ctx.getData(user);
    ctx.cleanup.addUser(userListData.userId);

    await ctx.client.identity(`/api/users/${userListData.userId}/permissions`, 'post', {
      body: {
        permissionId: permissionListData.permissionId
      }
    });

    const response = await ctx.client.identity(`/api/users/${userListData.userId}/permissions`, 'get');
    const userPermissionsData = ctx.getData(response);

    expect(userPermissionsData.permissions).toBeDefined();
    expect(Array.isArray(userPermissionsData.permissions)).toBe(true);
    
    const permissionIds = userPermissionsData.permissions.map((p: any) => p.permissionId);
    expect(permissionIds).toContain(permissionListData.permissionId);
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
    const permissionCheckData = ctx.getData(permission);
    ctx.cleanup.addPermission(permissionCheckData.permissionId);

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
    const userCheckData = ctx.getData(user);
    ctx.cleanup.addUser(userCheckData.userId);

    await ctx.client.identity(`/api/users/${userCheckData.userId}/permissions`, 'post', {
      body: {
        permissionId: permissionCheckData.permissionId
      }
    });

    const response = await ctx.client.identity(`/api/users/${userCheckData.userId}/has-permission`, 'post', {
      body: {
        permissionName: permissionData.name
      }
    });
    const hasPermissionData = ctx.getData(response);

    expect(hasPermissionData.hasPermission).toBe(true);
  });
});