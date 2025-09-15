/**
 * Unified API types using OpenAPI-generated schemas
 * This module provides type-safe access to all API types from the generated packages
 */

import type { components as TenantComponents } from '@btshift/tenant-management-types';
// import type { components as IdentityComponents } from '@btshift/identity-types';
import type { components as ClientComponents } from '@btshift/client-management-types';

// Re-export tenant types
export type TenantInfo = TenantComponents['schemas']['tenantTenantInfo'];
export type TenantCreateRequest = TenantComponents['schemas']['tenantCreateTenantRequest'];
export type TenantCreateResponse = TenantComponents['schemas']['tenantCreateTenantResponse'];
export type TenantListResponse = TenantComponents['schemas']['tenantListTenantsResponse'];
export type TenantActivateResponse = TenantComponents['schemas']['tenantActivateTenantResponse'];
export type TenantUpdateRequest = TenantComponents['schemas']['TenantServiceUpdateTenantBody'];

// Re-export identity types - using fallback types since exact schema names may vary
export type LoginRequest = { email: string; password: string; portalType?: string; };

export type LoginResponse = {
  success: boolean;
  tokenInfo?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  };
  userInfo?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    userType?: string;
    tenantId?: string;
    clientId?: string;
  };
};

export type RegisterRequest = { email: string; password: string; userType?: string; };

export type RegisterResponse = { success: boolean; userId?: string; };

// Re-export client types - using actual schema names from the package
export type ClientInfo = ClientComponents['schemas']['clientmanagementClientInfo'];

export type ClientCreateRequest = {
  companyName: string;
  taxId: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
};

export type ClientCreateResponse = {
  success: boolean;
  clientId?: string;
  client?: ClientInfo;
};

export type ClientListResponse = {
  clients?: ClientInfo[];
  totalCount?: number;
};

// Test-specific types (still needed for test context)
export type UserType = 'SuperAdmin' | 'TenantAdmin' | 'ClientUser';

export interface TestUserContext {
  userType: UserType;
  email: string;
  tenantId: string | null;
  clientId: string | null;
}

export interface TestOperationalContext {
  tenantId?: string;
  clientId?: string;
}

// Type guards for runtime validation
export function isTenantInfo(obj: unknown): obj is TenantInfo {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

export function isLoginResponse(obj: unknown): obj is LoginResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  // Handle different possible response structures
  return 'success' in obj || 'tokenInfo' in obj || 'accessToken' in obj;
}

export function isClientInfo(obj: unknown): obj is ClientInfo {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// Generic API response wrapper (for consistent error handling)
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Error types
export interface ApiValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  status: number;
  message?: string;
  errors?: ApiValidationError[];
}

export class TestValidationError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = 'TestValidationError';
  }
}

export class TestSetupError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'TestSetupError';
  }
}