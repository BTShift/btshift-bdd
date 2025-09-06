/**
 * Global teardown for UI tests  
 * This runs once after all UI tests
 */

async function globalTeardown() {
  console.log('🧹 Starting UI test global teardown...');
  
  try {
    // Cleanup any global UI test resources
    // e.g., close test databases, cleanup test data, etc.
    
    console.log('🎉 UI test global teardown completed successfully');
  } catch (error) {
    console.error('❌ UI test global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test results
  }
}

export default globalTeardown;