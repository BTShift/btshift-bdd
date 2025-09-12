const { Client } = require('pg');
require('dotenv').config();

async function findNSTechAndUser() {
  // Connection for tenant management database
  const tenantMgmtClient = new Client({
    connectionString: 'postgresql://postgres:LYnWxsJeHnIHtHzIDYzodPAnfzQgPUED@trolley.proxy.rlwy.net:57354/railway'
  });

  // Connection for platform database (identity is in the same DB)
  const platformClient = new Client({
    connectionString: 'postgresql://postgres:XPTalMVXCwtQIAWtKvinUrbZJuBXucdq@switchyard.proxy.rlwy.net:15685/identity_db'
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
        "Status",
        "CreatedAt"
      FROM "Tenants" 
      WHERE LOWER("Name") LIKE '%nstech%' 
         OR LOWER("Domain") LIKE '%nstech%'
      LIMIT 1
    `;
    
    const tenantResult = await tenantMgmtClient.query(tenantQuery);
    
    if (tenantResult.rows.length === 0) {
      console.log('❌ NStech tenant not found!');
      return;
    }

    const tenant = tenantResult.rows[0];
    console.log('✅ Found NStech tenant:');
    console.log('   ID:', tenant.Id);
    console.log('   Name:', tenant.Name);
    console.log('   Domain:', tenant.Domain);
    console.log('   Database:', tenant.DatabaseName);
    console.log('   Status:', tenant.Status);
    console.log('');

    // 2. Find user named Anass in identity database
    console.log('👤 Step 2: Finding user with first name "Anass"...');
    const userQuery = `
      SELECT 
        u."Id",
        u."UserName",
        u."Email",
        u."FirstName",
        u."LastName",
        u."PhoneNumber",
        u."EmailConfirmed",
        u."LockoutEnabled",
        u."LockoutEnd",
        u."AccessFailedCount",
        u."TwoFactorEnabled",
        u."TenantId"
      FROM public."Users" u
      WHERE LOWER(u."FirstName") = 'anass'
        AND u."TenantId" = $1
        AND u."EmailConfirmed" = true
        AND (u."LockoutEnd" IS NULL OR u."LockoutEnd" < NOW())
      LIMIT 1
    `;
    
    const userResult = await platformClient.query(userQuery, [tenant.Id]);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No active user named Anass found for NStech tenant.');
      console.log('   Searching for any Anass user...');
      
      // Try finding any Anass user
      const anyAnassQuery = `
        SELECT 
          u."Id",
          u."UserName",
          u."Email",
          u."FirstName",
          u."LastName",
          u."TenantId",
          u."EmailConfirmed"
        FROM public."Users" u
        WHERE LOWER(u."FirstName") = 'anass'
        LIMIT 5
      `;
      
      const anyAnassResult = await platformClient.query(anyAnassQuery);
      
      if (anyAnassResult.rows.length > 0) {
        console.log('\n   Found these Anass users in the system:');
        anyAnassResult.rows.forEach(user => {
          console.log(`   - ${user.Email} (TenantId: ${user.TenantId || 'None'}, Confirmed: ${user.EmailConfirmed})`);
        });
      }
      
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Found active user:');
    console.log('   ID:', user.Id);
    console.log('   Email:', user.Email);
    console.log('   Name:', user.FirstName, user.LastName);
    console.log('   Username:', user.UserName);
    console.log('   Email Confirmed:', user.EmailConfirmed);
    console.log('   Two Factor:', user.TwoFactorEnabled);
    console.log('');

    // 3. Check user roles
    console.log('🔐 Step 3: Checking user roles...');
    const rolesQuery = `
      SELECT 
        r."Name" as "RoleName",
        r."Id" as "RoleId"
      FROM public."UserRoles" ur
      JOIN public."Roles" r ON r."Id" = ur."RoleId"
      WHERE ur."UserId" = $1
    `;
    
    const rolesResult = await platformClient.query(rolesQuery, [user.Id]);
    
    if (rolesResult.rows.length > 0) {
      console.log('   User roles:');
      rolesResult.rows.forEach(role => {
        console.log(`   - ${role.RoleName}`);
      });
    } else {
      console.log('   ⚠️ User has no roles assigned');
    }
    console.log('');

    // 4. Update password for testing
    console.log('🔑 Step 4: Updating password for testing...');
    const newPassword = 'TenantAdmin@123!';
    
    // Note: In production, we'd use proper password hashing with Identity
    // For now, we'll output what needs to be done
    console.log('   ⚠️  Password update requires using Identity service API');
    console.log('   Recommended test password: TenantAdmin@123!');
    console.log('');

    // 5. Output configuration for tests
    console.log('📝 Configuration for BDD tests:');
    console.log('================================');
    console.log('# NStech Tenant Admin');
    console.log(`TENANT_ID=${tenant.Id}`);
    console.log(`TENANT_NAME=${tenant.Name}`);
    console.log(`TENANT_DOMAIN=${tenant.Domain}`);
    console.log(`TENANT_DB_NAME=${tenant.DatabaseName}`);
    console.log(`TENANT_ADMIN_EMAIL=${user.Email}`);
    console.log(`TENANT_ADMIN_USERNAME=${user.UserName}`);
    console.log(`TENANT_ADMIN_PASSWORD=TenantAdmin@123!  # Needs to be set via Identity API`);
    console.log(`TENANT_ADMIN_USER_ID=${user.Id}`);
    console.log('');

    // 6. Check if we can find other test-suitable users
    console.log('🔍 Step 5: Looking for other suitable test users in NStech...');
    const otherUsersQuery = `
      SELECT 
        u."Email",
        u."FirstName",
        u."LastName",
        u."EmailConfirmed",
        COUNT(ur."RoleId") as "RoleCount"
      FROM public."Users" u
      LEFT JOIN public."UserRoles" ur ON ur."UserId" = u."Id"
      WHERE u."TenantId" = $1
        AND u."EmailConfirmed" = true
        AND (u."LockoutEnd" IS NULL OR u."LockoutEnd" < NOW())
      GROUP BY u."Id", u."Email", u."FirstName", u."LastName", u."EmailConfirmed"
      ORDER BY "RoleCount" DESC
      LIMIT 5
    `;
    
    const otherUsersResult = await platformClient.query(otherUsersQuery, [tenant.Id]);
    
    if (otherUsersResult.rows.length > 0) {
      console.log('   Other active users in NStech:');
      otherUsersResult.rows.forEach(user => {
        console.log(`   - ${user.FirstName} ${user.LastName} (${user.Email}) - ${user.RoleCount} roles`);
      });
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

// Run the script
findNSTechAndUser().catch(console.error);