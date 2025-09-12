const { Client } = require('pg');

async function checkAllDatabases() {
  console.log('🔍 Checking all databases on both PostgreSQL instances...\n');
  
  // Platform PostgreSQL (pg-plateform)
  const platformClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/postgres'
  });

  // Tenant Management PostgreSQL (pg-tenant-management)
  const tenantClient = new Client({
    connectionString: 'postgresql://postgres:LYnWxsJeHnIHtHzIDYzodPAnfzQgPUED@trolley.proxy.rlwy.net:57354/postgres'
  });

  try {
    console.log('📊 PLATFORM PostgreSQL (pg-plateform) databases:');
    console.log('================================================');
    await platformClient.connect();
    
    const platformDbs = await platformClient.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    platformDbs.rows.forEach(row => {
      console.log(`   - ${row.datname}`);
    });
    
    // Check for Identity tables in railway database
    await platformClient.query(`SELECT current_database()`);
    const railwayCheck = await platformClient.query(`
      SELECT COUNT(*) as count
      FROM pg_database d
      JOIN pg_stat_user_tables t ON d.datname = 'railway'
      WHERE t.schemaname = 'public' 
      AND t.tablename IN ('Users', 'Roles', 'UserRoles')
      LIMIT 1
    `);
    
    await platformClient.end();
    
    console.log('\n📊 TENANT MANAGEMENT PostgreSQL (pg-tenant-management) databases:');
    console.log('================================================================');
    await tenantClient.connect();
    
    const tenantDbs = await tenantClient.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    tenantDbs.rows.forEach(row => {
      console.log(`   - ${row.datname}`);
    });
    
    await tenantClient.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllDatabases().catch(console.error);
