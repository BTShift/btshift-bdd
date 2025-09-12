/**
 * Configuration for API request/response reporting in tests
 */

import { ApiAllureReporter } from '../support/helpers/api-allure-reporter';

/**
 * Initialize API Reporter configuration
 * This should be called in test setup
 */
export function initializeApiReporter(): void {
  const config = {
    // Enable/disable API reporting (can be controlled via env var)
    enabled: process.env.API_REPORTING !== 'false',
    
    // Include headers in reports (masks sensitive data by default)
    includeHeaders: process.env.API_REPORT_HEADERS !== 'false',
    
    // Include request/response bodies
    includeBody: process.env.API_REPORT_BODY !== 'false',
    
    // Mask sensitive data like passwords, tokens, etc.
    maskSensitiveData: process.env.API_UNMASK_SENSITIVE !== 'true',
    
    // Attach to Allure reports
    attachToAllure: process.env.API_ALLURE_ATTACH !== 'false',
    
    // Also log to console (useful for debugging)
    consoleLog: process.env.API_CONSOLE_LOG === 'true'
  };

  ApiAllureReporter.configure(config);

  console.log('📊 API Reporter initialized with config:', {
    enabled: config.enabled,
    includeHeaders: config.includeHeaders,
    includeBody: config.includeBody,
    maskSensitiveData: config.maskSensitiveData,
    attachToAllure: config.attachToAllure,
    consoleLog: config.consoleLog
  });
}

/**
 * Environment variable documentation:
 * 
 * API_REPORTING=false          - Disable all API reporting
 * API_REPORT_HEADERS=false     - Don't include headers in reports
 * API_REPORT_BODY=false        - Don't include request/response bodies
 * API_UNMASK_SENSITIVE=true    - Don't mask sensitive data (use with caution!)
 * API_ALLURE_ATTACH=false      - Don't attach to Allure reports
 * API_CONSOLE_LOG=true         - Also log API calls to console
 * 
 * Example usage in command line:
 * API_CONSOLE_LOG=true npm test
 * API_REPORTING=false npm test    # Run tests without API reporting for speed
 */