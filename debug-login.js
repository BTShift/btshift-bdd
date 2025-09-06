const axios = require('axios');
const { makeClient } = require('@btshift/identity-types');

async function compareLogins() {
  const baseURL = 'https://api-gateway-production-91e9.up.railway.app';
  
  const credentials = {
    email: 'superadmin@shift.ma',
    password: 'SuperAdmin@123!'
  };

  console.log('=== Testing Axios (Working) ===');
  try {
    const axiosResponse = await axios.post(`${baseURL}/api/authentication/login`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Axios Success:', axiosResponse.status, axiosResponse.data?.tokenInfo ? 'Has token' : 'No token');
  } catch (error) {
    console.log('❌ Axios Error:', error.response?.status, error.response?.data);
  }

  console.log('\n=== Testing NPM Package ===');
  try {
    const client = makeClient({
      baseUrl: baseURL
    });
    
    const npmResponse = await client.api('/api/authentication/login', 'post', {
      body: credentials
    });
    console.log('✅ NPM Success:', npmResponse);
  } catch (error) {
    console.log('❌ NPM Error:', error.message);
  }
}

compareLogins();