import { BaseApiClient } from './base-api-client';

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  industry?: string;
  notes?: string;
}

export interface ClientResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  industry?: string;
  notes?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateClientRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  industry?: string;
  notes?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
}

export interface CreateClientGroupRequest {
  name: string;
  description?: string;
  clientIds: string[];
}

export interface ClientGroupResponse {
  id: string;
  name: string;
  description?: string;
  clients: ClientResponse[];
  createdAt: string;
}

export interface UserClientAssociationRequest {
  userId: string;
  clientId: string;
  role: 'Viewer' | 'Editor' | 'Admin';
}

export class ClientManagementClient extends BaseApiClient {
  
  async createClient(request: CreateClientRequest): Promise<ClientResponse> {
    const response = await this.request<ClientResponse>({
      method: 'POST',
      url: '/api/clients',
      data: request,
    });
    return response.data;
  }

  async getClient(clientId: string): Promise<ClientResponse> {
    const response = await this.request<ClientResponse>({
      method: 'GET',
      url: `/api/clients/${clientId}`,
    });
    return response.data;
  }

  async getClients(pageSize = 50, pageNumber = 1): Promise<{
    clients: ClientResponse[];
    totalCount: number;
    pageSize: number;
    pageNumber: number;
  }> {
    const response = await this.request({
      method: 'GET',
      url: '/api/clients',
      params: { pageSize, pageNumber },
    });
    return response.data;
  }

  async updateClient(clientId: string, request: UpdateClientRequest): Promise<ClientResponse> {
    const response = await this.request<ClientResponse>({
      method: 'PUT',
      url: `/api/clients/${clientId}`,
      data: request,
    });
    return response.data;
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/api/clients/${clientId}`,
    });
  }

  async createClientGroup(request: CreateClientGroupRequest): Promise<ClientGroupResponse> {
    const response = await this.request<ClientGroupResponse>({
      method: 'POST',
      url: '/api/client-groups',
      data: request,
    });
    return response.data;
  }

  async getClientGroup(groupId: string): Promise<ClientGroupResponse> {
    const response = await this.request<ClientGroupResponse>({
      method: 'GET',
      url: `/api/client-groups/${groupId}`,
    });
    return response.data;
  }

  async associateUserWithClient(request: UserClientAssociationRequest): Promise<void> {
    await this.request({
      method: 'POST',
      url: '/api/user-client-associations',
      data: request,
    });
  }

  async getUserClientAssociations(userId: string): Promise<{
    userId: string;
    associations: Array<{
      clientId: string;
      client: ClientResponse;
      role: string;
    }>;
  }> {
    const response = await this.request({
      method: 'GET',
      url: `/api/user-client-associations/user/${userId}`,
    });
    return response.data;
  }

  async removeUserClientAssociation(userId: string, clientId: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      url: `/api/user-client-associations/user/${userId}/client/${clientId}`,
    });
  }
}