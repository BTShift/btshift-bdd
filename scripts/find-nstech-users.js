const { Client } = require('pg');

async function findNSTechUsers() {
  const tenantMgmtClient = new Client({
    connectionString: 'postgresql://postgres:LYnWxsJeHnIHtHzIDYzodPAnfzQgPUED@trolley.proxy.rlwy.net:57354/railway'
  });

  const platformClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/railway'
  });

  try {
    console.log('🔍 Connecting to databases...\n');
    await tenantMgmtClient.connect();
    await platformClient.connect();

    // 1. Find NStech tenant
    console.log('📋 Step 1: Finding NStech tenant...');
    const tenantQuery = `
      SELECT 
        "Id", 
        "Name", 
        "Domain", 
        "DatabaseName",
        "Status"
      FROM "Tenants" 
      WHERE LOWER("Name") LIKE '%nstech%' 
         OR LOWER("Domain") LIKE '%nstech%'
      LIMIT 1
    `;
    
    const tenantResult = await tenantMgmtClient.query(tenantQuery);
    
    if (tenantResult.rows.length === 0) {
      console.log('❌ NStech tenant not found!');
      
      // Show all tenants
      const allTenantsQuery = `
        SELECT "Name", "Domain", "Status" 
        FROM "Tenants" 
        ORDER BY "CreatedAt" DESC 
        LIMIT 10
      `;
      const allTenants = await tenantMgmtClient.query(allTenantsQuery);
      console.log('\n Available tenants:');
      allTenants.rows.forEach(t => {
        console.log(`   - ${t.Name} (${t.Domain}) - ${t.Status}`);
      });
      return;
    }

    const tenant = tenantResult.rows[0];
    console.log('✅ Found NStech tenant:');
    console.log('   ID:', tenant.Id);
    console.log('   Name:', tenant.Name);
    console.log('   Domain:', tenant.Domain);
    console.log('');

    // 2. Find ALL users for NStech tenant
    console.log('👥 Step 2: Finding ALL users for NStech tenant...');
    const allUsersQuery = `
      SELECT 
        u."Id",
        u."UserName",
        u."Email",
        u."FirstName",
        u."LastName",
        u."EmailConfirmed",
        u."TenantId",
        u."CreatedAt"
      FROM public."Users" u
      WHERE u."TenantId" = $1
      ORDER BY u."CreatedAt" DESC
      LIMIT 20
    `;
    
    const allUsersResult = await platformClient.query(allUsersQuery, [tenant.Id]);
    
    if (allUsersResult.rows.length === 0) {
      console.log('❌ No users found for NStech tenant!');
      
      // Check if there are ANY users with ANY tenant
      const anyUsersQuery = `
        SELECT 
          u."Email",
          u."FirstName",
          u."LastName",
          u."TenantId",
          t."Name" as "TenantName"
        FROM public."Users" u
        LEFT JOIN "Tenants" t ON t."Id" = u."TenantId"
        WHERE u."TenantId" IS NOT NULL
        LIMIT 10
      `;
      
      const anyUsersResult = await platformClient.query(anyUsersQuery);
      if (anyUsersResult.rows.length > 0) {
        console.log('\n Users in other tenants:');
        anyUsersResult.rows.forEach(user => {
          console.log(`   - ${user.FirstName} ${user.LastName} (${user.Email}) - Tenant: ${user.TenantName || user.TenantId}`);
        });
      }
      return;
    }

    console.log(`✅ Found ${allUsersResult.rows.length} users in NStech:`);
    allUsersResult.rows.forEach((user, index) => {
      console.log(`\n   User ${index + 1}:`);
      console.log(`   - Name: ${user.FirstName} ${user.LastName}`);
      console.log(`   - Email: ${user.Email}`);
      console.log(`   - Username: ${user.UserName}`);
      console.log(`   - Confirmed: ${user.EmailConfirmed}`);
      console.log(`   - ID: ${user.Id}`);
    });

    // 3. Find users with roles
    console.log('\n🔐 Step 3: Checking which users have roles...');
    const usersWithRolesQuery = `
      SELECT 
        u."Id",
        u."Email",
        u."FirstName",
        u."LastName",
        r."Name" as "RoleName"
      FROM public."Users" u
      JOIN public."UserRoles" ur ON ur."UserId" = u."Id"
      JOIN public."Roles" r ON r."Id" = ur."RoleId"
      WHERE u."TenantId" = $1
      ORDER BY u."Email"
    `;
    
    const rolesResult = await platformClient.query(usersWithRolesQuery, [tenant.Id]);
    
    if (rolesResult.rows.length > 0) {
      console.log('   Users with roles:');
      const userRoles = {};
      rolesResult.rows.forEach(row => {
        if (!userRoles[row.Email]) {
          userRoles[row.Email] = {
            name: `${row.FirstName} ${row.LastName}`,
            roles: []
          };
        }
        userRoles[row.Email].roles.push(row.RoleName);
      });
      
      Object.entries(userRoles).forEach(([email, data]) => {
        console.log(`   - ${data.name} (${email}): ${data.roles.join(', ')}`);
      });
    } else {
      console.log('   ⚠️ No users have roles assigned');
    }

    // 4. Suggest best user for testing
    console.log('\n📝 Recommendation:');
    if (allUsersResult.rows.length > 0) {
      const confirmedUser = allUsersResult.rows.find(u => u.EmailConfirmed);
      if (confirmedUser) {
        console.log('   Best user for testing:');
        console.log(`   - Email: ${confirmedUser.Email}`);
        console.log(`   - Name: ${confirmedUser.FirstName} ${confirmedUser.LastName}`);
        console.log(`   - User ID: ${confirmedUser.Id}`);
        console.log(`   - Will need to reset password via Identity API`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
  } finally {
    await tenantMgmtClient.end();
    await platformClient.end();
  }
}

findNSTechUsers().catch(console.error);