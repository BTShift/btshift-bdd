/**
 * Type safety test - this file demonstrates compile-time type checking
 * Uncomment the error examples to see TypeScript catch them at compile time!
 */

import { TypedApiClientV2, ClientComponents } from './typed-api-client-v2';

// Create a properly typed client
const client = new TypedApiClientV2();

// ✅ CORRECT: Passing an object to body
async function correctExample() {
  const response = await client.clientManagement('/api/clients', 'post', {
    body: {
      companyName: 'Test Company',
      country: 'Morocco',
      industry: 'Technology'
    }
  });
  
  // TypeScript knows the response type!
  console.log(response.data.clientId); // OK
}

// ❌ ERROR EXAMPLES - Uncomment to see TypeScript errors!

// ERROR 1: Passing JSON.stringify to body
async function error1_jsonStringify() {
  // TypeScript should error: body expects object, not string
  /*
  const response = await client.clientManagement('/api/clients', 'post', {
    body: JSON.stringify({ companyName: 'Test' }) // ❌ Type error!
  });
  */
}

// ERROR 2: Wrong field names (snake_case instead of camelCase)
async function error2_wrongFieldNames() {
  // TypeScript should error: unknown fields
  /*
  const response = await client.clientManagement('/api/clients', 'post', {
    body: {
      company_name: 'Test', // ❌ Should be companyName
      tenant_id: '123'       // ❌ Should be tenantId
    }
  });
  */
}

// ERROR 3: Invalid path
async function error3_invalidPath() {
  // TypeScript should error: path doesn't exist
  /*
  const response = await client.clientManagement(
    '/api/invalid/path', // ❌ Not a valid path
    'post',
    { body: {} }
  );
  */
}

// ERROR 4: Wrong HTTP method for path
async function error4_wrongMethod() {
  // TypeScript should error: GET doesn't accept body
  /*
  const response = await client.clientManagement('/api/clients', 'get', {
    body: { companyName: 'Test' } // ❌ GET shouldn't have body
  });
  */
}

// ERROR 5: Missing required fields
async function error5_missingFields() {
  // TypeScript should warn about potentially missing required fields
  /*
  const response = await client.clientManagement('/api/clients', 'post', {
    body: {} // ❌ Empty body, missing required fields
  });
  */
}

// ✅ CORRECT: Type-safe field names
async function correctFieldNames() {
  const response = await client.clientManagement('/api/clients', 'post', {
    body: {
      companyName: 'Test Company',     // ✅ camelCase
      tenantId: 'tenant-123',          // ✅ camelCase
      fiscalYearEnd: '2024-12-31',     // ✅ camelCase
      assignedTeamId: 'team-456'       // ✅ camelCase
    }
  });
}

// ✅ CORRECT: Type-safe query parameters
async function correctQueryParams() {
  const response = await client.clientManagement('/api/clients', 'get', {
    params: {
      query: {
        tenantId: 'tenant-123',  // ✅ camelCase
        page: 1,                 // ✅ not page_number
        pageSize: 10             // ✅ camelCase, not page_size
      }
    }
  });
}

// Runtime validation example
async function runtimeValidation() {
  try {
    // This will throw a runtime error even if TypeScript doesn't catch it
    const response = await client.clientManagement('/api/clients', 'post', {
      body: JSON.stringify({ test: 'data' }) as any // Force past TS with 'as any'
    });
  } catch (error) {
    // Will catch: "Body must be an object, not a string"
    console.error('Runtime validation caught:', error);
  }
}

// Helper to demonstrate proper typing for responses
function handleClientResponse(response: ClientComponents['schemas']['clientmanagementClientResponse']) {
  // TypeScript knows all the fields!
  console.log(response.clientId);      // ✅
  console.log(response.companyName);   // ✅
  console.log(response.tenantId);      // ✅
  
  // TypeScript will error on wrong field names
  // console.log(response.client_id);  // ❌ Property 'client_id' does not exist
  // console.log(response.company_name); // ❌ Property 'company_name' does not exist
}

export { correctExample, correctFieldNames, correctQueryParams };