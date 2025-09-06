const { TypedApiClient } = require('./tests/api/support/clients/typed-api-client');

async function debugToken() {
  const client = new TypedApiClient('https://api-gateway-production-91e9.up.railway.app');
  
  console.log('1. Initial token:', client.getAuthToken());
  
  try {
    const response = await client.login('superadmin@shift.ma', 'SuperAdmin@123!');
    console.log('2. After login token:', client.getAuthToken() ? 'SET' : 'NOT SET');
    console.log('3. Login response keys:', Object.keys(response));
    
    if (response.tokenInfo?.accessToken) {
      console.log('4. Token from response:', response.tokenInfo.accessToken.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('Login error:', error.message);
  }
}

debugToken();