const { TypedScriptClient } = require('./scripts/lib/typed-script-client');
const { makeClient } = require('@btshift/identity-types');

async function compareLogins() {
  const baseURL = 'https://api-gateway-production-91e9.up.railway.app';

  const credentials = {
    email: 'superadmin@shift.ma',
    password: 'SuperAdmin@123!'
  };

  console.log('=== Testing openapi-fetch (New approach) ===');
  try {
    const client = new TypedScriptClient();
    const openapiResponse = await client.identity.POST('/api/authentication/login', {
      body: credentials,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!openapiResponse.error && openapiResponse.response.status === 200) {
      const token = openapiResponse.data?.tokenInfo?.accessToken;
      console.log('✅ openapi-fetch Success:', openapiResponse.response.status, token ? 'Has token' : 'No token');
    } else {
      console.log('❌ openapi-fetch Error:', openapiResponse.response?.status, openapiResponse.error);
    }
  } catch (error) {
    console.log('❌ openapi-fetch Error:', error.message);
  }

  console.log('\n=== Testing NPM Package (for comparison) ===');
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