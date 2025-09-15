Feature: User Creation with Hierarchical Validation
  As a system administrator
  I want to ensure users can only create other users within their permission hierarchy
  So that privilege escalation is prevented

  Background:
    Given the following users exist:
      | UserType     | Email                | TenantId  | ClientId |
      | SuperAdmin   | super@btshift.com   | null      | null     |
      | TenantAdmin  | admin@tenant-a.com  | tenant-a  | null     |
      | TenantUser   | user@tenant-a.com   | tenant-a  | null     |
      | ClientUser   | client@client-1.com | tenant-a  | client-1 |

  @sprint3 @user-creation @security @critical
  Scenario: SuperAdmin can create any UserType
    Given I am logged in as UserType "SuperAdmin"
    When I create a user with UserType "SuperAdmin"
    Then the user should be created successfully
    When I create a user with UserType "TenantAdmin"
    Then the user should be created successfully
    When I create a user with UserType "TenantUser"
    Then the user should be created successfully
    When I create a user with UserType "ClientUser"
    Then the user should be created successfully

  @sprint3 @user-creation @security @critical
  Scenario: TenantAdmin can create users except SuperAdmin
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I create a user with UserType "TenantAdmin"
    Then the user should be created successfully
    When I create a user with UserType "TenantUser"
    Then the user should be created successfully
    When I create a user with UserType "ClientUser"
    Then the user should be created successfully
    When I attempt to create a user with UserType "SuperAdmin"
    Then I should receive a 403 Forbidden response
    And the error message should contain "cannot create users of type SuperAdmin"

  @sprint3 @user-creation @security @critical
  Scenario: TenantUser cannot create any users
    Given I am logged in as UserType "TenantUser" for tenant "tenant-a"
    When I attempt to create a user with UserType "TenantUser"
    Then I should receive a 403 Forbidden response
    And the error message should contain "cannot create users"
    When I attempt to create a user with UserType "ClientUser"
    Then I should receive a 403 Forbidden response
    When I attempt to create a user with UserType "TenantAdmin"
    Then I should receive a 403 Forbidden response
    When I attempt to create a user with UserType "SuperAdmin"
    Then I should receive a 403 Forbidden response

  @sprint3 @user-creation @security @critical
  Scenario: ClientUser cannot create any users
    Given I am logged in as UserType "ClientUser" for client "client-1" in tenant "tenant-a"
    When I attempt to create a user with UserType "ClientUser"
    Then I should receive a 403 Forbidden response
    And the error message should contain "cannot create users"
    When I attempt to create a user with UserType "TenantUser"
    Then I should receive a 403 Forbidden response
    When I attempt to create a user with UserType "TenantAdmin"
    Then I should receive a 403 Forbidden response
    When I attempt to create a user with UserType "SuperAdmin"
    Then I should receive a 403 Forbidden response

  @sprint3 @user-creation @validation
  Scenario: UserType validation for CreateUser API
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I create a user with an invalid UserType "InvalidType"
    Then I should receive a 400 Bad Request response
    And the error message should contain "Invalid user type"

  @sprint3 @user-creation @validation
  Scenario: ClientUser requires ClientId
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    When I create a user with UserType "ClientUser" without a ClientId
    Then I should receive a 400 Bad Request response
    And the error message should contain "ClientUser requires a client_id"

  @sprint3 @user-creation @jwt
  Scenario: JWT contains correct UserType claim
    Given I am logged in as UserType "SuperAdmin"
    Then my JWT token should contain claim "user_type" with value "SuperAdmin"
    Given I am logged in as UserType "TenantAdmin" for tenant "tenant-a"
    Then my JWT token should contain claim "user_type" with value "TenantAdmin"
    Given I am logged in as UserType "TenantUser" for tenant "tenant-a"
    Then my JWT token should contain claim "user_type" with value "TenantUser"
    Given I am logged in as UserType "ClientUser" for client "client-1" in tenant "tenant-a"
    Then my JWT token should contain claim "user_type" with value "ClientUser"

  @sprint3 @user-creation @database
  Scenario: Created users have correct UserType in database
    Given I am logged in as UserType "SuperAdmin"
    When I create a user with UserType "TenantAdmin" and email "newadmin@test.com"
    Then the database should have a user with email "newadmin@test.com" and UserType "TenantAdmin"
    When I create a user with UserType "ClientUser" and email "newclient@test.com"
    Then the database should have a user with email "newclient@test.com" and UserType "ClientUser"