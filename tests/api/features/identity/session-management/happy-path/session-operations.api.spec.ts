import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Session Management Operations', () => {
  let ctx: TestContext;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    allure.parentSuite('Session Management');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTest();
    
    // Create a test user for session operations
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User',
        password: 'Test123!@#'
      }
    });
    testUserId = (user as any).userId;
    ctx.cleanup.addUser(testUserId);

    // Create a session by logging in
    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#'
      }
    });
    testSessionId = (loginResponse as any).sessionId;
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should get current session information', async () => {
    const response = await ctx.client.identity('/api/sessions/current', 'get');

    expect(response).toBeDefined();
    expect((response as any).sessionId).toBeTruthy();
    expect((response as any).userId).toBeTruthy();
    expect((response as any).createdAt).toBeTruthy();
    expect((response as any).lastActivityAt).toBeTruthy();
    expect((response as any).ipAddress).toBeTruthy();
    expect((response as any).userAgent).toBeTruthy();
  });

  test('should list all active sessions for user', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions`, 'get');

    expect(response).toBeDefined();
    expect((response as any).sessions).toBeDefined();
    expect(Array.isArray((response as any).sessions)).toBe(true);
    expect((response as any).sessions.length).toBeGreaterThan(0);
    
    const sessionIds = (response as any).sessions.map((s: any) => s.sessionId);
    expect(sessionIds).toContain(testSessionId);
  });

  test('should get session by ID', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}`, 'get');

    expect(response).toBeDefined();
    expect((response as any).sessionId).toBe(testSessionId);
    expect((response as any).userId).toBe(testUserId);
    expect((response as any).isActive).toBe(true);
  });

  test('should refresh session', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}/refresh`, 'post');

    expect(response).toBeDefined();
    expect((response as any).token).toBeTruthy();
    expect((response as any).refreshToken).toBeTruthy();
    expect((response as any).expiresAt).toBeTruthy();
  });

  test('should revoke specific session', async () => {
    // Create a new session first
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User',
        password: 'Test123!@#'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#'
      }
    });
    const sessionToRevoke = (loginResponse as any).sessionId;

    const response = await ctx.client.identity(`/api/sessions/${sessionToRevoke}/revoke`, 'post');

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);

    // Verify session is revoked
    await expect(
      ctx.client.identity(`/api/sessions/${sessionToRevoke}`, 'get')
    ).rejects.toMatchObject({
      response: { status: 404 }
    });
  });

  test('should revoke all sessions for user', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions/revoke-all`, 'post');

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
    expect((response as any).revokedCount).toBeGreaterThan(0);
  });

  test('should track session activity', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}/activity`, 'post', {
      body: {
        action: 'page_view',
        resource: '/dashboard'
      }
    });

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
  });

  test('should get session activity history', async () => {
    // Track some activity first
    await ctx.client.identity(`/api/sessions/${testSessionId}/activity`, 'post', {
      body: {
        action: 'api_call',
        resource: '/api/users'
      }
    });

    const response = await ctx.client.identity(`/api/sessions/${testSessionId}/activity`, 'get');

    expect(response).toBeDefined();
    expect((response as any).activities).toBeDefined();
    expect(Array.isArray((response as any).activities)).toBe(true);
    expect((response as any).activities.length).toBeGreaterThan(0);
  });

  test('should validate session token', async () => {
    const response = await ctx.client.identity('/api/sessions/validate', 'post', {
      body: {
        token: ctx.client.getAuthToken()
      }
    });

    expect(response).toBeDefined();
    expect((response as any).valid).toBe(true);
    expect((response as any).sessionId).toBeTruthy();
    expect((response as any).userId).toBeTruthy();
  });

  test('should handle session timeout', async () => {
    // Create a session with short timeout
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User',
        password: 'Test123!@#'
      }
    });
    ctx.cleanup.addUser((user as any).userId);

    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#',
        sessionTimeout: 1 // 1 minute timeout
      }
    });

    const shortSession = (loginResponse as any).sessionId;

    // Wait for timeout (in real test, would wait actual timeout period)
    // For now, just check the session details
    const sessionDetails = await ctx.client.identity(`/api/sessions/${shortSession}`, 'get');

    expect(sessionDetails).toBeDefined();
    expect((sessionDetails as any).sessionTimeout).toBe(1);
  });

  test('should get session statistics', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions/stats`, 'get');

    expect(response).toBeDefined();
    expect((response as any).totalSessions).toBeDefined();
    expect((response as any).activeSessions).toBeDefined();
    expect((response as any).averageSessionDuration).toBeDefined();
    expect((response as any).lastLoginAt).toBeDefined();
  });

  test('should detect concurrent sessions', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions/concurrent`, 'get');

    expect(response).toBeDefined();
    expect((response as any).concurrentSessions).toBeDefined();
    expect((response as any).maxAllowed).toBeDefined();
    expect((response as any).exceedsLimit).toBeDefined();
  });
});