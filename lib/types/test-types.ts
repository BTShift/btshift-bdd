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

export interface ApiValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  response?: {
    status: number;
    data?: {
      message?: string;
      errors?: ApiValidationError[];
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

// Strict API response types
export interface LoginResponse {
  success: boolean;
  tokenInfo?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  } | undefined;
  userInfo?: {
    userId: string;
    email: string;
    userType: UserType;
    tenantId?: string;
    clientIds?: string[];
  } | undefined;
  message?: string;
}

export interface TenantCreateRequest {
  name: string;
  companyName: string;
  domain: string;
  adminEmail: string;
  adminPassword?: string;  // Made optional for certain test scenarios
  plan?: string;
  adminFirstName?: string;
  adminLastName?: string;
  phone?: string;
  address?: string;
  country?: string;
}

export interface TenantCreateResponse {
  success: boolean;
  data?: TestTenant;
  message?: string;
  tenantId?: string;  // Some responses include tenantId directly
}

export interface ClientCreateRequest {
  companyName: string;
  taxId: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ClientCreateResponse {
  success: boolean;
  data?: TestClient;
  message?: string;
}

export interface UserCreateRequest {
  email: string;
  password: string;
  userType: UserType;
  tenantId?: string;
  clientIds?: string[];
}

export interface UserCreateResponse {
  success: boolean;
  data?: {
    userId: string;
    email: string;
    userType: UserType;
  };
  message?: string;
}

export interface TestApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  tenantId?: string;
  clientId?: string;
}

export interface TenantsListResponse extends TestApiResponse<TestTenant[]> {
  tenants?: TestTenant[];
}

export interface ClientsListResponse extends TestApiResponse<TestClient[]> {
  clients?: TestClient[];
}

// Type guards for runtime validation
export function isLoginResponse(obj: unknown): obj is LoginResponse {
  return typeof obj === 'object' && obj !== null &&
         'success' in obj && typeof (obj as LoginResponse).success === 'boolean';
}

export function isTenantCreateResponse(obj: unknown): obj is TenantCreateResponse {
  return typeof obj === 'object' && obj !== null &&
         'success' in obj && typeof (obj as TenantCreateResponse).success === 'boolean';
}

export function isClientCreateResponse(obj: unknown): obj is ClientCreateResponse {
  return typeof obj === 'object' && obj !== null &&
         'success' in obj && typeof (obj as ClientCreateResponse).success === 'boolean';
}

export function isUserCreateResponse(obj: unknown): obj is UserCreateResponse {
  return typeof obj === 'object' && obj !== null &&
         'success' in obj && typeof (obj as UserCreateResponse).success === 'boolean';
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

// Schema validation utility
export class SchemaValidator {
  static validateLoginResponse(data: unknown): LoginResponse {
    if (!isLoginResponse(data)) {
      throw new TestValidationError('Invalid login response structure', { data });
    }
    return data;
  }

  static validateTenantCreateResponse(data: unknown): TenantCreateResponse {
    if (!isTenantCreateResponse(data)) {
      throw new TestValidationError('Invalid tenant create response structure', { data });
    }
    return data;
  }

  static validateClientCreateResponse(data: unknown): ClientCreateResponse {
    if (!isClientCreateResponse(data)) {
      throw new TestValidationError('Invalid client create response structure', { data });
    }
    return data;
  }

  static validateUserCreateResponse(data: unknown): UserCreateResponse {
    if (!isUserCreateResponse(data)) {
      throw new TestValidationError('Invalid user create response structure', { data });
    }
    return data;
  }
}