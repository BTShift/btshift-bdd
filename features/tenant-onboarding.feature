Feature: Tenant Onboarding
  As a platform administrator
  I want to create and onboard new tenants
  So that they can use the accounting platform

  Background:
    Given I am logged in as a SuperAdmin
    And all tenant databases have been cleaned up

  @sprint1 @critical
  Scenario: Complete tenant onboarding flow
    When I navigate to the tenant creation page
    And I create a new tenant with:
      | Field                   | Value                |
      | Company Name           | BDD Test Company     |
      | Tenant Name            | bdd-test            |
      | Domain                 | bdd-test            |
      | Plan                   | Professional        |
      | Admin Email            | bdd-admin@test.com  |
      | Admin First Name       | BDD                 |
      | Admin Last Name        | Admin               |
      | Phone                  | +212612345678       |
      | Address                | 123 Test Street     |
      | Country                | Morocco             |
    Then the tenant should be created successfully
    And the tenant status should be "Pending" in the database
    And a tenant database should be provisioned
    And the onboarding saga should be initiated
    And the saga should complete within 30 seconds

  @sprint1 @critical
  Scenario: Activate tenant and verify login
    Given a pending tenant "bdd-test" exists
    When I activate the tenant from the admin portal
    Then the tenant status should change to "Active"
    And the tenant admin should receive a welcome email
    And the activation link should be valid for 7 days
    
  @sprint1 @security
  Scenario: Multi-tenant isolation
    Given two active tenants exist:
      | Tenant Name | Admin Email        |
      | tenant-a    | admin@tenant-a.com |
      | tenant-b    | admin@tenant-b.com |
    When I log in as admin of "tenant-a"
    Then I should only see data for "tenant-a"
    And I should not be able to access "tenant-b" data
    And cross-tenant API requests should return 403 Forbidden

  @sprint1 @validation
  Scenario: Duplicate tenant prevention
    Given a tenant "existing-tenant" already exists
    When I try to create a tenant with the same name
    Then I should see a validation error "Tenant name already exists"
    And no new tenant should be created in the database
    And no saga should be initiated