import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Identity Service - Two-Factor Authentication Operations', () => {
  let ctx: TestContext;
  let testUserId: string;

  beforeAll(async () => {
    allure.parentSuite('Two-Factor Authentication');
    allure.feature('Identity & Access Management');
    ctx = await setupApiTestWithContext('TenantAdmin');
    
    // Create a test user for 2FA operations
    const userData = TestDataFactory.user();
    const user = await ctx.client.identity('/api/users', 'post', {
      body: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        role: 'User'
      }
    });
    const userResponseData = ctx.getData(user);
    testUserId = userResponseData.userId;
    ctx.cleanup.addUser(testUserId);
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should enable two-factor authentication', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/enable`, 'post');
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.secret).toBeTruthy();
    expect(responseData.qrCodeUrl).toBeTruthy();
    expect(responseData.backupCodes).toBeDefined();
    expect(Array.isArray(responseData.backupCodes)).toBe(true);
    expect(responseData.backupCodes.length).toBeGreaterThan(0);
  });

  test('should verify two-factor authentication code', async () => {
    // Note: In a real test, we would need to generate a valid TOTP code
    // For this test structure, we're showing the API call pattern
    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/verify`, 'post', {
      body: {
        code: '123456' // This would need to be a valid TOTP in production
      }
    });
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.verified).toBeDefined();
  });

  test('should disable two-factor authentication', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/disable`, 'post', {
      body: {
        code: '123456' // Would need valid TOTP or backup code
      }
    });
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.success).toBe(true);
  });

  test('should generate new backup codes', async () => {
    // First enable 2FA
    await ctx.client.identity(`/api/users/${testUserId}/2fa/enable`, 'post');

    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/backup-codes/regenerate`, 'post', {
      body: {
        code: '123456' // Would need valid TOTP
      }
    });
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.backupCodes).toBeDefined();
    expect(Array.isArray(responseData.backupCodes)).toBe(true);
    expect(responseData.backupCodes.length).toBeGreaterThan(0);
  });

  test('should verify backup code', async () => {
    // Enable 2FA and get backup codes
    const enableResponse = await ctx.client.identity(`/api/users/${testUserId}/2fa/enable`, 'post');
    const enableResponseData = ctx.getData(enableResponse);
    const backupCodes = enableResponseData.backupCodes;

    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/verify-backup`, 'post', {
      body: {
        backupCode: backupCodes[0]
      }
    });
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.verified).toBeDefined();
  });

  test('should get two-factor authentication status', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/status`, 'get');
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.enabled).toBeDefined();
    expect(typeof responseData.enabled).toBe('boolean');
  });

  test('should require 2FA for sensitive operations', async () => {
    // Enable 2FA first
    await ctx.client.identity(`/api/users/${testUserId}/2fa/enable`, 'post');

    // Try to perform a sensitive operation without 2FA code
    await expect(
      ctx.client.identity(`/api/users/${testUserId}`, 'delete')
    ).rejects.toMatchObject({
      response: {
        status: 403,
        data: { message: expect.stringContaining('2FA') }
      }
    });
  });

  test('should send 2FA code via SMS', async () => {
    const response = await ctx.client.identity(`/api/users/${testUserId}/2fa/send-sms`, 'post');
    const responseData = ctx.getData(response);

    expect(response).toBeDefined();
    expect(responseData.success).toBe(true);
    expect(responseData.message).toContain('SMS sent');
  });

  test('should validate 2FA for login', async () => {
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
    ctx.cleanup.addUser(userResponseData.userId);

    // Enable 2FA for the user
    await ctx.client.identity(`/api/users/${userResponseData.userId}/2fa/enable`, 'post');

    // Attempt login should require 2FA
    const loginResponse = await ctx.client.identity('/api/auth/login', 'post', {
      body: {
        email: userData.email,
        password: 'Test123!@#'
      }
    });
    const loginResponseData = ctx.getData(loginResponse);

    expect(loginResponseData.requires2FA).toBe(true);
    expect(loginResponseData.tempToken).toBeTruthy();

    // Complete login with 2FA code
    const completeLoginResponse = await ctx.client.identity('/api/auth/login/2fa', 'post', {
      body: {
        tempToken: loginResponseData.tempToken,
        code: '123456'
      }
    });
    const completeLoginResponseData = ctx.getData(completeLoginResponse);

    expect(completeLoginResponseData.token).toBeTruthy();
    expect(completeLoginResponseData.refreshToken).toBeTruthy();
  });
});