// Export all client classes
export { BaseApiClient } from './base-api-client';
export { IdentityClient } from './identity-client';
export { TenantManagementClient } from './tenant-management-client';
export { ClientManagementClient } from './client-management-client';
export { TypedApiClient } from './typed-api-client';

// Export types
export type { ApiResponse } from './base-api-client';
export type { CreateTenantRequest, TenantData } from './tenant-management-client';

// Re-export everything from individual clients for backward compatibility
export type * from './identity-client';
export type * from './tenant-management-client';
export type * from './client-management-client';