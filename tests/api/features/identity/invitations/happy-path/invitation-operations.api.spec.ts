import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Invitation Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should send user invitation', async () => {
    const invitationData = {
      email: `invitee${Date.now()}@example.com`,
      firstName: 'John',
      lastName: 'Doe',
      role: 'User',
      tenantId: 'test-tenant-id'
    };

    const response = await ctx.client.identity('/api/invitations', 'post', {
      body: invitationData
    });

    ctx.cleanup.addInvitation((response as any).invitationId);

    expect(response).toBeDefined();
    expect((response as any).invitationId).toBeTruthy();
    expect((response as any).email).toBe(invitationData.email);
    expect((response as any).status).toBe('Pending');
    expect((response as any).invitationToken).toBeTruthy();
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
    ctx.cleanup.addInvitation((created as any).invitationId);

    const response = await ctx.client.identity(`/api/invitations/${(created as any).invitationId}`, 'get');

    expect((response as any).invitationId).toBe((created as any).invitationId);
    expect((response as any).email).toBe(invitationData.email);
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
    ctx.cleanup.addInvitation((created as any).invitationId);

    const response = await ctx.client.identity(`/api/invitations/${(created as any).invitationId}/accept`, 'post', {
      body: {
        invitationToken: (created as any).invitationToken,
        password: 'NewUser123!@#'
      }
    });

    expect((response as any).success).toBe(true);
    expect((response as any).userId).toBeTruthy();
    ctx.cleanup.addUser((response as any).userId);
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
    ctx.cleanup.addInvitation((created as any).invitationId);

    const response = await ctx.client.identity(`/api/invitations/${(created as any).invitationId}/resend`, 'post');

    expect((response as any).success).toBe(true);
    expect((response as any).message).toContain('resent');
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

    const response = await ctx.client.identity(`/api/invitations/${(created as any).invitationId}/cancel`, 'post');

    expect((response as any).success).toBe(true);

    const getResponse = await ctx.client.identity(`/api/invitations/${(created as any).invitationId}`, 'get');
    expect((getResponse as any).status).toBe('Cancelled');
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

    expect((response as any).invitations).toBeDefined();
    expect(Array.isArray((response as any).invitations)).toBe(true);
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
    ctx.cleanup.addInvitation((created as any).invitationId);

    const response = await ctx.client.identity('/api/invitations/validate', 'post', {
      body: {
        invitationToken: (created as any).invitationToken
      }
    });

    expect((response as any).valid).toBe(true);
    expect((response as any).invitationId).toBe((created as any).invitationId);
  });
});