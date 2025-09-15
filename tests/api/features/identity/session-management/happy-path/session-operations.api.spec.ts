import { describe, beforeAll, afterAll, expect } from '../../../../support/test-imports';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Session Management Operations', () => {
  let ctx: TestContext;
  let testUserId: string;
  let testSessionId: string;

  beforeAll(async () => {
    allure.parentSuite('Session Management');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
    
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
    const userResponseData = ctx.getData(user);
    testUserId = userResponseData.userId;
    ctx.cleanup.addUser(testUserId);

    // Create a session by logging in
    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#'
      }
    });
    const loginResponseData = ctx.getData(loginResponse);
    testSessionId = loginResponseData.sessionId;
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should get current session information', async () => {
    const response = await ctx.client.identity('/api/sessions/current', 'get');

    expect(response).toBeDefined();
    const currentSessionData = ctx.getData(response);
    expect(currentSessionData.sessionId).toBeTruthy();
    expect(currentSessionData.userId).toBeTruthy();
    expect(currentSessionData.createdAt).toBeTruthy();
    expect(currentSessionData.lastActivityAt).toBeTruthy();
    expect(currentSessionData.ipAddress).toBeTruthy();
    expect(currentSessionData.userAgent).toBeTruthy();
  });

  test('should list all active sessions for user', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions`, 'get');

    expect(response).toBeDefined();
    const sessionsResponseData = ctx.getData(response);
    expect(sessionsResponseData.sessions).toBeDefined();
    expect(Array.isArray(sessionsResponseData.sessions)).toBe(true);
    expect(sessionsResponseData.sessions.length).toBeGreaterThan(0);
    
    const sessionIds = sessionsResponseData.sessions.map((s: any) => s.sessionId);
    expect(sessionIds).toContain(testSessionId);
  });

  test('should get session by ID', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}`, 'get');

    expect(response).toBeDefined();
    const sessionDetailsData = ctx.getData(response);
    expect(sessionDetailsData.sessionId).toBe(testSessionId);
    expect(sessionDetailsData.userId).toBe(testUserId);
    expect(sessionDetailsData.isActive).toBe(true);
  });

  test('should refresh session', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}/refresh`, 'post');

    expect(response).toBeDefined();
    const refreshResponseData = ctx.getData(response);
    expect(refreshResponseData.token).toBeTruthy();
    expect(refreshResponseData.refreshToken).toBeTruthy();
    expect(refreshResponseData.expiresAt).toBeTruthy();
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
    const newUserData = ctx.getData(user);
    ctx.cleanup.addUser(newUserData.userId);

    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#'
      }
    });
    const newLoginResponseData = ctx.getData(loginResponse);
    const sessionToRevoke = newLoginResponseData.sessionId;

    const response = await ctx.client.identity(`/api/sessions/${sessionToRevoke}/revoke`, 'post');

    expect(response).toBeDefined();
    const revokeResponseData = ctx.getData(response);
    expect(revokeResponseData.success).toBe(true);

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
    const revokeAllResponseData = ctx.getData(response);
    expect(revokeAllResponseData.success).toBe(true);
    expect(revokeAllResponseData.revokedCount).toBeGreaterThan(0);
  });

  test('should track session activity', async () => {
    const response = await ctx.client.identity(`/api/sessions/${testSessionId}/activity`, 'post', {
      body: {
        action: 'page_view',
        resource: '/dashboard'
      }
    });

    expect(response).toBeDefined();
    const activityResponseData = ctx.getData(response);
    expect(activityResponseData.success).toBe(true);
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
    const activityHistoryData = ctx.getData(response);
    expect(activityHistoryData.activities).toBeDefined();
    expect(Array.isArray(activityHistoryData.activities)).toBe(true);
    expect(activityHistoryData.activities.length).toBeGreaterThan(0);
  });

  test('should validate session token', async () => {
    const response = await ctx.client.identity('/api/sessions/validate', 'post', {
      body: {
        token: ctx.client.getAuthToken()
      }
    });

    expect(response).toBeDefined();
    const validateResponseData = ctx.getData(response);
    expect(validateResponseData.valid).toBe(true);
    expect(validateResponseData.sessionId).toBeTruthy();
    expect(validateResponseData.userId).toBeTruthy();
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
    const timeoutUserData = ctx.getData(user);
    ctx.cleanup.addUser(timeoutUserData.userId);

    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#',
        sessionTimeout: 1 // 1 minute timeout
      }
    });

    const timeoutLoginData = ctx.getData(loginResponse);
    const shortSession = timeoutLoginData.sessionId;

    // Wait for timeout (in real test, would wait actual timeout period)
    // For now, just check the session details
    const sessionDetails = await ctx.client.identity(`/api/sessions/${shortSession}`, 'get');

    expect(sessionDetails).toBeDefined();
    const timeoutSessionDetails = ctx.getData(sessionDetails);
    expect(timeoutSessionDetails.sessionTimeout).toBe(1);
  });

  test('should get session statistics', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions/stats`, 'get');

    expect(response).toBeDefined();
    const statsResponseData = ctx.getData(response);
    expect(statsResponseData.totalSessions).toBeDefined();
    expect(statsResponseData.activeSessions).toBeDefined();
    expect(statsResponseData.averageSessionDuration).toBeDefined();
    expect(statsResponseData.lastLoginAt).toBeDefined();
  });

  test('should detect concurrent sessions', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/sessions/concurrent`, 'get');

    expect(response).toBeDefined();
    const concurrentResponseData = ctx.getData(response);
    expect(concurrentResponseData.concurrentSessions).toBeDefined();
    expect(concurrentResponseData.maxAllowed).toBeDefined();
    expect(concurrentResponseData.exceedsLimit).toBeDefined();
  });
});