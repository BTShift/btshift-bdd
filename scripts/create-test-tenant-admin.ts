#!/usr/bin/env node

import axios from 'axios';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
const TENANT_ID = 'aef1fb0d-84fb-412d-97c8-06f7eb7f3846';

async function createTestTenantAdmin() {
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

    // Step 2: Create invitation for new TenantAdmin
    console.log('\nStep 2: Creating invitation for test TenantAdmin...');
    
    const inviteResponse = await axios.post(
      `${API_GATEWAY_URL}/api/invitations`,
      {
        email: 'test.admin@btshift.ma',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'TenantAdmin',
        tenantId: TENANT_ID
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Correlation-ID': crypto.randomUUID(),
          'X-Tenant-ID': TENANT_ID
        },
        validateStatus: () => true
      }
    );

    if (inviteResponse.status >= 200 && inviteResponse.status < 300) {
      console.log('✅ Invitation created successfully');
      console.log('Invitation details:', inviteResponse.data);
      
      // Step 3: Accept invitation (simulate)
      const invitationToken = inviteResponse.data.token || inviteResponse.data.invitationToken;
      if (invitationToken) {
        console.log('\nStep 3: Accepting invitation...');
        
        const acceptResponse = await axios.post(
          `${API_GATEWAY_URL}/api/invitations/accept`,
          {
            token: invitationToken,
            password: 'TenantAdmin@123!',
            confirmPassword: 'TenantAdmin@123!'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-ID': crypto.randomUUID()
            },
            validateStatus: () => true
          }
        );

        if (acceptResponse.status >= 200 && acceptResponse.status < 300) {
          console.log('✅ Invitation accepted, user created');
          
          // Test login
          console.log('\nStep 4: Testing login...');
          const testLogin = await axios.post(
            `${API_GATEWAY_URL}/api/authentication/login`,
            {
              email: 'test.admin@btshift.ma',
              password: 'TenantAdmin@123!'
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Correlation-ID': crypto.randomUUID()
              },
              validateStatus: () => true
            }
          );

          if (testLogin.status === 200) {
            console.log('✅ New TenantAdmin can login successfully!');
            console.log('\nCredentials:');
            console.log('  Email: test.admin@btshift.ma');
            console.log('  Password: TenantAdmin@123!');
            console.log('  Tenant ID:', TENANT_ID);
          }
        } else {
          console.log('❌ Failed to accept invitation:', acceptResponse.status, acceptResponse.data);
        }
      }
    } else {
      console.log('❌ Failed to create invitation:', inviteResponse.status, inviteResponse.data);
      
      // Try alternative: direct user creation
      console.log('\nTrying alternative: Direct user creation...');
      const createUserResponse = await axios.post(
        `${API_GATEWAY_URL}/api/users`,
        {
          email: 'test.admin@btshift.ma',
          password: 'TenantAdmin@123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'TenantAdmin',
          tenantId: TENANT_ID
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Correlation-ID': crypto.randomUUID(),
            'X-Tenant-ID': TENANT_ID
          },
          validateStatus: () => true
        }
      );

      if (createUserResponse.status >= 200 && createUserResponse.status < 300) {
        console.log('✅ User created directly');
      } else {
        console.log('❌ Direct user creation failed:', createUserResponse.status, createUserResponse.data);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestTenantAdmin();