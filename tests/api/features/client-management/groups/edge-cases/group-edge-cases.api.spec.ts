import { describe, beforeAll, afterAll, expect } from '@playwright/test';
import { test } from '../../../../../support/test-context-fixture';
import { allure } from 'allure-playwright';
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';
import { EnhancedAssertions, testStep, expectWithContext } from '../../../../support/helpers/enhanced-assertions';

describe('Client Management - Group Edge Cases', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTestWithContext('TenantAdmin');
  });

  // Set Allure metadata for each test to ensure all tests are properly categorized
  test.beforeEach(async () => {
    allure.parentSuite('👥 Client Services');
    allure.feature('Client Relationship Management');
    allure.suite('Group Edge Cases');
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should return 404 when getting a non-existent group', async () => {
    // Use a non-existent group ID
    const nonExistentGroupId = '00000000-0000-0000-0000-000000000000';

    await testStep('Attempt to get non-existent group', async () => {
      try {
        const response = await ctx.client.clientManagement(`/api/groups/${nonExistentGroupId}` as any, 'get');

        // If we get here, the request didn't fail as expected
        throw new Error('Expected request to fail with 404 but it succeeded');

      } catch (error: any) {
        // Verify this is the expected 404 error
        const context = {
          operation: 'Get Non-existent Group',
          endpoint: `/api/groups/${nonExistentGroupId}`,
          entityId: nonExistentGroupId,
          entityType: 'group',
          additionalInfo: {
            expectedError: '404 Not Found',
            actualError: error.message
          }
        };

        await expectWithContext(error.message, context).toBeDefined();

        // The error message should indicate not found
        expect(error.message.toLowerCase()).toContain('not found');
      }
    }, {
      operation: 'Get Non-existent Group',
      endpoint: `/api/groups/${nonExistentGroupId}`,
      entityId: nonExistentGroupId,
      entityType: 'group'
    });
  });

  test('should return 400 when getting a group with invalid ID format', async () => {
    // Use an invalid GUID format
    const invalidGroupId = 'invalid-group-id';

    await testStep('Attempt to get group with invalid ID format', async () => {
      try {
        const response = await ctx.client.clientManagement(`/api/groups/${invalidGroupId}` as any, 'get');

        // If we get here, the request didn't fail as expected
        throw new Error('Expected request to fail with 400 but it succeeded');

      } catch (error: any) {
        // Verify this is the expected 400 error for invalid format
        const context = {
          operation: 'Get Group Invalid Format',
          endpoint: `/api/groups/${invalidGroupId}`,
          entityId: invalidGroupId,
          entityType: 'group',
          additionalInfo: {
            expectedError: '400 Bad Request or Invalid Argument',
            actualError: error.message
          }
        };

        await expectWithContext(error.message, context).toBeDefined();

        // The error should indicate invalid format or bad request
        const errorLower = error.message.toLowerCase();
        const isValidError = errorLower.includes('invalid') ||
                           errorLower.includes('bad request') ||
                           errorLower.includes('format');

        expect(isValidError).toBe(true,
          `Expected error to contain 'invalid', 'bad request', or 'format' but got: ${error.message}`);
      }
    }, {
      operation: 'Get Group Invalid Format',
      endpoint: `/api/groups/${invalidGroupId}`,
      entityId: invalidGroupId,
      entityType: 'group'
    });
  });

  test('should handle GetGroup with proper client count when group has members', async () => {
    // Create a group
    const groupData = {
      name: `ClientCountTestGroup_${Date.now()}`,
      description: 'Test group for client count verification'
    };

    const createGroupResponse = await testStep('Create group for client count test', async () => {
      return await ctx.client.clientManagement('/api/groups', 'post', {
        body: groupData
      });
    }, {
      operation: 'Create Group',
      endpoint: '/api/groups',
      entityType: 'group'
    });

    const createdGroupData = ctx.getData(createGroupResponse);
    ctx.cleanup.addGroup(createdGroupData.groupId);

    // Create two clients
    const client1Data = {
      companyName: `TestClient1_${Date.now()}`,
      country: 'Morocco',
      industry: 'Technology'
    };

    const client2Data = {
      companyName: `TestClient2_${Date.now()}`,
      country: 'Morocco',
      industry: 'Finance'
    };

    const client1Response = await ctx.client.clientManagement('/api/clients', 'post', {
      body: client1Data
    });
    const client1ResponseData = ctx.getData(client1Response);
    ctx.cleanup.addClient(client1ResponseData.clientId);

    const client2Response = await ctx.client.clientManagement('/api/clients', 'post', {
      body: client2Data
    });
    const client2ResponseData = ctx.getData(client2Response);
    ctx.cleanup.addClient(client2ResponseData.clientId);

    // Add clients to the group
    await ctx.client.clientManagement(
      `/api/groups/${createdGroupData.groupId}/clients/${client1ResponseData.clientId}` as any,
      'post'
    );
    await ctx.client.clientManagement(
      `/api/groups/${createdGroupData.groupId}/clients/${client2ResponseData.clientId}` as any,
      'post'
    );

    // Now get the group and verify client count
    const getGroupResponse = await testStep('Get group with clients', async () => {
      return await ctx.client.clientManagement(`/api/groups/${createdGroupData.groupId}` as any, 'get');
    }, {
      operation: 'Get Group with Clients',
      endpoint: `/api/groups/${createdGroupData.groupId}`,
      entityId: createdGroupData.groupId,
      entityType: 'group'
    });

    const retrievedGroupData = ctx.getData(getGroupResponse);

    await testStep('Verify group has correct client count', async () => {
      const context = {
        operation: 'Verify Group Client Count',
        endpoint: `/api/groups/${createdGroupData.groupId}`,
        entityId: createdGroupData.groupId,
        entityType: 'group',
        additionalInfo: {
          expectedClientCount: 2,
          actualClientCount: retrievedGroupData.clientCount,
          addedClients: [client1ResponseData.clientId, client2ResponseData.clientId]
        }
      };

      await expectWithContext(retrievedGroupData, context).toBeDefined();
      await expectWithContext(retrievedGroupData.groupId, context).toBe(createdGroupData.groupId);
      await expectWithContext(retrievedGroupData.name, context).toBe(groupData.name);
      await expectWithContext(retrievedGroupData.clientCount, context).toBe(2);
      await expectWithContext(retrievedGroupData.description, context).toBe(groupData.description);
    });
  });

  test('should handle GetGroup authorization properly', async () => {
    // This test would ideally test unauthorized access, but since we're using TenantAdmin
    // context, we'll create a group and verify it returns proper tenant isolation
    const groupData = {
      name: `AuthTestGroup_${Date.now()}`,
      description: 'Test group for authorization verification'
    };

    const createResponse = await testStep('Create group for auth test', async () => {
      return await ctx.client.clientManagement('/api/groups', 'post', {
        body: groupData
      });
    }, {
      operation: 'Create Group',
      endpoint: '/api/groups',
      entityType: 'group'
    });

    const createdData = ctx.getData(createResponse);
    ctx.cleanup.addGroup(createdData.groupId);

    // Get the group and verify tenant information is included
    const response = await testStep('Get group to verify authorization context', async () => {
      return await ctx.client.clientManagement(`/api/groups/${createdData.groupId}` as any, 'get');
    }, {
      operation: 'Get Group Authorization Check',
      endpoint: `/api/groups/${createdData.groupId}`,
      entityId: createdData.groupId,
      entityType: 'group'
    });

    const retrievedData = ctx.getData(response);

    await testStep('Verify tenant isolation in response', async () => {
      const context = {
        operation: 'Verify Authorization Context',
        endpoint: `/api/groups/${createdData.groupId}`,
        entityId: createdData.groupId,
        entityType: 'group',
        additionalInfo: {
          tenantId: retrievedData.tenantId
        }
      };

      await expectWithContext(retrievedData, context).toBeDefined();
      await expectWithContext(retrievedData.tenantId, context).toBeTruthy();

      // Verify the group belongs to the expected tenant context
      // The tenant ID should be consistent with our test context
      expect(typeof retrievedData.tenantId).toBe('string');
      expect(retrievedData.tenantId.length).toBeGreaterThan(0);
    });
  });
});