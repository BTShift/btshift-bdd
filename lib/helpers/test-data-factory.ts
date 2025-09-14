import { TestUser, TestClient, TestTenant, UserType } from '../types/test-types';

export class TestDataFactory {
  private static readonly timestamp = Date.now();
  private static counter = 0;

  private static getUniqueId(): string {
    return `test-${this.timestamp}-${++this.counter}`;
  }

  static createUser(userType: UserType, overrides?: Partial<TestUser>): TestUser {
    const uniqueId = this.getUniqueId();

    const baseUser: TestUser = {
      userType,
      email: `${userType.toLowerCase()}-${uniqueId}@test.btshift.com`,
      tenantId: userType === 'SuperAdmin' ? null : `tenant-${uniqueId}`,
      clientIds: userType === 'ClientUser' ? [`client-${uniqueId}`] : null
    };

    return { ...baseUser, ...overrides };
  }

  static createTenant(overrides?: Partial<TestTenant>): TestTenant {
    const uniqueId = this.getUniqueId();

    const baseTenant: TestTenant = {
      id: `tenant-${uniqueId}`,
      name: `test-tenant-${uniqueId}`,
      companyName: `Test Company ${uniqueId}`,
      domain: `test-${uniqueId}`,
      status: 'Pending',
      databaseName: `tenant_db_${uniqueId.replace(/-/g, '_')}`
    };

    return { ...baseTenant, ...overrides };
  }

  static createClient(tenantId: string, overrides?: Partial<TestClient>): TestClient {
    const uniqueId = this.getUniqueId();

    const baseClient: TestClient = {
      id: `client-${uniqueId}`,
      companyName: `Test Client ${uniqueId}`,
      taxId: `TAX${uniqueId.replace(/\D/g, '')}`,
      email: `client-${uniqueId}@test.btshift.com`,
      phone: `+212${String(Math.random()).substring(2, 11)}`,
      address: `${uniqueId} Test Street`,
      city: 'Casablanca',
      country: 'Morocco',
      tenantId
    };

    return { ...baseClient, ...overrides };
  }

  static createSuperAdminUser(overrides?: Partial<TestUser>): TestUser {
    return this.createUser('SuperAdmin', {
      email: 'superadmin@test.btshift.com',
      ...overrides
    });
  }

  static createTenantAdminUser(tenantId: string, overrides?: Partial<TestUser>): TestUser {
    return this.createUser('TenantAdmin', {
      tenantId,
      email: `admin@${tenantId}.test.com`,
      ...overrides
    });
  }

  static createClientUser(tenantId: string, clientId: string, overrides?: Partial<TestUser>): TestUser {
    return this.createUser('ClientUser', {
      tenantId,
      clientIds: [clientId],
      email: `user@${clientId}.test.com`,
      ...overrides
    });
  }

  // Helper method to create test scenarios with related data
  static createCompleteTestScenario() {
    const tenant = this.createTenant();
    const client = this.createClient(tenant.id);
    const superAdmin = this.createSuperAdminUser();
    const tenantAdmin = this.createTenantAdminUser(tenant.id);
    const clientUser = this.createClientUser(tenant.id, client.id);

    return {
      tenant,
      client,
      users: {
        superAdmin,
        tenantAdmin,
        clientUser
      }
    };
  }

  // Cleanup helper
  static getTestEmailPattern(): RegExp {
    return /.*@test\.btshift\.com$/;
  }

  static isTestData(email: string): boolean {
    return this.getTestEmailPattern().test(email);
  }
}