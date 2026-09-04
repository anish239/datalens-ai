import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  listUserReports,
  getReportById,
  deleteReport,
  saveUserReport,
  clearUserReports,
  countUserReports,
  DatasetReport,
} from '../server/reports/reportService';
import { deleteReportRecord, saveReportRecord, clearLocalAnalyses } from '../services/firestore';
import fs from 'fs';
import path from 'path';

describe('DataLens AI — Report Deletion & Persistence Lifecycle Engine', () => {
  const userA = 'user_analyst_alpha_123';
  const userB = 'user_analyst_beta_456';
  const datasetA = 'dataset_car_market_001';
  const datasetB = 'dataset_sales_q3_002';

  const testReportsDir = path.join(process.cwd(), 'data', 'reports');

  // In-memory localStorage mock for node environment
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // Setup global localStorage mock
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();

    clearUserReports(userA);
    clearUserReports(userB);

    try {
      const userADir = path.join(testReportsDir, userA);
      const userBDir = path.join(testReportsDir, userB);
      if (fs.existsSync(userADir)) fs.rmSync(userADir, { recursive: true, force: true });
      if (fs.existsSync(userBDir)) fs.rmSync(userBDir, { recursive: true, force: true });
    } catch {}
  });

  afterEach(() => {
    clearUserReports(userA);
    clearUserReports(userB);

    try {
      const userADir = path.join(testReportsDir, userA);
      const userBDir = path.join(testReportsDir, userB);
      if (fs.existsSync(userADir)) fs.rmSync(userADir, { recursive: true, force: true });
      if (fs.existsSync(userBDir)) fs.rmSync(userBDir, { recursive: true, force: true });
    } catch {}
  });

  function createMockReport(reportId: string, ownerId: string, datasetId: string, title: string): DatasetReport {
    return {
      reportId,
      datasetId,
      ownerId,
      title,
      datasetName: `${datasetId}.csv`,
      fileType: 'csv',
      generatedAt: new Date().toISOString(),
      status: 'completed',
      rowCount: 500,
      columnCount: 10,
      dataQualityScore: 95,
      executiveSummary: {
        summary: `Executive summary for ${title}`,
        keyFindings: ['Key finding 1', 'Key finding 2'],
        majorAnomalies: [],
        recommendations: ['Recommendation 1'],
      },
      overview: {
        numericColumnsCount: 5,
        categoricalColumnsCount: 5,
        datetimeColumnsCount: 0,
        missingValuesTotal: 0,
        duplicateRows: 0,
        missingPercentage: 0,
      },
      columnSummary: [],
      correlations: {
        topPositive: [],
        topNegative: [],
        summary: 'No strong multicollinearity detected.',
      },
      outliers: {
        affectedColumns: [],
        totalOutliersDetected: 0,
        method: 'Interquartile Range',
      },
      dataQuality: {
        score: 95,
        missingDataPct: 0,
        duplicatesCount: 0,
        warnings: [],
        recommendations: [],
      },
      mlResults: {
        hasModels: false,
        modelsCount: 0,
        models: [],
      },
      aiInsights: {
        narrative: `AI insights narrative for ${title}`,
        generatedBy: 'deterministic_fallback',
        caveats: ['Standard confidence thresholds apply.'],
      },
      methodology: ['Descriptive statistics computed deterministically.'],
      caveats: ['Standard sample caveats.'],
    };
  }

  it('1. Successfully deletes a report from in-memory and disk persistence for owner', () => {
    // Seed reports for user A
    const rep1 = createMockReport('rep_001', userA, datasetA, 'Q1 Executive Report');
    const rep2 = createMockReport('rep_002', userA, datasetA, 'Q2 Executive Report');

    saveUserReport(rep1);
    saveUserReport(rep2);

    const userADir = path.join(testReportsDir, userA);

    // Verify initial report count
    const initialList = listUserReports(userA);
    expect(initialList.length).toBe(2);

    // Delete rep_001
    const deleteResult = deleteReport('rep_001', userA);
    expect(deleteResult).toBe(true);

    // Verify rep_001 is removed and rep_002 remains
    const remainingList = listUserReports(userA);
    expect(remainingList.length).toBe(1);
    expect(remainingList[0].reportId).toBe('rep_002');
    expect(getReportById('rep_001', userA)).toBeNull();
    expect(getReportById('rep_002', userA)).not.toBeNull();

    // Verify disk file is deleted
    expect(fs.existsSync(path.join(userADir, 'rep_001.json'))).toBe(false);
    expect(fs.existsSync(path.join(userADir, 'rep_002.json'))).toBe(true);
  });

  it('2. Enforces multi-tenant authorization: User B cannot delete User A\'s report', () => {
    const repA = createMockReport('rep_user_a', userA, datasetA, 'Confidential Financial Audit');
    saveUserReport(repA);

    const userADir = path.join(testReportsDir, userA);

    const list = listUserReports(userA);
    expect(list.some((r) => r.reportId === 'rep_user_a')).toBe(true);

    // User B attempts to delete User A's report
    expect(() => {
      deleteReport('rep_user_a', userB);
    }).toThrow(/Access denied/i);

    // User A's report must remain intact
    const afterAttempt = listUserReports(userA);
    expect(afterAttempt.some((r) => r.reportId === 'rep_user_a')).toBe(true);
    expect(fs.existsSync(path.join(userADir, 'rep_user_a.json'))).toBe(true);
  });

  it('3. Targeted deletion isolation: Deleting Report A does NOT delete Report B or Report C', () => {
    const repA = createMockReport('rep_alpha_1', userA, datasetA, 'Dataset A Report 1');
    const repB = createMockReport('rep_alpha_2', userA, datasetA, 'Dataset A Report 2');
    const repC = createMockReport('rep_beta_1', userA, datasetB, 'Dataset B Report 1');

    saveUserReport(repA);
    saveUserReport(repB);
    saveUserReport(repC);

    // Verify all 3 exist
    expect(listUserReports(userA).length).toBe(3);

    // Delete Report A
    const deleted = deleteReport('rep_alpha_1', userA);
    expect(deleted).toBe(true);

    // Verify Report B and Report C remain untouched
    const currentReports = listUserReports(userA);
    expect(currentReports.length).toBe(2);
    const ids = currentReports.map((r) => r.reportId);
    expect(ids).toContain('rep_alpha_2');
    expect(ids).toContain('rep_beta_1');
    expect(ids).not.toContain('rep_alpha_1');
  });

  it('4. Deleting non-existent report returns false gracefully without throwing unhandled exceptions', () => {
    const result = deleteReport('rep_non_existent_999', userA);
    expect(result).toBe(false);
  });

  it('5. Firestore client synchronization: deleteReportRecord updates local storage and cleans cache', async () => {
    const rep = createMockReport('rep_client_sync_01', userA, datasetA, 'Client Cached Report');

    // Save report to client store
    await saveReportRecord(rep);

    const storageKey = `datalens_reports_${userA}`;
    const rawBefore = localStorage.getItem(storageKey);
    expect(rawBefore).not.toBeNull();
    const parsedBefore = JSON.parse(rawBefore || '[]');
    expect(parsedBefore.some((r: any) => r.reportId === 'rep_client_sync_01')).toBe(true);

    // Perform client delete
    await deleteReportRecord('rep_client_sync_01', userA);

    const rawAfter = localStorage.getItem(storageKey);
    const parsedAfter = JSON.parse(rawAfter || '[]');
    expect(parsedAfter.some((r: any) => r.reportId === 'rep_client_sync_01')).toBe(false);
  });
});
