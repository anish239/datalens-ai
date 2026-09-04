export type LogicalType = 'numeric' | 'categorical' | 'text' | 'boolean' | 'datetime' | 'unknown';

export interface NumericStatistics {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  std: number | null;
  q25: number | null;
  q75: number | null;
}

export interface CategoricalValueFrequency {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnProfile {
  name: string;
  normalizedName: string;
  logicalType: LogicalType;
  pandasDtype: string;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  sampleValues: (string | number | boolean | null)[];
  statistics?: NumericStatistics | null;
  topValues?: CategoricalValueFrequency[] | null;
  isDateTimeCandidate: boolean;
  isPotentialTarget?: boolean;
  targetReason?: string | null;
}

export interface PotentialTarget {
  columnName: string;
  logicalType: LogicalType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DatasetProfile {
  datasetId: string;
  ownerId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  duplicateRowCount: number;
  duplicateRowPercentage: number;
  missingValueCount: number;
  missingDataPercentage: number;
  columnsWithMissingValues: number;
  dataQualityScore: number;
  dataQualityExplanation: string;
  columns: ColumnProfile[];
  numericColumns: string[];
  categoricalColumns: string[];
  textColumns: string[];
  booleanColumns: string[];
  datetimeColumns: string[];
  potentialTargets: PotentialTarget[];
  previewRows: Record<string, any>[];
  createdAt: string;
  profileStatus: string;
}

export interface DatasetSummary {
  datasetId: string;
  ownerId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  dataQualityScore: number;
  createdAt: string;
  profileStatus: string;
}

export interface DatasetListResponse {
  items: DatasetSummary[];
  total: number;
}

export interface DatasetUploadResponse {
  dataset: DatasetProfile;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
