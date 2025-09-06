/**
 * Test Data Factory - DRY approach for generating test data
 */

interface TenantData {
  companyName: string;
  tenantName: string;
  domain: string;
  plan: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  phoneNumber?: string;
  address?: string;
  country: string;
}

interface ClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  industry?: string;
  notes?: string;
}

interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export class TestDataFactory {
  private static counter = 0;

  static generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    this.counter++;
    return `${timestamp}-${random}-${this.counter}`;
  }

  static tenant(overrides: Partial<TenantData> = {}): TenantData {
    const id = this.generateId();
    return {
      companyName: `Test Company ${id}`,
      tenantName: `tenant-${id}`,
      domain: `tenant-${id}`,
      plan: 'Professional',
      adminEmail: `admin-${id}@test.com`,
      adminFirstName: 'Test',
      adminLastName: 'Admin',
      phoneNumber: '+212612345678',
      address: '123 Test Street, Casablanca',
      country: 'Morocco',
      ...overrides
    };
  }

  static client(overrides: Partial<ClientData> = {}): ClientData {
    const id = this.generateId();
    return {
      name: `Client ${id}`,
      email: `client-${id}@test.com`,
      phone: '+212612345678',
      address: '456 Business Ave',
      taxId: `TAX${id}`,
      industry: 'Technology',
      notes: 'Auto-generated test client',
      ...overrides
    };
  }

  static user(overrides: Partial<UserData> = {}): UserData {
    const id = this.generateId();
    return {
      email: `user-${id}@test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: `User${id}`,
      phoneNumber: '+212600000000',
      ...overrides
    };
  }

  static credentials() {
    return {
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@btshift.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!'
    };
  }
}