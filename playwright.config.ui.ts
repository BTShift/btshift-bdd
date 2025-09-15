import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Playwright configuration for UI tests
 * This configuration is optimized for comprehensive UI testing with browser automation
 */
export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 1,
  workers: process.env['CI'] ? 2 : 4, // Fewer workers for UI tests as they're resource intensive

  use: {
    baseURL: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // UI tests typically need more time
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Longer timeout for UI tests
  timeout: 120000,
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/shared/global-setup-ui.ts'),
  globalTeardown: require.resolve('./tests/shared/global-teardown-ui.ts'),

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Enable these for cross-browser testing when needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  reporter: [
    ['html', { 
      outputFolder: 'test-results/ui/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'test-results/ui/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/ui/junit.xml' 
    }],
    // Console reporter for CI
    process.env['CI'] ? ['github'] : ['list']
  ],

  outputDir: 'test-results/ui',

  // Web server configuration for local development
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env['CI'],
    env: {
      NODE_ENV: 'test'
    }
  },
});