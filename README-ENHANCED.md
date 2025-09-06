# BTShift BDD Testing Suite - Enhanced Edition

A comprehensive Behavior-Driven Development (BDD) testing suite for the BTShift multi-tenant SaaS platform, implementing an **API-first testing approach** with clear separation between API and UI tests.

## 🚀 Key Enhancements

### ✅ What's New in Version 2.0

- **API-First Testing**: Comprehensive API coverage before UI testing
- **Feature-Based Organization**: Tests organized by business features, not technical layers
- **Happy Path vs Edge Cases**: Clear separation for better test planning and execution
- **Typed API Clients**: Generated TypeScript clients with full type safety
- **Parallel Test Execution**: Optimized for speed with separate API and UI test runners
- **Comprehensive Reporting**: Separate HTML reports for API, UI, and integration tests

## 🏗️ Architecture Overview

```
API Tests (Fast & Comprehensive) → UI Tests (Critical Paths) → Integration Tests (E2E Workflows)
```

### Why API-First?

1. **Speed**: API tests run 10x faster than UI tests
2. **Coverage**: Test all edge cases and business logic at API level
3. **Reliability**: Less flaky than UI tests, better for CI/CD
4. **Early Feedback**: Catch issues before UI implementation
5. **Confidence**: Build UI tests on solid API foundation

## 📁 Enhanced Folder Structure

```
btshift-bdd/
├── tests/
│   ├── api/                          # 🚀 API-first testing
│   │   ├── features/                 # Feature-based organization
│   │   │   ├── tenant-management/
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── happy-path/          # ✅ Success scenarios
│   │   │   │   │   │   ├── tenant-creation.api.spec.ts
│   │   │   │   │   │   └── tenant-activation.api.spec.ts
│   │   │   │   │   └── edge-cases/          # ❌ Error scenarios
│   │   │   │   │       ├── duplicate-tenant.api.spec.ts
│   │   │   │   │       └── invalid-data.api.spec.ts
│   │   │   │   └── lifecycle/
│   │   │   ├── client-management/
│   │   │   │   ├── crud-operations/
│   │   │   │   └── user-associations/
│   │   │   └── identity/
│   │   │       ├── authentication/
│   │   │       └── authorization/
│   │   └── support/
│   │       ├── clients/              # 🎯 Typed API clients
│   │       ├── fixtures/             # Test data
│   │       └── helpers/              # Test utilities
│   ├── ui/                           # 🖥️ UI testing (critical paths)
│   │   ├── features/                 # Same feature organization
│   │   └── support/
│   │       ├── pages/                # Page objects
│   │       └── components/
│   ├── integration/                  # 🔄 End-to-end workflows
│   └── shared/                       # Common utilities
├── lib/
│   └── clients/                      # Generated OpenAPI clients
└── scripts/
    └── generate-clients.ts           # Client generation
```

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Access to BTShift API Gateway
- SuperAdmin credentials in `.env` file

### 1. Installation & Setup

```bash
# Install dependencies and generate API clients
npm run setup

# Or step by step:
npm install
npm run playwright:install
npm run generate:clients
```

### 2. Environment Configuration

Create `.env` file (copy from `.env.example`):

```env
# API Configuration
API_GATEWAY_URL=https://your-api-gateway.railway.app
FRONTEND_URL=http://localhost:3000

# SuperAdmin Credentials for Testing
SUPER_ADMIN_EMAIL=superadmin@btshift.com
SUPER_ADMIN_PASSWORD=YourSecurePassword

# Database (for cleanup operations)
DB_CONNECTION_STRING=postgresql://user:pass@host:port/db
```

## 🧪 Running Tests

### API Tests (Run These First!)

```bash
# All API tests
npm run test:api

# Happy path tests only
npm run test:api:happy

# Edge cases only  
npm run test:api:edge

# Specific feature
npx playwright test tests/api/features/tenant-management

# Debug mode
npm run test:debug:api
```

### UI Tests (After API Confidence)

```bash
# All UI tests
npm run test:ui

# Happy path only
npm run test:ui:happy

# Edge cases only
npm run test:ui:edge
```

### Integration Tests

