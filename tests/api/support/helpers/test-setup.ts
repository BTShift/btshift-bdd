import { IdentityClient } from '../clients/identity-client';
import { TenantManagementClient } from '../clients/tenant-management-client';
import { ClientManagementClient } from '../clients/client-management-client';
import { superAdminCredentials } from '../fixtures/tenant-data';

export interface TestClients {
  identity: IdentityClient;
  tenantManagement: TenantManagementClient;
  clientManagement: ClientManagementClient;
}

export class TestSetup {
  private static clients: TestClients;
  private static isAuthenticated = false;

  static async getClients(): Promise<TestClients> {
    if (!this.clients) {
      this.clients = {
        identity: new IdentityClient(),
        tenantManagement: new TenantManagementClient(),
        clientManagement: new ClientManagementClient()
      };
    }

    // Ensure we're authenticated as SuperAdmin for API tests
    if (!this.isAuthenticated) {
      await this.authenticateAsSuperAdmin();
    }

    return this.clients;
  }

  static async authenticateAsSuperAdmin(): Promise<void> {
    const { identity, tenantManagement, clientManagement } = await this.getClients();

    try {
      const loginResponse = await identity.login(superAdminCredentials);
      
      if (!loginResponse.success) {
        throw new Error(`SuperAdmin authentication failed: ${loginResponse.message}`);
      }

      const token = loginResponse.tokenInfo?.accessToken;
      if (!token) {
        throw new Error('No access token received from authentication');
      }

      // Set the same token for all clients
      tenantManagement.setAuthToken(token);
      clientManagement.setAuthToken(token);
      
      this.isAuthenticated = true;
      console.log('✅ Authenticated as SuperAdmin for API tests');
    } catch (error) {
      console.error('❌ Failed to authenticate as SuperAdmin:', error);
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    if (this.clients?.identity) {
      await this.clients.identity.logout();
    }
    this.isAuthenticated = false;
    console.log('🧹 Test cleanup completed');
  }

  static createUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeoutMs = 30000,
    intervalMs = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }
}