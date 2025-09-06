import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - User Management CRUD Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should create a new user successfully', async () => {
    const userData = TestDataFactory.user();
    
    const response = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });

    ctx.cleanup.addUser((response as any).userId);
    
    expect(response).toBeDefined();
    expect((response as any).userId).toBeTruthy();
    expect((response as any).email).toBe(userData.email);
    expect((response as any).firstName).toBe(userData.firstName);
    expect((response as any).lastName).toBe(userData.lastName);
  });

  test('should retrieve user by ID', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created as any).userId);

    const retrieved = await ctx.client.identity(`/api/users/${(created as any).userId}`, 'get');

    expect((retrieved as any).userId).toBe((created as any).userId);
    expect((retrieved as any).email).toBe(userData.email);
    expect((retrieved as any).firstName).toBe(userData.firstName);
    expect((retrieved as any).lastName).toBe(userData.lastName);
  });

  test('should update user information', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created as any).userId);

    const updatedData = {
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+212600000001'
    };

    const updated = await ctx.client.identity(`/api/users/${(created as any).userId}`, 'put', {
      body: updatedData
    });

    expect((updated as any).userId).toBe((created as any).userId);
    expect((updated as any).firstName).toBe(updatedData.firstName);
    expect((updated as any).lastName).toBe(updatedData.lastName);
    expect((updated as any).phoneNumber).toBe(updatedData.phoneNumber);
  });

  test('should delete user', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });

    const deleteResponse = await ctx.client.identity(`/api/users/${(created as any).userId}`, 'delete');
    
    expect((deleteResponse as any).success).toBe(true);

    await expect(
      ctx.client.identity(`/api/users/${(created as any).userId}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should list users with pagination', async () => {
    const userData1 = TestDataFactory.user();
    const userData2 = TestDataFactory.user();
    
    const created1 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData1.email,
        firstName: userData1.firstName,
        lastName: userData1.lastName,
        phoneNumber: userData1.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created1 as any).userId);

    const created2 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData2.email,
        firstName: userData2.firstName,
        lastName: userData2.lastName,
        phoneNumber: userData2.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created2 as any).userId);

    const response = await ctx.client.identity('/api/users', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });

    expect((response as any).users).toBeDefined();
    expect(Array.isArray((response as any).users)).toBe(true);
    expect((response as any).totalCount).toBeGreaterThanOrEqual(2);
    
    const userIds = (response as any).users.map((u: any) => u.userId);
    expect(userIds).toContain((created1 as any).userId);
    expect(userIds).toContain((created2 as any).userId);
  });

  test('should search users by email', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created as any).userId);

    const response = await ctx.client.identity('/api/users/search', 'get', {
      params: { 
        query: { 
          email: userData.email
        } 
      }
    });

    expect((response as any).users).toBeDefined();
    expect(Array.isArray((response as any).users)).toBe(true);
    expect((response as any).users.length).toBeGreaterThanOrEqual(1);
    
    const found = (response as any).users.find((u: any) => u.userId === (created as any).userId);
    expect(found).toBeDefined();
    expect(found.email).toBe(userData.email);
  });

  test('should get user by email', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created as any).userId);

    const retrieved = await ctx.client.identity(`/api/users/by-email/${encodeURIComponent(userData.email)}`, 'get');

    expect((retrieved as any).userId).toBe((created as any).userId);
    expect((retrieved as any).email).toBe(userData.email);
  });

  test('should deactivate and reactivate user', async () => {
    const userData = TestDataFactory.user();
    const created = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    ctx.cleanup.addUser((created as any).userId);

    const deactivated = await ctx.client.identity(`/api/users/${(created as any).userId}/deactivate`, 'post');
    expect((deactivated as any).isActive).toBe(false);

    const reactivated = await ctx.client.identity(`/api/users/${(created as any).userId}/activate`, 'post');
    expect((reactivated as any).isActive).toBe(true);
  });
});