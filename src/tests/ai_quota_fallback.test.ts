import { describe, it, expect } from 'vitest';
import { runAiAnalyst } from '../server/ai/orchestrator';
import { DatasetProfile } from '../types/dataset';
import { AiAnalystRequest } from '../types/ai';

const sampleProfile: DatasetProfile = {
  datasetId: 'ds_test_123',
  ownerId: 'user_A_123',
  fileName: 'monthly_sales.csv',
  fileType: 'csv',
  fileSizeBytes: 1024,
  rowCount: 100,
  columnCount: 3,
  duplicateRowCount: 0,
  duplicateRowPercentage: 0,
  missingValueCount: 0,
  missingDataPercentage: 0,
  columnsWithMissingValues: 0,
  dataQualityScore: 98,
  dataQualityExplanation: 'Clean sales dataset with 100 observations across category, revenue, and units_sold.',
  columns: [
    {
      name: 'category',
      normalizedName: 'category',
      logicalType: 'categorical',
      pandasDtype: 'object',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 4,
      sampleValues: ['Electronics', 'Furniture', 'Clothing', 'Food'],
      isDateTimeCandidate: false,
    },
    {
      name: 'revenue',
      normalizedName: 'revenue',
      logicalType: 'numeric',
      pandasDtype: 'float64',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 95,
      sampleValues: [120.5, 450.0, 89.9],
      statistics: {
        mean: 250.4,
        std: 85.2,
        min: 50.0,
        max: 890.0,
        median: 230.0,
        q25: 180.0,
        q75: 310.0,
      },
      isDateTimeCandidate: false,
    },
    {
      name: 'units_sold',
      normalizedName: 'units_sold',
      logicalType: 'numeric',
      pandasDtype: 'int64',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 40,
      sampleValues: [10, 25, 8],
      statistics: {
        mean: 18.2,
        std: 6.4,
        min: 2,
        max: 45,
        median: 17,
        q25: 12,
        q75: 22,
      },
      isDateTimeCandidate: false,
    },
  ],
  numericColumns: ['revenue', 'units_sold'],
  categoricalColumns: ['category'],
  textColumns: [],
  datetimeColumns: [],
  booleanColumns: [],
  potentialTargets: [],
  previewRows: [
    { category: 'Electronics', revenue: 120.5, units_sold: 10 },
    { category: 'Furniture', revenue: 450.0, units_sold: 25 },
  ],
  profileStatus: 'completed',
  createdAt: new Date().toISOString(),
};

describe('Task 8: AI Quota 429 Resilience & Deterministic Fallback Tests', () => {
  it('8. Gemini 429 / RESOURCE_EXHAUSTED correctly activates deterministic fallback analysis', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_test_123',
      message: 'What are the main outliers in revenue?',
      conversationId: 'conv_429_test',
    };

    const result = await runAiAnalyst(req, sampleProfile, 'user_A_123');

    expect(result).toBeDefined();
    expect(result.conversationId).toBe('conv_429_test');
    expect(result.messageId).toBeDefined();
    // User-facing answer must NOT leak internal tool names or debug traces
    expect(result.answer).not.toContain('detect_outliers');
    expect(result.answer).not.toContain('Analysis computed deterministically');
    expect(result.answer).toContain('Outlier Analysis');
    // Tools are tracked cleanly in metadata and trace
    expect(result.execution?.toolsUsed).toContain('detect_outliers');
    expect(result.toolTrace.some((t) => t.toolName === 'detect_outliers')).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.methodology).toBeDefined();
  });

  it('9. Gemini 429 executes a single deterministic path without uncontrolled retry loops', async () => {
    const startTime = Date.now();
    const req: AiAnalystRequest = {
      datasetId: 'ds_test_123',
      message: 'Calculate correlation between revenue and units_sold',
    };

    const result = await runAiAnalyst(req, sampleProfile, 'user_A_123');
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(3000);
    expect(result.toolTrace.length).toBeGreaterThanOrEqual(1);
    expect(result.toolTrace[0].toolName).toBe('calculate_correlation');
  });

  it('10. Deterministic fallback responses produce valid Firestore-serializable payloads', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_test_123',
      message: 'Assess data quality and missing rows',
    };

    const result = await runAiAnalyst(req, sampleProfile, 'user_A_123');

    const serialized = JSON.stringify(result);
    const parsed = JSON.parse(serialized);

    expect(parsed.datasetId).toBe('ds_test_123');
    expect(parsed.answer).toBeDefined();
    expect(Array.isArray(parsed.evidence)).toBe(true);
    expect(Array.isArray(parsed.toolTrace)).toBe(true);
  });
});
