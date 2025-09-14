Feature: Authorization Hierarchy Validation
  As a system architect
  I want to ensure proper authorization boundaries
  So that users can only access data within their scope

  Background:
    Given the following users exist:
      | UserType     | Email                | TenantId  | ClientIds |
      | SuperAdmin   | super@btshift.com   | null      | null      |
      | TenantAdmin  | admin@tenant-a.com  | tenant-a  | null      |
      | ClientUser   | user@client-1.com   | tenant-a  | client-1  |

  @sprint2 @authorization @critical
  Scenario: SuperAdmin can access all tenant data
    Given I am logged in as UserType "SuperAdmin"
    When I request tenant list
    Then I should see all tenants
    And each request should include proper authorization headers

  @sprint2 @authorization @critical
  Scenario: TenantAdmin can only access their tenant data
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I request tenant information
    Then I should only see "tenant-a" data
    And I should not be able to access "tenant-b" data
    And requests should include "X-Operation-Tenant-Id: tenant-a"

  @sprint2 @authorization @critical
  Scenario: ClientUser can only access their client data
    Given I am logged in as UserType "ClientUser" for client "client-1" in tenant "tenant-a"
    When I request client information
    Then I should only see "client-1" data
    And I should not be able to access "client-2" data
    And requests should include "X-Operation-Client-Id: client-1"

  @sprint2 @authorization @security
  Scenario: TenantAdmin cannot create tenants
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I attempt to create a new tenant
    Then I should receive a 403 Forbidden response
    And no tenant should be created

  @sprint2 @authorization @security
  Scenario: ClientUser cannot manage other clients
    Given I am logged in as UserType "ClientUser" for client "client-1"
    When I attempt to access client "client-2" data
    Then I should receive a 403 Forbidden response
    And no client-2 data should be returned

  @sprint2 @authorization @security
  Scenario: Cross-tenant access prevention
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I attempt to access tenant "tenant-b" data
    Then I should receive a 403 Forbidden response
    And no tenant-b data should be returned