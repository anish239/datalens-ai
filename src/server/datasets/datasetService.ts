import { DatasetProfile, ColumnProfile, LogicalType, NumericStatistics, CategoricalValueFrequency, PotentialTarget } from '../../types/dataset';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Maximum upload limits
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ROWS_LIMIT = 1_000_000;
export const MAX_COLS_LIMIT = 1_000;
export const MAX_PREVIEW_ROWS = 50;

const DATA_DIR = path.join(process.cwd(), 'data', 'datasets');

function ensureDataDir(ownerId?: string) {
  try {
    const dir = ownerId ? path.join(DATA_DIR, ownerId) : DATA_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('[DataLens Persistence] Failed to create data dir:', err);
  }
}

// In-memory store for datasets across sessions
const inMemoryDatasetStore = new Map<string, { profile: DatasetProfile; rawRows: Record<string, any>[] }>();

function loadDatasetsFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) return;
    const owners = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    for (const owner of owners) {
      if (owner.isDirectory()) {
        const ownerId = owner.name;
        const ownerDir = path.join(DATA_DIR, ownerId);
        const files = fs.readdirSync(ownerDir);
        for (const file of files) {
          if (file.endsWith('.json') && !file.endsWith('.rows.json')) {
            const datasetId = file.replace('.json', '');
            const profilePath = path.join(ownerDir, file);
            const rowsPath = path.join(ownerDir, `${datasetId}.rows.json`);
            try {
              const profileRaw = fs.readFileSync(profilePath, 'utf-8');
              const profile: DatasetProfile = JSON.parse(profileRaw);
              let rawRows: Record<string, any>[] = [];
              if (fs.existsSync(rowsPath)) {
                const rowsRaw = fs.readFileSync(rowsPath, 'utf-8');
                rawRows = JSON.parse(rowsRaw);
              }
              inMemoryDatasetStore.set(datasetId, { profile, rawRows });
            } catch (loadErr) {
              console.error(`[DataLens Persistence] Failed to load dataset ${datasetId} from disk:`, loadErr);
            }
          }
        }
      }
    }
    console.log(`[DataLens Persistence] Loaded ${inMemoryDatasetStore.size} persistent dataset(s) from disk.`);
  } catch (err) {
    console.error('[DataLens Persistence] Error loading datasets from disk:', err);
  }
}

// Load on module import
loadDatasetsFromDisk();

function saveDatasetToDisk(ownerId: string, datasetId: string, profile: DatasetProfile, rawRows: Record<string, any>[]) {
  try {
    ensureDataDir(ownerId);
    const ownerDir = path.join(DATA_DIR, ownerId);
    const profilePath = path.join(ownerDir, `${datasetId}.json`);
    const rowsPath = path.join(ownerDir, `${datasetId}.rows.json`);
    
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
    fs.writeFileSync(rowsPath, JSON.stringify(rawRows), 'utf-8');
  } catch (err) {
    console.error(`[DataLens Persistence] Failed to save dataset ${datasetId} to disk:`, err);
  }
}

function removeDatasetFromDisk(ownerId: string, datasetId: string) {
  try {
    const ownerDir = path.join(DATA_DIR, ownerId);
    const profilePath = path.join(ownerDir, `${datasetId}.json`);
    const rowsPath = path.join(ownerDir, `${datasetId}.rows.json`);
    if (fs.existsSync(profilePath)) fs.unlinkSync(profilePath);
    if (fs.existsSync(rowsPath)) fs.unlinkSync(rowsPath);
  } catch (err) {
    console.error(`[DataLens Persistence] Failed to delete dataset ${datasetId} from disk:`, err);
  }
}

export interface ParsedRawData {
  rows: Record<string, any>[];
  columnNames: string[];
  rowCount: number;
  columnCount: number;
}

