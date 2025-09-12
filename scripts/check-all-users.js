const { Client } = require('pg');

async function checkAllUsers() {
  const platformClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/identity_db'
  });

  try {
    console.log('🔍 Connecting to platform database...\n');
    await platformClient.connect();

    // 1. Check total users
    console.log('📋 Total users in system:');
    const countQuery = `SELECT COUNT(*) as total FROM public."Users"`;
    const countResult = await platformClient.query(countQuery);
    console.log(`   Total: ${countResult.rows[0].total} users\n`);

    // 2. Find all users with tenant associations
    console.log('👥 Users with tenant assignments:');
    const usersQuery = `
      SELECT 
        u."Id",
        u."Email",
        u."FirstName",
        u."LastName",
        u."TenantId",
        u."EmailConfirmed",
        u."CreatedAt"
      FROM public."Users" u
      WHERE u."TenantId" IS NOT NULL
      ORDER BY u."CreatedAt" DESC
      LIMIT 20
    `;
    
    const usersResult = await platformClient.query(usersQuery);
    
    if (usersResult.rows.length === 0) {
      console.log('   No users with tenant assignments found!\n');
    } else {
      console.log(`   Found ${usersResult.rows.length} users with tenants:\n`);
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.FirstName} ${user.LastName}`);
        console.log(`      Email: ${user.Email}`);
        console.log(`      TenantId: ${user.TenantId}`);
        console.log(`      Confirmed: ${user.EmailConfirmed}`);
        console.log('');
      });
    }

    // 3. Check for the specific NStech tenant ID
    const nstechTenantId = '645e8102-df5c-4f40-8b59-bc4f4dfd273c';
    console.log(`🔍 Checking for users with NStech tenant ID (${nstechTenantId}):`);
    const nstechUsersQuery = `
      SELECT 
        "Id",
        "Email",
        "FirstName",
        "LastName",
        "EmailConfirmed"
      FROM public."Users"
      WHERE "TenantId" = $1
    `;
    
    const nstechResult = await platformClient.query(nstechUsersQuery, [nstechTenantId]);
    
    if (nstechResult.rows.length > 0) {
      console.log(`   ✅ Found ${nstechResult.rows.length} NStech users:`);
      nstechResult.rows.forEach(user => {
        console.log(`   - ${user.FirstName} ${user.LastName} (${user.Email})`);
      });
    } else {
      console.log('   ❌ No users found with NStech tenant ID');
    }

    // 4. Find Super Admin users
    console.log('\n🔐 Looking for Super Admin users:');
    const superAdminQuery = `
      SELECT 
        u."Id",
        u."Email",
        u."FirstName",
        u."LastName",
        r."Name" as "RoleName"
      FROM public."Users" u
      JOIN public."UserRoles" ur ON ur."UserId" = u."Id"
      JOIN public."Roles" r ON r."Id" = ur."RoleId"
      WHERE r."Name" ILIKE '%admin%'
         OR r."Name" ILIKE '%super%'
      LIMIT 10
    `;
    
    const adminResult = await platformClient.query(superAdminQuery);
    
    if (adminResult.rows.length > 0) {
      console.log('   Found admin users:');
      adminResult.rows.forEach(user => {
        console.log(`   - ${user.FirstName} ${user.LastName} (${user.Email}) - Role: ${user.RoleName}`);
      });
    }

    // 5. Find users by name pattern
    console.log('\n🔍 Looking for users with common test names:');
    const testUserQuery = `
      SELECT 
        "Email",
        "FirstName",
        "LastName",
        "TenantId"
      FROM public."Users"
      WHERE LOWER("FirstName") IN ('test', 'admin', 'anass', 'demo', 'user')
         OR LOWER("Email") LIKE '%test%'
         OR LOWER("Email") LIKE '%admin%'
      LIMIT 10
    `;
    
    const testUsersResult = await platformClient.query(testUserQuery);
    
    if (testUsersResult.rows.length > 0) {
      console.log('   Found potential test users:');
      testUsersResult.rows.forEach(user => {
        console.log(`   - ${user.FirstName} ${user.LastName} (${user.Email}) - TenantId: ${user.TenantId || 'None'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await platformClient.end();
  }
}

checkAllUsers().catch(console.error);