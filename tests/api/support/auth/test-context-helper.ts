/**
 * Test Context Helper
 * Determines which user context (SuperAdmin or TenantAdmin) 
 * should be used for different test scenarios
 */

import { UserContext } from './multi-user-auth-manager';

export interface TestContextInfo {
  context: UserContext;
  reason: string;
}

export class TestContextHelper {
  // Platform operations that require SuperAdmin
  private static readonly PLATFORM_OPERATIONS = [
    // Tenant management
    'tenant-creation',
    'tenant-deletion',
    'tenant-activation',
    'tenant-suspension',
    'tenant-billing',
    
    // Platform administration
    'platform-settings',
    'platform-configuration',
    'subscription-management',
    'plan-management',
    
    // Cross-tenant operations
    'cross-tenant-query',
    'platform-reporting',
    'system-monitoring',
    'platform-audit'
  ];

  // Tenant operations that should use TenantAdmin
  private static readonly TENANT_OPERATIONS = [
    // Client management
    'client-creation',
    'client-update',
    'client-deletion',
    'client-listing',
    'client-groups',
    
    // User management within tenant
    'user-invitation',
    'user-management',
    'role-assignment',
    'permission-management',
    
    // Business operations
    'invoice-management',
    'accounting-operations',
    'report-generation',
    'document-management',
    
    // Tenant-specific settings
    'tenant-settings',
    'tenant-configuration',
    'integration-settings',
    'notification-preferences'
  ];

  /**
   * Determine user context based on operation type
   */
  static getContextForOperation(operation: string): TestContextInfo {
    const normalizedOp = operation.toLowerCase().replace(/_/g, '-');
    
    // Check if it's a platform operation
    if (this.PLATFORM_OPERATIONS.some(op => normalizedOp.includes(op))) {
      return {
        context: 'SuperAdmin',
        reason: `Operation '${operation}' requires platform-level permissions`
      };
    }
    
    // Check if it's a tenant operation
    if (this.TENANT_OPERATIONS.some(op => normalizedOp.includes(op))) {
      return {
        context: 'TenantAdmin',
        reason: `Operation '${operation}' is tenant-specific`
      };
    }
    
    // Default to TenantAdmin for unspecified operations
    // This ensures we test with more restrictive permissions by default
    return {
      context: 'TenantAdmin',
      reason: `Operation '${operation}' defaults to tenant context for security`
    };
  }

  /**
   * Determine context based on test file path
   */
  static getContextForTestFile(filePath: string): TestContextInfo {
    const path = filePath.toLowerCase();
    
    // Platform service tests
    if (path.includes('tenant-management') && 
        (path.includes('creation') || path.includes('onboarding'))) {
      return {
        context: 'SuperAdmin',
        reason: 'Tenant management service requires SuperAdmin'
      };
    }
    
    // Client management tests
    if (path.includes('client-management') || path.includes('client')) {
      return {
        context: 'TenantAdmin',
        reason: 'Client management is tenant-specific'
      };
    }
    
    // Identity service tests - context depends on operation
    if (path.includes('identity')) {
      if (path.includes('user-management') || path.includes('invitation')) {
        return {
          context: 'TenantAdmin',
          reason: 'User management within tenant'
        };
      }
      if (path.includes('authentication')) {
        return {
          context: 'SuperAdmin',
          reason: 'Authentication tests may need platform access'
        };
      }
    }
    
    // Default to TenantAdmin
    return {
      context: 'TenantAdmin',
      reason: 'Default to tenant context for test isolation'
    };
  }

  /**
   * Check if an operation requires cross-context testing
   */
  static requiresCrossContextTesting(operation: string): boolean {
    const crossContextOperations = [
      'permission-validation',
      'role-based-access',
      'tenant-isolation',
      'authorization-boundary'
    ];
    
    return crossContextOperations.some(op => 
      operation.toLowerCase().includes(op)
    );
  }

  /**
   * Get both contexts for cross-context testing
   */
  static getAllContexts(): UserContext[] {
    return ['SuperAdmin', 'TenantAdmin'];
  }

  /**
   * Validate that the correct context is being used
   */
  static validateContext(
    operation: string, 
    actualContext: UserContext
  ): { valid: boolean; message?: string } {
    const recommended = this.getContextForOperation(operation);
    
    if (recommended.context !== actualContext) {
      // Some operations can use either context
      const flexibleOperations = ['authentication', 'health-check', 'status'];
      if (flexibleOperations.some(op => operation.includes(op))) {
        return { valid: true };
      }
      
      return {
        valid: false,
        message: `Operation '${operation}' should use ${recommended.context} but is using ${actualContext}. ${recommended.reason}`
      };
    }
    
    return { valid: true };
  }
}