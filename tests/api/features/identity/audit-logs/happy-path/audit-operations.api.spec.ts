import { describe, beforeAll, afterAll, test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { setupApiTest, teardownApiTest, TestContext } from '../../../../support/helpers/api-test-base';

describe('Identity Service - Audit Log Operations', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    allure.parentSuite('Audit Logs');
    ctx = await setupApiTest();
  });

  afterAll(async () => {
    await teardownApiTest(ctx);
  });

  test('should retrieve audit logs', async () => {
    const response = await ctx.client.identity('/api/audit-logs', 'get', {
      params: { 
        query: { 
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });

    expect(response).toBeDefined();
    expect((response as any).logs).toBeDefined();
    expect(Array.isArray((response as any).logs)).toBe(true);
    expect((response as any).totalCount).toBeDefined();
  });

  test('should filter audit logs by user', async () => {
    const response = await ctx.client.identity('/api/audit-logs', 'get', {
      params: { 
        query: { 
          userId: 'test-user-id',
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });

    expect(response).toBeDefined();
    expect((response as any).logs).toBeDefined();
  });

  test('should filter audit logs by date range', async () => {
    const response = await ctx.client.identity('/api/audit-logs', 'get', {
      params: { 
        query: { 
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });

    expect(response).toBeDefined();
    expect((response as any).logs).toBeDefined();
  });

  test('should filter audit logs by action type', async () => {
    const response = await ctx.client.identity('/api/audit-logs', 'get', {
      params: { 
        query: { 
          actionType: 'LOGIN',
          pageNumber: 1,
          pageSize: 10
        } 
      }
    });

    expect(response).toBeDefined();
    expect((response as any).logs).toBeDefined();
    if ((response as any).logs.length > 0) {
      expect((response as any).logs[0].actionType).toBe('LOGIN');
    }
  });

  test('should get audit log by ID', async () => {
    // First get some logs
    const logsResponse = await ctx.client.identity('/api/audit-logs', 'get', {
      params: { query: { pageNumber: 1, pageSize: 1 } }
    });

    if ((logsResponse as any).logs.length > 0) {
      const logId = (logsResponse as any).logs[0].id;
      const response = await ctx.client.identity(`/api/audit-logs/${logId}`, 'get');

      expect(response).toBeDefined();
      expect((response as any).id).toBe(logId);
    }
  });

  test('should export audit logs', async () => {
    const response = await ctx.client.identity('/api/audit-logs/export', 'post', {
      body: {
        format: 'csv',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });

    expect(response).toBeDefined();
    expect((response as any).downloadUrl).toBeTruthy();
  });
});