Feature: Client Management
  As a tenant administrator
  I want to manage clients within my tenant
  So that I can track accounting data for each client

  Background:
    Given I am logged in as UserType "TenantAdmin" for tenant "test-tenant"
    And my tenant is active
    And I have tenant-scoped permissions for "test-tenant"

  @sprint1 @crud
  Scenario: Create a new client
    When I navigate to the clients page
    And I click "New Client"
    And I fill in the client form with:
      | Field         | Value                    |
      | Company Name  | Test Client Inc          |
      | Tax ID        | 123456789               |
      | Email         | contact@testclient.com  |
      | Phone         | +212600000000           |
      | Address       | 456 Client Avenue       |
      | City          | Casablanca              |
      | Country       | Morocco                 |
    And I save the client
    Then the client should be created successfully
    And the client should appear in the list
    And the client should be stored in the tenant database

  @sprint1 @groups
  Scenario: Manage client groups
    Given the following clients exist:
      | Company Name     | Tax ID    |
      | Client A         | 111111111 |
      | Client B         | 222222222 |
      | Client C         | 333333333 |
    When I create a group "Premium Clients"
    And I add "Client A" and "Client B" to the group
    Then the group should contain 2 clients
    And I should be able to filter clients by group

  @sprint1 @user-association
  Scenario: Associate user with client
    Given a client "Test Client" exists
    And a ClientUser "client.user@example.com" exists for tenant "test-tenant"
    When I associate the user with "Test Client"
    Then the user should only see "Test Client" data
    And the user should not see other clients
    And the association should be stored in the database
    And the user should have UserType "ClientUser" with client-scoped permissions