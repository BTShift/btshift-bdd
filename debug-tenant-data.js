// Quick debug of tenant data format
const { execSync } = require('child_process');

// Since we can't easily import the TypeScript, let's run a simple JS equivalent
const testData = {
  companyName: `Test Company ${Date.now()}`,
  tenantName: `tenant-${Date.now()}`,
  domain: `test-${Date.now()}.com`,
  plan: 'Basic',
  adminEmail: 'test@example.com',
  adminFirstName: 'Test',
  adminLastName: 'Admin',
  phoneNumber: '+1234567890',
  address: '123 Test St',
  country: 'US'
};

console.log('Test tenant data:');
console.log(JSON.stringify(testData, null, 2));