/**
 * Example of using the type-safe client
 * This demonstrates compile-time type checking for API calls
 */

import { describe, test, expect } from '@playwright/test';
import { 
  TypedApiClient, 
  ClientRequest, 
  ClientResponse,
  GroupRequest,
  GroupResponse 
} from '../support/clients/typed-api-client-enhanced';

describe('Type-Safe Client Usage Examples', () => {
  let client: TypedApiClient;

  beforeAll(() => {
    client = new TypedApiClient();
  });

  test('CORRECT: Create client with proper camelCase fields', async () => {
    // ✅ TypeScript enforces correct field names
    const clientData: ClientRequest = {
      companyName: 'Test Company',      // ✅ camelCase
      country: 'Morocco',
      address: '123 Test Street',
      iceNumber: 'ICE123456',          // ✅ camelCase
      rcNumber: 'RC789',                // ✅ camelCase
      vatNumber: 'VAT456',              // ✅ camelCase
      cnssNumber: 'CNSS789',            // ✅ camelCase
      industry: 'Technology',
      adminContactPerson: 'admin@test.com',     // ✅ camelCase
      billingContactPerson: 'billing@test.com', // ✅ camelCase
      tenantId: 'tenant-123',           // ✅ camelCase
      fiscalYearEnd: '2024-12-31',     // ✅ camelCase
      assignedTeamId: 'team-456'       // ✅ camelCase
    };

    const response = await client.clientManagement('/api/clients', 'post', {
      body: clientData  // ✅ Pass object directly, no JSON.stringify!
    });

    // TypeScript knows the response type!
    const createdClient: ClientResponse = response.data;
    expect(createdClient.clientId).toBeDefined();       // ✅ camelCase
    expect(createdClient.companyName).toBeDefined();    // ✅ camelCase
  });

  test('CORRECT: Create group with proper field names', async () => {
    const groupData: GroupRequest = {
      name: 'Test Group',
      description: 'A test group',
      tenantId: 'tenant-123'  // ✅ camelCase, not tenant_id
    };

    const response = await client.clientManagement('/api/groups', 'post', {
      body: groupData
    });

    const createdGroup: GroupResponse = response.data;
    expect(createdGroup.groupId).toBeDefined();     // ✅ camelCase
    expect(createdGroup.clientCount).toBe(0);       // ✅ camelCase
  });

  test('CORRECT: List clients with proper query parameters', async () => {
    const response = await client.clientManagement('/api/clients', 'get', {
      params: {
        query: {
          tenantId: 'tenant-123',  // ✅ camelCase
          page: 1,                 // ✅ not page_number
          pageSize: 10             // ✅ camelCase, not page_size
        }
      }
    });

    expect(response.data.clients).toBeDefined();
    expect(response.data.totalCount).toBeDefined();  // ✅ camelCase
  });

  test('Runtime validation catches JSON.stringify mistakes', async () => {
    // Even if someone forces past TypeScript with 'as any'
    await expect(async () => {
      await client.clientManagement('/api/clients', 'post', {
        body: JSON.stringify({ test: 'data' }) as any
      });
    }).rejects.toThrow('Body must be an object, not a string');
  });

  test('Runtime warning for snake_case fields', async () => {
    // Console will warn about snake_case fields
    const consoleSpy = jest.spyOn(console, 'warn');
    
    await client.clientManagement('/api/clients', 'post', {
      body: {
        company_name: 'Test',  // Will trigger warning
        tenant_id: '123'       // Will trigger warning
      } as any
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Snake_case fields detected')
    );
    
    consoleSpy.mockRestore();
  });
});

/**
 * COMPILATION ERRORS - These would fail at compile time!
 * Uncomment to see TypeScript errors
 */

// ❌ ERROR: Wrong field names (snake_case)
/*
async function wrongFieldNames() {
  await client.clientManagement('/api/clients', 'post', {
    body: {
      company_name: 'Test',  // ❌ TypeScript error: unknown property
      tenant_id: '123'       // ❌ TypeScript error: unknown property
    }
  });
}
*/

// ❌ ERROR: JSON.stringify on body
/*
async function jsonStringifyError() {
  await client.clientManagement('/api/clients', 'post', {
    body: JSON.stringify({ companyName: 'Test' })  // ❌ TypeScript error: type 'string' is not assignable
  });
}
*/

// ❌ ERROR: Invalid path
/*
async function invalidPath() {
  await client.clientManagement(
    '/api/invalid/endpoint',  // ❌ TypeScript error: not a valid path
    'post',
    { body: {} }
  );
}
*/

// ❌ ERROR: Wrong HTTP method
/*
async function wrongMethod() {
  await client.clientManagement(
    '/api/clients/123',
    'post',  // ❌ TypeScript error: only 'get', 'put', 'delete' allowed for this path
    { body: {} }
  );
}
*/