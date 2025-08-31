import { FullConfig } from '@playwright/test';
import TestDataCleaner from '../scripts/cleanup';

async function globalSetup(config: FullConfig) {
  console.log('\n🎭 Playwright Global Setup');
  console.log('================================\n');
  
  // Clean up any leftover test data from previous runs
  console.log('🧹 Cleaning up test data from previous runs...\n');
  
  const cleaner = new TestDataCleaner();
  
  try {
    await cleaner.runFullCleanup();
    console.log('\n✅ Pre-test cleanup complete');
  } catch (error) {
    console.error('⚠️  Pre-test cleanup failed, but continuing with tests:', error);
  }
  
  console.log('\n================================');
  console.log('🚀 Starting test execution...\n');
  
  // Store cleanup instance for teardown
  (global as any).__CLEANER__ = cleaner;
}

export default globalSetup;