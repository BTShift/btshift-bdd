#!/bin/bash

# Script to add Allure suite annotations to all API test files
# This creates a better organized test suite structure in Allure reports

echo "🚀 Adding Allure suite annotations to API tests..."

# Find all API test files
find tests/api/features -name "*.spec.ts" | while read -r file; do
    echo "📝 Processing: $file"
    
    # Extract path components for suite organization
    if [[ $file =~ tests/api/features/([^/]+)/([^/]+)/[^/]+/([^/]+)\.api\.spec\.ts ]]; then
        service="${BASH_REMATCH[1]}"
        feature="${BASH_REMATCH[2]}"
        
        # Map service names to readable parent suites
        case $service in
            "identity")
                parent_suite="Identity Service"
                ;;
            "tenant-management") 
                parent_suite="Tenant Management Service"
                ;;
            "client-management")
                parent_suite="Client Management Service"
                ;;
            *)
                parent_suite="$service"
                ;;
        esac
        
        # Map feature names to readable suites
        case $feature in
            "authentication")
                suite="Authentication"
                ;;
            "user-management")
                suite="User Management"
                ;;
            "role-management")
                suite="Role Management"
                ;;
            "permission-management")
                suite="Permission Management"
                ;;
            "two-factor-auth")
                suite="Two-Factor Authentication"
                ;;
            "session-management")
                suite="Session Management"
                ;;
            "audit-logs")
                suite="Audit Logs"
                ;;
            "invitations")
                suite="User Invitations"
                ;;
            "password-reset")
                suite="Password Reset"
                ;;
            "onboarding")
                suite="Tenant Onboarding"
                ;;
            "suspension")
                suite="Tenant Lifecycle"
                ;;
            "subscription")
                suite="Subscription Management"
                ;;
            "client-operations")
                suite="Client Operations"
                ;;
            "group-operations")
                suite="Group Management"
                ;;
            "user-client-associations")
                suite="User-Client Associations"
                ;;
            *)
                suite="$feature"
                ;;
        esac
        
        # Check if file already has allure import
        if ! grep -q "import.*allure.*from 'allure-playwright'" "$file"; then
            # Add allure import after the first import
            sed -i "1a\\import { allure } from 'allure-playwright';" "$file"
        fi
        
        # Check if file already has allure suite annotations
        if ! grep -q "allure.parentSuite" "$file"; then
            # Find the beforeAll function and add allure annotations
            sed -i "/beforeAll(async () => {/a\\    allure.parentSuite('$parent_suite');\\    allure.suite('$suite');" "$file"
        fi
        
        echo "  ✅ Added: $parent_suite > $suite"
    else
        echo "  ⚠️  Skipped: $file (pattern not matched)"
    fi
done

echo "✅ Completed adding Allure suite annotations!"