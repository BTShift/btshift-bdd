/**
 * Centralized test imports for all API tests
 * This provides the correct Playwright test imports and fixtures
 */

import { test as base } from '@playwright/test';

// Re-export the test object with its methods
export const test = base;
export const describe = test.describe;
export const beforeAll = test.beforeAll;
export const afterAll = test.afterAll;
export const beforeEach = test.beforeEach;
export const afterEach = test.afterEach;
export const expect = test.expect;

// Export the fail function for test assertions
export function fail(message?: string): never {
  throw new Error(message || 'Test failed');
}