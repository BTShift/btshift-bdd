import { BaseApiClient } from './base-api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  tokenInfo?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export class IdentityClient extends BaseApiClient {
  
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>({
      method: 'POST',
      url: '/api/authentication/login',
      data: request,
    });

    // Auto-set token if login is successful
    if (response.data.success && response.data.tokenInfo) {
      this.setAuthToken(response.data.tokenInfo.accessToken);
    }

    return response.data;
  }

  async register(request: RegisterRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/api/authentication/register',
      data: request,
    });
    return response.data;
  }

  async resetPassword(request: ResetPasswordRequest): Promise<any> {
    const response = await this.request({
      method: 'POST',
      url: '/api/authentication/reset-password',
      data: request,
    });
    return response.data;
  }

  async validateToken(token: string): Promise<any> {
    const response = await this.request({
      method: 'GET',
      url: `/api/authentication/validate-token?token=${token}`,
    });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>({
      method: 'POST',
      url: '/api/authentication/refresh-token',
      data: { refreshToken },
    });

    // Auto-set new token if refresh is successful
    if (response.data.success && response.data.tokenInfo) {
      this.setAuthToken(response.data.tokenInfo.accessToken);
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request({
        method: 'POST',
        url: '/api/authentication/logout',
      });
    } finally {
      // Always clear token even if logout fails
      this.clearAuthToken();
    }
  }
}