/**
 * Test Context Manager for BDD-to-Log Correlation
 * Tracks test scenario metadata and provides context for API calls
 */

export interface TestContext {
  featureFile: string;
  scenario: string;
  testCase?: string;  // Individual test case name (e.g., "should create client group with typed client")
  currentStep: string;
  testIntent: 'positive' | 'negative';
  expectedOutcome: string;
  testSessionId: string;
}

export class TestContextManager {
  private static instance: TestContextManager;
  private currentContext: TestContext | null = null;
  private testSessionId: string | null = null;

  private constructor() {}

  static getInstance(): TestContextManager {
    if (!TestContextManager.instance) {
      TestContextManager.instance = new TestContextManager();
    }
    return TestContextManager.instance;
  }

  /**
   * Start a new test session (called in Before hook)
   */
  startTestSession(featureFile: string): void {
    this.testSessionId = this.generateTestSessionId();
    console.log(`🎬 Starting test session: ${this.testSessionId} for feature: ${featureFile}`);
  }

  /**
   * Set the current scenario context
   */
  setScenario(featureFile: string, scenarioName: string, testIntent: 'positive' | 'negative' = 'positive'): void {
    this.currentContext = {
      featureFile,
      scenario: scenarioName,
      currentStep: '',
      testIntent,
      expectedOutcome: testIntent === 'positive' ? '2xx_success' : 'expected_failure',
      testSessionId: this.testSessionId || this.generateTestSessionId()
    };
    
    console.log(`📋 Test context set: ${featureFile} :: ${scenarioName} (${testIntent})`);
  }

  /**
   * Set the individual test case name (e.g., "should create client group with typed client")
   */
  setTestCase(testCaseName: string): void {
    if (!this.currentContext) {
      console.warn('⚠️  No test context set when updating test case:', testCaseName);
      return;
    }

    this.currentContext.testCase = testCaseName;
    console.log(`🧪 Test case: ${testCaseName}`);
  }

  /**
   * Update the current step being executed
   */
  setCurrentStep(stepDescription: string, expectedOutcome?: string): void {
    if (!this.currentContext) {
      console.warn('⚠️  No test context set when updating step:', stepDescription);
      return;
    }

    this.currentContext.currentStep = stepDescription;
    if (expectedOutcome) {
      this.currentContext.expectedOutcome = expectedOutcome;
    }

    console.log(`🔄 Current step: ${stepDescription}`);
  }

  /**
   * Get the current test context for API calls
   */
  getCurrentContext(): TestContext | null {
    return this.currentContext;
  }

  /**
   * Get test context as HTTP header value (JSON string)
   */
  getContextHeader(): string | null {
    if (!this.currentContext) {
      return null;
    }

    return JSON.stringify(this.currentContext);
  }

  /**
   * Clear the current context (called in After hook)
   */
  clearContext(): void {
    console.log(`🏁 Clearing test context for session: ${this.testSessionId}`);
    this.currentContext = null;
    this.testSessionId = null;
  }

  /**
   * Extract feature file name from full path
   */
  static extractFeatureName(featureUri: string): string {
    return featureUri.split('/').pop() || featureUri;
  }

  /**
   * Generate a unique test session ID
   */
  private generateTestSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `test-${timestamp}-${random}`;
  }

  /**
   * Infer test intent from scenario name and step description
   */
  static inferTestIntent(scenarioName: string, stepDescription?: string): 'positive' | 'negative' {
    const text = `${scenarioName} ${stepDescription || ''}`.toLowerCase();
    
    // Negative test indicators
    const negativeKeywords = [
      'fail', 'error', 'invalid', 'deny', 'denied', 'forbidden', 
      'unauthorized', 'bad', 'wrong', 'duplicate', 'missing',
      'should not', 'cannot', 'unable', 'reject', 'prevent'
    ];

    return negativeKeywords.some(keyword => text.includes(keyword)) ? 'negative' : 'positive';
  }

  /**
   * Map step description to expected HTTP outcome
   */
  static inferExpectedOutcome(stepDescription: string, testIntent: 'positive' | 'negative'): string {
    const step = stepDescription.toLowerCase();
    
    if (testIntent === 'negative') {
      if (step.includes('unauthorized') || step.includes('forbidden')) return '403_forbidden';
      if (step.includes('not found')) return '404_not_found';
      if (step.includes('conflict') || step.includes('duplicate')) return '409_conflict';
      if (step.includes('bad') || step.includes('invalid')) return '400_bad_request';
      return 'expected_error';
    }

    // Positive test outcomes
    if (step.includes('create') || step.includes('post')) return '201_created';
    if (step.includes('update') || step.includes('put') || step.includes('patch')) return '200_updated';
    if (step.includes('delete')) return '204_deleted';
    if (step.includes('get') || step.includes('read') || step.includes('retrieve')) return '200_success';
    
    return '2xx_success';
  }
}