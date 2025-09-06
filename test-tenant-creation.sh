#!/bin/bash

# Get fresh token
echo "Getting fresh token..."
TOKEN=$(curl -s -X POST https://api-gateway-production-91e9.up.railway.app/api/authentication/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@shift.ma","password":"SuperAdmin@123!"}' | jq -r '.tokenInfo.accessToken')

echo "Token: ${TOKEN:0:20}..."

# Test tenant creation
echo "Testing tenant creation..."
curl -s -X POST https://api-gateway-production-91e9.up.railway.app/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "tenantName": "test-tenant-123",
    "domain": "test123.com",
    "adminEmail": "admin@test.com",
    "adminFirstName": "Test",
    "adminLastName": "Admin",
    "country": "US",
    "plan": "Basic"
  }'