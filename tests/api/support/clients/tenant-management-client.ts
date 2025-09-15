import { TypedScriptClient } from '../../../../scripts/lib/typed-script-client';

/**
 * TenantManagementClient - Production-ready wrapper for tenant management operations
 */
export class TenantManagementClient {
  private client: TypedScriptClient;

  constructor(baseUrl?: string) {
    this.client = new TypedScriptClient();
  }

  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  async createTenant(tenantData: CreateTenantRequest): Promise<any> {
    return await this.client.createTenant(tenantData);
  }

  async getTenant(tenantId: string): Promise<any> {
    return await this.client.getTenant(tenantId);
  }

  async getTenants(): Promise<any> {
    return await this.client.getTenants();
  }

  async activateTenant(tenantId: string): Promise<any> {
    return await this.client.activateTenant(tenantId);
  }

  async resendWelcomeEmail(tenantId: string): Promise<any> {
    return await this.client.resendWelcomeEmail(tenantId);
  }

  async updateTenant(tenantId: string, updateData: any): Promise<any> {
    const response = await this.client.tenant.PUT('/api/tenants/{id}' as any, {
      params: { path: { id: tenantId } },
      body: updateData
    } as any);

    if (response.error) {
      throw new Error(`Update tenant failed: ${response.error}`);
    }

    return response.data;
  }

  async deleteTenant(tenantId: string): Promise<any> {
    const response = await this.client.tenant.DELETE('/api/tenants/{id}' as any, {
      params: { path: { id: tenantId } }
    } as any);

    if (response.error) {
      throw new Error(`Delete tenant failed: ${response.error}`);
    }

    return response.data;
  }

  // Direct access to the underlying client for any custom operations
  get rawClient() {
    return this.client.tenant;
  }
}

// Type definitions
export interface CreateTenantRequest {
  companyName: string;
  tenantName: string;
  domain: string;
  plan: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  phoneNumber?: string;
  address?: string;
  country: string;
}

export interface TenantData extends CreateTenantRequest {
  id?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}