/**
 * Type-safe environment variable configuration
 * This module provides strict typing for environment variables
 */

export interface EnvConfig {
  API_GATEWAY_URL: string;
  PLATFORM_ADMIN_URL: string;
  FRONTEND_URL: string;
  PLATFORM_ADMIN_EMAIL: string;
  PLATFORM_ADMIN_PASSWORD: string;
  TEST_USER_PASSWORD: string;
  HEADLESS?: string;
  SKIP_CLEANUP_AFTER?: string;
  SKIP_CLEANUP_BEFORE?: string;
  TENANT_DB_CONNECTION: string;
  IDENTITY_DB_CONNECTION: string;
  CLIENT_DB_CONNECTION: string;
  SKIP_CLEANUP?: string;
  CI?: string;
}

/**
 * Get environment variable with type safety
 */
export function getEnvVar(key: keyof EnvConfig): string | undefined {
  return process.env[key];
}

/**
 * Get required environment variable (throws if missing)
 */
export function getRequiredEnvVar(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment variable with default value
 */
export function getEnvVarWithDefault(key: keyof EnvConfig, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Check if environment variable is truthy
 */
export function isEnvVarTrue(key: keyof EnvConfig): boolean {
  const value = process.env[key];
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get all environment variables as typed config
 */
export function getEnvConfig(): Partial<EnvConfig> {
  const config: Partial<EnvConfig> = {};

  const apiGatewayUrl = process.env['API_GATEWAY_URL'];
  if (apiGatewayUrl) config.API_GATEWAY_URL = apiGatewayUrl;

  const platformAdminUrl = process.env['PLATFORM_ADMIN_URL'];
  if (platformAdminUrl) config.PLATFORM_ADMIN_URL = platformAdminUrl;

  const frontendUrl = process.env['FRONTEND_URL'];
  if (frontendUrl) config.FRONTEND_URL = frontendUrl;

  const platformAdminEmail = process.env['PLATFORM_ADMIN_EMAIL'];
  if (platformAdminEmail) config.PLATFORM_ADMIN_EMAIL = platformAdminEmail;

  const platformAdminPassword = process.env['PLATFORM_ADMIN_PASSWORD'];
  if (platformAdminPassword) config.PLATFORM_ADMIN_PASSWORD = platformAdminPassword;

  const testUserPassword = process.env['TEST_USER_PASSWORD'];
  if (testUserPassword) config.TEST_USER_PASSWORD = testUserPassword;

  const headless = process.env['HEADLESS'];
  if (headless) config.HEADLESS = headless;

  const skipCleanupAfter = process.env['SKIP_CLEANUP_AFTER'];
  if (skipCleanupAfter) config.SKIP_CLEANUP_AFTER = skipCleanupAfter;

  const skipCleanupBefore = process.env['SKIP_CLEANUP_BEFORE'];
  if (skipCleanupBefore) config.SKIP_CLEANUP_BEFORE = skipCleanupBefore;

  const tenantDbConnection = process.env['TENANT_DB_CONNECTION'];
  if (tenantDbConnection) config.TENANT_DB_CONNECTION = tenantDbConnection;

  const identityDbConnection = process.env['IDENTITY_DB_CONNECTION'];
  if (identityDbConnection) config.IDENTITY_DB_CONNECTION = identityDbConnection;

  const clientDbConnection = process.env['CLIENT_DB_CONNECTION'];
  if (clientDbConnection) config.CLIENT_DB_CONNECTION = clientDbConnection;

  const skipCleanup = process.env['SKIP_CLEANUP'];
  if (skipCleanup) config.SKIP_CLEANUP = skipCleanup;

  const ci = process.env['CI'];
  if (ci) config.CI = ci;

  return config;
}