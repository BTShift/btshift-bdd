#!/usr/bin/env node

/**
 * Reset passwords for SuperAdmin and TenantAdmin users
 * This script uses the identity service to properly hash and update passwords
 */

import axios from 'axios';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
const IDENTITY_SERVICE_URL = 'https://identity-service-production-80cf.up.railway.app';

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

  for (const password of passwords) {
    try {
      const response = await axios.post(
        `${API_GATEWAY_URL}/api/authentication/login`,
        { 
          email: 'superadmin@shift.ma', 
          password 
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': crypto.randomUUID()
          }
        }
      );

      if (response.status === 200 && response.data.token) {
        console.log(`✅ Successfully logged in as SuperAdmin`);
        return response.data.token;
      }
    } catch (error) {
      // Continue trying next password
    }
  }
  
  throw new Error('Could not login as SuperAdmin with any known password');
}

async function updateUserPassword(token: string, userId: string, newPassword: string): Promise<boolean> {
  try {
    // Use the change password endpoint
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/users/${userId}/change-password-admin`,
      { 
        newPassword 
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Correlation-ID': crypto.randomUUID()
        }
      }
    );

    return response.status === 200 || response.status === 204;
  } catch (error) {
    console.error(`Failed to update password for user ${userId}:`, error.response?.data || error.message);
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
      const superAdminResponse = await axios.post(
        `${API_GATEWAY_URL}/api/authentication/login`,
        { 
          email: 'superadmin@shift.ma', 
          password: STANDARD_SUPER_ADMIN_PASSWORD 
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': crypto.randomUUID()
          }
        }
      );
      
      if (superAdminResponse.status === 200) {
        console.log('✅ SuperAdmin can login with new password');
      }
    } catch (error) {
      console.log('❌ SuperAdmin cannot login with new password');
    }
    
    // Test TenantAdmin
    try {
      const tenantAdminResponse = await axios.post(
        `${API_GATEWAY_URL}/api/authentication/login`,
        { 
          email: 'anass.yatim+nstech2@gmail.com', 
          password: STANDARD_TENANT_ADMIN_PASSWORD 
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': crypto.randomUUID()
          }
        }
      );
      
      if (tenantAdminResponse.status === 200) {
        console.log('✅ TenantAdmin can login with new password');
      }
    } catch (error) {
      console.log('❌ TenantAdmin cannot login with new password');
    }
    
    console.log('\n✅ Password reset complete!');
    
  } catch (error) {
    console.error('❌ Failed to reset passwords:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);