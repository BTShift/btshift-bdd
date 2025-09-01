const axios = require('axios');

async function testApi() {
  const baseURL = 'https://api-gateway-production-91e9.up.railway.app';
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${baseURL}/api/authentication/login`, {
      email: 'superadmin@shift.ma',
      password: 'SuperAdmin@123!'
    });
    
    console.log('Login response:', loginResponse.status, loginResponse.data);
    
    if (!loginResponse.data.success || !loginResponse.data.tokenInfo) {
      console.error('Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.tokenInfo.accessToken;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Step 2: Create tenant
    console.log('\n2. Creating tenant...');
    const tenantData = {
      name: `API Test Tenant ${Date.now()}`,
      domain: `api-test-${Date.now()}`,
      adminEmail: 'test@example.com',
      adminFirstName: 'Test',
      adminLastName: 'Admin'
    };
    
    const createResponse = await axios.post(
      `${baseURL}/api/tenants`,
      tenantData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Create tenant response:', createResponse.status, createResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testApi();