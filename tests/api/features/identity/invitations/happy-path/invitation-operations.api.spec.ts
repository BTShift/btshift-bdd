import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Invitation Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('User Invitations');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should send user invitation', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'John',
      lastName: 'Doe',
      role: 'User'
    };

    const response = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const responseData = ctx.getData(response);

    ctx.cleanup.addInvitation(responseData.invitationId);

    expect(response).toBeDefined();
    expect(responseData.invitationId).toBeTruthy();
    expect(responseData.email).toBe(invitationData.email);
    expect(responseData.status).toBe('Pending');
    expect(responseData.invitationToken).toBeTruthy();
  });

  test('should get invitation by ID', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'Admin'
    };

    const created = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addInvitation(createdData.invitationId);

    const response = await ctx.client.identity(`/api/invitations/${createdData.invitationId}`, 'get');
    const responseData = ctx.getData(response);

    expect(responseData.invitationId).toBe(createdData.invitationId);
    expect(responseData.email).toBe(invitationData.email);
  });

  test('should accept invitation', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'User'
    };

    const created = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addInvitation(createdData.invitationId);

    const response = await ctx.client.identity(`/api/invitations/${createdData.invitationId}/accept`, 'post', {
      body: {
        invitationToken: createdData.invitationToken,
        password: 'NewUser123!@#'
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.success).toBe(true);
    expect(responseData.userId).toBeTruthy();
    ctx.cleanup.addUser(responseData.userId);
  });

  test('should resend invitation', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'User'
    };

    const created = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addInvitation(createdData.invitationId);

    const response = await ctx.client.identity(`/api/invitations/${createdData.invitationId}/resend`, 'post');
    const responseData = ctx.getData(response);

    expect(responseData.success).toBe(true);
    expect(responseData.message).toContain('resent');
  });

  test('should cancel invitation', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'Charlie',
      lastName: 'Brown',
      role: 'User'
    };

    const created = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const createdData = ctx.getData(created);

    const response = await ctx.client.identity(`/api/invitations/${createdData.invitationId}/cancel`, 'post');
    const responseData = ctx.getData(response);

    expect(responseData.success).toBe(true);

    const getResponse = await ctx.client.identity(`/api/invitations/${createdData.invitationId}`, 'get');
    const getResponseData = ctx.getData(getResponse);
    expect(getResponseData.status).toBe('Cancelled');
  });

  test('should list pending invitations', async () => {
    const response = await ctx.client.identity('/api/invitations', 'get', {
      params: { 
        query: { 
          status: 'Pending',
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.invitations).toBeDefined();
    expect(Array.isArray(responseData.invitations)).toBe(true);
  });

  test('should validate invitation token', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'David',
      lastName: 'Lee',
      role: 'User'
    };

    const created = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });
    const createdData = ctx.getData(created);
    ctx.cleanup.addInvitation(createdData.invitationId);

    const response = await ctx.client.identity('/api/invitations/validate', 'post', {
      body: {
        invitationToken: createdData.invitationToken
      }
    });
    const responseData = ctx.getData(response);

    expect(responseData.valid).toBe(true);
    expect(responseData.invitationId).toBe(createdData.invitationId);
  });
});