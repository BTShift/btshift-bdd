import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Playwright configuration for API tests
 * This configuration is optimized for fast, parallel API testing
 */
export default defineConfig({
  testDir: './tests/api',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : 6, // More workers for API tests as they're faster
  
  // API tests don't need browser screenshots or videos
  use: {
    baseURL: process.env.API_GATEWAY_URL,
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    // API tests should be fast
    timeout: 30000,
  },

  // Test timeout for API tests (shorter than UI tests)
  timeout: 60000,
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/shared/global-setup-api.ts'),
  globalTeardown: require.resolve('./tests/shared/global-teardown-api.ts'),

  projects: [
    {
      name: 'api-tests',
      testDir: './tests/api',
      use: {
        // API tests don't need browser context
      },
    },
  ],

  reporter: [
    ['html', { 
      outputFolder: 'test-results/api/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/api/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/api/junit.xml' 
    }],
    // Console reporter for CI
    process.env.CI ? ['github'] : ['list']
  ],

  outputDir: 'test-results/api',
});