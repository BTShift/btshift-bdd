const axios = require('axios');
require('dotenv').config();

async function createNSTechTestUser() {
  const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
  const NSTECH_TENANT_ID = '645e8102-df5c-4f40-8b59-bc4f4dfd273c';
  
  try {
    console.log('🔐 Step 1: Logging in as SuperAdmin...');
    
    // Login as super admin
    const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/authentication/login`, {
      email: 'admin@shift.ma',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!'
    });

    if (!loginResponse.data.success) {
      throw new Error('Failed to login as SuperAdmin');
    }

    const token = loginResponse.data.tokenInfo.accessToken;
    console.log('✅ Logged in successfully\n');

    // Create axios instance with auth
    const api = axios.create({
      baseURL: API_GATEWAY_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('👤 Step 2: Creating test user for NStech tenant...');
    
    // Create a test user for NStech
    const testUser = {
      email: 'testadmin@nstech.com',
      firstName: 'Test',
      lastName: 'Admin',
      phoneNumber: '+212600000001',
      password: 'TenantAdmin@123!',
      confirmPassword: 'TenantAdmin@123!',
      tenantId: NSTECH_TENANT_ID,
      role: 'TenantAdmin'
    };

    try {
      const createUserResponse = await api.post('/api/users', testUser);
      
      if (createUserResponse.data.success || createUserResponse.status === 200 || createUserResponse.status === 201) {
        console.log('✅ Test user created successfully!');
        console.log('   Email:', testUser.email);
        console.log('   Password:', testUser.password);
        console.log('   Tenant ID:', NSTECH_TENANT_ID);
        
        if (createUserResponse.data.userId) {
          console.log('   User ID:', createUserResponse.data.userId);
        }
      }
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️  User already exists, attempting to reset password...');
        
        // If user exists, try to reset their password
        try {
          // First, initiate password reset
          const resetResponse = await api.post('/api/authentication/forgot-password', {
            email: testUser.email
          });
          
          console.log('   Password reset initiated. Check email for reset link.');
          console.log('   For testing, you may need to manually set the password.');
        } catch (resetError) {
          console.log('   Could not initiate password reset:', resetError.response?.data?.message || resetError.message);
        }
      } else {
        throw error;
      }
    }

    console.log('\n📝 Configuration for BDD tests:');
    console.log('================================');
    console.log('# NStech Tenant Admin');
    console.log(`TENANT_ID=${NSTECH_TENANT_ID}`);
    console.log(`TENANT_NAME=nstech`);
    console.log(`TENANT_DOMAIN=nstech`);
    console.log(`TENANT_DB_NAME=tenant_nstech`);
    console.log(`TENANT_ADMIN_EMAIL=${testUser.email}`);
    console.log(`TENANT_ADMIN_PASSWORD=${testUser.password}`);
    console.log('');
    
    // Also try to create a regular tenant user
    console.log('👤 Step 3: Creating regular tenant user...');
    
    const regularUser = {
      email: 'testuser@nstech.com',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+212600000002',
      password: 'TenantUser@123!',
      confirmPassword: 'TenantUser@123!',
      tenantId: NSTECH_TENANT_ID,
      role: 'User'
    };

    try {
      const createRegularResponse = await api.post('/api/users', regularUser);
      
      if (createRegularResponse.data.success || createRegularResponse.status === 200 || createRegularResponse.status === 201) {
        console.log('✅ Regular user created successfully!');
        console.log('   Email:', regularUser.email);
        console.log('   Password:', regularUser.password);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  Regular user already exists');
      } else {
        console.log('⚠️  Could not create regular user:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n✅ Setup complete! You can now use these credentials for BDD tests.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createNSTechTestUser().catch(console.error);