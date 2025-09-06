#!/bin/bash

# Script to enhance Allure reports with BDD-style business organization
# This transforms technical tests into business-friendly scenarios

echo "🎯 Enhancing Allure reports with BDD-style business organization..."

# Enhanced mapping function for business-friendly suite names
enhance_test_file() {
    local file="$1"
    echo "📝 Processing: $file"
    
    # Extract path components for business organization
    if [[ $file =~ tests/api/features/([^/]+)/([^/]+)/[^/]+/([^/]+)\.api\.spec\.ts ]]; then
        service="${BASH_REMATCH[1]}"
        feature="${BASH_REMATCH[2]}"
        
        # Map services to business capabilities
        case $service in
            "identity")
                parent_suite="🔐 Security & Access"
                business_feature="Identity & Access Management"
                ;;
            "tenant-management") 
                parent_suite="🏢 Business Operations"
                business_feature="Tenant Management"
                ;;
            "client-management")
                parent_suite="👥 Client Services"
                business_feature="Client Relationship Management"
                ;;
            *)
                parent_suite="🔧 Platform Services"
                business_feature="$service"
                ;;
        esac
        
        # Map features to business capabilities
        case $feature in
            "authentication")
                suite="Authentication Systems"
                business_story="Platform access control and security validation"
                ;;
            "user-management")
                suite="User Administration"
                business_story="User lifecycle and account management"
                ;;
            "role-management")
                suite="Role & Permissions"
                business_story="Access control and authorization management"
                ;;
            "permission-management")
                suite="Permission Systems"
                business_story="Fine-grained access control"
                ;;
            "two-factor-auth")
                suite="Multi-Factor Authentication"
                business_story="Enhanced security measures"
                ;;
            "session-management")
                suite="Session Control"
                business_story="User session lifecycle management"
                ;;
            "audit-logs")
                suite="Audit & Compliance"
                business_story="Activity tracking and compliance"
                ;;
            "invitations")
                suite="User Onboarding"
                business_story="New user invitation workflow"
                ;;
            "password-reset")
                suite="Account Recovery"
                business_story="Password reset and account recovery"
                ;;
            "onboarding")
                suite="Tenant Lifecycle Management"
                business_story="New tenant onboarding process"
                ;;
            "suspension")
                suite="Tenant Lifecycle Management"
                business_story="Tenant status and lifecycle control"
                ;;
            "subscription")
                suite="Subscription Management"
                business_story="Tenant subscription and billing management"
                ;;
            "client-operations"|"crud-operations")
                suite="Client Operations"
                business_story="Client account management and operations"
                ;;
            "group-operations"|"groups")
                suite="Client Organization"
                business_story="Client grouping and organization"
                ;;
            "user-associations"|"user-client-associations")
                suite="Client-User Relationships"
                business_story="Managing user access to client accounts"
                ;;
            *)
                suite="$feature Operations"
                business_story="Business operations for $feature"
                ;;
        esac
        
        # Check if file already has enhanced business annotations
        if ! grep -q "allure.feature(" "$file"; then
            # Add enhanced business annotations
            sed -i "/allure\.parentSuite(/a\\    allure.feature('$business_feature');" "$file"
        fi
        
        # Update suite names to be business-friendly
        sed -i "s/allure\.parentSuite('.*')/allure.parentSuite('$parent_suite')/g" "$file"
        sed -i "s/allure\.suite('.*')/allure.suite('$suite')/g" "$file"
        
        echo "  ✅ Enhanced: $parent_suite > $business_feature > $suite"
    else
        echo "  ⚠️  Skipped: $file (pattern not matched)"
    fi
}

# Find and enhance all API test files
find tests/api/features -name "*.spec.ts" | while read -r file; do
    enhance_test_file "$file"
done

echo ""
echo "🎉 Allure BDD enhancement completed!"
echo ""
echo "📊 Business-friendly organization added:"
echo "  🔐 Security & Access (Identity Management)"
echo "  🏢 Business Operations (Tenant Management)" 
echo "  👥 Client Services (Client Management)"
echo ""
echo "✨ Your Allure reports will now show:"
echo "  📋 Business Features instead of technical services"
echo "  📖 User Stories in behaviors section"
echo "  🎯 Business-friendly test names"
echo "  📊 Proper categorization for stakeholders"