/**
 * Sanitizes user-provided filename preserving spaces, hyphens, dots, and alphanumeric chars.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'dataset.csv';
  }
  // Strip path traversal attempts
  const base = filename.replace(/^.*[/\\]/, '').trim();
  // Allow normal filename characters: alphanumeric, spaces, hyphens, underscores, dots, parentheses
  const sanitized = base.replace(/[^a-zA-Z0-9_\-\.\s()]/g, '_').replace(/\s+/g, ' ');
  return sanitized.slice(0, 150) || 'dataset.csv';
}

/**
 * Validates file extension
 */
export function validateExtension(filename: string): 'csv' | 'xlsx' {
  const lower = filename.toLowerCase().trim();
  if (lower.endsWith('.csv')) {
    return 'csv';
  }
  if (lower.endsWith('.xlsx')) {
    return 'xlsx';
  }
  if (lower.endsWith('.xls')) {
    throw new Error('Legacy Excel .xls format is not supported. Please save and upload as modern .xlsx or .csv.');
  }
  throw new Error(`Unsupported file format. Only modern .csv and .xlsx files are supported (got '${filename}').`);
}

/**
 * Parses raw CSV buffer safely handling UTF-8, UTF-8 BOM (\uFEFF), semicolons/tabs/commas, and quoted values.
 */
export function parseCsvBuffer(buffer: Buffer): ParsedRawData {
  let text = buffer.toString('utf-8');
  
  // Handle UTF-8 Byte Order Mark (BOM)
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // Remove trailing null bytes or empty lines
  text = text.trim();

  if (!text) {
    throw new Error('The uploaded CSV file is empty and contains no readable data.');
  }

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false, // We will type-infer deterministically
    transformHeader: (h) => h.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, ''),
  });

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type !== 'Delimiter');
    if (fatal && result.data.length === 0) {
      throw new Error(`Malformed CSV: ${fatal.message} (Row ${fatal.row || 1})`);
    }
  }

  const rows = (result.data as Record<string, any>[]).filter((r) => {
    if (!r || typeof r !== 'object') return false;
    return Object.values(r).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
  });

  if (rows.length === 0) {
    throw new Error('The uploaded CSV file contains headers but no valid data rows.');
  }

  let columnNames = result.meta.fields || [];
  if (columnNames.length === 0 && rows.length > 0) {
    columnNames = Object.keys(rows[0]);
  }

  // Normalize column names
  const cleanColumns = columnNames.map((c, i) => c || `Column_${i + 1}`);

  if (cleanColumns.length === 0) {
    throw new Error('No columns detected in the uploaded CSV dataset.');
  }

  return {
    rows,
    columnNames: cleanColumns,
    rowCount: rows.length,
    columnCount: cleanColumns.length,
  };
}

/**
 * Parses raw XLSX buffer using SheetJS
 */
export function parseXlsxBuffer(buffer: Buffer): ParsedRawData {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err: any) {
    throw new Error(`Failed to parse Excel workbook: ${err.message || 'Corrupted or password-protected file.'}`);
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The Excel workbook contains no worksheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (!rows || rows.length === 0) {
    throw new Error(`Worksheet '${firstSheetName}' is empty and contains no readable data.`);
  }

  const columnNames = Object.keys(rows[0]);
  if (columnNames.length === 0) {
    throw new Error('No valid columns found in Excel worksheet.');
  }

  return {
    rows,
    columnNames,
    rowCount: rows.length,
    columnCount: columnNames.length,
  };
}

/**
 * Deterministic Schema Inference & Profiler
 */
