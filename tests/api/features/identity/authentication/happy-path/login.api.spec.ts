import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupUnauthenticatedApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Authentication - Login Happy Path API Tests', () => {
  let ctx: TestContext;
  const credentials = TestDataFactory.credentials();

  beforeAll(async () => {
    allure.parentSuite('Authentication');
    allure.feature('Identity & Access Management');
    // Use unauthenticated setup since we're testing login functionality
    ctx = await setupUnauthenticatedApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should successfully login with valid SuperAdmin credentials', async () => {
    const response = await ctx.client.identity('/api/authentication/login', 'post', {
      body: credentials
    });

    // Report the X-Correlation-ID to Allure for this API call
    ctx.reportLastCorrelationId();

    expect(response).toBeDefined();
    // Handle wrapped response format using helper
    const responseData = ctx.getData(response);
    expect(responseData.tokenInfo?.accessToken).toBeTruthy();
    expect(responseData.tokenInfo?.refreshToken).toBeTruthy();
    expect(responseData.userInfo?.email).toBe(credentials.email);
    expect(responseData.userInfo?.roles).toContain('SuperAdmin');
  });

  test('should validate a valid token', async () => {
    await ctx.client.login(credentials.email, credentials.password);
    const token = ctx.client.getAuthToken();

    const response = await ctx.client.identity('/api/authentication/validate-token', 'get', {
      params: { query: { token } }
    });

    expect(response).toBeDefined();
    const responseData = ctx.getData(response);
    expect(responseData.valid).toBe(true);
    expect(responseData.user?.email).toBe(credentials.email);
  });

  test('should refresh token with valid refresh token', async () => {
    const loginResponse = await ctx.client.login(credentials.email, credentials.password);
    const loginData = ctx.getData(loginResponse);
    const refreshToken = loginData.tokenInfo?.refreshToken;
    const originalToken = ctx.client.getAuthToken();

    const refreshResponse = await ctx.client.identity('/api/authentication/refresh', 'post', {
      body: { refreshToken }
    });
    const refreshData = ctx.getData(refreshResponse);

    expect(refreshData.tokenInfo?.accessToken).toBeTruthy();
    expect(refreshData.tokenInfo?.accessToken).not.toBe(originalToken);
  });

  test('should logout successfully', async () => {
    await ctx.client.login(credentials.email, credentials.password);
    expect(ctx.client.getAuthToken()).toBeTruthy();

    await ctx.client.logout();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should maintain authentication state across multiple requests', async () => {
    await ctx.client.login(credentials.email, credentials.password);
    const token = ctx.client.getAuthToken();

    for (let i = 0; i < 3; i++) {
      const response = await ctx.client.identity('/api/authentication/me', 'get');
      expect(response).toBeDefined();
      expect(ctx.client.getAuthToken()).toBe(token);
    }
  });

  test('should return user information in login response', async () => {
    const response = await ctx.client.identity('/api/authentication/login', 'post', {
      body: credentials
    });

    const responseData = ctx.getData(response);
    const user = responseData.user;
    expect(user).toBeDefined();
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(credentials.email);
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(Array.isArray(user.roles)).toBe(true);
  });

  test('should have token with reasonable expiration time', async () => {
    const response = await ctx.client.identity('/api/authentication/login', 'post', {
      body: credentials
    });
    
    const responseData = ctx.getData(response);
    const expiresAt = new Date(responseData.tokenInfo.expiresAt);
    const now = new Date();
    const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
    
    expect(diffMinutes).toBeGreaterThan(15);
    expect(diffMinutes).toBeLessThan(24 * 60);
  });
});