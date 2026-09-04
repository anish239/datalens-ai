import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveUserAnalysis,
  listUserAnalyses,
  getUserAnalysesMetrics,
  clearUserAnalyses,
} from '../server/analyses/analysisService';
import { AnalysisRecord } from '../types/analysis';
import { saveAnalysisRecord, getUserAnalyses, getUserMetrics, clearLocalAnalyses } from '../services/firestore';
import fs from 'fs';
import path from 'path';

describe('DataLens AI — Dashboard Analyses & Insights Persistence Engine', () => {
  const userA = 'user_analyst_alpha_123';
  const userB = 'user_analyst_beta_456';
  const datasetA = 'dataset_car_market_001';
  const datasetB = 'dataset_sales_q3_002';

  const testAnalysesDir = path.join(process.cwd(), 'data', 'analyses');

  beforeEach(() => {
    // Clear in-memory stores
    clearUserAnalyses(userA);
    clearUserAnalyses(userB);
    clearLocalAnalyses(userA);
    clearLocalAnalyses(userB);

    // Clean up test directories if they exist
    try {
      const userADir = path.join(testAnalysesDir, userA);
      const userBDir = path.join(testAnalysesDir, userB);
      if (fs.existsSync(userADir)) fs.rmSync(userADir, { recursive: true, force: true });
      if (fs.existsSync(userBDir)) fs.rmSync(userBDir, { recursive: true, force: true });
    } catch {}

    // Clear localStorage simulation if in test environment
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    clearUserAnalyses(userA);
    clearUserAnalyses(userB);
    clearLocalAnalyses(userA);
    clearLocalAnalyses(userB);

    try {
      const userADir = path.join(testAnalysesDir, userA);
      const userBDir = path.join(testAnalysesDir, userB);
      if (fs.existsSync(userADir)) fs.rmSync(userADir, { recursive: true, force: true });
      if (fs.existsSync(userBDir)) fs.rmSync(userBDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. No active dataset -> Analyses 0, Insights 0', () => {
    const metricsA = getUserAnalysesMetrics(userA, null);
    expect(metricsA.analysisCount).toBe(0);
    expect(metricsA.insightCount).toBe(0);

    const metricsUndefined = getUserAnalysesMetrics(userA, undefined);
    expect(metricsUndefined.analysisCount).toBe(0);
    expect(metricsUndefined.insightCount).toBe(0);
  });

  it('2 & 3. Dataset A active with 3 analyses and 10 insights -> Analyses 3, Insights 10', () => {
    const analysis1: AnalysisRecord = {
      id: `analysis_msg_001`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_101',
      messageId: 'msg_001',
      query: 'What factors influence selling price most strongly?',
      answer: 'Engine displacement and vehicle age show strongest correlation with selling price.',
      keyFindings: ['Finding 1', 'Finding 2', 'Finding 3'],
      insightsCount: 3,
      status: 'completed',
      createdAt: new Date(Date.now() - 3000).toISOString(),
    };

    const analysis2: AnalysisRecord = {
      id: `analysis_msg_002`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_101',
      messageId: 'msg_002',
      query: 'Analyze fuel type distribution',
      answer: 'Diesel represents 45% of total records.',
      keyFindings: ['Finding 4', 'Finding 5', 'Finding 6', 'Finding 7'],
      insightsCount: 4,
      status: 'completed',
      createdAt: new Date(Date.now() - 2000).toISOString(),
    };

    const analysis3: AnalysisRecord = {
      id: `analysis_msg_003`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_101',
      messageId: 'msg_003',
      query: 'Detect mileage anomalies',
      answer: '3 outliers detected above 250k km.',
      keyFindings: ['Finding 8', 'Finding 9', 'Finding 10'],
      insightsCount: 3,
      status: 'completed',
      createdAt: new Date(Date.now() - 1000).toISOString(),
    };

    saveUserAnalysis(userA, analysis1);
    saveUserAnalysis(userA, analysis2);
    saveUserAnalysis(userA, analysis3);

    const metricsDatasetA = getUserAnalysesMetrics(userA, datasetA);
    expect(metricsDatasetA.analysisCount).toBe(3);
    expect(metricsDatasetA.insightCount).toBe(10);
  });

  it('4. Dataset B active -> Dataset A counts are NOT shown (isolated)', () => {
    // Dataset A has 3 analyses / 10 insights from previous test or newly created
    const analysisA: AnalysisRecord = {
      id: `analysis_A_1`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_A',
      messageId: 'msg_A',
      query: 'Price trend',
      answer: 'Upward trend',
      keyFindings: ['Insight A1', 'Insight A2'],
      insightsCount: 2,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveUserAnalysis(userA, analysisA);

    // Dataset B has 0 analyses currently
    const metricsDatasetB = getUserAnalysesMetrics(userA, datasetB);
    expect(metricsDatasetB.analysisCount).toBe(0);
    expect(metricsDatasetB.insightCount).toBe(0);
  });

  it('5. Dataset A has historical analyses but no active dataset -> returns 0/0', () => {
    const analysisA: AnalysisRecord = {
      id: `analysis_historical_A`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_A',
      messageId: 'msg_A',
      query: 'Historical query',
      answer: 'Historical answer',
      keyFindings: ['Historical Insight 1', 'Historical Insight 2'],
      insightsCount: 2,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveUserAnalysis(userA, analysisA);

    // No active dataset specified
    const metricsNoActive = getUserAnalysesMetrics(userA, null);
    expect(metricsNoActive.analysisCount).toBe(0);
    expect(metricsNoActive.insightCount).toBe(0);

    const metricsUndefined = getUserAnalysesMetrics(userA, undefined);
    expect(metricsUndefined.analysisCount).toBe(0);
    expect(metricsUndefined.insightCount).toBe(0);
  });

  it('6. Switching A -> B refreshes metrics correctly', () => {
    const analysisA: AnalysisRecord = {
      id: `analysis_switch_A`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'c1',
      messageId: 'm1',
      query: 'A query',
      answer: 'A answer',
      keyFindings: ['Finding A1', 'Finding A2'],
      insightsCount: 2,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    const analysisB: AnalysisRecord = {
      id: `analysis_switch_B`,
      ownerId: userA,
      datasetId: datasetB,
      datasetName: 'Q3_Sales.xlsx',
      conversationId: 'c2',
      messageId: 'm2',
      query: 'B query',
      answer: 'B answer',
      keyFindings: ['Finding B1'],
      insightsCount: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveUserAnalysis(userA, analysisA);
    saveUserAnalysis(userA, analysisB);

    // When A is active:
    const metricsA = getUserAnalysesMetrics(userA, datasetA);
    expect(metricsA.analysisCount).toBe(1);
    expect(metricsA.insightCount).toBe(2);

    // When switched to B:
    const metricsB = getUserAnalysesMetrics(userA, datasetB);
    expect(metricsB.analysisCount).toBe(1);
    expect(metricsB.insightCount).toBe(1);
  });

  it('7. Clearing the active dataset -> returns 0/0', () => {
    const analysisA: AnalysisRecord = {
      id: `analysis_clear_A`,
      ownerId: userA,
      datasetId: datasetA,
      conversationId: 'c1',
      messageId: 'm1',
      query: 'Query',
      answer: 'Answer',
      keyFindings: ['Insight 1'],
      insightsCount: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveUserAnalysis(userA, analysisA);

    expect(getUserAnalysesMetrics(userA, datasetA).analysisCount).toBe(1);
    // Active dataset cleared
    expect(getUserAnalysesMetrics(userA, null).analysisCount).toBe(0);
    expect(getUserAnalysesMetrics(userA, null).insightCount).toBe(0);
  });

  it('8. Previous dataset records remain persisted on disk and are not deleted', () => {
    const recordA: AnalysisRecord = {
      id: `analysis_persist_A`,
      ownerId: userA,
      datasetId: datasetA,
      datasetName: 'Car_Market.csv',
      conversationId: 'conv_persist',
      messageId: 'msg_persist',
      query: 'Persist query',
      answer: 'Persist answer',
      keyFindings: ['Persist finding'],
      insightsCount: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    saveUserAnalysis(userA, recordA);

    // Verify file exists on disk
    const expectedFilePath = path.join(testAnalysesDir, userA, `${recordA.id}.json`);
    expect(fs.existsSync(expectedFilePath)).toBe(true);

    // Even when querying with datasetB or null, disk file and all analyses remain intact
    const allAnalyses = listUserAnalyses(userA);
    expect(allAnalyses.some((a) => a.id === recordA.id)).toBe(true);

    const metricsB = getUserAnalysesMetrics(userA, datasetB);
    expect(metricsB.analysisCount).toBe(0);
    expect(fs.existsSync(expectedFilePath)).toBe(true); // File was NOT deleted
  });

  it('9. User A cannot see User B metrics (strict multi-tenant isolation)', () => {
    const a1: AnalysisRecord = {
      id: 'analysis_userA_sec',
      ownerId: userA,
      datasetId: datasetA,
      conversationId: 'c1',
      messageId: 'm1',
      query: 'Trend test A',
      answer: 'Positive trend',
      keyFindings: ['Finding 1', 'Finding 2'],
      insightsCount: 2,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    const b1: AnalysisRecord = {
      id: 'analysis_userB_sec',
      ownerId: userB,
      datasetId: datasetA, // Same dataset ID name, different owner
      conversationId: 'cB1',
      messageId: 'mB1',
      query: 'User B query',
      answer: 'User B result',
      keyFindings: ['User B insight'],
      insightsCount: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveUserAnalysis(userA, a1);
    saveUserAnalysis(userB, b1);

    const metricsA = getUserAnalysesMetrics(userA, datasetA);
    expect(metricsA.analysisCount).toBe(1);
    expect(metricsA.insightCount).toBe(2);

    const metricsB = getUserAnalysesMetrics(userB, datasetA);
    expect(metricsB.analysisCount).toBe(1);
    expect(metricsB.insightCount).toBe(1);

    // User C (unregistered / unknown)
    const metricsC = getUserAnalysesMetrics('user_unknown_999', datasetA);
    expect(metricsC.analysisCount).toBe(0);
    expect(metricsC.insightCount).toBe(0);
  });

  it('10. Client-side getUserMetrics with null activeDatasetId returns 0/0 without restoring stale analyses', async () => {
    const metrics = await getUserMetrics(userA, null);
    expect(metrics.analysisCount).toBe(0);
    expect(metrics.insightCount).toBe(0);
  });

  it('11. Client-side saveAnalysisRecord updates local storage and dispatches update event', async () => {
    const customEventSpy = vi.fn();
    if (typeof window !== 'undefined') {
      window.addEventListener('datalens:metrics-updated', customEventSpy);
    }

    const clientRecord: AnalysisRecord = {
      id: 'analysis_client_001',
      ownerId: userA,
      datasetId: datasetA,
      conversationId: 'c_client',
      messageId: 'm_client',
      query: 'Client query',
      answer: 'Client answer',
      keyFindings: ['Insight A', 'Insight B'],
      insightsCount: 2,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    await saveAnalysisRecord(clientRecord);

    const userAnalyses = await getUserAnalyses(userA, datasetA);
    expect(userAnalyses.length).toBeGreaterThanOrEqual(1);
    expect(userAnalyses.some((a) => a.id === 'analysis_client_001')).toBe(true);

    if (typeof window !== 'undefined') {
      expect(customEventSpy).toHaveBeenCalled();
      window.removeEventListener('datalens:metrics-updated', customEventSpy);
    }
  });

  it('12. Unauthenticated call to getUserMetrics throws error rather than falsely displaying 0', async () => {
    await expect(getUserMetrics('')).rejects.toThrow();
  });
});
