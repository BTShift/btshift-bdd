# Multi-User Authentication Migration Guide

## Overview
This guide explains how to migrate existing BDD tests to use the new Multi-User Authentication Manager, which properly tests multi-tenant isolation and role-based permissions.

## Why This Change?
- **Current Issue**: All tests use SuperAdmin, which bypasses tenant isolation
- **Solution**: Use appropriate user contexts (SuperAdmin for platform ops, TenantAdmin for tenant ops)
- **Benefits**: Catches authorization bugs, validates permissions, ensures tenant isolation

## Configuration

### 1. Environment Setup
Copy `.env.multiuser` to `.env` and update passwords:
```bash
cp .env.multiuser .env
# Edit .env to add actual passwords
```

### 2. Available User Contexts

| Context | User | Use For |
|---------|------|---------|
| SuperAdmin | superadmin@shift.ma | Platform operations, tenant CRUD, cross-tenant queries |
| TenantAdmin | anass.yatim+nstech2@gmail.com | Client management, user management, business operations |

## Migration Steps

### Step 1: Identify Test Context
Determine which user context your test needs:

```typescript
// Platform operations → SuperAdmin
- Tenant creation/deletion
- Subscription management
- Platform settings
- Cross-tenant operations

// Tenant operations → TenantAdmin
- Client CRUD
- User management within tenant
- Invoice/accounting operations
- Tenant-specific settings
```

### Step 2: Update Test Setup

#### Old Code (Using Global Auth):
```typescript
import { setupApiTest, teardownApiTest, TestContext } from '../support/helpers/api-test-base';

describe('My Test Suite', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTest(); // Uses SuperAdmin for everything
  });
```

#### New Code (Using Context-Aware Auth):

**Option A: Explicit Context**
```typescript
import { setupApiTestWithContext, teardownApiTest, TestContext } from '../support/helpers/api-test-base';

describe('Client Management Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // Explicitly specify TenantAdmin for tenant operations
    ctx = await setupApiTestWithContext('TenantAdmin');
  });
```

**Option B: Auto Context**
```typescript
import { setupApiTestAuto, teardownApiTest, TestContext } from '../support/helpers/api-test-base';

describe('Client Management Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // System automatically determines context based on test file
    ctx = await setupApiTestAuto(__filename);
  });
```

### Step 3: Update Test Expectations

Tests may need updated expectations when using TenantAdmin:

```typescript
// Old test (with SuperAdmin)
test('should list all clients', async () => {
  const response = await ctx.client.clientManagement('/api/clients', 'get');
  const clients = ctx.getData(response);
  
  // SuperAdmin sees ALL clients across ALL tenants
  expect(clients.length).toBeGreaterThan(100);
});

// New test (with TenantAdmin)
test('should list tenant clients only', async () => {
  const response = await ctx.client.clientManagement('/api/clients', 'get');
  const clients = ctx.getData(response);
  
  // TenantAdmin only sees their tenant's clients
  expect(clients.every(c => c.tenantId === 'aef1fb0d-84fb-412d-97c8-06f7eb7f3846')).toBe(true);
});
```

## Test Categories & Contexts

### Use SuperAdmin for:
- `tenant-management/onboarding/*.spec.ts`
- `platform/settings/*.spec.ts`
- `subscription-management/*.spec.ts`
- `cross-tenant-reports/*.spec.ts`

### Use TenantAdmin for:
- `client-management/*.spec.ts`
- `user-management/*.spec.ts`
- `accounting/*.spec.ts`
- `invoice-management/*.spec.ts`
- `tenant-settings/*.spec.ts`

## Examples

### Example 1: Tenant Creation (SuperAdmin)
```typescript
describe('Tenant Creation', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTestWithContext('SuperAdmin');
  });

  test('should create new tenant', async () => {
    const tenantData = TestDataFactory.tenant();
    const response = await ctx.client.tenant('/api/tenants', 'post', {
      body: tenantData
    });
    
    // Only SuperAdmin can create tenants
    expect(response.status).toBe(201);
  });
});
```

### Example 2: Client Management (TenantAdmin)
```typescript
describe('Client Management', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupApiTestWithContext('TenantAdmin');
  });

  test('should create client in tenant', async () => {
    const clientData = TestDataFactory.client();
    const response = await ctx.client.clientManagement('/api/clients', 'post', {
      body: clientData
    });
    
    const client = ctx.getData(response);
    // Client automatically associated with TenantAdmin's tenant
    expect(client.tenantId).toBe('aef1fb0d-84fb-412d-97c8-06f7eb7f3846');
  });
});
```

### Example 3: Permission Testing
```typescript
describe('Permission Boundaries', () => {
  test('should enforce tenant isolation', async () => {
    const tenantCtx = await setupApiTestWithContext('TenantAdmin');
    
    // TenantAdmin should NOT be able to:
    // 1. Create tenants
    await expect(
      tenantCtx.client.tenant('/api/tenants', 'post', { body: {} })
    ).rejects.toHaveProperty('response.status', 403);
    
    // 2. Access other tenant's data
    const otherTenantId = 'different-tenant-id';
    await expect(
      tenantCtx.client.tenant(`/api/tenants/${otherTenantId}/clients`, 'get')
    ).rejects.toHaveProperty('response.status', 403);
    
    await teardownApiTest(tenantCtx);
  });
});
```

## Running Tests

### Run with multi-user auth:
```bash
# Copy and configure environment
cp .env.multiuser .env

# Run tests
npm test

# Run specific test file
npm test -- tests/api/features/client-management
```

### Debug authentication:
```bash
# Enable auth debugging
AUTH_DEBUG=true npm test
```

## Troubleshooting

### Issue: "401 Unauthorized"
**Solution**: Check that passwords in `.env` are correct

### Issue: "403 Forbidden" 
**Solution**: You're using the wrong context. TenantAdmin can't do platform operations.

### Issue: "No data returned"
**Solution**: TenantAdmin only sees their tenant's data. Check you're querying the right tenant.

### Issue: Tests passing with SuperAdmin but failing with TenantAdmin
**Solution**: This is good! It means you found a permission issue. Update the test to use the correct context.

## Best Practices

1. **Always use the most restrictive context** that should work for the operation
2. **Test permission boundaries** - verify TenantAdmin can't do platform operations
3. **Validate tenant isolation** - ensure tenants can't see each other's data
4. **Use explicit contexts** for clarity in critical tests
5. **Document context requirements** in test comments

## Next Steps

1. Start with failing tests first
2. Migrate tests incrementally 
3. Run both old and new tests during migration
4. Remove old Global Auth Manager once migration complete

## Support

For issues or questions about the migration, check:
- This migration guide
- Example test: `tests/api/features/multi-user-example.spec.ts`
- Multi-user auth manager: `tests/api/support/auth/multi-user-auth-manager.ts`