export type AnalysisType =
  | 'overview'
  | 'statistics'
  | 'group_by'
  | 'correlation'
  | 'outliers'
  | 'trends'
  | 'distribution'
  | 'data_quality'
  | 'chart'
  | 'query';

export interface AnalysisMetadata {
  rowsAnalyzed: number;
  columnsAnalyzed: number;
  generatedAt: string;
  executionTimeMs: number;
}

export interface NumericStatsResponse {
  count: number;
  missingCount: number;
  missingPercentage: number;
  mean?: number | null;
  median?: number | null;
  std?: number | null;
  variance?: number | null;
  min?: number | null;
  max?: number | null;
  range?: number | null;
  q1?: number | null;
  q3?: number | null;
  iqr?: number | null;
  percentiles: Record<string, number | null>;
}

export interface TopCategoryItem {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStatsResponse {
  count: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  mostFrequentValue?: string | null;
  mostFrequentCount?: number | null;
  mostFrequentPercentage?: number | null;
  topCategories: TopCategoryItem[];
}

export interface BooleanStatsResponse {
  count: number;
  trueCount: number;
  falseCount: number;
  missingCount: number;
  truePercentage: number;
  falsePercentage: number;
}

export interface DateTimeStatsResponse {
  count: number;
  minDate?: string | null;
  maxDate?: string | null;
  dateRangeDays?: number | null;
  uniqueDates: number;
  missingCount: number;
  missingPercentage: number;
  inferredFrequency?: string | null;
}

export interface ColumnStatisticsResponse {
  column: string;
  logicalType: string;
  sampleValues: any[];
  numeric?: NumericStatsResponse | null;
  categorical?: CategoricalStatsResponse | null;
  boolean?: BooleanStatsResponse | null;
  datetime?: DateTimeStatsResponse | null;
}

export interface GroupByAggregation {
  column: string;
  function: 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'std' | 'nunique';
  alias?: string;
}

export interface GroupByRequest {
  by: string | string[];
  aggregations: GroupByAggregation[];
  sortBy?: string;
  ascending?: boolean;
  limit?: number;
}

export interface GroupByResponse {
  by: string[];
  aggregations: GroupByAggregation[];
  groups: Record<string, any>[];
  totalGroups: number;
  truncated: boolean;
}

export interface CorrelationRequest {
  columns?: string[];
  method?: 'pearson' | 'spearman' | 'kendall';
  minSampleSize?: number;
}

export interface CorrelationPair {
  columnA: string;
  columnB: string;
  correlation: number;
  method: string;
  sampleSize: number;
  relationship: string;
}

export interface CorrelationMatrixResponse {
  method: string;
  columns: string[];
  matrix: Record<string, Record<string, number | null>>;
  strongestPositive: CorrelationPair[];
  strongestNegative: CorrelationPair[];
  sampleSize: number;
}

export interface OutlierRequest {
  column: string;
  method?: 'iqr' | 'zscore';
  threshold?: number;
  sampleLimit?: number;
}

export interface OutlierResponse {
  column: string;
  method: string;
  threshold: number;
  totalObservations: number;
  validObservations: number;
  outlierCount: number;
  outlierPercentage: number;
  lowerBound?: number | null;
  upperBound?: number | null;
  sampleOutliers: Record<string, any>[];
}

export interface TrendRequest {
  dateColumn: string;
  valueColumn: string;
  aggregation?: 'sum' | 'mean' | 'median' | 'count';
  frequency?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface TrendPoint {
  period: string;
  value: number | null;
  count: number;
}

export interface TrendResponse {
  dateColumn: string;
  valueColumn: string;
  aggregation: string;
  frequency: string;
  points: TrendPoint[];
  firstValue?: number | null;
  lastValue?: number | null;
  absoluteChange?: number | null;
  percentageChange?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'insufficient_data';
  overallSummary: string;
}

export interface DistributionRequest {
  column: string;
  bins?: number;
}

export interface HistogramBin {
  binIndex: number;
  binStart: number;
  binEnd: number;
  count: number;
  percentage: number;
}

export interface DistributionResponse {
  column: string;
  count: number;
  min?: number | null;
  max?: number | null;
  mean?: number | null;
  median?: number | null;
  std?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  percentiles: Record<string, number | null>;
  bins: HistogramBin[];
}

export interface DataQualityFactor {
  name: string;
  penalty: number;
  impact: string;
  description: string;
}

export interface DataQualityResponse {
  score: number;
  rating: 'High' | 'Good' | 'Fair' | 'Poor';
  factors: DataQualityFactor[];
  totalMissingCells: number;
  missingPercentage: number;
  duplicateRows: number;
  duplicatePercentage: number;
  emptyColumnsCount: number;
  zeroVarianceColumnsCount: number;
  summary: string;
}

export interface ChartRequest {
  chartType: 'bar' | 'line' | 'scatter' | 'histogram';
  xColumn: string;
  yColumn?: string;
  aggregation?: 'sum' | 'mean' | 'median' | 'count';
  groupByColumn?: string;
  bins?: number;
  limit?: number;
}

export interface ChartResponse {
  chartType: string;
  x: string;
  y?: string | null;
  title: string;
  data: Record<string, any>[];
  metadata: Record<string, any>;
}

export interface FilterCondition {
  column: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'greater_than_or_equal'
    | 'less_than'
    | 'less_than_or_equal'
    | 'contains'
    | 'is_null'
    | 'is_not_null'
    | 'in';
  value?: any;
}

export interface QueryRequest {
  columns?: string[];
  filters?: FilterCondition[];
  sortBy?: string;
  ascending?: boolean;
  limit?: number;
  offset?: number;
}

export interface QueryResponse {
  rows: Record<string, any>[];
  totalMatchingRows: number;
  offset: number;
  limit: number;
  columns: string[];
}

export interface AnalyticsOverviewResponse {
  datasetId: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  numericColumnCount: number;
  categoricalColumnCount: number;
  datetimeColumnCount: number;
  booleanColumnCount: number;
  missingCellCount: number;
  missingDataPercentage: number;
  duplicateRowCount: number;
  duplicateRowPercentage: number;
  dataQualityScore: number;
  dataQualityRating: string;
  numericColumns: string[];
  categoricalColumns: string[];
  datetimeColumns: string[];
  booleanColumns: string[];
  textColumns: string[];
  topMissingColumns: {
    column: string;
    nullCount: number;
    nullPercentage: number;
    logicalType: string;
  }[];
  potentialTargets: any[];
  summaryFacts: string[];
}

export interface AnalyticsEnvelope<T = any> {
  success: boolean;
  datasetId: string;
  analysisType: string;
  result: T;
  metadata: AnalysisMetadata;
}

export interface AnalysisRecord {
  id: string; // analysisId (e.g. analysis_${messageId})
  ownerId: string; // authenticated user uid
  datasetId: string;
  datasetName?: string;
  conversationId: string;
  messageId: string;
  query: string; // Analytical prompt
  answer: string; // Executive conclusion
  keyFindings: string[]; // Verified findings / insights
  insightsCount: number; // Count of verified insights
  evidence?: any[];
  methodology?: string;
  status: 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
}
