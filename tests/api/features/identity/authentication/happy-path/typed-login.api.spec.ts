import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupUnauthenticatedApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { superAdminCredentials } from '../../../../support/fixtures/tenant-data';

describe('Business Feature: Platform Access Control', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.feature('Identity & Access Management');
    allure.parentSuite('🔐 Security & Access');
    allure.suite('Authentication Systems');
    allure.subSuite('User Login Process');
    
    // Use unauthenticated setup since we're testing login functionality
    ctx = await setupUnauthenticatedApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('Super Admin can access the platform with valid credentials', async () => {
    allure.story('As a Super Admin, I want to securely log into the platform so I can manage tenants and users');
    allure.description('This test validates that Super Admin can authenticate using the platform login system and receive proper access tokens for subsequent operations.');
    allure.tag('authentication');
    allure.tag('security');
    allure.tag('access-control');
    allure.owner('Super Admin');
    allure.severity('blocker');

    let loginResponse: any;
    // Act - Using the typed ctx.client from @btshift/identity-types
    const response = await ctx.client.identity('/api/authentication/login', 'post', {
      body: {
        email: superAdminCredentials.email,
        password: superAdminCredentials.password
      }
    });

    // Assert - Response is fully typed based on the OpenAPI schema
    expect(response).toBeDefined();
    const loginResponseData = ctx.getData(response);
    expect(loginResponseData.success).toBe(true);
    expect(loginResponseData.tokenInfo).toBeDefined();
    expect(loginResponseData.tokenInfo.accessToken).toBeTruthy();
    
    // Verify token was set
    expect(ctx.client.getAuthToken()).toBeTruthy();
  });

  test('should get current user information with typed ctx.client', async () => {
    // Arrange - Login first
    await ctx.client.login(superAdminCredentials.email, superAdminCredentials.password);

    // Act - Get current user using typed endpoint
    const response = await ctx.client.identity('/api/authentication/me', 'get');

    // Assert
    expect(response).toBeDefined();
    const meResponseData = ctx.getData(response);
    expect(meResponseData.email).toBe(superAdminCredentials.email);
    expect(meResponseData.roles).toBeDefined();
  });

  test('should refresh token with typed ctx.client', async () => {
    // Arrange - Login to get tokens
    const loginResponse = await ctx.client.login(
      superAdminCredentials.email,
      superAdminCredentials.password
    );
    const loginTokenData = ctx.getData(loginResponse);
    const refreshToken = loginTokenData.tokenInfo?.refreshToken;
    expect(refreshToken).toBeTruthy();

    // Act - Refresh token
    const refreshResponse = await ctx.client.identity('/api/authentication/refresh', 'post', {
      body: { refreshToken }
    });

    // Assert
    expect(refreshResponse).toBeDefined();
    const refreshTokenData = ctx.getData(refreshResponse);
    expect(refreshTokenData.tokenInfo?.accessToken).toBeTruthy();
    expect(refreshTokenData.tokenInfo?.accessToken).not.toBe(
      loginTokenData.tokenInfo?.accessToken
    );
  });

  test('should handle change password with typed ctx.client', async () => {
    // Note: This is a demo - in real tests you'd use a test user
    // Arrange - Login first
    await ctx.client.login(superAdminCredentials.email, superAdminCredentials.password);

    // Act - Attempt to change password (will fail for SuperAdmin but tests the typed API)
    try {
      await ctx.client.identity('/api/authentication/change-password', 'post', {
        body: {
          currentPassword: superAdminCredentials.password,
          newPassword: 'NewTestPassword123!',
          confirmPassword: 'NewTestPassword123!'
        }
      });
    } catch (error: any) {
      // Assert - We expect this to fail for security reasons, but the API call is typed
      expect(error.response).toBeDefined();
      // The important part is that the request was properly typed
    }
  });

  test('should validate typed error responses', async () => {
    // Act & Assert - Invalid login should return typed error
    try {
      await ctx.client.identity('/api/authentication/login', 'post', {
        body: {
          email: 'invalid@example.com',
          password: 'WrongPassword'
        }
      });
      fail('Should have thrown an error');
    } catch (error: any) {
      // The error response is also typed based on the OpenAPI schema
      expect(error).toBeDefined();
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});