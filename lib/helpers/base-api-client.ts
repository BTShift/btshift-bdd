/**
 * Base API Client for DRY Test Context Injection
 * All API clients should extend this base class to automatically get test context support
 */

import { TestContextManager } from './test-context-manager';
import { randomUUID } from 'crypto';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  body?: any;
  params?: any;
  [key: string]: any;
}

export interface EnhancedApiResponse<T = any> {
  data: T;
  correlationId: string;
  requestCorrelationId: string;
}

export abstract class BaseApiClient {
  protected baseUrl: string;
  protected authToken: string | null = null;
  protected lastCorrelationId: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env['API_GATEWAY_URL'] || 'http://localhost:8080';
  }

  /**
   * Make an HTTP request with automatic test context injection
   */
  protected async makeRequest<T = any>(
    path: string, 
    method: string, 
    options: ApiRequestOptions = {}
  ): Promise<EnhancedApiResponse<T>> {
    // Get test context from TestContextManager
    const testContext = TestContextManager.getInstance().getContextHeader();
    
    // Generate correlation ID for this request
    const correlationId = randomUUID();
    this.lastCorrelationId = correlationId;
    
    // Enhance options with context and correlation ID
    const enhancedOptions = {
      ...options,
      headers: {
        'X-Correlation-ID': correlationId,
        ...(testContext && { 'X-Test-Context': testContext }),
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` }),
        ...options.headers
      }
    };
    
    // Log context information
    if (testContext) {
      const context = JSON.parse(testContext);
      console.log(`🧪 [${context.currentStep}] ${method.toUpperCase()} ${path} | Correlation: ${correlationId}`);
    } else {
      console.warn(`⚠️  No test context for ${method.toUpperCase()} ${path} | Correlation: ${correlationId}`);
    }
    
    try {
      // Execute the actual request (implemented by child classes)
      const result = await this.executeRequest(path, method, enhancedOptions);
      
      console.log(`✅ ${method.toUpperCase()} ${path} | Correlation: ${correlationId} | Success`);
      
      // Return enhanced response with metadata
      return {
        data: result,
        correlationId: correlationId,
        requestCorrelationId: correlationId
      };
    } catch (error: any) {
      console.error(`❌ ${method.toUpperCase()} ${path} | Correlation: ${correlationId} | Error:`, error.message);
      
      // Enhance error with correlation ID
      error.correlationId = correlationId;
      error.requestCorrelationId = correlationId;
      throw error;
    }
  }

  /**
   * Abstract method to be implemented by child classes for actual HTTP execution
   */
  protected abstract executeRequest(path: string, method: string, options: ApiRequestOptions): Promise<any>;

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Get last correlation ID used
   */
  getLastCorrelationId(): string | null {
    return this.lastCorrelationId;
  }

  /**
   * Validate that a response contains expected fields
   */
  protected validateResponse(response: any, requiredFields: string[], operation: string): void {
    const missingFields = requiredFields.filter(field => !response?.data?.[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Invalid response structure for ${operation}. Missing fields:`, missingFields);
      console.error('Response received:', response);
      throw new Error(`Missing required fields in response for ${operation}: ${missingFields.join(', ')}`);
    }
  }
}

/**
 * Helper function to validate client response structure
 */
export function validateClientResponse(response: any, operation: string): string {
  if (!response?.data?.clientId) {
    console.error(`❌ Invalid response structure for ${operation}:`, response);
    throw new Error(`Missing clientId in response for ${operation}`);
  }
  return response.data.clientId;
}

/**
 * Helper function to validate group response structure
 */
export function validateGroupResponse(response: any, operation: string): string {
  if (!response?.data?.groupId) {
    console.error(`❌ Invalid response structure for ${operation}:`, response);
    throw new Error(`Missing groupId in response for ${operation}`);
  }
  return response.data.groupId;
}