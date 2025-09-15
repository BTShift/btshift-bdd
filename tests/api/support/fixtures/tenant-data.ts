import { CreateTenantRequest } from '../clients/tenant-management-client';

export const validTenantData: CreateTenantRequest = {
  companyName: 'BDD Test Company',
  tenantName: 'bdd-test-company',
  domain: 'bdd-test-company',
  plan: 'Professional',
  adminEmail: 'admin@bddtest.com',
  adminFirstName: 'BDD',
  adminLastName: 'Admin',
  phoneNumber: '+212612345678',
  address: '123 Test Street, Casablanca',
  country: 'Morocco'
};

export const generateUniqueTenantData = (prefix = 'test'): CreateTenantRequest => {
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substr(2, 9);
  const tenantName = `${prefix}-${timestamp}-${uniqueId}`;
  
  return {
    ...validTenantData,
    tenantName,
    domain: tenantName,
    companyName: `${validTenantData.companyName} ${timestamp}`,
    adminEmail: `admin-${timestamp}@${tenantName}.test`
  };
};

export const invalidTenantDataSets = {
  missingRequiredFields: {
    companyName: '',
    tenantName: '',
    domain: '',
    plan: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    country: ''
  },
  invalidEmail: {
    ...validTenantData,
    adminEmail: 'invalid-email'
  },
  invalidPhoneNumber: {
    ...validTenantData,
    phoneNumber: 'not-a-phone-number'
  },
  unsupportedPlan: {
    ...validTenantData,
    plan: 'NonExistentPlan'
  },
  tooLongTenantName: {
    ...validTenantData,
    tenantName: 'a'.repeat(100), // Assuming there's a length limit
    domain: 'a'.repeat(100)
  },
  specialCharactersInTenantName: {
    ...validTenantData,
    tenantName: 'test@#$%^&*()',
    domain: 'test@#$%^&*()'
  }
};

export const superAdminCredentials = {
  email: process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@btshift.com',
  password: process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin123!'
};