import { describe, it, expect } from 'vitest';
import { runAiAnalyst } from '../server/ai/orchestrator';
import { DatasetProfile } from '../types/dataset';
import { AiAnalystRequest } from '../types/ai';

const mockCarDatasetProfile: DatasetProfile = {
  datasetId: 'ds_cars_presentation_test',
  ownerId: 'user_analyst_test',
  fileName: 'car_market.csv',
  fileType: 'csv',
  fileSizeBytes: 45000,
  rowCount: 301,
  columnCount: 9,
  duplicateRowCount: 2,
  duplicateRowPercentage: 0.66,
  missingValueCount: 0,
  missingDataPercentage: 0,
  columnsWithMissingValues: 0,
  dataQualityScore: 98,
  dataQualityExplanation: 'Clean dataset with minimal duplicates and zero missing values.',
  columns: [
    {
      name: 'selling_price',
      normalizedName: 'selling_price',
      logicalType: 'numeric',
      pandasDtype: 'float64',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 156,
      sampleValues: [3.35, 4.75, 7.25],
      isDateTimeCandidate: false,
      isPotentialTarget: true,
      statistics: { min: 0.1, max: 35.0, mean: 4.66, median: 3.6, std: 5.08, q25: 0.9, q75: 6.0 },
    },
    {
      name: 'present_price',
      normalizedName: 'present_price',
      logicalType: 'numeric',
      pandasDtype: 'float64',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 147,
      sampleValues: [5.59, 9.54, 9.85],
      isDateTimeCandidate: false,
      statistics: { min: 0.32, max: 92.6, mean: 7.63, median: 5.4, std: 8.64, q25: 1.2, q75: 9.9 },
    },
    {
      name: 'kms_driven',
      normalizedName: 'kms_driven',
      logicalType: 'numeric',
      pandasDtype: 'int64',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 206,
      sampleValues: [27000, 43000, 6900],
      isDateTimeCandidate: false,
      statistics: { min: 500, max: 500000, mean: 36947, median: 30541, std: 38886, q25: 15000, q75: 48767 },
    },
    {
      name: 'fuel_type',
      normalizedName: 'fuel_type',
      logicalType: 'categorical',
      pandasDtype: 'object',
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 3,
      sampleValues: ['Petrol', 'Diesel', 'CNG'],
      isDateTimeCandidate: false,
      topValues: [
        { value: 'Petrol', count: 239, percentage: 79.4 },
        { value: 'Diesel', count: 60, percentage: 19.9 },
        { value: 'CNG', count: 2, percentage: 0.7 },
      ],
    },
  ],
  numericColumns: ['selling_price', 'present_price', 'kms_driven'],
  categoricalColumns: ['fuel_type'],
  textColumns: [],
  booleanColumns: [],
  datetimeColumns: [],
  potentialTargets: [
    {
      columnName: 'selling_price',
      logicalType: 'numeric',
      reason: 'Key financial outcome',
      confidence: 'high',
    },
  ],
  previewRows: [
    { selling_price: 3.35, present_price: 5.59, kms_driven: 27000, fuel_type: 'Petrol' },
    { selling_price: 4.75, present_price: 9.54, kms_driven: 43000, fuel_type: 'Diesel' },
    { selling_price: 7.25, present_price: 9.85, kms_driven: 6900, fuel_type: 'Petrol' },
    { selling_price: 2.85, present_price: 4.15, kms_driven: 5200, fuel_type: 'Petrol' },
  ],
  createdAt: new Date().toISOString(),
  profileStatus: 'complete',
};

