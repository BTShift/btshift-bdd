# BTShift BDD Test Suite

End-to-end BDD tests for validating Sprint 1 features of the BTShift multi-tenant SaaS accounting platform.

## Features Tested

### Sprint 1 Coverage
- ✅ Complete tenant onboarding flow
- ✅ User authentication and authorization
- ✅ Client management CRUD operations
- ✅ Multi-tenant isolation
- ✅ Session management (10-minute timeout)
- ✅ Password policies and user invitations
- ✅ Saga orchestration and compensation

## Tech Stack

- **Playwright** - Browser automation and E2E testing
- **Cucumber** - BDD framework for Gherkin scenarios
- **TypeScript** - Type-safe test implementation
- **PostgreSQL** - Direct database validation
- **Axios** - API testing

## Project Structure

```
btshift-bdd/
├── features/                  # Gherkin feature files
│   ├── tenant-onboarding.feature
│   └── client-management.feature
├── features/step_definitions/ # Cucumber step implementations
│   └── tenant-steps.ts
├── tests/e2e/                # Playwright E2E tests
│   └── tenant-onboarding.spec.ts
├── lib/                      # Shared libraries
│   ├── pages/               # Page Object Models
│   │   ├── login-page.ts
│   │   └── tenant-page.ts
│   ├── db/                  # Database utilities
│   │   └── database-manager.ts
│   └── helpers/             # API and test helpers
│       └── api-client.ts
├── .env                     # Environment variables (git-ignored)
├── .env.example            # Environment template
├── playwright.config.ts    # Playwright configuration
├── cucumber.js            # Cucumber configuration
└── tsconfig.json         # TypeScript configuration
```

## Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Access to Railway-deployed services
- Database credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/BTShift/btshift-bdd.git
cd btshift-bdd
```

2. Install dependencies and Playwright:
```bash
npm run setup
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

## Running Tests

### All Tests
```bash
npm test                  # Runs with automatic cleanup before and after
```

### Playwright E2E Tests Only
```bash
npm run test:e2e          # Standard test run with cleanup
```

### Test Without Cleanup (For Investigation)
```bash
npm run test:keep-data    # Skips cleanup AFTER tests (keeps data for debugging)
npm run test:no-cleanup   # Skips ALL cleanup (before and after)
npm run test:debug        # Debug mode + keeps test data after
```

### Cucumber BDD Tests Only
```bash
npm run test:bdd
```

### Interactive UI Mode
```bash
npm run test:ui
```

### View Test Report
```bash
npm run test:report
```

### Manual Cleanup
```bash
npm run cleanup           # Clean all test data manually
npm run cleanup:check     # Preview what would be cleaned (dry run)
```

## Test Scenarios

### Tenant Onboarding
- Create new tenant through UI
- Verify database provisioning
- Check saga orchestration
- Validate tenant activation
- Test multi-tenant isolation

### Client Management
- CRUD operations for clients
- Client group management
- User-client associations
- Permission scoping

### Security Tests
- Session timeout validation
- Cross-tenant access prevention
- Password policy enforcement
- JWT token validation

## Environment Variables

### Required Credentials
```env
# Platform Admin Portal
PLATFORM_ADMIN_URL=https://platform-admin-portal-production.up.railway.app
PLATFORM_ADMIN_EMAIL=admin@btshift.com
PLATFORM_ADMIN_PASSWORD=SecurePassword123!

# Database Connections
TENANT_DB_HOST=trolley.proxy.rlwy.net
TENANT_DB_PORT=57354
TENANT_DB_USER=postgres
TENANT_DB_PASSWORD=your-password
TENANT_DB_NAME=railway

IDENTITY_DB_HOST=switchyard.proxy.rlwy.net
IDENTITY_DB_PORT=15685
IDENTITY_DB_USER=postgres
IDENTITY_DB_PASSWORD=your-password
IDENTITY_DB_NAME=railway
```

## CI/CD Integration

### GitHub Actions
```yaml
name: BDD Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            test-results/
```

## Test Data Management

### Cleanup Strategy
- Tests automatically clean up test data before and after execution
- All test tenants have "BDD" or "test" in their names for easy identification
- Database cleanup removes test tenant databases

### Test Isolation
- Each test creates unique tenant names using timestamps
- Tests are designed to be idempotent
- Database transactions ensure clean state

## Debugging

### Enable Headed Mode
```bash
HEADLESS=false npm test
```

### Slow Motion Execution
Add to playwright.config.ts:
```typescript
use: {
  slowMo: 1000, // 1 second delay between actions
}
```

### Screenshots on Failure
Automatically captured and stored in `test-results/`

### Database Queries
Use `database-manager.ts` methods for direct DB validation

## Known Issues & Limitations

1. **Email Testing**: Currently doesn't validate actual email delivery
2. **Time-based Tests**: Session timeout test uses mocking
3. **Saga Timing**: Some tests may need adjustment based on saga processing speed

## Contributing

1. Create feature branch
2. Write tests following existing patterns
3. Ensure all tests pass
4. Submit PR with test results

## Sprint 1 Validation Checklist

- [ ] All 44 Sprint 1 issues resolved
- [ ] Tenant onboarding flow works end-to-end
- [ ] Multi-tenant isolation verified
- [ ] Client management CRUD functional
- [ ] User types (TenantUser/ClientUser) working
- [ ] Session management (10-min timeout) active
- [ ] Password policies enforced
- [ ] Saga orchestration completing
- [ ] All Railway services healthy
- [ ] No critical bugs remaining

## Support

For issues or questions:
- Create issue in BTShift/btshift-bdd repository
- Contact: admin@btshift.com

## License

Proprietary - BTShift © 2025