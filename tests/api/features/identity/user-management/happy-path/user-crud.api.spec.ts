import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - User Management CRUD Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('User Management');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
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

    const responseData = ctx.getData(response);
    ctx.cleanup.addUser(responseData.userId);
    
    expect(response).toBeDefined();
    expect(responseData.userId).toBeTruthy();
    expect(responseData.email).toBe(userData.email);
    expect(responseData.firstName).toBe(userData.firstName);
    expect(responseData.lastName).toBe(userData.lastName);
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
    const createdData = ctx.getData(created);
    ctx.cleanup.addUser(createdData.userId);

    const retrieved = await ctx.client.identity(`/api/users/${createdData.userId}`, 'get');
    const retrievedData = ctx.getData(retrieved);

    expect(retrievedData.userId).toBe(createdData.userId);
    expect(retrievedData.email).toBe(userData.email);
    expect(retrievedData.firstName).toBe(userData.firstName);
    expect(retrievedData.lastName).toBe(userData.lastName);
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
    const createdData = ctx.getData(created);
    ctx.cleanup.addUser(createdData.userId);

    const updatePayload = {
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+212600000001'
    };

    const updated = await ctx.client.identity(`/api/users/${createdData.userId}`, 'put', {
      body: updatePayload
    });
    const updatedData = ctx.getData(updated);

    expect(updatedData.userId).toBe(createdData.userId);
    expect(updatedData.firstName).toBe(updatePayload.firstName);
    expect(updatedData.lastName).toBe(updatePayload.lastName);
    expect(updatedData.phoneNumber).toBe(updatePayload.phoneNumber);
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

    const createdData = ctx.getData(created);
    const deleteResponse = await ctx.client.identity(`/api/users/${createdData.userId}`, 'delete');
    const deleteData = ctx.getData(deleteResponse);
    
    expect(deleteData.success).toBe(true);

    await expect(
      ctx.client.identity(`/api/users/${createdData.userId}`, 'get')
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
    const created1Data = ctx.getData(created1);
    ctx.cleanup.addUser(created1Data.userId);

    const created2 = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData2.email,
        firstName: userData2.firstName,
        lastName: userData2.lastName,
        phoneNumber: userData2.phoneNumber,
        role: 'User'
      }
    });
    const created2Data = ctx.getData(created2);
    ctx.cleanup.addUser(created2Data.userId);

    const response = await ctx.client.identity('/api/users', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.users).toBeDefined();
    expect(Array.isArray(responseData.users)).toBe(true);
    expect(responseData.totalCount).toBeGreaterThanOrEqual(2);
    
    const userIds = responseData.users.map((u: any) => u.userId);
    expect(userIds).toContain(created1Data.userId);
    expect(userIds).toContain(created2Data.userId);
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
    const createdData = ctx.getData(created);
    ctx.cleanup.addUser(createdData.userId);

    const response = await ctx.client.identity('/api/users/search', 'get', {
      params: { 
        query: { 
          email: userData.email
        } 
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.users).toBeDefined();
    expect(Array.isArray(responseData.users)).toBe(true);
    expect(responseData.users.length).toBeGreaterThanOrEqual(1);
    
    const found = responseData.users.find((u: any) => u.userId === createdData.userId);
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
    const createdData = ctx.getData(created);
    ctx.cleanup.addUser(createdData.userId);

    const retrieved = await ctx.client.identity(`/api/users/by-email/${encodeURIComponent(userData.email)}`, 'get');
    const retrievedData = ctx.getData(retrieved);

    expect(retrievedData.userId).toBe(createdData.userId);
    expect(retrievedData.email).toBe(userData.email);
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
    const createdData = ctx.getData(created);
    ctx.cleanup.addUser(createdData.userId);

    const deactivated = await ctx.client.identity(`/api/users/${createdData.userId}/deactivate`, 'post');
    const deactivatedData = ctx.getData(deactivated);
    expect(deactivatedData.isActive).toBe(false);

    const reactivated = await ctx.client.identity(`/api/users/${createdData.userId}/activate`, 'post');
    const reactivatedData = ctx.getData(reactivated);
    expect(reactivatedData.isActive).toBe(true);
  });
});