export function profileDatasetContent(
  datasetId: string,
  ownerId: string,
  fileName: string,
  fileType: 'csv' | 'xlsx',
  fileSizeBytes: number,
  rawData: ParsedRawData
): DatasetProfile {
  const { rows, columnNames, rowCount, columnCount } = rawData;

  if (rowCount > MAX_ROWS_LIMIT) {
    throw new Error(`Dataset exceeds maximum row limit of ${MAX_ROWS_LIMIT.toLocaleString()} rows (got ${rowCount.toLocaleString()}).`);
  }
  if (columnCount > MAX_COLS_LIMIT) {
    throw new Error(`Dataset exceeds maximum column limit of ${MAX_COLS_LIMIT} columns (got ${columnCount}).`);
  }

  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const textColumns: string[] = [];
  const booleanColumns: string[] = [];
  const datetimeColumns: string[] = [];
  const potentialTargets: PotentialTarget[] = [];
  const columnProfiles: ColumnProfile[] = [];

  let totalCells = rowCount * columnCount;
  let totalMissingCells = 0;
  let columnsWithMissing = 0;

  // Duplicate Row Check using row hash
  const seenRowHashes = new Set<string>();
  let duplicateRowCount = 0;

  for (let i = 0; i < Math.min(rowCount, 10000); i++) {
    const rowStr = JSON.stringify(rows[i]);
    if (seenRowHashes.has(rowStr)) {
      duplicateRowCount++;
    } else {
      seenRowHashes.add(rowStr);
    }
  }

  // Scale duplicate count if dataset was sampled for hashing
  if (rowCount > 10000) {
    duplicateRowCount = Math.round((duplicateRowCount / 10000) * rowCount);
  }
  const duplicateRowPercentage = Number(((duplicateRowCount / rowCount) * 100).toFixed(2));

  // Date regex patterns
  const datePattern = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
  const dateSlashPattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

  for (const colName of columnNames) {
    const values: any[] = [];
    let nullCount = 0;
    const valueFreqMap = new Map<string, number>();

    for (let r = 0; r < rowCount; r++) {
      const val = rows[r][colName];
      if (val === null || val === undefined || val === '' || String(val).trim() === '' || String(val).toLowerCase() === 'nan' || String(val).toLowerCase() === 'null') {
        nullCount++;
      } else {
        const strVal = String(val).trim();
        values.push(val);
        valueFreqMap.set(strVal, (valueFreqMap.get(strVal) || 0) + 1);
      }
    }

    totalMissingCells += nullCount;
    if (nullCount > 0) columnsWithMissing++;

    const nonNullCount = values.length;
    const nullPercentage = Number(((nullCount / rowCount) * 100).toFixed(2));
    const uniqueCount = valueFreqMap.size;

    // Determine Logical Type Deterministically
    let logicalType: LogicalType = 'text';
    let pandasDtype = 'object';
    let numericStats: NumericStatistics | null = null;
    let isDateTimeCandidate = false;

    // Test Numeric
    let numericMatches = 0;
    const parsedNumbers: number[] = [];

    for (const val of values) {
      if (typeof val === 'number') {
        numericMatches++;
        parsedNumbers.push(val);
      } else {
        const cleanedStr = String(val).replace(/[$€£₹,\s%]/g, '');
        if (cleanedStr !== '' && !isNaN(Number(cleanedStr))) {
          numericMatches++;
          parsedNumbers.push(Number(cleanedStr));
        }
      }
    }

    const isNumeric = nonNullCount > 0 && numericMatches / nonNullCount >= 0.85;

    // Test Boolean
    const lowerValues = values.slice(0, 100).map((v) => String(v).toLowerCase().trim());
    const boolKeywords = new Set(['true', 'false', 'yes', 'no', '1', '0', 'y', 'n', 't', 'f']);
    const isBoolean = nonNullCount > 0 && uniqueCount <= 2 && lowerValues.every((v) => boolKeywords.has(v));

    // Test DateTime
    let dateMatches = 0;
    for (const val of values.slice(0, 100)) {
      const s = String(val).trim();
      if (datePattern.test(s) || dateSlashPattern.test(s) || (typeof val === 'string' && !isNaN(Date.parse(val)) && s.length > 5 && isNaN(Number(s)))) {
        dateMatches++;
      }
    }
    const isDateTime = nonNullCount > 0 && !isNumeric && dateMatches / Math.min(nonNullCount, 100) >= 0.8;

    if (isBoolean) {
      logicalType = 'boolean';
      pandasDtype = 'bool';
      booleanColumns.push(colName);
    } else if (isDateTime) {
      logicalType = 'datetime';
      pandasDtype = 'datetime64[ns]';
      isDateTimeCandidate = true;
      datetimeColumns.push(colName);
    } else if (isNumeric) {
      logicalType = 'numeric';
      numericColumns.push(colName);

      // Compute exact statistics
      parsedNumbers.sort((a, b) => a - b);
      const min = parsedNumbers[0] ?? null;
      const max = parsedNumbers[parsedNumbers.length - 1] ?? null;
      const sum = parsedNumbers.reduce((acc, curr) => acc + curr, 0);
      const mean = parsedNumbers.length > 0 ? Number((sum / parsedNumbers.length).toFixed(4)) : null;

      // Median
      let median: number | null = null;
      const mid = Math.floor(parsedNumbers.length / 2);
      if (parsedNumbers.length > 0) {
        median = parsedNumbers.length % 2 === 0 ? Number(((parsedNumbers[mid - 1] + parsedNumbers[mid]) / 2).toFixed(4)) : parsedNumbers[mid];
      }

      // Standard Deviation
      let std: number | null = null;
      if (parsedNumbers.length > 1 && mean !== null) {
        const variance = parsedNumbers.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (parsedNumbers.length - 1);
        std = Number(Math.sqrt(variance).toFixed(4));
      }

      // Quartiles
      const q25Idx = Math.floor(parsedNumbers.length * 0.25);
      const q75Idx = Math.floor(parsedNumbers.length * 0.75);
      const q25 = parsedNumbers[q25Idx] ?? null;
      const q75 = parsedNumbers[q75Idx] ?? null;

      // Pandas Dtype
      const isInteger = parsedNumbers.every((n) => Number.isInteger(n));
      pandasDtype = isInteger ? 'int64' : 'float64';

      numericStats = {
        min,
        max,
        mean,
        median,
        std,
        q25,
        q75,
      };
    } else {
      // Categorical vs Free Text
      const cardinalityRatio = nonNullCount > 0 ? uniqueCount / nonNullCount : 0;
      if (uniqueCount <= 50 || cardinalityRatio < 0.25) {
        logicalType = 'categorical';
        categoricalColumns.push(colName);
      } else {
        logicalType = 'text';
        textColumns.push(colName);
      }
      pandasDtype = 'object';
    }

    // Categorical frequencies
    let topValues: CategoricalValueFrequency[] | null = null;
    if (logicalType === 'categorical' || logicalType === 'boolean') {
      const sortedFreqs = Array.from(valueFreqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      topValues = sortedFreqs.map(([value, count]) => ({
        value,
        count,
        percentage: Number(((count / (nonNullCount || 1)) * 100).toFixed(2)),
      }));
    }

    // Sample Values
    const sampleValues = Array.from(valueFreqMap.keys()).slice(0, 8);

    // Target Variable Candidate Detection
    const normalizedName = colName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').trim();
    let isPotentialTarget = false;
    let targetReason: string | null = null;

    const targetKeywords = ['price', 'selling_price', 'target', 'label', 'churn', 'status', 'outcome', 'converted', 'revenue', 'salary', 'cost', 'class', 'fraud', 'default', 'score'];
    for (const kw of targetKeywords) {
      if (normalizedName === kw || normalizedName.endsWith(`_${kw}`) || normalizedName.startsWith(`${kw}_`)) {
        isPotentialTarget = true;
        targetReason = `Column name contains target indicator keyword '${kw}'.`;
        break;
      }
    }

    if (!isPotentialTarget && logicalType === 'numeric' && colName === columnNames[columnNames.length - 1]) {
      isPotentialTarget = true;
      targetReason = 'Last numerical column in dataset structure.';
    }

    if (isPotentialTarget) {
      potentialTargets.push({
        columnName: colName,
        logicalType,
        reason: targetReason || 'Candidate target variable for predictive modeling.',
        confidence: normalizedName.includes('price') || normalizedName.includes('target') ? 'high' : 'medium',
      });
    }

    columnProfiles.push({
      name: colName,
      normalizedName,
      logicalType,
      pandasDtype,
      nullCount,
      nullPercentage,
      uniqueCount,
      sampleValues,
      statistics: numericStats,
      topValues,
      isDateTimeCandidate,
      isPotentialTarget,
      targetReason,
    });
  }

  // Data Quality Score (0-100)
  const missingDataPercentage = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(2)) : 0;
  let dataQualityScore = 100;
  dataQualityScore -= Math.min(30, missingDataPercentage * 1.5);
  dataQualityScore -= Math.min(20, duplicateRowPercentage * 1.2);
  if (columnsWithMissing > 0) {
    dataQualityScore -= Math.min(15, (columnsWithMissing / columnCount) * 15);
  }
  dataQualityScore = Math.max(10, Math.min(100, Math.round(dataQualityScore)));

  const dataQualityExplanation =
    dataQualityScore >= 85
      ? `High-quality dataset: Clean structure with ${missingDataPercentage}% missing cells and ${duplicateRowPercentage}% duplicate rows.`
      : dataQualityScore >= 70
      ? `Good dataset quality: Contains minor missing values (${missingDataPercentage}%) across ${columnsWithMissing} columns.`
      : `Moderate dataset quality: Has ${missingDataPercentage}% missing values and ${duplicateRowPercentage}% duplicate records. Imputation or cleaning recommended.`;

  // Preview Rows
  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);

  const profile: DatasetProfile = {
    datasetId,
    ownerId,
    fileName,
    fileType,
    fileSizeBytes,
    rowCount,
    columnCount,
    duplicateRowCount,
    duplicateRowPercentage,
    missingValueCount: totalMissingCells,
    missingDataPercentage,
    columnsWithMissingValues: columnsWithMissing,
    dataQualityScore,
    dataQualityExplanation,
    columns: columnProfiles,
    numericColumns,
    categoricalColumns,
    textColumns,
    booleanColumns,
    datetimeColumns,
    potentialTargets,
    previewRows,
    createdAt: new Date().toISOString(),
    profileStatus: 'ready',
  };

  // Register in memory store and persist to disk
  inMemoryDatasetStore.set(datasetId, { profile, rawRows: rows });
  saveDatasetToDisk(ownerId, datasetId, profile, rows);

  return profile;
}

