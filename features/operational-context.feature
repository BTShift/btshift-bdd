Feature: Operational Context Headers
  As a service developer
  I want to ensure operational context is properly propagated
  So that authorization decisions are made correctly

  Background:
    Given the following users exist:
      | UserType     | Email                | TenantId  | ClientIds |
      | SuperAdmin   | super@btshift.com   | null      | null      |
      | TenantAdmin  | admin@tenant-a.com  | tenant-a  | null      |

  @sprint2 @context @critical
  Scenario: SuperAdmin operating on behalf of tenant
    Given I am logged in as UserType "SuperAdmin"
    And I select operational context tenant "tenant-a"
    When I create a new client for the selected tenant
    Then the request should include "X-Operation-Tenant-Id: tenant-a"
    And the client should be created in "tenant-a"
    And I should receive confirmation within tenant context

  @sprint2 @context @critical
  Scenario: TenantAdmin operating on behalf of client
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    And I select operational context client "client-1"
    When I update client information
    Then the request should include "X-Operation-Client-Id: client-1"
    And only "client-1" data should be updated

  @sprint2 @context @validation
  Scenario: Operational context validation for SuperAdmin
    Given I am logged in as UserType "SuperAdmin"
    When I perform operations without selecting operational context
    Then requests should not include tenant or client context headers
    And I should see platform-wide data by default

  @sprint2 @context @validation
  Scenario: TenantAdmin operational context is automatically set
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I perform any tenant operation
    Then requests should automatically include "X-Operation-Tenant-Id: tenant-a"
    And I should not be able to change the tenant context

  @sprint2 @context @validation
  Scenario: ClientUser operational context is automatically set
    Given I am logged in as UserType "ClientUser" for client "client-1" in tenant "tenant-a"
    When I perform any client operation
    Then requests should automatically include "X-Operation-Client-Id: client-1"
    And requests should automatically include "X-Operation-Tenant-Id: tenant-a"
    And I should not be able to change the client or tenant context