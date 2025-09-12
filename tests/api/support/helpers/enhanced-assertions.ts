/**
 * Enhanced assertion helpers for clearer test failure messages
 * Provides context-rich error messages and Allure integration
 */

import { expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { attachment } from 'allure-js-commons';

/**
 * Custom assertion context for API responses
 */
export interface AssertionContext {
  operation?: string;
  endpoint?: string;
  entityId?: string;
  entityType?: string;
  expectedState?: string;
  actualState?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Enhanced assertions for API testing with clear error messages
 */
export class EnhancedAssertions {
  /**
   * Assert that an entity was successfully deleted
   */
  static async assertDeleted(
    exists: boolean,
    context: AssertionContext
  ): Promise<void> {
    const message = `${context.entityType || 'Entity'} ${context.entityId || ''} should be deleted but ${exists ? 'still exists' : 'was successfully deleted'}`;
    
    if (exists) {
      // Add debugging information before assertion fails
      await this.attachDebugInfo({
        ...context,
        actualState: 'exists',
        expectedState: 'deleted',
        assertion: 'assertDeleted',
        failed: true
      });
    }
    
    expect(exists).toBe(false, message);
  }

  /**
   * Assert that an entity exists
   */
  static async assertExists(
    exists: boolean,
    context: AssertionContext
  ): Promise<void> {
    const message = `${context.entityType || 'Entity'} ${context.entityId || ''} should exist but ${exists ? 'exists as expected' : 'was not found'}`;
    
    if (!exists) {
      await this.attachDebugInfo({
        ...context,
        actualState: 'not found',
        expectedState: 'exists',
        assertion: 'assertExists',
        failed: true
      });
    }
    
    expect(exists).toBe(true, message);
  }

  /**
   * Assert API operation success with context
   */
  static async assertOperationSuccess(
    success: boolean,
    context: AssertionContext
  ): Promise<void> {
    const operation = context.operation || 'Operation';
    const message = `${operation} should succeed but ${success ? 'succeeded' : 'failed'}`;
    
    if (!success) {
      await this.attachDebugInfo({
        ...context,
        assertion: 'assertOperationSuccess',
        failed: true
      });
    }
    
    expect(success).toBe(true, message);
  }

  /**
   * Assert response has expected status code with context
   */
  static async assertStatus(
    actual: number,
    expected: number,
    context: AssertionContext
  ): Promise<void> {
    const message = `${context.operation || 'Operation'} at ${context.endpoint || 'endpoint'} should return ${expected} but returned ${actual}`;
    
    if (actual !== expected) {
      await this.attachDebugInfo({
        ...context,
        actualStatus: actual,
        expectedStatus: expected,
        assertion: 'assertStatus',
        failed: true
      });
    }
    
    expect(actual).toBe(expected, message);
  }

  /**
   * Assert array length with context
   */
  static async assertArrayLength(
    array: any[],
    expectedLength: number,
    context: AssertionContext
  ): Promise<void> {
    const actualLength = array?.length || 0;
    const entityType = context.entityType || 'items';
    const message = `Expected ${expectedLength} ${entityType} but found ${actualLength}`;
    
    if (actualLength !== expectedLength) {
      await this.attachDebugInfo({
        ...context,
        actualLength,
        expectedLength,
        items: array,
        assertion: 'assertArrayLength',
        failed: true
      });
    }
    
    expect(actualLength).toBe(expectedLength, message);
  }

  /**
   * Assert property exists and has value
   */
  static async assertProperty(
    object: any,
    property: string,
    expectedValue?: any,
    context?: AssertionContext
  ): Promise<void> {
    const hasProperty = object && property in object;
    const actualValue = object?.[property];
    
    if (!hasProperty) {
      await this.attachDebugInfo({
        ...context,
        property,
        object,
        assertion: 'assertProperty',
        failed: true,
        error: 'Property does not exist'
      });
      expect(hasProperty).toBe(true, `Property '${property}' should exist on object`);
    }
    
    if (expectedValue !== undefined && actualValue !== expectedValue) {
      await this.attachDebugInfo({
        ...context,
        property,
        actualValue,
        expectedValue,
        assertion: 'assertProperty',
        failed: true
      });
      expect(actualValue).toBe(expectedValue, `Property '${property}' should be '${expectedValue}' but was '${actualValue}'`);
    }
  }

  /**
   * Attach debug information to Allure report
   */
  private static async attachDebugInfo(info: Record<string, any>): Promise<void> {
    try {
      // Log to console for immediate visibility
      console.error('❌ Assertion Failed:', JSON.stringify(info, null, 2));
      
      // Attach to Allure report if available
      if (typeof attachment === 'function') {
        await attachment(
          'Assertion Failure Context',
          JSON.stringify(info, null, 2),
          'application/json'
        );
      }
    } catch (error) {
      // Silently fail if attachment doesn't work
      console.warn('Could not attach debug info:', error);
    }
  }
}

/**
 * Wrapper for test steps with Allure integration
 */
export async function testStep<T>(
  name: string,
  action: () => Promise<T>,
  context?: AssertionContext
): Promise<T> {
  return await allure.step(name, async () => {
    try {
      console.log(`📍 Step: ${name}`);
      const result = await action();
      return result;
    } catch (error) {
      // Attach context on error
      if (context) {
        await attachment(
          'Step Failure Context',
          JSON.stringify({
            step: name,
            ...context,
            error: error.message
          }, null, 2),
          'application/json'
        );
      }
      throw error;
    }
  });
}

/**
 * Create a context-aware expect wrapper
 */
export function expectWithContext(actual: any, context: AssertionContext) {
  return {
    toBe: async (expected: any) => {
      try {
        expect(actual).toBe(expected);
      } catch (error) {
        // On failure, attach context before re-throwing
        const message = `${context.operation || 'Value'} at ${context.endpoint || 'endpoint'}\n` +
          `Expected: ${JSON.stringify(expected)}\n` +
          `Actual: ${JSON.stringify(actual)}\n` +
          `Entity: ${context.entityType} ${context.entityId || ''}`.trim();
        
        await attachment(
          'Assertion Failure Context',
          JSON.stringify({
            ...context,
            actual,
            expected,
            message,
            assertion: 'toBe'
          }, null, 2),
          'application/json'
        );
        
        console.error(`❌ ${message}`);
        throw error; // Re-throw original error for test framework
      }
    },
    
    toBeTruthy: async () => {
      try {
        expect(actual).toBeTruthy();
      } catch (error) {
        const message = `${context.operation || 'Value'} at ${context.endpoint || 'endpoint'}\n` +
          `Expected: truthy value\n` +
          `Actual: ${JSON.stringify(actual)}\n` +
          `Entity: ${context.entityType} ${context.entityId || ''}`.trim();
        
        await attachment(
          'Assertion Failure Context',
          JSON.stringify({
            ...context,
            actual,
            expected: 'truthy value',
            message,
            assertion: 'toBeTruthy'
          }, null, 2),
          'application/json'
        );
        
        console.error(`❌ ${message}`);
        throw error;
      }
    },
    
    toBeDefined: async () => {
      try {
        expect(actual).toBeDefined();
      } catch (error) {
        const message = `${context.operation || 'Value'} at ${context.endpoint || 'endpoint'}\n` +
          `Expected: defined value\n` +
          `Actual: ${actual === undefined ? 'undefined' : JSON.stringify(actual)}\n` +
          `Entity: ${context.entityType} ${context.entityId || ''}`.trim();
        
        await attachment(
          'Assertion Failure Context',
          JSON.stringify({
            ...context,
            actual: actual === undefined ? 'undefined' : actual,
            expected: 'defined value',
            message,
            assertion: 'toBeDefined'
          }, null, 2),
          'application/json'
        );
        
        console.error(`❌ ${message}`);
        throw error;
      }
    }
  };
}