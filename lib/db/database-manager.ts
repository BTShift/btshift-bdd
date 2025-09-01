import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseManager {
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
    await this.tenantDbClient.connect();
    await this.identityDbClient.connect();
  }

  async disconnect(): Promise<void> {
    await this.tenantDbClient.end();
    await this.identityDbClient.end();
  }

  // Tenant Management Database Operations
  async getTenantByName(name: string): Promise<any> {
    const query = 'SELECT * FROM "Tenants" WHERE "Name" = $1';
    const result = await this.tenantDbClient.query(query, [name]);
    return result.rows[0];
  }

  async getTenantById(id: string): Promise<any> {
    const query = 'SELECT * FROM "Tenants" WHERE "Id" = $1';
    const result = await this.tenantDbClient.query(query, [id]);
    return result.rows[0];
  }

  async getSagaState(tenantId: string): Promise<any> {
    const query = 'SELECT * FROM "TenantOnboardingStates" WHERE "TenantId" = $1';
    const result = await this.tenantDbClient.query(query, [tenantId]);
    return result.rows[0];
  }

  async checkTenantDatabaseExists(dbName: string): Promise<boolean> {
    const query = "SELECT 1 FROM pg_database WHERE datname = $1";
    const result = await this.tenantDbClient.query(query, [dbName]);
    return result.rows.length > 0;
  }

  async cleanupAllTenants(): Promise<void> {
    // Delete all test tenants with comprehensive patterns
    await this.tenantDbClient.query(`
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
    
    // Clean up test tenant databases
    const testDatabases = await this.tenantDbClient.query(
      "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%test%' OR datname LIKE 'tenant_%bdd%' OR datname LIKE 'tenant_duplicate%' OR datname LIKE 'tenant_activation%' OR datname LIKE 'tenant_tenant%'"
    );
    
    for (const db of testDatabases.rows) {
      try {
        // First terminate all connections to the database
        await this.tenantDbClient.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1
            AND pid <> pg_backend_pid()
        `, [db.datname]);
        
        // Wait a bit for connections to close
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now drop the database
        await this.tenantDbClient.query(`DROP DATABASE IF EXISTS "${db.datname}"`);
      } catch (error) {
        console.log(`Could not drop database ${db.datname}:`, error);
      }
    }
  }

  // Identity Database Operations
  async getUserByEmail(email: string): Promise<any> {
    const query = 'SELECT * FROM "Users" WHERE "Email" = $1';
    const result = await this.identityDbClient.query(query, [email]);
    return result.rows[0];
  }

  async getUserById(id: string): Promise<any> {
    const query = 'SELECT * FROM "Users" WHERE "Id" = $1';
    const result = await this.identityDbClient.query(query, [id]);
    return result.rows[0];
  }

  async cleanupTestUsers(): Promise<void> {
    await this.identityDbClient.query('DELETE FROM "Users" WHERE "Email" LIKE $1', ['%@test.com']);
    await this.identityDbClient.query('DELETE FROM "Users" WHERE "Email" LIKE $1', ['%bdd%']);
  }

  // Client Management Operations (in tenant database)
  async getClientsByTenant(tenantDbName: string): Promise<any[]> {
    const tenantClient = new Client({
      host: process.env.TENANT_DB_HOST,
      port: parseInt(process.env.TENANT_DB_PORT || '5432'),
      user: process.env.TENANT_DB_USER,
      password: process.env.TENANT_DB_PASSWORD,
      database: tenantDbName,
    });

    try {
      await tenantClient.connect();
      const result = await tenantClient.query('SELECT * FROM client_management.clients');
      return result.rows;
    } finally {
      await tenantClient.end();
    }
  }

  async getSagaState(tenantId: string): Promise<any> {
    const query = `
      SELECT 
        "CorrelationId",
        "CurrentState",
        "TenantId",
        "DatabaseProvisionedAt",
        "IdentityConfiguredAt",
        "ClientManagementInitializedAt",
        "AccountingInitializedAt",
        "CompletedAt",
        "LastError",
        "RetryCount"
      FROM "TenantOnboardingStates" 
      WHERE "TenantId" = $1
    `;
    const result = await this.tenantDbClient.query(query, [tenantId]);
    return result.rows[0];
  }

  async waitForSagaCompletion(tenantId: string, maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    console.log(`Waiting for saga completion for tenant ${tenantId}`);
    
    while (Date.now() - startTime < maxWaitMs) {
      const sagaState = await this.getSagaState(tenantId);
      
      if (sagaState) {
        console.log(`Saga state for tenant ${tenantId}: ${sagaState.CurrentState}`);
        
        // Check if completed successfully
        if (sagaState.CurrentState === 'Completed' && sagaState.CompletedAt) {
          return true;
        }
        
        // Check if failed
        if (sagaState.CurrentState === 'Failed' || sagaState.LastError) {
          console.error(`Saga failed for tenant ${tenantId}: ${sagaState.LastError}`);
          return false;
        }
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Timeout - log the last state
    const finalState = await this.getSagaState(tenantId);
    if (finalState) {
      console.log(`Saga timeout for tenant ${tenantId}. Final state: ${finalState.CurrentState}`);
      console.log('Saga progress:', {
        DatabaseProvisioned: !!finalState.DatabaseProvisionedAt,
        IdentityConfigured: !!finalState.IdentityConfiguredAt,
        ClientManagementInitialized: !!finalState.ClientManagementInitializedAt,
        AccountingInitialized: !!finalState.AccountingInitializedAt,
        Completed: !!finalState.CompletedAt
      });
    }
    
    return false;
  }
}