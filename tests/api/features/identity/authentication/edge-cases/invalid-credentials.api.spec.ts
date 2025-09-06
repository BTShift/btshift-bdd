import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupUnauthenticatedApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Authentication - Invalid Credentials API Tests', () => {
  let ctx: TestContext;
  const validEmail = TestDataFactory.credentials().email;

  beforeAll(async () => {
    allure.parentSuite('Authentication');
    allure.feature('Identity & Access Management');
    // Use unauthenticated setup since we're testing authentication edge cases
    ctx = await setupUnauthenticatedApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should reject login with invalid email', async () => {
    await expect(
      ctx.client.identity('/api/authentication/login', 'post', {
        body: { email: 'nonexistent@example.com', password: 'SomePassword123!' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject login with invalid password', async () => {
    await expect(
      ctx.client.identity('/api/authentication/login', 'post', {
        body: { email: validEmail, password: 'WrongPassword123!' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject login with empty email', async () => {
    await expect(
      ctx.client.identity('/api/authentication/login', 'post', {
        body: { email: '', password: 'SomePassword123!' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject login with empty password', async () => {
    await expect(
      ctx.client.identity('/api/authentication/login', 'post', {
        body: { email: 'test@example.com', password: '' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject login with malformed email', async () => {
    await expect(
      ctx.client.identity('/api/authentication/login', 'post', {
        body: { email: 'not-an-email', password: 'SomePassword123!' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject token validation with invalid token', async () => {
    await expect(
      ctx.client.identity('/api/authentication/validate-token', 'get', {
        params: { query: { token: 'invalid-token-12345' } }
      })
    ).rejects.toMatchObject({
      response: { status: expect.any(Number) }
    });
  });

  test('should reject token validation with expired token', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MzAwMDAwMDB9.fake';
    await expect(
      ctx.client.identity('/api/authentication/validate-token', 'get', {
        params: { query: { token: expiredToken } }
      })
    ).rejects.toMatchObject({
      response: { status: expect.any(Number) }
    });
  });

  test('should reject refresh token with invalid refresh token', async () => {
    await expect(
      ctx.client.identity('/api/authentication/refresh', 'post', {
        body: { refreshToken: 'invalid-refresh-token-12345' }
      })
    ).rejects.toMatchObject({
      response: { status: expect.any(Number) }
    });
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should reject refresh token with empty refresh token', async () => {
    await expect(
      ctx.client.identity('/api/authentication/refresh', 'post', {
        body: { refreshToken: '' }
      })
    ).rejects.toThrow();
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should handle multiple failed login attempts gracefully', async () => {
    const invalidCredentials = {
      email: 'test@example.com',
      password: 'WrongPassword'
    };

    for (let i = 0; i < 3; i++) {
      await expect(
        ctx.client.identity('/api/authentication/login', 'post', {
          body: invalidCredentials
        })
      ).rejects.toThrow();
    }
    expect(ctx.client.getAuthToken()).toBeNull();
  });

  test('should return appropriate error response for unauthorized access', async () => {
    await expect(
      ctx.client.identity('/api/authentication/validate-token', 'get', {
        params: { query: { token: '' } }
      })
    ).rejects.toMatchObject({
      response: { status: expect.any(Number) }
    });
  });
});