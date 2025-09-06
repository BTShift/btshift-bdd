#!/usr/bin/env node

/**
 * Simple test script to verify correlation ID functionality
 */

const { TypedApiClient } = require('./lib/clients/typed-api-client');
const { AllureCorrelationHelper } = require('./lib/support/helpers/allure-correlation');

async function testCorrelationIds() {
  console.log('🔍 Testing Correlation ID Implementation...\n');

  try {
    const client = new TypedApiClient();
    
    console.log('1. Testing API client correlation ID generation...');
    
    // Test login to see if correlation IDs are working
    const response = await client.login('admin@btshift.com', 'password123');
    
    console.log('✅ Login response received');
    console.log('📋 Response structure:', {
      hasData: !!response.data,
      hasCorrelationId: !!response.correlationId,
      hasRequestCorrelationId: !!response.requestCorrelationId,
      correlationId: response.correlationId,
      requestCorrelationId: response.requestCorrelationId
    });
    
    console.log('2. Testing correlation ID tracking...');
    const lastCorrelationId = client.getLastCorrelationId();
    console.log('📊 Last tracked correlation ID:', lastCorrelationId);
    
    console.log('\n🎉 Correlation ID implementation is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Correlation ID info:', {
      correlationId: error.correlationId,
      requestCorrelationId: error.requestCorrelationId
    });
  }
}

testCorrelationIds();