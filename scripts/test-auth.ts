#!/usr/bin/env node

/**
 * Test authentication with different passwords to find the correct ones
 */

import axios from 'axios';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';

async function testAuth(email: string, password: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/authentication/login`,
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': crypto.randomUUID()
        },
        validateStatus: () => true // Don't throw on any status
      }
    );
    
    if (response.status === 200) {
      console.log(`✅ SUCCESS: ${email} with password: ${password.substring(0, 3)}...`);
      console.log(`   Token: ${response.data.token?.substring(0, 30)}...`);
      return true;
    } else {
      console.log(`❌ FAILED: ${email} - Status ${response.status}: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${email} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔐 Testing Authentication Credentials\n');
  
  // Test SuperAdmin with different passwords
  const superAdminPasswords = [
    'ShiftPlatform2024@SuperAdmin!',
    'SuperAdmin@123!',
    'Admin@123!',
    'ShiftPlatform2024!',
    'Shift@2024!'
  ];
  
  console.log('Testing SuperAdmin passwords...');
  for (const pwd of superAdminPasswords) {
    const success = await testAuth('superadmin@shift.ma', pwd);
    if (success) break;
  }
  
  console.log('\nTesting TenantAdmin passwords...');
  // Test TenantAdmin with different passwords
  const tenantAdminPasswords = [
    'TenantAdmin@123!',
    'Admin@123!',
    'Shift@2024!',
    'Password@123!',
    'Test@123!'
  ];
  
  for (const pwd of tenantAdminPasswords) {
    const success = await testAuth('anass.yatim+nstech2@gmail.com', pwd);
    if (success) break;
  }
}

main().catch(console.error);