describe('AI Analyst Presentation & Internal Metadata Segregation Tests', () => {
  it('1. Returns clean executive Markdown response without internal tool leaking on correlation query', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'What are the main correlations with selling_price in this dataset?',
      conversationId: 'conv_pres_1',
    };

    const res = await runAiAnalyst(req, mockCarDatasetProfile, 'user_analyst_test');

    expect(res).toBeDefined();
    expect(res.answer).toBeDefined();

    // Verify presence of professional sections
    expect(res.answer).toContain('### Correlation Analysis');
    expect(res.answer).toContain('Key findings');
    expect(res.answer).toContain('### What this means');
    expect(res.answer).toContain('### Suggested next analysis');

    // CRITICAL: Verify ABSENCE of raw internal debug artifacts and tool leaks
    expect(res.answer).not.toContain('using tool:');
    expect(res.answer).not.toContain('Analysis computed deterministically');
    expect(res.answer).not.toContain('Source of Truth:');
    expect(res.answer).not.toContain('svgDataset');
    expect(res.answer).not.toContain('svgVerified');
    expect(res.answer).not.toContain('Tool: calculate_correlation');

    // Verify internal execution metadata is segregated into dedicated execution property
    expect(res.execution).toBeDefined();
    expect(res.execution?.provider).toBe('deterministic');
    expect(res.execution?.toolsUsed).toContain('calculate_correlation');
    expect(res.toolTrace.length).toBeGreaterThan(0);
    expect(res.toolTrace[0].toolName).toBe('calculate_correlation');
  });

  it('2. Returns clean outlier report without leaking internal algorithm strings into answer', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'Find unusual records and outliers in present_price',
      conversationId: 'conv_pres_2',
    };

    const res = await runAiAnalyst(req, mockCarDatasetProfile, 'user_analyst_test');

    expect(res.answer).toContain('### Outlier Analysis for present price');
    expect(res.answer).toContain('Key findings');
    expect(res.answer).not.toContain('using tool:');
    expect(res.answer).not.toContain('detect_outliers');
    expect(res.answer).not.toContain('Analysis computed deterministically');

    // Metadata contains verified details
    expect(res.execution?.toolsUsed).toContain('detect_outliers');
    expect(res.evidence.length).toBeGreaterThan(0);
    expect(res.evidence.some((e) => e.metric === 'Outlier Count')).toBe(true);
  });

  it('3. Generates appropriate Dataset Overview without claiming correlation findings when only profile was retrieved', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'Give me an overview of this dataset',
      conversationId: 'conv_pres_3',
    };

    const res = await runAiAnalyst(req, mockCarDatasetProfile, 'user_analyst_test');

    expect(res.answer).toContain('### Dataset Overview');
    expect(res.answer).toContain('301 rows');
    expect(res.answer).toContain('9 columns');
    expect(res.answer).toContain('**Data quality:** 98/100');

    // Must NOT claim correlation findings
    expect(res.answer).not.toContain('strongest positive relationship');
    expect(res.answer).not.toContain('using tool: get_dataset_profile');
  });

  it('4. Handles out-of-scope requests gracefully without hallucinating or leaking errors', async () => {
    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'Write a poem about motor oil',
      conversationId: 'conv_pres_4',
    };

    const res = await runAiAnalyst(req, mockCarDatasetProfile, 'user_analyst_test');

    expect(res.answer).toContain('### Dataset Overview');
    expect(res.answer).toContain('specific analysis requested could not be computed');
    expect(res.answer).toContain('You can ask me to analyze:');
    expect(res.answer).not.toContain('using tool:');
    expect(res.answer).not.toContain('stack trace');
  });

  it('5. Handles queries safely on datasets without potential targets or categories without throwing replace errors', async () => {
    const edgeProfile: DatasetProfile = {
      ...mockCarDatasetProfile,
      potentialTargets: [],
      categoricalColumns: [],
      numericColumns: ['selling_price', 'present_price'],
    };

    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'What are the correlations in this data?',
      conversationId: 'conv_pres_5',
    };

    // This should execute smoothly without throwing: TypeError: Cannot read properties of undefined (reading 'replace')
    const res = await runAiAnalyst(req, edgeProfile, 'user_analyst_test');
    expect(res).toBeDefined();
    expect(res.answer).toContain('### Correlation Analysis');
    expect(res.answer).not.toContain('undefined');
  });

  it('6. Handles model training and group-by queries on minimal datasets without replace errors', async () => {
    const edgeProfile: DatasetProfile = {
      ...mockCarDatasetProfile,
      potentialTargets: undefined as any,
      numericColumns: ['selling_price', 'present_price'],
      categoricalColumns: ['fuel_type'],
    };

    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'Compare average selling_price across fuel_type categories and train a model',
      conversationId: 'conv_pres_6',
    };

    const res = await runAiAnalyst(req, edgeProfile, 'user_analyst_test');
    expect(res).toBeDefined();
    expect(res.answer).toBeDefined();
    expect(res.answer).not.toContain('TypeError');
  });

  it('7. Real fuel type query: computes true group averages without "undefined records" or svg artifacts', async () => {
    // Inject real preview rows with Diesel, Petrol, CNG
    const carProfileWithRows: DatasetProfile = {
      ...mockCarDatasetProfile,
      previewRows: [
        { selling_price: 6.46, fuel_type: 'Diesel' },
        { selling_price: 3.85, fuel_type: 'Petrol' },
        { selling_price: 3.10, fuel_type: 'CNG' },
      ],
    };

    const req: AiAnalystRequest = {
      datasetId: 'ds_cars_presentation_test',
      message: 'Which fuel type has the highest average selling price?',
      conversationId: 'conv_pres_fuel_test',
    };

    const res = await runAiAnalyst(req, carProfileWithRows, 'user_analyst_test');

    expect(res).toBeDefined();
    expect(res.answer).toBeDefined();

    // 1. Answer mentions Diesel as highest
    expect(res.answer).toContain('Diesel');

    // 2. CRITICAL: Absolute prohibition of undefined/null/NaN records text
    expect(res.answer).not.toContain('undefined records');
    expect(res.answer).not.toContain('across undefined records');
    expect(res.answer).not.toContain('null records');
    expect(res.answer).not.toContain('NaN records');

    // 3. Absolute prohibition of internal SVG/debug artifacts
    expect(res.answer).not.toContain('svgDiesel');
    expect(res.answer).not.toContain('svgPetrol');
    expect(res.answer).not.toContain('svgCNG');
    expect(res.answer).not.toContain('svgVerified');
    expect(res.answer).not.toContain('svgTool');

    // 4. Execution metadata segregated
    expect(res.execution).toBeDefined();
    expect(res.execution?.status).toBe('success');
    expect(res.execution?.toolsUsed).toContain('group_by');

    // 5. Visualization data contract aligned
    expect(res.visualization).toBeDefined();
    expect(res.visualization?.data).toBeDefined();
    const visData = res.visualization?.data || [];
    expect(visData.length).toBeGreaterThan(0);
    expect(visData[0].category).toBeDefined();
    expect(visData[0].mean).toBeDefined();
    expect(typeof visData[0].mean).toBe('number');
  });

  it('8. Response sanitizer strips any rogue undefined records or svg prefixes', async () => {
    const dirtyResponse = {
      conversationId: 'conv_1',
      messageId: 'msg_1',
      datasetId: 'ds_1',
      answer: 'Diesel: Average Selling Price of 6.46 across undefined records. svgDiesel svgVerified Deterministic Evidence',
      findings: ['Petrol: Average Selling Price of 3.85 across undefined records.'],
      keyFindings: ['CNG: Average Selling Price of 3.1 across undefined records.'],
      statistics: {},
      evidence: [],
      methodology: 'Computed deterministically',
      caveats: [],
      limitations: [],
      visualization: null,
      charts: [],
      followUpQuestions: [],
      dataSource: { datasetId: 'ds_1', filename: 'cars.csv', rows: 100, columns: 5 },
      execution: { provider: 'deterministic' as const, toolsUsed: ['group_by'], status: 'success' },
      toolTrace: [],
      createdAt: new Date().toISOString(),
    };

    const { sanitizeAnalystResponse } = await import('../server/ai/orchestrator');
    const cleaned = sanitizeAnalystResponse(dirtyResponse as any);

    expect(cleaned.answer).not.toContain('undefined records');
    expect(cleaned.answer).not.toContain('svgDiesel');
    expect(cleaned.answer).not.toContain('svgVerified');
    expect(cleaned.findings[0]).not.toContain('undefined records');
    expect(cleaned.keyFindings[0]).not.toContain('undefined records');
  });
});
