/**
 * API Allure Reporter - Captures and attaches API request/response data to Allure reports
 */

import { attachment } from 'allure-js-commons';
import { allure } from 'allure-playwright';

export interface ApiCallDetails {
  endpoint: string;
  method: string;
  request: {
    headers?: Record<string, any>;
    body?: any;
    params?: any;
    query?: any;
  };
  response: {
    status?: number;
    headers?: Record<string, any>;
    body?: any;
    error?: any;
  };
  correlationId?: string;
  duration?: number;
  timestamp?: Date;
}

/**
 * Configuration for API reporting
 */
export interface ApiReportConfig {
  enabled: boolean;
  includeHeaders: boolean;
  includeBody: boolean;
  maskSensitiveData: boolean;
  attachToAllure: boolean;
  consoleLog: boolean;
}

// Default configuration
const defaultConfig: ApiReportConfig = {
  enabled: process.env['API_VERBOSE_LOGGING'] !== 'false', // Enabled by default unless explicitly disabled
  includeHeaders: true,
  includeBody: true,
  maskSensitiveData: true,
  attachToAllure: true,
  consoleLog: false
};

export class ApiAllureReporter {
  private static config: ApiReportConfig = defaultConfig;
  private static apiCallHistory: ApiCallDetails[] = [];

  /**
   * Configure the API reporter
   */
  static configure(config: Partial<ApiReportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Mask sensitive data in objects
   */
  private static maskSensitiveData(data: any): any {
    if (!data || !this.config.maskSensitiveData) return data;

    const sensitiveKeys = [
      'password', 'token', 'authorization', 'api_key', 'apikey', 
      'secret', 'credential', 'private_key', 'access_token', 'refresh_token'
    ];

    const mask = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => mask(item));
      }

      const masked: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          masked[key] = '***MASKED***';
        } else if (typeof value === 'object') {
          masked[key] = mask(value);
        } else {
          masked[key] = value;
        }
      }
      return masked;
    };

    return mask(data);
  }

  /**
   * Format API call details for display
   */
  private static formatApiCall(details: ApiCallDetails): string {
    const lines: string[] = [];
    
    lines.push(`=== API Call Details ===`);
    lines.push(`Method: ${details.method.toUpperCase()}`);
    lines.push(`Endpoint: ${details.endpoint}`);
    lines.push(`Correlation ID: ${details.correlationId || 'N/A'}`);
    lines.push(`Timestamp: ${details.timestamp?.toISOString() || new Date().toISOString()}`);
    lines.push(`Duration: ${details.duration ? `${details.duration}ms` : 'N/A'}`);
    
    if (this.config.includeHeaders && details.request.headers) {
      lines.push(`\n=== Request Headers ===`);
      lines.push(JSON.stringify(this.maskSensitiveData(details.request.headers), null, 2));
    }
    
    if (this.config.includeBody) {
      if (details.request.body) {
        lines.push(`\n=== Request Body ===`);
        lines.push(JSON.stringify(this.maskSensitiveData(details.request.body), null, 2));
      }
      
      if (details.request.params) {
        lines.push(`\n=== Request Params ===`);
        lines.push(JSON.stringify(this.maskSensitiveData(details.request.params), null, 2));
      }
      
      if (details.request.query) {
        lines.push(`\n=== Query Parameters ===`);
        lines.push(JSON.stringify(this.maskSensitiveData(details.request.query), null, 2));
      }
    }
    
    lines.push(`\n=== Response ===`);
    if (details.response.status) {
      lines.push(`Status: ${details.response.status}`);
    }
    
    if (this.config.includeHeaders && details.response.headers) {
      lines.push(`\nResponse Headers:`);
      lines.push(JSON.stringify(this.maskSensitiveData(details.response.headers), null, 2));
    }
    
    if (this.config.includeBody) {
      if (details.response.body) {
        lines.push(`\nResponse Body:`);
        lines.push(JSON.stringify(this.maskSensitiveData(details.response.body), null, 2));
      }
      
      if (details.response.error) {
        lines.push(`\nError Details:`);
        lines.push(JSON.stringify(this.maskSensitiveData(details.response.error), null, 2));
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Report an API call to Allure
   */
  static async reportApiCall(details: ApiCallDetails): Promise<void> {
    if (!this.config.enabled) return;

    // Store in history
    this.apiCallHistory.push(details);

    // Format the call details
    const formatted = this.formatApiCall(details);

    // Console log if enabled
    if (this.config.consoleLog) {
      console.log(formatted);
    }

    // Attach to Allure if enabled
    if (this.config.attachToAllure) {
      try {
        const fileName = `${details.method.toUpperCase()}_${details.endpoint.replace(/\//g, '_')}_${Date.now()}`;
        
        // Attach formatted text
        await attachment(
          `API Call: ${details.method.toUpperCase()} ${details.endpoint}`,
          formatted,
          'text/plain'
        );

        // Also attach as JSON for better structure
        await attachment(
          `API Call JSON: ${details.method.toUpperCase()} ${details.endpoint}`,
          JSON.stringify(this.maskSensitiveData(details), null, 2),
          'application/json'
        );
      } catch (error) {
        console.warn('Failed to attach API call to Allure:', error);
      }
    }
  }

  /**
   * Create an API step with automatic reporting
   */
  static async apiStep<T>(
    name: string,
    apiCall: () => Promise<T>,
    extractDetails: (result: T) => Partial<ApiCallDetails>
  ): Promise<T> {
    const startTime = Date.now();
    
    return await allure.step(name, async () => {
      try {
        const result = await apiCall();
        const duration = Date.now() - startTime;
        
        // Extract and report details
        const details = extractDetails(result);
        await this.reportApiCall({
          ...details,
          duration,
          timestamp: new Date()
        } as ApiCallDetails);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Report error
        await this.reportApiCall({
          endpoint: 'Unknown',
          method: 'Unknown',
          request: {},
          response: {
            error: {
              message: error.message,
              stack: error.stack,
              ...error
            }
          },
          duration,
          timestamp: new Date()
        });
        
        throw error;
      }
    });
  }

  /**
   * Get API call history
   */
  static getHistory(): ApiCallDetails[] {
    return [...this.apiCallHistory];
  }

  /**
   * Clear API call history
   */
  static clearHistory(): void {
    this.apiCallHistory = [];
  }

  /**
   * Attach full API history to Allure (useful at test end)
   */
  static async attachFullHistory(testName?: string): Promise<void> {
    if (!this.config.enabled || !this.config.attachToAllure) return;
    
    if (this.apiCallHistory.length === 0) return;

    try {
      const summary = {
        testName: testName || 'API Test',
        totalCalls: this.apiCallHistory.length,
        timestamp: new Date().toISOString(),
        calls: this.apiCallHistory.map(call => this.maskSensitiveData(call))
      };

      await attachment(
        'Complete API Call History',
        JSON.stringify(summary, null, 2),
        'application/json'
      );
    } catch (error) {
      console.warn('Failed to attach API history to Allure:', error);
    }
  }
}