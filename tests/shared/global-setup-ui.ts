/**
 * Global setup for UI tests
 * This runs once before all UI tests
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting UI test global setup...');
  
  try {
    // Verify frontend is accessible
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(process.env.FRONTEND_URL || 'http://localhost:3000');
      console.log('✅ Frontend accessibility verified');
    } finally {
      await browser.close();
    }

    // Any other global setup for UI tests
    console.log('🎉 UI test global setup completed successfully');
  } catch (error) {
    console.error('❌ UI test global setup failed:', error);
    throw error;
  }
}

export default globalSetup;