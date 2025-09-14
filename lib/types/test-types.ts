// Test-specific type definitions for authorization model

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

export interface ApiErrorResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
      errors?: any[];
    };
  };
}

export interface TestUser {
  userType: UserType;
  email: string;
  tenantId: string | null;
  clientIds: string[] | null;
}

export interface TestClient {
  id: string;
  companyName: string;
  taxId: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tenantId: string;
}

export interface TestTenant {
  id: string;
  name: string;
  companyName: string;
  domain: string;
  status: 'Pending' | 'Active' | 'Suspended';
  databaseName: string;
}

export interface TestApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  tenantId?: string;
  clientId?: string;
  tenants?: TestTenant[];
  clients?: TestClient[];
}

export class TestValidationError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'TestValidationError';
  }
}

export class TestSetupError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TestSetupError';
  }
}