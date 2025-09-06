# BDD Project Enhancement Plan

## Proposed Folder Structure

```
btshift-bdd/
├── tests/
│   ├── api/                           # API-first testing
│   │   ├── features/                  # Feature-based organization
│   │   │   ├── tenant-management/
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── happy-path/
│   │   │   │   │   │   ├── tenant-creation.api.spec.ts
│   │   │   │   │   │   └── tenant-activation.api.spec.ts
│   │   │   │   │   └── edge-cases/
│   │   │   │   │       ├── duplicate-tenant.api.spec.ts
│   │   │   │   │       └── invalid-data.api.spec.ts
│   │   │   │   └── lifecycle/
│   │   │   │       ├── happy-path/
│   │   │   │       └── edge-cases/
│   │   │   ├── client-management/
│   │   │   │   ├── crud-operations/
│   │   │   │   │   ├── happy-path/
│   │   │   │   │   └── edge-cases/
│   │   │   │   └── user-associations/
│   │   │   └── identity/
│   │   │       ├── authentication/
│   │   │       │   ├── happy-path/
│   │   │       │   └── edge-cases/
│   │   │       └── authorization/
│   │   └── support/
│   │       ├── clients/               # Generated/typed API clients
│   │       ├── fixtures/              # Test data
│   │       └── helpers/               # API test utilities
│   ├── ui/                            # UI testing (after API confidence)
│   │   ├── features/                  # Same feature organization
│   │   │   ├── tenant-management/
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── happy-path/
│   │   │   │   │   └── edge-cases/
│   │   │   └── client-management/
│   │   └── support/
│   │       ├── pages/                 # Page objects
│   │       ├── components/            # Component helpers
│   │       └── fixtures/              # UI test data
│   ├── integration/                   # End-to-end integration tests
│   │   └── workflows/                 # Complete business workflows
│   └── shared/
│       ├── config/
│       ├── database/
│       └── utilities/
├── cucumber-features/                 # BDD specifications (if keeping Cucumber)
│   ├── api/
│   │   └── features/
│   └── ui/
│       └── features/
└── lib/                              # Shared libraries and clients
    ├── clients/                      # Generated OpenAPI clients
    │   ├── tenant-management/
    │   ├── client-management/
    │   ├── identity/
    │   └── api-gateway/
    ├── database/
    ├── fixtures/
    └── utilities/
```

## Implementation Steps

### 1. Create OpenAPI Client Generation Pipeline
Since npm packages aren't available yet, we need to:
- Generate TypeScript clients from OpenAPI specs
- Package them as scoped npm packages (@btshift/*)
- Set up CI/CD to auto-publish on service updates

### 2. Restructure Tests by Feature + Path Type
- Move from service-centric to feature-centric organization
- Separate happy path from edge cases for better test planning
- API tests first, then UI tests that validate the same features

### 3. Enhanced Test Categories
- **API Tests**: Direct service calls, fast execution, comprehensive coverage
- **UI Tests**: User workflows, slower execution, critical paths only
- **Integration Tests**: Multi-service workflows, realistic scenarios

### 4. Typed Client Integration
- Replace manual axios calls with generated clients
- Benefit from TypeScript types and IDE support
- Automatic schema validation

### 5. Test Data Strategy
- Feature-specific fixtures
- Database seeding strategies
- Tenant isolation for parallel execution

## Benefits of This Structure

1. **API-First Confidence**: Comprehensive API coverage before UI testing
2. **Feature-Focused**: Tests organized by business capabilities
3. **Clear Test Intent**: Happy path vs edge cases separation
4. **Scalable**: Easy to add new features and services
5. **Type Safety**: Generated clients provide compile-time validation
6. **Parallel Execution**: Feature isolation enables concurrent testing
7. **Clear Ownership**: Teams can own feature test suites