import { BaseApiClient } from './base-api-client';

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

export interface TenantResponse {
  id: string;
  companyName: string;
  tenantName: string;
  domain: string;
  plan: string;
  status: 'Pending' | 'Active' | 'Suspended' | 'Cancelled';
  createdAt: string;
  adminUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UpdateTenantStatusRequest {
  status: 'Active' | 'Suspended' | 'Cancelled';
  reason?: string;
}

export class TenantManagementClient extends BaseApiClient {
  
  async createTenant(request: CreateTenantRequest): Promise<TenantResponse> {
    const response = await this.request<TenantResponse>({
      method: 'POST',
      url: '/api/tenants',
      data: request,
    });
    return response.data;
  }

  async getTenant(tenantId: string): Promise<TenantResponse> {
    const response = await this.request<TenantResponse>({
      method: 'GET',
      url: `/api/tenants/${tenantId}`,
    });
    return response.data;
  }

  async getTenants(pageSize = 50, pageNumber = 1): Promise<{
    tenants: TenantResponse[];
    totalCount: number;
    pageSize: number;
    pageNumber: number;
  }> {
    const response = await this.request({
      method: 'GET',
      url: '/api/tenants',
      params: { pageSize, pageNumber },
    });
    return response.data;
  }

  async activateTenant(tenantId: string): Promise<TenantResponse> {
    const response = await this.request<TenantResponse>({
      method: 'POST',
      url: `/api/tenants/${tenantId}/activate`,
    });
    return response.data;
  }

  async updateTenantStatus(tenantId: string, request: UpdateTenantStatusRequest): Promise<TenantResponse> {
    const response = await this.request<TenantResponse>({
      method: 'PUT',
      url: `/api/tenants/${tenantId}/status`,
      data: request,
    });
    return response.data;
  }

  async resendWelcomeEmail(tenantId: string): Promise<void> {
    await this.request({
      method: 'POST',
      url: `/api/tenants/${tenantId}/resend-welcome`,
    });
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/api/tenants/${tenantId}`,
    });
  }

  async getTenantByName(tenantName: string): Promise<TenantResponse | null> {
    try {
      const response = await this.request<TenantResponse>({
        method: 'GET',
        url: `/api/tenants/by-name/${tenantName}`,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async checkTenantExists(tenantName: string): Promise<boolean> {
    const tenant = await this.getTenantByName(tenantName);
    return tenant !== null;
  }
}