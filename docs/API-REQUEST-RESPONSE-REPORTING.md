# API Request/Response Reporting in Allure

## Overview

The test suite now automatically captures and attaches full API request and response data to Allure reports. This makes debugging test failures much easier by providing complete visibility into what was sent and received.

## What Gets Captured

For each API call, the following information is captured:

### Request Data
- **HTTP Method** (GET, POST, PUT, DELETE, etc.)
- **Endpoint URL**
- **Headers** (with sensitive data masked)
- **Request Body** (full JSON payload)
- **Query Parameters**
- **Correlation ID** for tracing

### Response Data
- **Status Code**
- **Response Headers** (when available)
- **Response Body** (full JSON response)
- **Error Details** (if request failed)
- **Duration** (request timing in milliseconds)

### Metadata
- **Timestamp** of the request
- **Service Name** (Identity, Tenant, ClientManagement)
- **Test Context** information

## How It Works

1. **Automatic Capture**: Every API call made through the `TypedApiClient` is automatically captured
2. **Allure Attachments**: Data is attached to Allure reports as both:
   - Formatted text for easy reading
   - JSON for structured analysis
3. **Test Summary**: At the end of each test, a complete API call history is attached

## Example in Allure Report

When you run tests and generate an Allure report, you'll see:

```
Test: should create a new client group
├── Step: Create new client group
│   └── Attachment: API Call: POST /api/groups
│       └── Shows full request/response details
├── Step: Verify group creation response
│   └── Attachment: Assertion Failure Context (if failed)
└── Attachment: Complete API Call History
    └── Shows all API calls made during the test
```

## Configuration

Control the reporting behavior using environment variables:

### Enable/Disable Features

```bash
# Disable all API reporting (for faster test runs)
API_REPORTING=false npm test

# Don't include headers in reports
API_REPORT_HEADERS=false npm test

# Don't include request/response bodies
API_REPORT_BODY=false npm test

# Don't mask sensitive data (passwords, tokens, etc.)
# ⚠️ Use with caution! Only for local debugging
API_UNMASK_SENSITIVE=true npm test

# Don't attach to Allure reports
API_ALLURE_ATTACH=false npm test

# Also log API calls to console (useful for debugging)
API_CONSOLE_LOG=true npm test
```

### Common Usage Patterns

**Full debugging mode (maximum information):**
```bash
API_CONSOLE_LOG=true npm test
```

**Fast test mode (minimal reporting):**
```bash
API_REPORTING=false npm test
```

**Security-conscious mode (no sensitive data):**
```bash
# This is the default - sensitive data is automatically masked
npm test
```

## Viewing the Reports

### In Allure Report

1. Run tests: `npm test`
2. Generate Allure report: `npm run allure:generate`
3. Open report: `npm run allure:open`
4. Click on a test to see attachments

### Attachment Types

- **"API Call: METHOD /endpoint"** - Individual API call details
- **"API Call JSON: METHOD /endpoint"** - Same data in JSON format
- **"Complete API Call History"** - All calls made during the test

## What Gets Masked

By default, the following sensitive data is automatically masked:

- Passwords
- Tokens (auth tokens, refresh tokens, API keys)
- Authorization headers
- Secrets and credentials
- Private keys

Masked values appear as `***MASKED***` in reports.

## Benefits

1. **Debugging Made Easy**: See exactly what was sent and received
2. **Correlation Tracking**: Follow requests across services with correlation IDs
3. **Performance Insights**: See request durations to identify slow endpoints
4. **Error Analysis**: Full error details including stack traces
5. **Test Documentation**: Reports serve as API documentation

## Example Report Output

```json
{
  "endpoint": "/api/groups",
  "method": "POST",
  "request": {
    "headers": {
      "X-Correlation-ID": "abc123",
      "Authorization": "***MASKED***",
      "Content-Type": "application/json"
    },
    "body": {
      "name": "TestGroup_1234567890",
      "description": "Test group for API testing",
      "tenantId": "test-tenant-123"
    }
  },
  "response": {
    "status": 200,
    "body": {
      "groupId": "grp_xyz789",
      "name": "TestGroup_1234567890",
      "description": "Test group for API testing",
      "createdAt": "2024-01-16T10:30:00Z"
    }
  },
  "correlationId": "abc123",
  "duration": 145,
  "timestamp": "2024-01-16T10:30:00.000Z"
}
```

## Troubleshooting

### Reports are too large

If reports become too large with full request/response data:

```bash
# Disable body capture for large payload tests
API_REPORT_BODY=false npm test
```

### Can't see sensitive data for debugging

For local debugging only:

```bash
# ⚠️ Never use in CI/CD or shared environments
API_UNMASK_SENSITIVE=true API_CONSOLE_LOG=true npm test
```

### Want to see requests in real-time

Enable console logging:

```bash
API_CONSOLE_LOG=true npm test
```

## Implementation Details

The reporting system consists of:

1. **`ApiAllureReporter`** - Handles capturing and formatting API data
2. **`TypedApiClient`** - Enhanced to capture all API calls
3. **Configuration** - Environment variable based configuration
4. **Global Setup** - Initializes reporter at test start

All sensitive data masking happens before data is attached to reports, ensuring security by default.