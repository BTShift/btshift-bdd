/**
 * Base class for API tests - DRY approach with shared setup/teardown
 * Uses Global Authentication Manager to avoid multiple logins
 */

import { TypedApiClient, ApiResponse } from '../clients/typed-api-client';
import { GlobalAuthManager } from '../auth/global-auth-manager';
import { AllureCorrelationHelper } from './allure-correlation';
import * as crypto from 'crypto';

export interface TestContext {
  client: TypedApiClient;
  cleanup: CleanupManager;
  correlation: CorrelationTracker;
}

export class CorrelationTracker {
  private correlationHistory: Array<{
    correlationId: string;
    requestCorrelationId: string;
    timestamp: Date;
    context?: any;
  }> = [];

  /**
   * Track a correlation ID from an API response
   */
  track(response: ApiResponse, context?: any): void {
    this.correlationHistory.push({
      correlationId: response.correlationId,
      requestCorrelationId: response.requestCorrelationId,
      timestamp: new Date(),
      context
    });
  }

  /**
   * Get the last tracked correlation ID
   */
  getLastCorrelationId(): string | null {
    const last = this.correlationHistory[this.correlationHistory.length - 1];
    return last?.correlationId || null;
  }

  /**
   * Get all tracked correlation IDs
   */
  getHistory(): typeof this.correlationHistory {
    return [...this.correlationHistory];
  }

  /**
   * Enhanced API call wrapper that automatically tracks correlation IDs and reports to Allure
   */
  async callAndReport<T extends ApiResponse>(
    stepName: string,
    apiCall: () => Promise<T>,
    context?: {
      endpoint?: string;
      method?: string;
      serviceName?: string;
    }
  ): Promise<T> {
    return await AllureCorrelationHelper.stepWithCorrelation(
      stepName,
      async () => {
        const response = await AllureCorrelationHelper.captureCorrelationOnError(
          apiCall,
          context
        );
        
        // Track the correlation ID
        this.track(response, context);
        
        return response;
      },
      context
    );
  }
}

export class CleanupManager {
  private tenantIds: string[] = [];
  private clientIds: string[] = [];
  private userIds: string[] = [];
  private roleIds: string[] = [];
  private permissionIds: string[] = [];
  private invitationIds: string[] = [];
  private groupIds: string[] = [];

  addTenant(id: string): void {
    this.tenantIds.push(id);
  }

  addClient(id: string): void {
    this.clientIds.push(id);
  }

  addUser(id: string): void {
    this.userIds.push(id);
  }

  addRole(id: string): void {
    this.roleIds.push(id);
  }

  addPermission(id: string): void {
    this.permissionIds.push(id);
  }

  addInvitation(id: string): void {
    this.invitationIds.push(id);
  }

  addGroup(id: string): void {
    this.groupIds.push(id);
  }

  async executeCleanup(client: TypedApiClient): Promise<void> {
    // Cleanup groups first
    for (const id of this.groupIds) {
      try {
        await client.clientManagement(`/api/groups/${id}`, 'delete');
        console.log(`🧹 Cleaned up group: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup group ${id}`);
      }
    }

    // Cleanup clients
    for (const id of this.clientIds) {
      try {
        await client.clientManagement(`/api/clients/${id}`, 'delete');
        console.log(`🧹 Cleaned up client: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup client ${id}`);
      }
    }

    // Cancel invitations
    for (const id of this.invitationIds) {
      try {
        await client.identity(`/api/invitations/${id}/cancel`, 'post');
        console.log(`🧹 Cancelled invitation: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cancel invitation ${id}`);
      }
    }

    // Cleanup users
    for (const id of this.userIds) {
      try {
        await client.identity(`/api/users/${id}`, 'delete');
        console.log(`🧹 Cleaned up user: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup user ${id}`);
      }
    }

    // Cleanup roles
    for (const id of this.roleIds) {
      try {
        await client.identity(`/api/roles/${id}`, 'delete');
        console.log(`🧹 Cleaned up role: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup role ${id}`);
      }
    }

    // Cleanup permissions
    for (const id of this.permissionIds) {
      try {
        await client.identity(`/api/permissions/${id}`, 'delete');
        console.log(`🧹 Cleaned up permission: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup permission ${id}`);
      }
    }

    // Cleanup tenants last
    for (const id of this.tenantIds) {
      try {
        await client.tenant(`/api/tenants/${id}`, 'delete');
        console.log(`🧹 Cleaned up tenant: ${id}`);
      } catch (error) {
        console.warn(`⚠️ Failed to cleanup tenant ${id}`);
      }
    }
  }
}

/**
 * Setup API test context using global authentication
 * This avoids multiple login calls and improves performance
 */
export async function setupApiTest(): Promise<TestContext> {
  const testSessionId = crypto.randomUUID().substring(0, 8);
  console.log(`🚀 [${testSessionId}] Setting up test context with global auth...`);
  
  try {
    // Get authenticated client from global auth manager
    const authManager = GlobalAuthManager.getInstance();
    const client = await authManager.getAuthenticatedClient();
    const cleanup = new CleanupManager();
    const correlation = new CorrelationTracker();
    
    const tokenInfo = authManager.getTokenInfo();
    console.log(`✅ [${testSessionId}] Using global authentication`);
    console.log(`🕐 [${testSessionId}] Token expires: ${tokenInfo?.expiresAt.toLocaleTimeString()}`);
    
    return { client, cleanup, correlation };
  } catch (error) {
    console.error(`❌ [${testSessionId}] Setup failed:`, error.message);
    // Fallback to non-authenticated client for cleanup purposes
    const client = new TypedApiClient();
    const cleanup = new CleanupManager();
    const correlation = new CorrelationTracker();
    return { client, cleanup, correlation };
  }
}

/**
 * Setup API test context WITHOUT authentication
 * Use this for authentication/login feature tests that need to test login itself
 */
export async function setupUnauthenticatedApiTest(): Promise<TestContext> {
  const testSessionId = crypto.randomUUID().substring(0, 8);
  console.log(`🚀 [${testSessionId}] Setting up UNAUTHENTICATED test context...`);
  
  const client = new TypedApiClient();
  const cleanup = new CleanupManager();
  const correlation = new CorrelationTracker();
  
  console.log(`🌐 [${testSessionId}] API Gateway URL:`, process.env.API_GATEWAY_URL);
  
  return { client, cleanup, correlation };
}

export async function teardownApiTest(context: TestContext): Promise<void> {
  if (context?.cleanup) {
    try {
      await context.cleanup.executeCleanup(context.client);
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }
  if (context?.client && context.client.getAuthToken()) {
    try {
      await context.client.logout();
    } catch (error) {
      console.warn('⚠️ Logout failed:', error.message);
    }
  }
}