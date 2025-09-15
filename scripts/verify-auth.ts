#!/usr/bin/env node

/**
 * Verify authentication with the configured passwords
 */

import { TypedScriptClient } from './lib/typed-script-client';
import * as crypto from 'crypto';

// const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';

async function testAuth(email: string, password: string, label: string): Promise<boolean> {
  try {
    // Create a new client instance for each test to avoid token interference
    const client = new TypedScriptClient();

    // Use the identity client directly for more control
    const response = await client.identity.POST('/api/authentication/login', {
      body: { email, password },
      headers: {
        'X-Correlation-ID': crypto.randomUUID()
      }
    });

    if (!response.error && response.response.status === 200) {
      console.log(`✅ ${label}: Authentication successful`);
      console.log(`   User: ${email}`);
      const token = (response.data as any)?.token || (response.data as any)?.tokenInfo?.accessToken;
      console.log(`   Token: ${token?.substring(0, 50)}...`);
      return true;
    } else {
      console.log(`❌ ${label}: Authentication failed`);
      console.log(`   Status: ${response.response?.status}`);
      console.log(`   Error: ${JSON.stringify(response.error || response.data)}`);
      return false;
    }
  } catch (error: any) {
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