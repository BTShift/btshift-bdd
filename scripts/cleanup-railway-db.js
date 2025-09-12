const { Client } = require('pg');

async function cleanupRailwayDatabase() {
  console.log('🧹 Cleaning up Identity tables from railway database...\n');
  
  const client = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/railway'
  });

  try {
    await client.connect();
    console.log('📊 Connected to railway database\n');
    
    // List of Identity tables to remove (in reverse dependency order)
    const tablesToDrop = [
      'UserSessions',
      'UserTokens',
      'UserLogins',
      'UserInvitations',
      'UserClaims',
      'User2FAs',
      'UserRoles',
      'RoleClaims',
      'RolePermissions',
      'Users',
      'Roles',
      '__EFMigrationsHistory'
    ];
    
    console.log('⚠️  WARNING: This will remove the following tables from the railway database:');
    tablesToDrop.forEach(table => console.log(`   - ${table}`));
    console.log('\nThese tables should only exist in the identity_db database.\n');
    
    // Check if these tables actually exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1::text[])
    `;
    
    const existingTables = await client.query(checkQuery, [tablesToDrop]);
    console.log(`📋 Found ${existingTables.rows.length} Identity tables to remove\n`);
    
    if (existingTables.rows.length === 0) {
      console.log('✅ No Identity tables found in railway database. Nothing to clean up!');
      return;
    }
    
    // Drop each table
    console.log('🗑️  Dropping tables...');
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`   ✓ Dropped ${table}`);
      } catch (err) {
        console.log(`   ✗ Error dropping ${table}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log('Identity tables have been removed from the railway database.');
    console.log('They remain intact in the identity_db database where they belong.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This script will remove Identity tables from the railway database.');
console.log('These tables should only exist in identity_db.');
console.log('');

rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'yes') {
    cleanupRailwayDatabase().catch(console.error);
  } else {
    console.log('Cleanup cancelled.');
  }
});