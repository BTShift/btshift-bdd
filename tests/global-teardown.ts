import { FullConfig } from '@playwright/test';
import TestDataCleaner from '../scripts/cleanup';

async function globalTeardown(config: FullConfig) {
  console.log('\n\n🎭 Playwright Global Teardown');
  console.log('================================\n');
  
  // Clean up all test data created during test run
  console.log('🧹 Cleaning up all test data...\n');
  
  const cleaner = new TestDataCleaner();
  
  try {
    await cleaner.runFullCleanup();
    console.log('\n✅ Post-test cleanup complete');
  } catch (error) {
    console.error('❌ Post-test cleanup failed:', error);
    console.error('⚠️  You may need to run manual cleanup: npm run cleanup');
  }
  
  console.log('\n================================');
  console.log('✨ All tests completed and cleaned up!\n');
}

export default globalTeardown;