/**
 * Get profile from memory store
 */
export function getStoredDatasetProfile(datasetId: string, ownerId?: string): DatasetProfile | null {
  const item = inMemoryDatasetStore.get(datasetId);
  if (!item) return null;
  if (ownerId && item.profile.ownerId && item.profile.ownerId !== ownerId) {
    throw new Error('Access denied: You do not have permission to access this dataset.');
  }
  return item.profile;
}

/**
 * List all dataset profiles for an owner
 */
export function listStoredDatasetProfiles(ownerId: string): DatasetProfile[] {
  const list: DatasetProfile[] = [];
  inMemoryDatasetStore.forEach((item) => {
    if (!ownerId || item.profile.ownerId === ownerId) {
      list.push(item.profile);
    }
  });
  return list;
}

/**
 * Delete a dataset profile
 */
export function deleteStoredDatasetProfile(datasetId: string, ownerId: string): boolean {
  const item = inMemoryDatasetStore.get(datasetId);
  if (!item) return false;
  if (item.profile.ownerId && item.profile.ownerId !== ownerId) {
    throw new Error('Access denied: You do not have permission to delete this dataset.');
  }
  removeDatasetFromDisk(ownerId, datasetId);
  return inMemoryDatasetStore.delete(datasetId);
}

/**
 * Get raw rows for computation
 */
export function getStoredDatasetRows(datasetId: string, ownerId?: string): Record<string, any>[] | null {
  const item = inMemoryDatasetStore.get(datasetId);
  if (!item) return null;
  if (ownerId && item.profile.ownerId && item.profile.ownerId !== ownerId) {
    throw new Error('Access denied: You do not have permission to access this dataset.');
  }
  return item.rawRows;
}
