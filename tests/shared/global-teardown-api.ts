/**
 * Global teardown for API tests
 * This runs once after all API tests
 */

import { TestSetup } from '../api/support/helpers/test-setup';

async function globalTeardown() {
  console.log('🧹 Starting API test global teardown...');
  
  try {
    // Cleanup any global resources
    await TestSetup.cleanup();
    
    console.log('🎉 API test global teardown completed successfully');
  } catch (error) {
    console.error('❌ API test global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test results
  }
}

export default globalTeardown;