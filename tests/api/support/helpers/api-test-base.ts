/**
 * Base class for API tests - DRY approach with shared setup/teardown
 */

import { TypedApiClient } from '../clients/typed-api-client';

export interface TestContext {
  client: TypedApiClient;
  cleanup: CleanupManager;
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

export async function setupApiTest(): Promise<TestContext> {
  const client = new TypedApiClient();
  const cleanup = new CleanupManager();
  
  // Login as SuperAdmin - use PLATFORM_ADMIN credentials from .env
  const credentials = {
    email: process.env.PLATFORM_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'superadmin@shift.ma',
    password: process.env.PLATFORM_ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123!'
  };
  
  await client.login(credentials.email, credentials.password);
  
  return { client, cleanup };
}

export async function teardownApiTest(context: TestContext): Promise<void> {
  await context.cleanup.executeCleanup(context.client);
  await context.client.logout();
}