import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Password Reset Operations', () => {
  let ctx: TestContext;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    allure.parentSuite('Password Reset'');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTest();
    
    // Create a test user for password reset operations
    const userData = TestDataFactory.user();
    testUserEmail = userData.email;
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User',
        password: 'OldPassword123!'
      }
    });
    testUserId = (user as any).userId;
    ctx.cleanup.addUser(testUserId);
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should request password reset', async () => {
    const response = await ctx.client.identity('/api/auth/password-reset/request', 'post', {
      body: {
        email: testUserEmail
      }
    });

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
    expect((response as any).message).toContain('reset email sent');
  });

  test('should validate password reset token', async () => {
    // Request reset first
    const resetRequest = await ctx.client.identity('/api/auth/password-reset/request', 'post', {
      body: {
        email: testUserEmail
      }
    });

    // In real scenario, token would come from email
    const mockToken = 'test-reset-token-123';

    const response = await ctx.client.identity('/api/auth/password-reset/validate', 'post', {
      body: {
        token: mockToken
      }
    });

    expect(response).toBeDefined();
    expect((response as any).valid).toBeDefined();
  });

  test('should reset password with valid token', async () => {
    // Request reset first
    await ctx.client.identity('/api/auth/password-reset/request', 'post', {
      body: {
        email: testUserEmail
      }
    });

    // In real scenario, token would come from email
    const mockToken = 'test-reset-token-123';

    const response = await ctx.client.identity('/api/auth/password-reset/confirm', 'post', {
      body: {
        token: mockToken,
        newPassword: 'NewPassword456!@#'
      }
    });

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
    expect((response as any).message).toContain('Password reset successful');
  });

  test('should change password for authenticated user', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/change-password`, 'post', {
      body: {
        currentPassword: 'OldPassword123!',
        newPassword: 'UpdatedPassword789!@#'
      }
    });

    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
  });

  test('should enforce password policy', async () => {
    await expect(
      ctx.client.identity(`/api/users/${testUserId}/change-password`, 'post', {
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'weak' // Too weak password
        }
      })
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: { message: expect.stringContaining('password policy') }
      }
    });
  });

  test('should get password policy requirements', async () => {
    const response = await ctx.client.identity('/api/auth/password-policy', 'get');

    expect(response).toBeDefined();
    expect((response as any).minLength).toBeDefined();
    expect((response as any).requireUppercase).toBeDefined();
    expect((response as any).requireLowercase).toBeDefined();
    expect((response as any).requireNumbers).toBeDefined();
    expect((response as any).requireSpecialCharacters).toBeDefined();
  });

  test('should check password strength', async () => {
    const response = await ctx.client.identity('/api/auth/password-strength', 'post', {
      body: {
        password: 'TestPassword123!@#'
      }
    });

    expect(response).toBeDefined();
    expect((response as any).strength).toBeDefined();
    expect((response as any).score).toBeDefined();
    expect((response as any).suggestions).toBeDefined();
  });

  test('should expire password reset token after use', async () => {
    // Request reset
    await ctx.client.identity('/api/auth/password-reset/request', 'post', {
      body: {
        email: testUserEmail
      }
    });

    const mockToken = 'test-reset-token-456';

    // Use the token
    await ctx.client.identity('/api/auth/password-reset/confirm', 'post', {
      body: {
        token: mockToken,
        newPassword: 'AnotherPassword123!@#'
      }
    });

    // Try to use the same token again
    await expect(
      ctx.client.identity('/api/auth/password-reset/confirm', 'post', {
        body: {
          token: mockToken,
          newPassword: 'YetAnotherPassword123!@#'
        }
      })
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: { message: expect.stringContaining('expired') }
      }
    });
  });
});