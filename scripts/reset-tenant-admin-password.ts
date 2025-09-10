#!/usr/bin/env node

import axios from 'axios';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
const NEW_PASSWORD = 'TenantAdmin@123!';

async function resetPassword() {
  try {
    // Step 1: Login as SuperAdmin
    console.log('Step 1: Logging in as SuperAdmin...');
    const loginResponse = await axios.post(
      `${API_GATEWAY_URL}/api/authentication/login`,
      { 
        email: 'superadmin@shift.ma',
        password: 'SuperAdmin@123!'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': crypto.randomUUID()
        }
      }
    );

    const token = loginResponse.data.token || loginResponse.data.accessToken;
    console.log('✅ Logged in as SuperAdmin');

    // Step 2: Reset TenantAdmin password
    console.log('\nStep 2: Resetting TenantAdmin password...');
    
    // Try different API endpoints that might work
    const endpoints = [
      '/api/users/56c3311b-3858-467c-a973-d940364c6efa/reset-password',
      '/api/users/56c3311b-3858-467c-a973-d940364c6efa/change-password',
      '/api/users/reset-password-admin',
      '/api/identity/users/56c3311b-3858-467c-a973-d940364c6efa/password',
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await axios.post(
          `${API_GATEWAY_URL}${endpoint}`,
          { 
            userId: '56c3311b-3858-467c-a973-d940364c6efa',
            newPassword: NEW_PASSWORD,
            password: NEW_PASSWORD
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Correlation-ID': crypto.randomUUID()
            },
            validateStatus: () => true
          }
        );

        if (response.status >= 200 && response.status < 300) {
          console.log(`✅ Password reset successful via ${endpoint}`);
          break;
        } else {
          console.log(`   Status ${response.status}: ${JSON.stringify(response.data)}`);
        }
      } catch (error) {
        console.log(`   Error: ${error.message}`);
      }
    }

    // Step 3: Test new password
    console.log('\nStep 3: Testing new password...');
    const testResponse = await axios.post(
      `${API_GATEWAY_URL}/api/authentication/login`,
      { 
        email: 'anass.yatim+nstech2@gmail.com',
        password: NEW_PASSWORD
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': crypto.randomUUID()
        },
        validateStatus: () => true
      }
    );

    if (testResponse.status === 200) {
      console.log('✅ TenantAdmin can now login with new password:', NEW_PASSWORD);
      return true;
    } else {
      console.log('❌ Password reset may have failed. Status:', testResponse.status);
      return false;
    }

  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

resetPassword();