# Authorization Model Updates for BDD Tests

This document describes the updates made to the BDD testing framework to support the new 3-layer authorization model.

## Summary of Changes

### New Feature Files

1. **`features/authorization-boundaries.feature`**
   - Tests authorization hierarchy validation
   - Validates SuperAdmin, TenantAdmin, and ClientUser permissions
   - Tests permission boundary enforcement
   - Validates cross-tenant access prevention

2. **`features/operational-context.feature`**
   - Tests operational context header propagation
   - Validates X-Operation-Tenant-Id and X-Operation-Client-Id headers
   - Tests context validation for different user types

### Updated Feature Files

1. **`features/tenant-onboarding.feature`**
   - Updated authentication to use `UserType "SuperAdmin"`
   - Added platform-wide permissions verification
   - Enhanced multi-tenant isolation scenario with operational context headers

2. **`features/client-management.feature`**
   - Updated authentication to use `UserType "TenantAdmin"`
   - Added tenant-scoped permissions verification
   - Enhanced user association scenario with UserType validation

### New Step Definitions

1. **`features/step_definitions/authorization-steps.ts`**
   - Complete set of step definitions for authorization testing
   - Supports UserType-based authentication
   - Operational context management
   - API operation steps with proper authorization validation
   - Comprehensive validation steps for permissions and headers

2. **`features/step_definitions/client-steps.ts`**
   - Step definitions for client management with authorization
   - UserType-aware client operations
   - Client-user association with proper scoping

### Updated Step Definitions

1. **`features/step_definitions/tenant-steps.ts`**
   - Added UserType-based authentication steps
   - Enhanced with authorization validation
   - Fixed database access methods

### Infrastructure Updates

1. **`lib/helpers/api-client.ts`**
   - Added operational context support
   - Enhanced request interceptor to include context headers
   - New authorization methods:
     - `loginWithUserType()` - Authenticate with specific UserType
     - `setOperationalContext()` - Set tenant/client context
     - `clearOperationalContext()` - Clear context
     - `getLastRequestHeaders()` - For header validation
   - Enhanced API methods for authorization testing

2. **`lib/db/database-manager.ts`**
   - Added authorization-related database methods:
     - `createTestUser()` - Create users with specific UserType
     - `getClientById()` - Retrieve client information
     - `getUserClientAssociation()` - Check user-client associations
     - `queryTenantDb()` / `queryIdentityDb()` - Helper query methods
   - Fixed duplicate method implementations

## Authorization Model Support

### UserType Support
- **SuperAdmin**: Platform-wide access, can operate on behalf of any tenant
- **TenantAdmin**: Tenant-scoped access, can operate on behalf of clients within tenant
- **ClientUser**: Client-scoped access, restricted to specific client data

### Operational Context Headers
- **X-Operation-Tenant-Id**: Specifies the tenant context for operations
- **X-Operation-Client-Id**: Specifies the client context for operations

### Authentication Flow
1. User authenticates with UserType and scope (tenant/client)
2. JWT token is issued with appropriate claims
3. Operational context is automatically set based on user type
4. API requests include proper context headers
5. Authorization boundaries are enforced at the service level

### Test Scenarios
- Authorization hierarchy validation
- Permission boundary enforcement
- Operational context propagation
- Cross-tenant/client access prevention
- Header validation for proper context passing

## Usage Examples

### Basic Authentication
```gherkin
Given I am logged in as UserType "SuperAdmin"
Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
Given I am logged in as UserType "ClientUser" for client "client-1" in tenant "tenant-a"
```

### Operational Context Testing
```gherkin
Given I select operational context tenant "tenant-a"
Then requests should include "X-Operation-Tenant-Id: tenant-a"
```

### Authorization Validation
```gherkin
When I attempt to access tenant "tenant-b" data
Then I should receive a 403 Forbidden response
And no tenant-b data should be returned
```

## Dependencies

These tests are designed to work with the updated backend services that implement:
- shift-authorization-infrastructure
- 3-layer authorization model (SuperAdmin → TenantAdmin → ClientUser)
- Operational context support in API Gateway
- JWT tokens with UserType and scope claims

## Future Enhancements

1. **Role-Based Access Control**: Support for fine-grained roles within UserTypes
2. **Resource-Level Permissions**: Test specific resource access permissions
3. **Audit Trail Testing**: Validate authorization events are logged
4. **Session Management**: Test authorization token lifecycle and refresh
5. **Integration with Frontend**: Test authorization flow from UI components