```bash
# End-to-end workflows
npm run test:integration

# Everything together
npm run test:all
```

### Test Reports

```bash
# View API test report
npm run test:report:api

# View UI test report
npm run test:report:ui

# View general report
npm run test:report
```

## 📊 Test Organization Strategy

### Happy Path Tests ✅

- **Purpose**: Validate core functionality works as expected
- **When to run**: Every commit, PR validation
- **Coverage**: Primary user journeys and business logic
- **Examples**:
  - Successful tenant creation and activation
  - Valid user authentication
  - Standard CRUD operations

### Edge Case Tests ❌

- **Purpose**: Validate error handling and boundary conditions
- **When to run**: Before releases, regression testing
- **Coverage**: Error scenarios, validation rules, security boundaries
- **Examples**:
  - Duplicate tenant prevention
  - Invalid authentication attempts
  - Data validation failures

### Feature Categories 🏷️

1. **Tenant Management**
   - Onboarding (creation, activation)
   - Lifecycle (status changes, suspension)
   
2. **Client Management**
   - CRUD operations
   - User associations
   
3. **Identity & Authentication**
   - Login/logout flows
   - Token management
   - Authorization rules

## 🎯 API Client Architecture

### Typed Clients

All API interactions use strongly-typed TypeScript clients:

```typescript
import { TenantManagementClient, CreateTenantRequest } from '../support/clients';

const client = new TenantManagementClient();
const tenantData: CreateTenantRequest = {
  companyName: 'Test Company',
  tenantName: 'test-tenant',
  // ... fully typed
};

const result = await client.createTenant(tenantData);
// result is fully typed TenantResponse
```

### Benefits

- **IntelliSense**: Full IDE support with autocomplete
- **Compile-time Validation**: Catch API changes early
- **Documentation**: Self-documenting through types
- **Refactoring**: Safe renames and changes

## 🔧 Development Workflow

### 1. API-First Development

```bash
# 1. Write API tests first
npm run test:api:happy

# 2. Implement API functionality
# 3. Verify with edge cases
npm run test:api:edge

# 4. Build UI tests for critical paths
npm run test:ui:happy

# 5. Full validation
npm run test:all
```

### 2. Adding New Features

```bash
# 1. Create feature folder structure
mkdir -p tests/api/features/new-feature/{happy-path,edge-cases}

# 2. Add API tests
# tests/api/features/new-feature/happy-path/core-functionality.api.spec.ts

# 3. Add UI tests if needed
# tests/ui/features/new-feature/happy-path/user-workflow.ui.spec.ts

# 4. Update documentation
```

### 3. Debugging Failed Tests

```bash
# Debug specific test with browser
npm run test:debug:api -- --grep "tenant creation"

# Keep data after test failure
npm run test:keep-data

# Check database state
npm run cleanup:check
```

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: BDD Tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:api
      - uses: actions/upload-artifact@v3
        with:
          name: api-test-results
          path: test-results/api/

  ui-tests:
    needs: api-tests  # Run UI tests only after API tests pass
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ui
```

## 🚨 Missing Components (To Be Implemented)

Since the npm packages aren't available yet, you need to:

1. **Generate OpenAPI Clients**:
   ```bash
   npm run generate:clients
   ```

2. **Set up Package Publishing** in each service repository:
   ```bash
   # Add to service CI/CD
   npm run generate:typescript-client
   npm publish @btshift/service-name-client
   ```

3. **Update Client Generation** when services change:
   ```bash
   # Run after API changes
   npm run generate:clients
   ```

## 🤝 Contributing

1. **API Tests First**: Always write API tests before UI tests
2. **Follow Structure**: Use the feature-based folder organization
3. **Happy Path + Edge Cases**: Cover both scenarios for each feature
4. **Type Safety**: Use the typed clients for all API interactions
5. **Documentation**: Update this README when adding new features

## 📚 Resources

- [Playwright API Testing Guide](https://playwright.dev/docs/api-testing)
- [TypeScript API Clients Best Practices](https://swagger.io/docs/specification/about/)
- [BDD Testing Patterns](https://cucumber.io/docs/bdd/)

---

**Happy Testing! 🎉**

*Built with ❤️ by the BTShift Team*