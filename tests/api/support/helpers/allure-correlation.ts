/**
 * Allure integration helper for correlation ID reporting
 * Provides utilities to automatically add correlation IDs to Allure reports
 */

import { allure } from 'allure-playwright';
import type { ApiResponse } from '../clients/typed-api-client';

export class AllureCorrelationHelper {
  /**
   * Adds correlation ID as Allure parameter and attachment
   * @param correlationId The correlation ID to report
   * @param requestCorrelationId The original request correlation ID (if different)
   * @param context Optional context information (endpoint, method, etc.)
   */
  static reportCorrelationId(
    correlationId: string,
    requestCorrelationId?: string,
    context?: {
      endpoint?: string;
      method?: string;
      serviceName?: string;
    }
  ): void {
    // Add correlation ID as parameter for easy visibility
    allure.parameter('Correlation ID', correlationId);
    
    // If request and response correlation IDs are different, show both
    if (requestCorrelationId && requestCorrelationId !== correlationId) {
      allure.parameter('Request Correlation ID', requestCorrelationId);
      allure.parameter('Response Correlation ID', correlationId);
    }
    
    // Add detailed correlation information as attachment
    const correlationInfo: any = {
      correlationId,
      timestamp: new Date().toISOString()
    };
    
    if (requestCorrelationId) {
      correlationInfo.requestCorrelationId = requestCorrelationId;
    }
    
    if (context) {
      correlationInfo.context = context;
    }
    
    allure.attachment(
      'Correlation Details',
      JSON.stringify(correlationInfo, null, 2),
      'application/json'
    );
  }

  /**
   * Extracts and reports correlation ID from an API response
   * @param response The API response containing correlation ID metadata
   * @param context Optional context information
   */
  static reportFromApiResponse(
    response: ApiResponse,
    context?: {
      endpoint?: string;
      method?: string;
      serviceName?: string;
    }
  ): void {
    this.reportCorrelationId(
      response.correlationId,
      response.requestCorrelationId,
      context
    );
  }

  /**
   * Creates an Allure step that automatically captures and reports correlation IDs
   * @param stepName The name of the step
   * @param apiCall Function that returns an API response
   * @param context Optional context information
   */
  static async stepWithCorrelation<T extends ApiResponse>(
    stepName: string,
    apiCall: () => Promise<T>,
    context?: {
      endpoint?: string;
      method?: string;
      serviceName?: string;
    }
  ): Promise<T> {
    return await allure.step(stepName, async () => {
      const response = await apiCall();
      
      // Automatically report correlation ID
      this.reportFromApiResponse(response, context);
      
      return response;
    });
  }

  /**
   * Wraps an API call to automatically capture correlation ID on errors
   * @param apiCall Function that makes an API call
   * @param context Optional context information
   */
  static async captureCorrelationOnError<T>(
    apiCall: () => Promise<T>,
    context?: {
      endpoint?: string;
      method?: string;
      serviceName?: string;
    }
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      // If error has correlation ID context, report it
      if (error.correlationId) {
        this.reportCorrelationId(
          error.correlationId,
          error.requestCorrelationId,
          context
        );
      }
      throw error;
    }
  }
}