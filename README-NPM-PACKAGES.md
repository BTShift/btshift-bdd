# Using BTShift NPM Packages for Testing

## ✅ Available NPM Packages

The following typed npm packages are published and available from GitHub Packages:

- **`@btshift/identity-types`** - TypeScript types and client for Identity Service
- **`@btshift/tenant-management-types`** - TypeScript types and client for Tenant Management
- **`@btshift/client-management-types`** - TypeScript types and client for Client Management

## 🚀 Key Benefits

1. **Full Type Safety**: Auto-generated from OpenAPI specs, ensuring type correctness
2. **IntelliSense Support**: Complete IDE autocomplete for all API endpoints
3. **Automatic Updates**: Packages are automatically updated when services change
4. **Version Tracking**: Each package has versioning aligned with service deployments

## 📦 Installation

Packages are already installed in this project. To install in a new project:

```bash
# Configure npm to use GitHub Packages
echo "@btshift:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc

# Install packages
npm install @btshift/identity-types @btshift/tenant-management-types @btshift/client-management-types
```

## 🎯 Usage Examples

### Basic Setup

```typescript
import { TypedApiClient } from './tests/api/support/clients/typed-api-client';

const client = new TypedApiClient();

// Login
await client.login('user@example.com', 'password');

// Now all API calls are typed and authenticated
```

### Identity Service API

```typescript
// Login - fully typed request and response
const loginResponse = await client.identity('/api/authentication/login', 'post', {
  body: {
    email: 'user@example.com',
    password: 'password123'
  }
});

// Get current user
const user = await client.identity('/api/authentication/me', 'get');

// Refresh token
const refreshed = await client.identity('/api/authentication/refresh', 'post', {
  body: { refreshToken: 'your-refresh-token' }
});

// Change password
await client.identity('/api/authentication/change-password', 'post', {
  body: {
    currentPassword: 'old-password',
    newPassword: 'new-password',
    confirmPassword: 'new-password'
  }
});
```

### Tenant Management API

```typescript
// Create tenant - all fields are typed
const tenant = await client.tenant('/api/tenants', 'post', {
  body: {
    companyName: 'Test Company',
    tenantName: 'test-tenant',
    domain: 'test-tenant',
    plan: 'Professional',
    adminEmail: 'admin@test.com',
    adminFirstName: 'Admin',
    adminLastName: 'User',
    country: 'Morocco'
  }
});

// Get tenant by ID
const retrievedTenant = await client.tenant(`/api/tenants/${tenantId}`, 'get');

// List tenants with pagination
const tenants = await client.tenant('/api/tenants', 'get', {
  params: {
    query: {
      pageSize: 10,
      pageNumber: 1
    }
  }
});

// Activate tenant
const activated = await client.tenant(`/api/tenants/${tenantId}/activate`, 'post');

// Delete tenant
await client.tenant(`/api/tenants/${tenantId}`, 'delete');
```

### Client Management API

```typescript
// Create client
const client = await client.clientManagement('/api/clients', 'post', {
  body: {
    name: 'Client Name',
    email: 'client@example.com',
    phone: '+212612345678',
    address: '123 Street',
    taxId: 'TAX123',
    industry: 'Technology',
    notes: 'Important client'
  }
});

// Update client
const updated = await client.clientManagement(`/api/clients/${clientId}`, 'put', {
  body: {
    name: 'Updated Name',
    status: 'Active'
  }
});

// Create client group
const group = await client.clientManagement('/api/client-groups', 'post', {
  body: {
    name: 'VIP Clients',
    description: 'High-value clients',
    clientIds: [clientId1, clientId2]
  }
});

// User-client association
await client.clientManagement('/api/user-client-associations', 'post', {
  body: {
    userId: 'user-id',
    clientId: 'client-id',
    role: 'Editor'
  }
});
```

## 🔍 Type Safety Benefits

### IntelliSense and Autocomplete

When using the typed clients, you get:
- Autocomplete for all available endpoints
- Parameter hints for request bodies
- Type checking for response data
- Compile-time validation of API calls

### Error Handling

```typescript
try {
  const response = await client.identity('/api/authentication/login', 'post', {
    body: { email, password }
  });
  // response is typed
} catch (error) {
  // error.response is also typed with error schema
  console.error('Login failed:', error.response?.data?.message);
}
```

## 📊 Test Organization with NPM Packages

### Happy Path Tests
```typescript
describe('Tenant Creation - Happy Path', () => {
  test('should create tenant with typed client', async () => {
    const response = await client.tenant('/api/tenants', 'post', {
      body: validTenantData // TypeScript validates this matches schema
    });
    
    expect(response.status).toBe('Pending');
  });
});
```

### Edge Case Tests
```typescript
describe('Tenant Creation - Edge Cases', () => {
  test('should handle duplicate tenant error', async () => {
    // First tenant
    await client.tenant('/api/tenants', 'post', { body: tenantData });
    
    // Duplicate attempt - error is typed
    await expect(
      client.tenant('/api/tenants', 'post', { body: tenantData })
    ).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          message: expect.stringContaining('already exists')
        }
      }
    });
  });
});
```

## 🔄 Package Versions

Current versions (as of last update):
- `@btshift/identity-types`: 6.1.12
- `@btshift/tenant-management-types`: 2.0.0
- `@btshift/client-management-types`: 3.0.5

Packages are automatically updated when services are deployed.

## 🛠️ Troubleshooting

### Authentication Issues
If you get 401 errors, ensure:
1. Token is set: `client.setAuthToken(token)`
2. Token is valid and not expired
3. User has required permissions

### Type Mismatches
If TypeScript shows type errors:
1. Update to latest package versions
2. Check service OpenAPI spec for changes
3. Regenerate types if needed

### Package Installation
If packages won't install:
1. Verify GitHub token has `read:packages` permission
2. Check `.npmrc` configuration
3. Ensure you're in the BTShift organization

## 📚 Resources

- [Service API Documentation](https://your-api-gateway.railway.app/swagger)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Pro Tip**: Use the typed clients for all API interactions to catch errors at compile time rather than runtime! 🎯