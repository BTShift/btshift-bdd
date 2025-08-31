#!/usr/bin/env ts-node

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

class TestDataCleaner {
  private tenantDbClient: Client;
  private identityDbClient: Client;

  constructor() {
    this.tenantDbClient = new Client({
      host: process.env.TENANT_DB_HOST,
      port: parseInt(process.env.TENANT_DB_PORT || '5432'),
      user: process.env.TENANT_DB_USER,
      password: process.env.TENANT_DB_PASSWORD,
      database: process.env.TENANT_DB_NAME,
    });

    this.identityDbClient = new Client({
      host: process.env.IDENTITY_DB_HOST,
      port: parseInt(process.env.IDENTITY_DB_PORT || '5432'),
      user: process.env.IDENTITY_DB_USER,
      password: process.env.IDENTITY_DB_PASSWORD,
      database: process.env.IDENTITY_DB_NAME,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.tenantDbClient.connect();
      console.log('✅ Connected to Tenant Management database');
      
      await this.identityDbClient.connect();
      console.log('✅ Connected to Identity database');
    } catch (error) {
      console.error('❌ Failed to connect to databases:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.tenantDbClient.end();
    await this.identityDbClient.end();
    console.log('✅ Disconnected from databases');
  }

  async cleanupTestTenants(): Promise<void> {
    console.log('\n🧹 Cleaning up test tenants...');
    
    try {
      // Find all test tenants
      const testTenants = await this.tenantDbClient.query(`
        SELECT "Id", "Name", "DatabaseName" 
        FROM "Tenants" 
        WHERE "Name" LIKE '%BDD%' 
           OR "Name" LIKE '%Test%' 
           OR "Name" LIKE '%test%'
           OR "Name" LIKE 'Tenant A%'
           OR "Name" LIKE 'Tenant B%'
           OR "Name" LIKE 'Duplicate%'
           OR "Name" LIKE 'Activation%'
           OR "Domain" LIKE '%bdd%'
           OR "Domain" LIKE '%test%'
           OR "Domain" LIKE 'tenant-a-%'
           OR "Domain" LIKE 'tenant-b-%'
           OR "Domain" LIKE '%[0-9]%'  -- Domains with timestamps
      `);

      console.log(`Found ${testTenants.rows.length} test tenants to clean up`);

      // Delete saga states for test tenants
      for (const tenant of testTenants.rows) {
        await this.tenantDbClient.query(
          'DELETE FROM "TenantOnboardingStates" WHERE "TenantId" = $1',
          [tenant.Id]
        );
        console.log(`  ✅ Deleted saga state for tenant: ${tenant.Name}`);
      }

      // Delete test tenants
      const deleteResult = await this.tenantDbClient.query(`
        DELETE FROM "Tenants" 
        WHERE "Name" LIKE '%BDD%' 
           OR "Name" LIKE '%Test%' 
           OR "Name" LIKE '%test%'
           OR "Name" LIKE 'Tenant A%'
           OR "Name" LIKE 'Tenant B%'
           OR "Name" LIKE 'Duplicate%'
           OR "Name" LIKE 'Activation%'
           OR "Domain" LIKE '%bdd%'
           OR "Domain" LIKE '%test%'
           OR "Domain" LIKE 'tenant-a-%'
           OR "Domain" LIKE 'tenant-b-%'
      `);

      console.log(`✅ Deleted ${deleteResult.rowCount} test tenants from database`);
    } catch (error) {
      console.error('❌ Error cleaning up tenants:', error);
    }
  }

  async cleanupTestDatabases(): Promise<void> {
    console.log('\n🧹 Cleaning up test databases...');
    
    try {
      // Find all test databases
      const testDatabases = await this.tenantDbClient.query(`
        SELECT datname 
        FROM pg_database 
        WHERE datname LIKE 'tenant_%test%' 
           OR datname LIKE 'tenant_%bdd%'
           OR datname LIKE 'tenant_duplicate%'
           OR datname LIKE 'tenant_activation%'
           OR datname LIKE 'tenant_tenant%'
           OR datname LIKE 'tenant_tenant-a-%'
           OR datname LIKE 'tenant_tenant-b-%'
           OR datname ~ 'tenant_.*[0-9]{10,}'  -- Databases with timestamps
      `);

      console.log(`Found ${testDatabases.rows.length} test databases to clean up`);

      for (const db of testDatabases.rows) {
        try {
          // First terminate all connections to the database
          await this.tenantDbClient.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
              AND pid <> pg_backend_pid()
          `, [db.datname]);

          // Wait a moment for connections to close
          await new Promise(resolve => setTimeout(resolve, 500));

          // Now drop the database
          await this.tenantDbClient.query(`DROP DATABASE IF EXISTS "${db.datname}"`);
          console.log(`  ✅ Dropped database: ${db.datname}`);
        } catch (error: any) {
          if (error.code === '55006') {
            console.log(`  ⚠️  Database ${db.datname} is still in use, skipping...`);
          } else {
            console.error(`  ❌ Failed to drop database ${db.datname}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up databases:', error);
    }
  }

  async cleanupTestUsers(): Promise<void> {
    console.log('\n🧹 Cleaning up test users...');
    
    try {
      // First, let's see what users exist
      const existingUsers = await this.identityDbClient.query(`
        SELECT "Id", "Email", "FirstName", "LastName" FROM "Users"
      `);
      
      if (existingUsers.rows.length > 0) {
        console.log(`  Found ${existingUsers.rows.length} total users in database`);
        existingUsers.rows.forEach(user => {
          console.log(`    - ${user.Email} (${user.FirstName} ${user.LastName})`);
        });
      }
      
      // Delete test users from identity database with comprehensive patterns
      // IMPORTANT: Never delete the superadmin
      const deleteResult = await this.identityDbClient.query(`
        DELETE FROM "Users" 
        WHERE (
          "Email" LIKE '%@test.com'
           OR "Email" LIKE '%bdd%'
           OR "Email" LIKE '%test%'
           OR "Email" LIKE '%@tenant-a.com'
           OR "Email" LIKE '%@tenant-b.com'
           OR "Email" LIKE 'admin@%'
           OR "Email" LIKE 'activation-%@%'
           OR "Email" LIKE 'duplicate%@%'
           OR "Email" = 'anass.yatim@gmail.com'
           OR "FirstName" IN ('BDD', 'Test', 'Duplicate', 'Activation', 'Anass')
           OR "FirstName" LIKE 'Test%'
           OR "FirstName" LIKE 'BDD%'
           OR "LastName" LIKE 'Admin%'
           OR "LastName" = 'Yatim'
           OR "Email" ~ '[0-9]{10,}'  -- Emails with timestamps
        )
        AND "Email" != 'superadmin@shift.ma'  -- Never delete superadmin
        AND "Email" != 'admin@btshift.com'    -- Keep any permanent admin accounts
      `);

      console.log(`✅ Deleted ${deleteResult.rowCount} test users from identity database`);

      // Also clean up any orphaned sessions, tokens, etc.
      await this.identityDbClient.query(`
        DELETE FROM "UserSessions" 
        WHERE "UserId" NOT IN (SELECT "Id" FROM "Users")
      `);

      await this.identityDbClient.query(`
        DELETE FROM "UserTokens" 
        WHERE "UserId" NOT IN (SELECT "Id" FROM "Users")
      `);

      console.log('✅ Cleaned up orphaned sessions and tokens');
    } catch (error) {
      console.error('❌ Error cleaning up users:', error);
    }
  }

  async generateCleanupReport(): Promise<void> {
    console.log('\n📊 Cleanup Report:');
    
    try {
      // Count remaining test data
      const remainingTenants = await this.tenantDbClient.query(`
        SELECT COUNT(*) as count 
        FROM "Tenants" 
        WHERE "Name" LIKE '%BDD%' 
           OR "Name" LIKE '%Test%' 
           OR "Name" LIKE '%test%'
      `);

      const remainingDatabases = await this.tenantDbClient.query(`
        SELECT COUNT(*) as count 
        FROM pg_database 
        WHERE datname LIKE 'tenant_%test%' 
           OR datname LIKE 'tenant_%bdd%'
      `);

      const remainingUsers = await this.identityDbClient.query(`
        SELECT COUNT(*) as count 
        FROM "Users" 
        WHERE "Email" LIKE '%@test.com'
           OR "Email" LIKE '%bdd%'
      `);

      console.log(`  Remaining test tenants: ${remainingTenants.rows[0].count}`);
      console.log(`  Remaining test databases: ${remainingDatabases.rows[0].count}`);
      console.log(`  Remaining test users: ${remainingUsers.rows[0].count}`);

      if (remainingTenants.rows[0].count === '0' && 
          remainingDatabases.rows[0].count === '0' && 
          remainingUsers.rows[0].count === '0') {
        console.log('\n✅ All test data successfully cleaned up!');
      } else {
        console.log('\n⚠️  Some test data remains - may need manual cleanup');
      }
    } catch (error) {
      console.error('❌ Error generating report:', error);
    }
  }

  async runFullCleanup(): Promise<void> {
    console.log('🚀 Starting BDD Test Data Cleanup...\n');
    console.log('=' . repeat(50));
    
    try {
      await this.connect();
      
      // Order matters: clean up in reverse order of dependencies
      await this.cleanupTestUsers();
      await this.cleanupTestTenants();
      await this.cleanupTestDatabases();
      
      await this.generateCleanupReport();
      
      await this.disconnect();
      
      console.log('\n' + '=' . repeat(50));
      console.log('✅ Cleanup complete!');
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    }
  }
}

// Run cleanup if executed directly
if (require.main === module) {
  const cleaner = new TestDataCleaner();
  cleaner.runFullCleanup().catch(console.error);
}

export default TestDataCleaner;