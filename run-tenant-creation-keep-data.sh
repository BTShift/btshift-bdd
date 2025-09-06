#!/bin/bash

# Run only the tenant creation scenario and keep the data
echo "Running tenant creation test with data preservation..."

# Skip cleanup before and after to preserve data
export SKIP_CLEANUP_BEFORE=true
export SKIP_CLEANUP_AFTER=true
export HEADLESS=false  # Show browser for visibility

# Run only the first scenario of tenant-onboarding feature
npx cucumber-js features/tenant-onboarding.feature:11 \
  --format @cucumber/pretty-formatter \
  --publish-quiet

echo "Test completed. Data has been preserved in the database."
echo "Created tenant: BDD Test Company (bdd-test)"