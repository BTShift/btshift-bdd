/**
 * Global setup for API tests
 * This runs once before all API tests
 */

import { TestSetup } from '../api/support/helpers/test-setup';

async function globalSetup() {
  console.log('🚀 Starting API test global setup...');
  
  try {
    // Verify API Gateway is accessible
    const response = await fetch(process.env.API_GATEWAY_URL + '/health');
    if (!response.ok) {
      throw new Error(`API Gateway health check failed: ${response.status}`);
    }
    console.log('✅ API Gateway health check passed');

    // Pre-authenticate and verify credentials
    await TestSetup.authenticateAsSuperAdmin();
    console.log('✅ SuperAdmin authentication verified');

    // Any other global setup for API tests
    console.log('🎉 API test global setup completed successfully');
  } catch (error) {
    console.error('❌ API test global setup failed:', error);
    throw error;
  }
}

export default globalSetup;