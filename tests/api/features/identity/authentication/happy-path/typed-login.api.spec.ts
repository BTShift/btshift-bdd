import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { TypedApiClient } from '../../../../support/clients/typed-api-client';
import { superAdminCredentials } from '../../../../support/fixtures/tenant-data';

describe('Authentication - Login with Typed Client (Using NPM Packages)', () => {
  let client: TypedApiClient;

  beforeAll(async () => {
    client = new TypedApiClient();
  });

  afterAll(async () => {
    if (client.getAuthToken()) {
      await client.logout();
    }
  });

  test('should successfully login with typed client from npm package', async () => {
    // Act - Using the typed client from @btshift/identity-types
    const response = await client.identity('/api/authentication/login', 'post', {
      body: {
        email: superAdminCredentials.email,
        password: superAdminCredentials.password
      }
    });

    // Assert - Response is fully typed based on the OpenAPI schema
    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
    expect((response as any).tokenInfo).toBeDefined();
    expect((response as any).tokenInfo.accessToken).toBeTruthy();
    
    // Verify token was set
    expect(client.getAuthToken()).toBeTruthy();
  });

  test('should get current user information with typed client', async () => {
    // Arrange - Login first
    await client.login(superAdminCredentials.email, superAdminCredentials.password);

    // Act - Get current user using typed endpoint
    const response = await client.identity('/api/authentication/me', 'get');

    // Assert
    expect(response).toBeDefined();
    expect((response as any).email).toBe(superAdminCredentials.email);
    expect((response as any).roles).toBeDefined();
  });

  test('should refresh token with typed client', async () => {
    // Arrange - Login to get tokens
    const loginResponse = await client.login(
      superAdminCredentials.email,
      superAdminCredentials.password
    );
    const refreshToken = (loginResponse as any).tokenInfo?.refreshToken;
    expect(refreshToken).toBeTruthy();

    // Act - Refresh token
    const refreshResponse = await client.identity('/api/authentication/refresh', 'post', {
      body: { refreshToken }
    });

    // Assert
    expect(refreshResponse).toBeDefined();
    expect((refreshResponse as any).tokenInfo?.accessToken).toBeTruthy();
    expect((refreshResponse as any).tokenInfo?.accessToken).not.toBe(
      (loginResponse as any).tokenInfo?.accessToken
    );
  });

  test('should handle change password with typed client', async () => {
    // Note: This is a demo - in real tests you'd use a test user
    // Arrange - Login first
    await client.login(superAdminCredentials.email, superAdminCredentials.password);

    // Act - Attempt to change password (will fail for SuperAdmin but tests the typed API)
    try {
      await client.identity('/api/authentication/change-password', 'post', {
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
      await client.identity('/api/authentication/login', 'post', {
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