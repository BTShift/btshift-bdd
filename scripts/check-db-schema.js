const { Client } = require('pg');

async function checkDatabaseSchema() {
  const platformClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/railway'
  });

  try {
    console.log('🔍 Connecting to platform database...\n');
    await platformClient.connect();

    // 1. Check schemas
    console.log('📋 Available schemas:');
    const schemaQuery = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `;
    const schemaResult = await platformClient.query(schemaQuery);
    schemaResult.rows.forEach(row => {
      console.log(`   - ${row.schema_name}`);
    });
    console.log('');

    // 2. Check tables with user data
    console.log('📋 Tables that might contain user data:');
    const tableQuery = `
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%user%' 
         OR table_name ILIKE '%aspnet%'
         OR table_name ILIKE '%identity%'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;
    const tableResult = await platformClient.query(tableQuery);
    tableResult.rows.forEach(row => {
      console.log(`   - ${row.table_schema}.${row.table_name}`);
    });
    console.log('');

    // 3. Check specific public schema tables
    console.log('📋 Tables in public schema:');
    const publicTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 20
    `;
    const publicResult = await platformClient.query(publicTablesQuery);
    publicResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await platformClient.end();
  }
}

checkDatabaseSchema().catch(console.error);