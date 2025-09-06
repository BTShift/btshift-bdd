import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // Cleanup configuration - controlled by environment variables
  globalSetup: process.env.SKIP_CLEANUP_BEFORE !== 'true' ? require.resolve('./tests/global-setup') : undefined,
  globalTeardown: process.env.SKIP_CLEANUP_AFTER !== 'true' ? require.resolve('./tests/global-teardown') : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true,
      categories: [
        {
          name: 'API Tests',
          matchedStatuses: ['passed', 'failed'],
          messageRegex: '.*api.*'
        }
      ],
      environmentInfo: {
        Environment: process.env.NODE_ENV || 'development',
        Platform: 'BTShift BDD Test Suite',
        BaseURL: process.env.PLATFORM_ADMIN_URL || 'https://platform-admin-portal-production.up.railway.app'
      }
    }]
  ],
  use: {
    baseURL: process.env.PLATFORM_ADMIN_URL || 'https://platform-admin-portal-production.up.railway.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env.HEADLESS !== 'false',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer needed - using Railway deployed services
});