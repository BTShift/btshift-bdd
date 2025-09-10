const axios = require('axios');
require('dotenv').config();

async function setupNSTechTestUser() {
  const API_GATEWAY_URL = 'https://api-gateway-production-91e9.up.railway.app';
  const NSTECH_TENANT_ID = '645e8102-df5c-4f40-8b59-bc4f4dfd273c';
  
  // We have these super admin users available:
  const superAdminCredentials = [
    { email: 'superadmin@shift.ma', password: 'SuperAdmin@123!' },
    { email: 'admin@btshift.com', password: 'SuperAdmin@123!' }
  ];
  
  let token = null;
  let loggedInAs = null;
  
  console.log('🔐 Step 1: Attempting to login as SuperAdmin...');
  
  // Try each super admin credential
  for (const creds of superAdminCredentials) {
    try {
      console.log(`   Trying ${creds.email}...`);
      const loginResponse = await axios.post(`${API_GATEWAY_URL}/api/authentication/login`, {
        email: creds.email,
        password: creds.password
      });

      if (loginResponse.data.success && loginResponse.data.tokenInfo) {
        token = loginResponse.data.tokenInfo.accessToken;
        loggedInAs = creds.email;
        console.log(`   ✅ Successfully logged in as ${loggedInAs}`);
        break;
      }
    } catch (error) {
      console.log(`   ❌ Failed with ${creds.email}: ${error.response?.data?.message || error.message}`);
    }
  }

  if (!token) {
    console.error('❌ Could not login with any SuperAdmin credentials');
    console.log('\nPlease provide the correct SuperAdmin password.');
    console.log('You can set it in the .env file as SUPER_ADMIN_PASSWORD');
    return;
  }

  // Create axios instance with auth
  const api = axios.create({
    baseURL: API_GATEWAY_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('\n👤 Step 2: Creating TenantAdmin user for NStech...');
  
  // Create a tenant admin for NStech
  const tenantAdmin = {
    email: 'admin@nstech.com',
    firstName: 'NStech',
    lastName: 'Admin',
    phoneNumber: '+212600000001',
    password: 'TenantAdmin@123!',
    tenantId: NSTECH_TENANT_ID
  };

  try {
    // First try to create the user
    const createUserResponse = await api.post('/api/users', tenantAdmin);
    
    console.log('✅ Tenant admin created successfully!');
    const userId = createUserResponse.data.userId || createUserResponse.data.id;
    
    // Assign TenantAdmin role
    if (userId) {
      try {
        await api.post(`/api/users/${userId}/roles`, {
          roleNames: ['TenantAdmin']
        });
        console.log('✅ TenantAdmin role assigned');
      } catch (error) {
        console.log('⚠️  Could not assign role:', error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
      console.log('⚠️  User already exists: admin@nstech.com');
      
      // Try to get the existing user and update
      try {
        const usersResponse = await api.get('/api/users?email=admin@nstech.com');
        if (usersResponse.data && usersResponse.data.length > 0) {
          const existingUser = usersResponse.data[0];
          console.log(`   Found existing user ID: ${existingUser.id}`);
          
          // Update password if needed
          console.log('   Attempting to reset password...');
          // Note: This would require the password reset flow
        }
      } catch (getUserError) {
        console.log('   Could not retrieve existing user');
      }
    } else {
      console.log('❌ Error creating user:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n👤 Step 3: Creating regular TenantUser for NStech...');
  
  // Create a regular user for NStech
  const tenantUser = {
    email: 'user@nstech.com',
    firstName: 'NStech',
    lastName: 'User',
    phoneNumber: '+212600000002',
    password: 'TenantUser@123!',
    tenantId: NSTECH_TENANT_ID
  };

  try {
    const createUserResponse = await api.post('/api/users', tenantUser);
    
    console.log('✅ Tenant user created successfully!');
    const userId = createUserResponse.data.userId || createUserResponse.data.id;
    
    // Assign User role
    if (userId) {
      try {
        await api.post(`/api/users/${userId}/roles`, {
          roleNames: ['User']
        });
        console.log('✅ User role assigned');
      } catch (error) {
        console.log('⚠️  Could not assign role:', error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️  User already exists: user@nstech.com');
    } else {
      console.log('⚠️  Error creating user:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n📝 Final Configuration for BDD Tests:');
  console.log('=====================================');
  console.log('# SuperAdmin (Platform Operations)');
  console.log(`SUPER_ADMIN_EMAIL=superadmin@shift.ma`);
  console.log(`SUPER_ADMIN_PASSWORD=SuperAdmin@123!  # Update with correct password`);
  console.log('');
  console.log('# NStech TenantAdmin (Tenant Operations)');
  console.log(`TENANT_ID=${NSTECH_TENANT_ID}`);
  console.log(`TENANT_NAME=nstech`);
  console.log(`TENANT_DOMAIN=nstech`);
  console.log(`TENANT_ADMIN_EMAIL=admin@nstech.com`);
  console.log(`TENANT_ADMIN_PASSWORD=TenantAdmin@123!`);
  console.log('');
  console.log('# Alternative: Use existing Anass user (but different tenant)');
  console.log('# Note: These users are for different tenants, not NStech');
  console.log('# anass.yatim+nstech2@gmail.com - Tenant: aef1fb0d-84fb-412d-97c8-06f7eb7f3846');
  console.log('# anass.yatim+nstech4@gmail.com - Tenant: a02138dd-4f80-45da-9c82-01887e03e7e4');
  console.log('');
  console.log('✅ Setup attempt complete!');
  console.log('');
  console.log('⚠️  IMPORTANT: If user creation failed, you may need to:');
  console.log('   1. Create the users manually in the admin portal');
  console.log('   2. Assign them to the NStech tenant (645e8102-df5c-4f40-8b59-bc4f4dfd273c)');
  console.log('   3. Set their passwords to TenantAdmin@123!');
  console.log('   4. Ensure they have TenantAdmin role');
}

setupNSTechTestUser().catch(console.error);