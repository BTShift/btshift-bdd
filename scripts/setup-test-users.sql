-- Create a test TenantAdmin user with known password
-- Password: TenantAdmin@123! (will need to be hashed)

-- First, let's check the structure of the Users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if we have a test admin already
SELECT "Id", "Email", "UserName", "TenantId" 
FROM public."Users" 
WHERE "Email" = 'test.admin@btshift.ma';

-- Get the password hash from SuperAdmin (we know it works with SuperAdmin@123!)
SELECT "Id", "Email", "PasswordHash" 
FROM public."Users" 
WHERE "Email" = 'superadmin@shift.ma';

-- Clone the SuperAdmin user as a TenantAdmin for testing
-- This will give us a user with password SuperAdmin@123!
INSERT INTO public."Users" (
    "Id",
    "UserName",
    "NormalizedUserName",
    "Email",
    "NormalizedEmail",
    "EmailConfirmed",
    "PasswordHash",
    "SecurityStamp",
    "ConcurrencyStamp",
    "PhoneNumber",
    "PhoneNumberConfirmed",
    "TwoFactorEnabled",
    "LockoutEnd",
    "LockoutEnabled",
    "AccessFailedCount",
    "FirstName",
    "LastName",
    "IsActive",
    "CreatedAt",
    "UpdatedAt",
    "TenantId",
    "RefreshToken",
    "RefreshTokenExpiryTime"
)
SELECT 
    gen_random_uuid(),
    'test.tenantadmin@btshift.ma',
    'TEST.TENANTADMIN@BTSHIFT.MA',
    'test.tenantadmin@btshift.ma',
    'TEST.TENANTADMIN@BTSHIFT.MA',
    true,
    "PasswordHash", -- Use the same password hash as SuperAdmin
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    NULL,
    false,
    false,
    NULL,
    true,
    0,
    'Test',
    'TenantAdmin',
    true,
    NOW(),
    NOW(),
    'aef1fb0d-84fb-412d-97c8-06f7eb7f3846', -- The tenant we're using
    NULL,
    NULL
FROM public."Users"
WHERE "Email" = 'superadmin@shift.ma'
ON CONFLICT DO NOTHING;

-- Verify the user was created
SELECT "Id", "Email", "TenantId" 
FROM public."Users" 
WHERE "Email" = 'test.tenantadmin@btshift.ma';