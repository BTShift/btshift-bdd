const { Client } = require('pg');

async function checkDatabases() {
  console.log('🔍 Checking Identity tables in both databases...\n');
  
  // Connection to railway database (default)
  const railwayClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/railway'
  });

  // Connection to identity_db database
  const identityClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/identity_db'
  });

  try {
    // Check railway database
    console.log('📊 Checking RAILWAY database:');
    console.log('================================');
    await railwayClient.connect();
    
    // Check if Roles table exists
    const railwayRolesQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Roles'
      ) as exists
    `;
    const railwayRoles = await railwayClient.query(railwayRolesQuery);
    console.log(`   Roles table exists: ${railwayRoles.rows[0].exists}`);
    
    // List all Identity-related tables
    const railwayTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%Role%' 
        OR table_name LIKE '%User%'
        OR table_name LIKE '%Identity%'
        OR table_name LIKE 'AspNet%'
        OR table_name = '__EFMigrationsHistory'
      )
      ORDER BY table_name
    `;
    const railwayTables = await railwayClient.query(railwayTablesQuery);
    console.log(`   Identity-related tables found: ${railwayTables.rows.length}`);
    railwayTables.rows.forEach(row => {
      console.log(`     - ${row.table_name}`);
    });
    
    await railwayClient.end();
    
    console.log('\n📊 Checking IDENTITY_DB database:');
    console.log('===================================');
    await identityClient.connect();
    
    // Check if Roles table exists
    const identityRolesQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Roles'
      ) as exists
    `;
    const identityRoles = await identityClient.query(identityRolesQuery);
    console.log(`   Roles table exists: ${identityRoles.rows[0].exists}`);
    
    // List all Identity-related tables
    const identityTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND (
        table_name LIKE '%Role%' 
        OR table_name LIKE '%User%'
        OR table_name LIKE '%Identity%'
        OR table_name LIKE 'AspNet%'
        OR table_name = '__EFMigrationsHistory'
      )
      ORDER BY table_name
    `;
    const identityTables = await identityClient.query(identityTablesQuery);
    console.log(`   Identity-related tables found: ${identityTables.rows.length}`);
    identityTables.rows.forEach(row => {
      console.log(`     - ${row.table_name}`);
    });
    
    // Check migration history
    const migrationQuery = `
      SELECT "MigrationId", "ProductVersion"
      FROM "__EFMigrationsHistory"
      ORDER BY "MigrationId"
    `;
    
    try {
      const migrations = await identityClient.query(migrationQuery);
      console.log(`\n   Migrations applied: ${migrations.rows.length}`);
      migrations.rows.forEach(row => {
        console.log(`     - ${row.MigrationId}`);
      });
    } catch (err) {
      console.log('\n   No migration history table found');
    }
    
    await identityClient.end();
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabases().catch(console.error);