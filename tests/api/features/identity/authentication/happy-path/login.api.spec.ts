import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { TypedApiClient } from '../../../../support/clients/typed-api-client';
import { TestDataFactory } from '../../../../support/fixtures/test-data-factory';

describe('Authentication - Login Happy Path API Tests', () => {
  let client: TypedApiClient;
  const credentials = TestDataFactory.credentials();

  beforeAll(async () => {
    client = new TypedApiClient();
  });

  afterAll(async () => {
    if (client.getAuthToken()) {
      await client.logout();
    }
  });

  test('should successfully login with valid SuperAdmin credentials', async () => {
    const response = await client.identity('/api/authentication/login', 'post', {
      body: credentials
    });

    expect(response).toBeDefined();
    expect((response as any).tokenInfo?.accessToken).toBeTruthy();
    expect((response as any).tokenInfo?.refreshToken).toBeTruthy();
    expect((response as any).userInfo?.email).toBe(credentials.email);
    expect((response as any).userInfo?.roles).toContain('SuperAdmin');
  });

  test('should validate a valid token', async () => {
    await client.login(credentials.email, credentials.password);
    const token = client.getAuthToken();

    const response = await client.identity('/api/authentication/validate-token', 'get', {
      params: { query: { token } }
    });

    expect(response).toBeDefined();
    expect((response as any).valid).toBe(true);
    expect((response as any).user?.email).toBe(credentials.email);
  });

  test('should refresh token with valid refresh token', async () => {
    const loginResponse = await client.login(credentials.email, credentials.password);
    const refreshToken = (loginResponse as any).tokenInfo?.refreshToken;
    const originalToken = client.getAuthToken();

    const refreshResponse = await client.identity('/api/authentication/refresh', 'post', {
      body: { refreshToken }
    });

    expect((refreshResponse as any).tokenInfo?.accessToken).toBeTruthy();
    expect((refreshResponse as any).tokenInfo?.accessToken).not.toBe(originalToken);
  });

  test('should logout successfully', async () => {
    await client.login(credentials.email, credentials.password);
    expect(client.getAuthToken()).toBeTruthy();

    await client.logout();
    expect(client.getAuthToken()).toBeNull();
  });

  test('should maintain authentication state across multiple requests', async () => {
    await client.login(credentials.email, credentials.password);
    const token = client.getAuthToken();

    for (let i = 0; i < 3; i++) {
      const response = await client.identity('/api/authentication/me', 'get');
      expect(response).toBeDefined();
      expect(client.getAuthToken()).toBe(token);
    }
  });

  test('should return user information in login response', async () => {
    const response = await client.identity('/api/authentication/login', 'post', {
      body: credentials
    });

    const user = (response as any).user;
    expect(user).toBeDefined();
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(credentials.email);
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(Array.isArray(user.roles)).toBe(true);
  });

  test('should have token with reasonable expiration time', async () => {
    const response = await client.identity('/api/authentication/login', 'post', {
      body: credentials
    });
    
    const expiresAt = new Date((response as any).tokenInfo.expiresAt);
    const now = new Date();
    const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
    
    expect(diffMinutes).toBeGreaterThan(15);
    expect(diffMinutes).toBeLessThan(24 * 60);
  });
});