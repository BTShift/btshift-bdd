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
    // Delete all test tenants
    await this.tenantDbClient.query('DELETE FROM "Tenants" WHERE "Name" LIKE $1', ['%BDD%']);
    await this.tenantDbClient.query('DELETE FROM "Tenants" WHERE "Name" LIKE $1', ['%test%']);
    
    // Clean up test tenant databases
    const testDatabases = await this.tenantDbClient.query(
      "SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%test%' OR datname LIKE 'tenant_%bdd%'"
    );
    
    for (const db of testDatabases.rows) {
      try {
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

  async waitForSagaCompletion(tenantId: string, maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const sagaState = await this.getSagaState(tenantId);
      
      if (sagaState && (sagaState.CurrentState === 'Completed' || sagaState.CurrentState === 'Failed')) {
        return sagaState.CurrentState === 'Completed';
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }
}