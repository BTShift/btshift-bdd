import { TypedScriptClient } from '../../../../scripts/lib/typed-script-client';

/**
 * IdentityClient - Production-ready wrapper for identity service operations
 */
export class IdentityClient {
  private client: TypedScriptClient;

  constructor(baseUrl?: string) {
    this.client = new TypedScriptClient();
  }

  async login(credentials: { email: string; password: string }): Promise<any> {
    return await this.client.login(credentials.email, credentials.password);
  }

  async logout(): Promise<void> {
    // Logout logic if needed
    this.client.clearAuthToken();
  }

  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  async register(userData: any): Promise<any> {
    return await this.client.register(userData);
  }

  async inviteUser(userData: any): Promise<any> {
    return await this.client.inviteUser(userData);
  }

  async createUser(userData: any): Promise<any> {
    return await this.client.createUser(userData);
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    return await this.client.resetPassword(token, newPassword);
  }

  async validateToken(token: string): Promise<any> {
    return await this.client.validateToken(token);
  }

  async acceptInvitation(token: string, password: string, confirmPassword: string): Promise<any> {
    return await this.client.acceptInvitation(token, password, confirmPassword);
  }

  // Direct access to the underlying client for any custom operations
  get rawClient() {
    return this.client.identity;
  }
}