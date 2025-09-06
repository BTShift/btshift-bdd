#!/bin/bash

echo "🔧 Fixing Allure suite annotation formatting..."

# Find all files with broken suite annotations and fix them
find tests/api/features -name "*.spec.ts" -exec grep -l "allure\.suite($" {} \; | while read -r file; do
    echo "📝 Fixing: $file"
    
    # Remove broken incomplete suite lines
    sed -i '/allure\.suite($/d' "$file"
    
    echo "  ✅ Fixed"
done

echo "✅ Completed fixing Allure suite formatting!"