#!/usr/bin/env node

import { TypedScriptClient } from './lib/typed-script-client';
import * as crypto from 'crypto';

const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
const TENANT_ID = 'aef1fb0d-84fb-412d-97c8-06f7eb7f3846';

async function createTestTenantAdmin() {
  try {
    const client = new TypedScriptClient();

    // Step 1: Login as SuperAdmin
    console.log('Step 1: Logging in as SuperAdmin...');
    const loginResponse = await client.identity.POST('/api/authentication/login', {
      body: {
        email: 'superadmin@shift.ma',
        password: 'SuperAdmin@123!'
      },
      headers: {
        'X-Correlation-ID': crypto.randomUUID()
      }
    });

    if (loginResponse.error) {
      throw new Error('Failed to login as SuperAdmin');
    }

    const token = (loginResponse.data as any)?.token || (loginResponse.data as any)?.tokenInfo?.accessToken;
    client.setAuthToken(token);
    console.log('✅ Logged in as SuperAdmin');

    // Step 2: Create invitation for new TenantAdmin
    console.log('\nStep 2: Creating invitation for test TenantAdmin...');

    const inviteResponse = await client.identity.POST('/api/invitations' as any, {
      body: {
        email: 'test.admin@btshift.ma',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'TenantAdmin',
        tenantId: TENANT_ID
      },
      headers: {
        'X-Correlation-ID': crypto.randomUUID(),
        'X-Tenant-ID': TENANT_ID
      }
    } as any);

    if (!inviteResponse.error && inviteResponse.response.status >= 200 && inviteResponse.response.status < 300) {
      console.log('✅ Invitation created successfully');
      console.log('Invitation details:', inviteResponse.data);

      // Step 3: Accept invitation (simulate)
      const invitationToken = (inviteResponse.data as any)?.token || (inviteResponse.data as any)?.invitationToken;
      if (invitationToken) {
        console.log('\nStep 3: Accepting invitation...');

        const acceptResponse = await client.identity.POST('/api/invitations/accept' as any, {
          body: {
            token: invitationToken,
            password: 'TenantAdmin@123!',
            confirmPassword: 'TenantAdmin@123!'
          },
          headers: {
            'X-Correlation-ID': crypto.randomUUID()
          }
        } as any);

        if (!acceptResponse.error && acceptResponse.response.status >= 200 && acceptResponse.response.status < 300) {
          console.log('✅ Invitation accepted, user created');

          // Test login
          console.log('\nStep 4: Testing login...');
          const testClient = new TypedScriptClient();
          const testLogin = await testClient.identity.POST('/api/authentication/login', {
            body: {
              email: 'test.admin@btshift.ma',
              password: 'TenantAdmin@123!'
            },
            headers: {
              'X-Correlation-ID': crypto.randomUUID()
            }
          });

          if (!testLogin.error && testLogin.response.status === 200) {
            console.log('✅ New TenantAdmin can login successfully!');
            console.log('\nCredentials:');
            console.log('  Email: test.admin@btshift.ma');
            console.log('  Password: TenantAdmin@123!');
            console.log('  Tenant ID:', TENANT_ID);
          }
        } else {
          console.log('❌ Failed to accept invitation:', acceptResponse.response?.status, acceptResponse.error || acceptResponse.data);
        }
      }
    } else {
      console.log('❌ Failed to create invitation:', inviteResponse.response?.status, inviteResponse.error || inviteResponse.data);

      // Try alternative: direct user creation
      console.log('\nTrying alternative: Direct user creation...');
      const createUserResponse = await client.identity.POST('/api/users', {
        body: {
          email: 'test.admin@btshift.ma',
          password: 'TenantAdmin@123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'TenantAdmin',
          tenantId: TENANT_ID
        },
        headers: {
          'X-Correlation-ID': crypto.randomUUID(),
          'X-Tenant-ID': TENANT_ID
        }
      });

      if (!createUserResponse.error && createUserResponse.response.status >= 200 && createUserResponse.response.status < 300) {
        console.log('✅ User created directly');
      } else {
        console.log('❌ Direct user creation failed:', createUserResponse.response?.status, createUserResponse.error || createUserResponse.data);
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

createTestTenantAdmin();