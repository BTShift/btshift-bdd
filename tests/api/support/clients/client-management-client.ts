import { TypedScriptClient } from '../../../../scripts/lib/typed-script-client';

/**
 * ClientManagementClient - Production-ready wrapper for client management operations
 */
export class ClientManagementClient {
  private client: TypedScriptClient;

  constructor(baseUrl?: string) {
    this.client = new TypedScriptClient();
  }

  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  async createClient(clientData: any): Promise<any> {
    return await this.client.createClient(clientData);
  }

  async getClient(clientId: string): Promise<any> {
    return await this.client.getClient(clientId);
  }

  async getClients(filters?: any): Promise<any> {
    return await this.client.getClients(filters);
  }

  async updateClient(clientId: string, updateData: any): Promise<any> {
    return await this.client.updateClient(clientId, updateData);
  }

  async deleteClient(clientId: string): Promise<any> {
    const response = await this.client.clientManagement.DELETE('/api/clients/{id}' as any, {
      params: { path: { id: clientId } }
    } as any);

    if (response.error) {
      throw new Error(`Delete client failed: ${response.error}`);
    }

    return response.data;
  }

  async createClientGroup(groupData: any): Promise<any> {
    return await this.client.createClientGroup(groupData);
  }

  async getClientGroup(groupId: string): Promise<any> {
    return await this.client.getClientGroup(groupId);
  }

  async associateUserWithClient(clientId: string, userEmail: string): Promise<any> {
    return await this.client.associateUserWithClient(clientId, userEmail);
  }

  // Direct access to the underlying client for any custom operations
  get rawClient() {
    return this.client.clientManagement;
  }
}