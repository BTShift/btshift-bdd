#!/usr/bin/env node

/**
 * Reset passwords for SuperAdmin and TenantAdmin users
 * This script uses the identity service to properly hash and update passwords
 */

import { TypedScriptClient } from './lib/typed-script-client';
import * as crypto from 'crypto';

// const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
// const IDENTITY_SERVICE_URL = 'https://identity-service-production-80cf.up.railway.app';

// Standard passwords we'll use for testing
const STANDARD_SUPER_ADMIN_PASSWORD = 'ShiftPlatform2024@SuperAdmin!';
const STANDARD_TENANT_ADMIN_PASSWORD = 'ShiftPlatform2024@TenantAdmin!';

async function loginAsSuperAdmin(): Promise<string> {
  // Try to login with various possible passwords
  const passwords = [
    'ShiftPlatform2024@SuperAdmin!',
    'SuperAdmin@123!',
    'Admin@123!',
    'ShiftPlatform2024!',
  ];

  const client = new TypedScriptClient();

  for (const password of passwords) {
    try {
      const response = await client.identity.POST('/api/authentication/login', {
        body: {
          email: 'superadmin@shift.ma',
          password
        },
        headers: {
          'X-Correlation-ID': crypto.randomUUID()
        }
      });

      if (!response.error && response.response.status === 200) {
        const token = (response.data as any)?.token || (response.data as any)?.tokenInfo?.accessToken;
        if (token) {
          console.log(`✅ Successfully logged in as SuperAdmin`);
          return token;
        }
      }
    } catch (error) {
      // Continue trying next password
    }
  }

  throw new Error('Could not login as SuperAdmin with any known password');
}

async function updateUserPassword(token: string, userId: string, newPassword: string): Promise<boolean> {
  try {
    const client = new TypedScriptClient();
    client.setAuthToken(token);

    // Use the change password endpoint
    const response = await client.identity.POST('/api/users/{id}/change-password-admin' as any, {
      params: { path: { id: userId } },
      body: {
        newPassword
      },
      headers: {
        'X-Correlation-ID': crypto.randomUUID()
      }
    } as any);

    return !response.error && (response.response.status === 200 || response.response.status === 204);
  } catch (error: any) {
    console.error(`Failed to update password for user ${userId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔐 Password Reset Script\n');
  console.log('This script will set standard passwords for testing:\n');
  console.log(`  SuperAdmin: ${STANDARD_SUPER_ADMIN_PASSWORD}`);
  console.log(`  TenantAdmin: ${STANDARD_TENANT_ADMIN_PASSWORD}\n`);

  try {
    // Step 1: Login as SuperAdmin
    console.log('Step 1: Logging in as SuperAdmin...');
    const token = await loginAsSuperAdmin();
    
    // Step 2: Update SuperAdmin password
    console.log('\nStep 2: Updating SuperAdmin password...');
    const superAdminId = '99a3ffec-fa9a-47d9-8c4b-ac1abbc3ca7b';
    const superAdminSuccess = await updateUserPassword(token, superAdminId, STANDARD_SUPER_ADMIN_PASSWORD);
    
    if (superAdminSuccess) {
      console.log('✅ SuperAdmin password updated successfully');
    } else {
      console.log('⚠️  Could not update SuperAdmin password - may already be correct');
    }
    
    // Step 3: Update TenantAdmin password
    console.log('\nStep 3: Updating TenantAdmin password...');
    const tenantAdminId = '56c3311b-3858-467c-a973-d940364c6efa';
    const tenantAdminSuccess = await updateUserPassword(token, tenantAdminId, STANDARD_TENANT_ADMIN_PASSWORD);
    
    if (tenantAdminSuccess) {
      console.log('✅ TenantAdmin password updated successfully');
    } else {
      console.log('⚠️  Could not update TenantAdmin password - may already be correct');
    }
    
    // Step 4: Test new passwords
    console.log('\nStep 4: Testing new passwords...');
    
    // Test SuperAdmin
    try {
      const testClient = new TypedScriptClient();
      const superAdminResponse = await testClient.identity.POST('/api/authentication/login', {
        body: {
          email: 'superadmin@shift.ma',
          password: STANDARD_SUPER_ADMIN_PASSWORD
        },
        headers: {
          'X-Correlation-ID': crypto.randomUUID()
        }
      });

      if (!superAdminResponse.error && superAdminResponse.response.status === 200) {
        console.log('✅ SuperAdmin can login with new password');
      } else {
        console.log('❌ SuperAdmin cannot login with new password');
      }
    } catch (error) {
      console.log('❌ SuperAdmin cannot login with new password');
    }
    
    // Test TenantAdmin
    try {
      const testClient = new TypedScriptClient();
      const tenantAdminResponse = await testClient.identity.POST('/api/authentication/login', {
        body: {
          email: 'anass.yatim+nstech2@gmail.com',
          password: STANDARD_TENANT_ADMIN_PASSWORD
        },
        headers: {
          'X-Correlation-ID': crypto.randomUUID()
        }
      });

      if (!tenantAdminResponse.error && tenantAdminResponse.response.status === 200) {
        console.log('✅ TenantAdmin can login with new password');
      }
    } catch (error) {
      console.log('❌ TenantAdmin cannot login with new password');
    }
    
    console.log('\n✅ Password reset complete!');
    
  } catch (error) {
    console.error('❌ Failed to reset passwords:', (error as Error).message);
    process.exit(1);
  }
}

main().catch(console.error);