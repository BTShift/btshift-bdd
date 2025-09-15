/**
 * BaseApiClient - Base class for API clients
 * This is a compatibility layer for the old client structure
 */
export class BaseApiClient {
  protected baseUrl: string;
  protected authToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.API_GATEWAY_URL || 'http://localhost:5000';
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: any;
  status: number;
  headers?: Record<string, string>;
}