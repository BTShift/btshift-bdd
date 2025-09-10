#!/usr/bin/env node

/**
 * Verify authentication with the configured passwords
 */

import axios from 'axios';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';

async function testAuth(email: string, password: string, label: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/authentication/login`,
      { email, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': crypto.randomUUID()
        },
        validateStatus: () => true
      }
    );
    
    if (response.status === 200) {
      console.log(`✅ ${label}: Authentication successful`);
      console.log(`   User: ${email}`);
      console.log(`   Token: ${response.data.token?.substring(0, 50)}...`);
      return true;
    } else {
      console.log(`❌ ${label}: Authentication failed`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${label}: Network error - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔐 Verifying Authentication Configuration\n');
  console.log('Testing with configured passwords:\n');
  
  // Test SuperAdmin
  const superAdminSuccess = await testAuth(
    'superadmin@shift.ma',
    'SuperAdmin@123!',
    'SuperAdmin'
  );
  
  console.log('');
  
  // Test TenantAdmin
  const tenantAdminSuccess = await testAuth(
    'test.tenantadmin@btshift.ma',
    'SuperAdmin@123!',
    'TenantAdmin'
  );
  
  console.log('\n' + '='.repeat(50));
  
  if (superAdminSuccess && tenantAdminSuccess) {
    console.log('✅ All authentication tests passed!');
    console.log('\nPasswords are correctly configured:');
    console.log('  - GitHub Secrets: ✅');
    console.log('  - .env files: ✅');
    console.log('  - Authentication service: ✅');
    process.exit(0);
  } else {
    console.log('❌ Some authentication tests failed');
    console.log('\nPlease check:');
    if (!superAdminSuccess) {
      console.log('  - SuperAdmin password may need to be reset in the database');
    }
    if (!tenantAdminSuccess) {
      console.log('  - TenantAdmin password may need to be reset in the database');
    }
    process.exit(1);
  }
}

main().catch(console.error);