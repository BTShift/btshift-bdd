/**
 * Playwright fixture for automatic test case context tracking
 * This enables DRY test context management without manual setTestCase() calls
 */

import { test as base, TestInfo } from '@playwright/test';
import { TestContextManager } from '../../lib/helpers/test-context-manager';

export interface TestContextFixture {
  autoTestContext: void;
}

/**
 * Extended Playwright test with automatic test context tracking
 * Usage: import { test } from './support/test-context-fixture';
 */
export const test = base.extend<TestContextFixture>({
  autoTestContext: [async ({ }, use, testInfo: TestInfo) => {
    // Automatically set test case context based on test info
    const testContextManager = TestContextManager.getInstance();
    
    // Extract feature file name from the test file path
    const featureFile = testInfo.file.split('/').pop()?.replace('.spec.ts', '.feature') || 'unknown.feature';
    
    // Use the test title as the test case name
    const testCaseName = testInfo.title;
    
    // Set the scenario based on the describe block (if available)
    const scenarioName = testInfo.titlePath.length > 1 ? testInfo.titlePath[0] : 'API Test';
    
    // Determine test intent based on test name and file path
    const testIntent = determineTestIntent(testInfo.file, testCaseName);
    
    // Initialize test context
    testContextManager.startTestSession(featureFile);
    testContextManager.setScenario(featureFile, scenarioName, testIntent);
    testContextManager.setTestCase(testCaseName);
    testContextManager.setCurrentStep('Test Execution', '2xx_success');
    
    console.log(`🎬 Auto-context: ${featureFile} :: ${scenarioName} :: ${testCaseName}`);
    
    await use();
    
    // Cleanup context after test
    testContextManager.clearContext();
  }, { auto: true }]
});

/**
 * Determine test intent based on file path and test name
 */
function determineTestIntent(filePath: string, testName: string): 'positive' | 'negative' {
  const text = `${filePath} ${testName}`.toLowerCase();
  
  // Check for edge cases or negative test indicators
  if (filePath.includes('edge-cases') || 
      text.includes('invalid') || 
      text.includes('fail') || 
      text.includes('error') ||
      text.includes('deny') ||
      text.includes('forbidden') ||
      text.includes('unauthorized') ||
      text.includes('should not')) {
    return 'negative';
  }
  
  return 'positive';
}

// Re-export expect for convenience
export { expect } from '@playwright/test';