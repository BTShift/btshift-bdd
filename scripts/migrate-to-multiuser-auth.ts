#!/usr/bin/env node

/**
 * Automated migration script for converting tests from GlobalAuthManager to MultiUserAuthManager
 * This script updates imports, setup functions, and test contexts across all test files
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationTarget {
  file: string;
  context: 'SuperAdmin' | 'TenantAdmin' | 'Unauthenticated' | 'Keep';
  reason: string;
}

const MIGRATION_TARGETS: MigrationTarget[] = [
  // Tenant Management Tests (SuperAdmin)
  { file: 'tests/api/features/tenant-management/onboarding/happy-path/tenant-creation.api.spec.ts', context: 'SuperAdmin', reason: 'Tenant creation' },
  { file: 'tests/api/features/tenant-management/onboarding/happy-path/typed-tenant-creation.api.spec.ts', context: 'SuperAdmin', reason: 'Typed tenant creation' },
  { file: 'tests/api/features/tenant-management/onboarding/edge-cases/duplicate-tenant.api.spec.ts', context: 'SuperAdmin', reason: 'Duplicate tenant checks' },
  { file: 'tests/api/features/tenant-management/suspension/happy-path/tenant-suspension.api.spec.ts', context: 'SuperAdmin', reason: 'Tenant suspension' },
  { file: 'tests/api/features/tenant-management/subscription/happy-path/subscription-management.api.spec.ts', context: 'SuperAdmin', reason: 'Subscription management' },

  // Client Management Tests (TenantAdmin)
  { file: 'tests/api/features/client-management/crud-operations/happy-path/typed-client-crud.api.spec.ts', context: 'TenantAdmin', reason: 'Client CRUD operations' },
  { file: 'tests/api/features/client-management/groups/happy-path/group-operations.api.spec.ts', context: 'TenantAdmin', reason: 'Client group operations' },
  { file: 'tests/api/features/client-management/user-associations/happy-path/user-client-associations.api.spec.ts', context: 'TenantAdmin', reason: 'User-client associations' },

  // Identity/User Management Tests (TenantAdmin)
  { file: 'tests/api/features/identity/user-management/happy-path/user-crud.api.spec.ts', context: 'TenantAdmin', reason: 'User CRUD operations' },
  { file: 'tests/api/features/identity/invitations/happy-path/invitation-operations.api.spec.ts', context: 'TenantAdmin', reason: 'User invitations' },
  { file: 'tests/api/features/identity/role-management/happy-path/role-crud.api.spec.ts', context: 'TenantAdmin', reason: 'Role management' },
  { file: 'tests/api/features/identity/permission-management/happy-path/permission-crud.api.spec.ts', context: 'TenantAdmin', reason: 'Permission management' },
  { file: 'tests/api/features/identity/password-reset/happy-path/password-reset.api.spec.ts', context: 'TenantAdmin', reason: 'Password reset' },
  { file: 'tests/api/features/identity/two-factor-auth/happy-path/2fa-operations.api.spec.ts', context: 'TenantAdmin', reason: '2FA operations' },
  { file: 'tests/api/features/identity/session-management/happy-path/session-operations.api.spec.ts', context: 'TenantAdmin', reason: 'Session management' },

  // Authentication Tests (Keep Unauthenticated)
  { file: 'tests/api/features/identity/authentication/happy-path/login.api.spec.ts', context: 'Unauthenticated', reason: 'Testing login itself' },
  { file: 'tests/api/features/identity/authentication/happy-path/typed-login.api.spec.ts', context: 'Unauthenticated', reason: 'Testing typed login' },
  { file: 'tests/api/features/identity/authentication/edge-cases/invalid-credentials.api.spec.ts', context: 'Unauthenticated', reason: 'Testing invalid credentials' },

  // Audit Tests (SuperAdmin)
  { file: 'tests/api/features/identity/audit-logs/happy-path/audit-operations.api.spec.ts', context: 'SuperAdmin', reason: 'Platform-wide audit logs' },

  // Multi-user example (Keep as-is)
  { file: 'tests/api/features/multi-user-example.spec.ts', context: 'Keep', reason: 'Example file - no changes needed' }
];

function updateImports(content: string): string {
  // Update import statements
  let updated = content;
  
  // Replace setupApiTest import with context-aware version - handle all path depths
  const importPatterns = [
    /import\s*{\s*setupApiTest\s*,\s*teardownApiTest\s*,\s*TestContext\s*}\s*from\s*['"]([\.\/]+)support\/helpers\/api-test-base['"]/g,
    /import\s*{\s*setupApiTest\s*,([^}]*),\s*TestContext\s*}\s*from\s*['"]([\.\/]+)support\/helpers\/api-test-base['"]/g,
    /import\s*{\s*([^}]*),\s*setupApiTest\s*,([^}]*)\s*}\s*from\s*['"]([\.\/]+)support\/helpers\/api-test-base['"]/g
  ];
  
  for (const pattern of importPatterns) {
    updated = updated.replace(pattern, (match, ...groups) => {
      // Find the path prefix (e.g., '../', '../../', '../../../')
      const pathPrefix = groups.find(g => g && g.includes('/')) || '../';
      return match
        .replace('setupApiTest', 'setupApiTestWithContext')
        .replace(/from\s*['"]([\.\/]+)support/, `from '${pathPrefix}support`);
    });
  }
  
  // Simpler approach - just replace the function name if it exists
  if (updated.includes('setupApiTest') && !updated.includes('setupApiTestWithContext')) {
    updated = updated.replace(/\bsetupApiTest\b/g, 'setupApiTestWithContext');
  }
  
  return updated;
}

function updateSetupFunction(content: string, context: 'SuperAdmin' | 'TenantAdmin'): string {
  // Replace setupApiTest() with setupApiTestWithContext()
  let updated = content.replace(
    /ctx\s*=\s*await\s+setupApiTest\(\)/g,
    `ctx = await setupApiTestWithContext('${context}')`
  );
  
  // Also handle any variations
  updated = updated.replace(
    /const\s+ctx\s*=\s*await\s+setupApiTest\(\)/g,
    `const ctx = await setupApiTestWithContext('${context}')`
  );
  
  updated = updated.replace(
    /let\s+ctx\s*=\s*await\s+setupApiTest\(\)/g,
    `let ctx = await setupApiTestWithContext('${context}')`
  );
  
  return updated;
}

function migrateFile(target: MigrationTarget): void {
  const filePath = path.join(process.cwd(), target.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${target.file}`);
    return;
  }
  
  if (target.context === 'Keep') {
    console.log(`✅ Keeping as-is: ${target.file}`);
    return;
  }
  
  if (target.context === 'Unauthenticated') {
    console.log(`✅ No changes needed (unauthenticated): ${target.file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Update imports
  content = updateImports(content);
  
  // Update setup function
  content = updateSetupFunction(content, target.context);
  
  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Migrated to ${target.context}: ${target.file}`);
  } else {
    console.log(`ℹ️  No changes needed: ${target.file}`);
  }
}

function main(): void {
  console.log('🚀 Starting migration to Multi-User Authentication System\n');
  
  // Group targets by context
  const byContext = MIGRATION_TARGETS.reduce((acc, target) => {
    if (!acc[target.context]) acc[target.context] = [];
    acc[target.context].push(target);
    return acc;
  }, {} as Record<string, MigrationTarget[]>);
  
  // Show migration plan
  console.log('📋 Migration Plan:');
  console.log(`  SuperAdmin context: ${byContext['SuperAdmin']?.length || 0} files`);
  console.log(`  TenantAdmin context: ${byContext['TenantAdmin']?.length || 0} files`);
  console.log(`  Unauthenticated: ${byContext['Unauthenticated']?.length || 0} files`);
  console.log(`  Keep as-is: ${byContext['Keep']?.length || 0} files`);
  console.log('');
  
  // Perform migration
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const target of MIGRATION_TARGETS) {
    try {
      migrateFile(target);
      if (target.context !== 'Keep' && target.context !== 'Unauthenticated') {
        migrated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`❌ Error migrating ${target.file}:`, error.message);
      errors++;
    }
  }
  
  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated} files`);
  console.log(`  ⏭️  Skipped: ${skipped} files`);
  if (errors > 0) {
    console.log(`  ❌ Errors: ${errors} files`);
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Review the migrated files');
  console.log('  2. Update .env with actual passwords');
  console.log('  3. Run tests to validate migration');
  console.log('  4. Monitor for any authentication issues');
}

// Run the migration
main();