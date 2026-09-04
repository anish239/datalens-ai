import { DatasetProfile } from '../types/dataset';
import {
  AnalyticsOverviewResponse,
  ColumnStatisticsResponse,
  CorrelationMatrixResponse,
  CorrelationPair,
  DataQualityResponse,
  DistributionResponse,
  GroupByRequest,
  GroupByResponse,
  HistogramBin,
  OutlierResponse,
  QueryRequest,
  QueryResponse,
  TrendPoint,
  TrendResponse,
} from '../types/analysis';

/**
 * Deterministic mathematical calculation utility for DataLens AI.
 * Computes exact statistical metrics without LLM estimations or random approximations.
 */

export function extractColumnValues(profile: DatasetProfile, columnName: string): any[] {
  if (!profile.previewRows || profile.previewRows.length === 0) {
    const colProf = profile.columns.find((c) => c.name === columnName);
    return colProf?.sampleValues || [];
  }
  return profile.previewRows.map((r) => r[columnName]).filter((v) => v !== undefined);
}

export function extractNumericValues(profile: DatasetProfile, columnName: string): number[] {
  const raw = extractColumnValues(profile, columnName);
  return raw
    .map((v) => {
      if (v === null || v === undefined || v === '') return NaN;
      const num = Number(v);
      return isNaN(num) ? NaN : num;
    })
    .filter((v) => !isNaN(v));
}

// ----------------------------------------------------
// 1. Overview Deterministic Calculation
// ----------------------------------------------------
export function computeDeterministicOverview(profile: DatasetProfile): AnalyticsOverviewResponse {
  const rating =
    profile.dataQualityScore >= 85
      ? 'High'
      : profile.dataQualityScore >= 70
      ? 'Good'
      : profile.dataQualityScore >= 50
      ? 'Fair'
      : 'Poor';

  const summaryFacts = [
    `Dataset contains ${profile.rowCount.toLocaleString()} total rows and ${profile.columnCount} columns.`,
    `DataLens Quality Score is ${profile.dataQualityScore}/100 with ${profile.missingDataPercentage.toFixed(1)}% missing cells.`,
  ];

  if (profile.numericColumns.length > 0) {
    summaryFacts.push(
      `${profile.numericColumns.length} numeric features available for statistical and correlation analysis.`
    );
  }
  if (profile.datetimeColumns.length > 0) {
    summaryFacts.push(
      `${profile.datetimeColumns.length} datetime feature(s) detected (${profile.datetimeColumns.slice(0, 2).join(', ')}) available for trend analysis.`
    );
  }
  if (profile.potentialTargets.length > 0) {
    summaryFacts.push(
      `${profile.potentialTargets.length} potential outcome/target variable(s) identified.`
    );
  }

  const topMissing = profile.columns
    .filter((c) => c.nullCount > 0)
    .sort((a, b) => b.nullPercentage - a.nullPercentage)
    .slice(0, 5)
    .map((c) => ({
      column: c.name,
      nullCount: c.nullCount,
      nullPercentage: c.nullPercentage,
      logicalType: c.logicalType,
    }));

  return {
    datasetId: profile.datasetId,
    fileName: profile.fileName,
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    numericColumnCount: profile.numericColumns.length,
    categoricalColumnCount: profile.categoricalColumns.length,
    datetimeColumnCount: profile.datetimeColumns.length,
    booleanColumnCount: profile.booleanColumns.length,
    missingCellCount: profile.missingValueCount,
    missingDataPercentage: profile.missingDataPercentage,
    duplicateRowCount: profile.duplicateRowCount,
    duplicateRowPercentage: profile.duplicateRowPercentage,
    dataQualityScore: profile.dataQualityScore,
    dataQualityRating: rating,
    numericColumns: profile.numericColumns,
    categoricalColumns: profile.categoricalColumns,
    datetimeColumns: profile.datetimeColumns,
    booleanColumns: profile.booleanColumns,
    textColumns: profile.textColumns,
    topMissingColumns: topMissing,
    potentialTargets: profile.potentialTargets,
    summaryFacts,
  };
}

// ----------------------------------------------------
// 2. Univariate Column Statistics
// ----------------------------------------------------
export function computeDeterministicColumnStats(
  profile: DatasetProfile,
  columnName: string
): ColumnStatisticsResponse {
  const colProf = profile.columns.find((c) => c.name === columnName);
  const logicalType = colProf?.logicalType || 'unknown';
  const rawValues = extractColumnValues(profile, columnName);
  const sampleValues = rawValues.slice(0, 10);

  if (logicalType === 'numeric') {
    const nums = extractNumericValues(profile, columnName).sort((a, b) => a - b);
    const n = nums.length;
    const missingCount = colProf?.nullCount ?? (profile.rowCount - n);
    const missingPercentage = colProf?.nullPercentage ?? (profile.rowCount > 0 ? (missingCount / profile.rowCount) * 100 : 0);

    if (n === 0) {
      return {
        column: columnName,
        logicalType: 'numeric',
        sampleValues,
        numeric: {
          count: 0,
          missingCount,
          missingPercentage,
          percentiles: {},
        },
      };
    }

    const sum = nums.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;
    const median = n % 2 === 1 ? nums[Math.floor(n / 2)] : (nums[n / 2 - 1] + nums[n / 2]) / 2;
    const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const std = Math.sqrt(variance);
    const min = nums[0];
    const max = nums[n - 1];
    const range = max - min;

    const getPercentile = (p: number) => {
      if (n === 1) return nums[0];
      const idx = (p / 100) * (n - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const weight = idx - lower;
      return nums[lower] * (1 - weight) + nums[upper] * weight;
    };

    const q1 = colProf?.statistics?.q25 ?? getPercentile(25);
    const q3 = colProf?.statistics?.q75 ?? getPercentile(75);
    const iqr = q3 - q1;

    const percentiles: Record<string, number | null> = {
      p1: Number(getPercentile(1).toFixed(3)),
      p5: Number(getPercentile(5).toFixed(3)),
      p10: Number(getPercentile(10).toFixed(3)),
      p25: Number(q1.toFixed(3)),
      p50: Number(median.toFixed(3)),
      p75: Number(q3.toFixed(3)),
      p90: Number(getPercentile(90).toFixed(3)),
      p95: Number(getPercentile(95).toFixed(3)),
      p99: Number(getPercentile(99).toFixed(3)),
    };

    return {
      column: columnName,
      logicalType: 'numeric',
      sampleValues,
      numeric: {
        count: n,
        missingCount,
        missingPercentage: Number(missingPercentage.toFixed(2)),
        mean: Number(mean.toFixed(3)),
        median: Number(median.toFixed(3)),
        std: Number(std.toFixed(3)),
        variance: Number(variance.toFixed(3)),
        min: Number(min.toFixed(3)),
        max: Number(max.toFixed(3)),
        range: Number(range.toFixed(3)),
        q1: Number(q1.toFixed(3)),
        q3: Number(q3.toFixed(3)),
        iqr: Number(iqr.toFixed(3)),
        percentiles,
      },
    };
  }

  if (logicalType === 'categorical' || logicalType === 'text') {
    const valid = rawValues.filter((v) => v !== null && v !== undefined && v !== '');
    const counts: Record<string, number> = {};
    valid.forEach((v) => {
      const k = String(v);
      counts[k] = (counts[k] || 0) + 1;
    });

    const topEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const uniqueCount = colProf?.uniqueCount ?? topEntries.length;
    const uniquePercentage = profile.rowCount > 0 ? (uniqueCount / profile.rowCount) * 100 : 0;
    const mostFrequent = topEntries[0];

    const topCategories = topEntries.slice(0, 20).map(([value, cnt]) => ({
      value,
      count: cnt,
      percentage: Number(((cnt / (valid.length || 1)) * 100).toFixed(1)),
    }));

    return {
      column: columnName,
      logicalType,
      sampleValues,
      categorical: {
        count: valid.length,
        missingCount: profile.rowCount - valid.length,
        missingPercentage: Number((((profile.rowCount - valid.length) / (profile.rowCount || 1)) * 100).toFixed(2)),
        uniqueCount,
        uniquePercentage: Number(uniquePercentage.toFixed(2)),
        mostFrequentValue: mostFrequent ? mostFrequent[0] : null,
        mostFrequentCount: mostFrequent ? mostFrequent[1] : null,
        mostFrequentPercentage: mostFrequent ? Number(((mostFrequent[1] / (valid.length || 1)) * 100).toFixed(1)) : null,
        topCategories,
      },
    };
  }

  if (logicalType === 'boolean') {
    const valid = rawValues.filter((v) => v !== null && v !== undefined);
    let trueCount = 0;
    let falseCount = 0;
    valid.forEach((v) => {
      const s = String(v).toLowerCase();
      if (v === true || s === 'true' || s === '1' || s === 'yes' || s === 't') {
        trueCount++;
      } else {
        falseCount++;
      }
    });

    const total = valid.length || 1;
    return {
      column: columnName,
      logicalType: 'boolean',
      sampleValues,
      boolean: {
        count: valid.length,
        trueCount,
        falseCount,
        missingCount: profile.rowCount - valid.length,
        truePercentage: Number(((trueCount / total) * 100).toFixed(1)),
        falsePercentage: Number(((falseCount / total) * 100).toFixed(1)),
      },
    };
  }

  if (logicalType === 'datetime') {
    const valid = rawValues
      .map((v) => (v ? new Date(v) : null))
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const minDate = valid.length > 0 ? valid[0].toISOString().split('T')[0] : null;
    const maxDate = valid.length > 0 ? valid[valid.length - 1].toISOString().split('T')[0] : null;
    const dateRangeDays =
      valid.length > 1
        ? Math.round((valid[valid.length - 1].getTime() - valid[0].getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      column: columnName,
      logicalType: 'datetime',
      sampleValues,
      datetime: {
        count: valid.length,
        minDate,
        maxDate,
        dateRangeDays,
        uniqueDates: new Set(valid.map((d) => d.toISOString().split('T')[0])).size,
        missingCount: profile.rowCount - valid.length,
        missingPercentage: Number((((profile.rowCount - valid.length) / (profile.rowCount || 1)) * 100).toFixed(2)),
        inferredFrequency: dateRangeDays > 365 ? 'Monthly / Yearly' : dateRangeDays > 30 ? 'Daily / Weekly' : 'Daily',
      },
    };
  }

  return {
    column: columnName,
    logicalType: 'unknown',
    sampleValues,
  };
}

// ----------------------------------------------------
// 3. Correlation Matrix Calculation
// ----------------------------------------------------
export function computeDeterministicCorrelation(
  profile: DatasetProfile,
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): CorrelationMatrixResponse {
  const numCols = profile.numericColumns;
  if (numCols.length < 2) {
    return {
      method,
      columns: numCols,
      matrix: {},
      strongestPositive: [],
      strongestNegative: [],
      sampleSize: profile.rowCount,
    };
  }

  const matrix: Record<string, Record<string, number | null>> = {};
  numCols.forEach((c) => {
    matrix[c] = {};
  });

  const pairs: CorrelationPair[] = [];

  for (let i = 0; i < numCols.length; i++) {
    const colA = numCols[i];
    matrix[colA][colA] = 1.0;

    for (let j = i + 1; j < numCols.length; j++) {
      const colB = numCols[j];
      const rows = profile.previewRows || [];
      const pairedData = rows
        .map((r) => ({
          a: Number(r[colA]),
          b: Number(r[colB]),
        }))
        .filter((p) => !isNaN(p.a) && !isNaN(p.b));

      if (pairedData.length < 3) {
        matrix[colA][colB] = null;
        matrix[colB][colA] = null;
        continue;
      }

      let r = 0;
      if (method === 'pearson') {
        const meanA = pairedData.reduce((acc, p) => acc + p.a, 0) / pairedData.length;
        const meanB = pairedData.reduce((acc, p) => acc + p.b, 0) / pairedData.length;
        let num = 0;
        let denA = 0;
        let denB = 0;

        pairedData.forEach((p) => {
          const diffA = p.a - meanA;
          const diffB = p.b - meanB;
          num += diffA * diffB;
          denA += diffA * diffA;
          denB += diffB * diffB;
        });

        const den = Math.sqrt(denA * denB);
        r = den === 0 ? 0 : num / den;
      } else {
        // Spearman Rank Correlation
        const rankA = computeRanks(pairedData.map((p) => p.a));
        const rankB = computeRanks(pairedData.map((p) => p.b));
        const n = pairedData.length;
        let dSquaredSum = 0;
        for (let k = 0; k < n; k++) {
          dSquaredSum += Math.pow(rankA[k] - rankB[k], 2);
        }
        r = 1 - (6 * dSquaredSum) / (n * (n * n - 1));
      }

      // Clamp between -1 and 1
      const corrVal = Number(Math.max(-1, Math.min(1, r)).toFixed(3));
      matrix[colA][colB] = corrVal;
      matrix[colB][colA] = corrVal;

      let relationship = 'weak';
      if (corrVal >= 0.7) relationship = 'strong_positive';
      else if (corrVal >= 0.4) relationship = 'moderate_positive';
      else if (corrVal <= -0.7) relationship = 'strong_negative';
      else if (corrVal <= -0.4) relationship = 'moderate_negative';

      pairs.push({
        columnA: colA,
        columnB: colB,
        correlation: corrVal,
        method,
        sampleSize: pairedData.length,
        relationship,
      });
    }
  }

  const strongestPositive = pairs
    .filter((p) => p.correlation > 0.1)
    .sort((a, b) => b.correlation - a.correlation)
    .slice(0, 5);

  const strongestNegative = pairs
    .filter((p) => p.correlation < -0.1)
    .sort((a, b) => a.correlation - b.correlation)
    .slice(0, 5);

  return {
    method,
    columns: numCols,
    matrix,
    strongestPositive,
    strongestNegative,
    sampleSize: profile.rowCount,
  };
}

function computeRanks(arr: number[]): number[] {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  for (let i = 0; i < sorted.length; i++) {
    ranks[sorted[i].i] = i + 1;
  }
  return ranks;
}

// ----------------------------------------------------
// 4. Group-By Aggregation
// ----------------------------------------------------
export function computeDeterministicGroupBy(
  profile: DatasetProfile,
  req: GroupByRequest,
  customRows?: Record<string, any>[]
): GroupByResponse {
  const byCols = Array.isArray(req.by) ? req.by : [req.by];
  const rows = (customRows && customRows.length > 0) ? customRows : (profile.previewRows || []);

  const grouped: Record<string, { keyRecord: Record<string, any>; items: Record<string, any>[] }> = {};

  rows.forEach((row) => {
    const key = byCols.map((col) => String(row[col] ?? 'N/A')).join(' | ');
    if (!grouped[key]) {
      const keyRecord: Record<string, any> = {};
      byCols.forEach((col) => {
        keyRecord[col] = row[col] ?? 'N/A';
      });
      grouped[key] = { keyRecord, items: [] };
    }
    grouped[key].items.push(row);
  });

  const results: Record<string, any>[] = [];

  Object.values(grouped).forEach(({ keyRecord, items }) => {
    const resRow: Record<string, any> = {
      ...keyRecord,
      count: items.length,
    };
    if (byCols.length === 1) {
      resRow.category = String(keyRecord[byCols[0]] ?? 'Uncategorized');
    }
    req.aggregations.forEach((agg) => {
      const alias = agg.alias || `${agg.function}_${agg.column}`;
      const vals = items
        .map((it) => Number(it[agg.column]))
        .filter((v) => !isNaN(v));

      if (agg.function === 'count') {
        resRow[alias] = items.length;
      } else if (agg.function === 'sum') {
        resRow[alias] = Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
      } else if (agg.function === 'mean') {
        const meanVal = vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
        resRow[alias] = meanVal;
        resRow.mean = meanVal;
      } else if (agg.function === 'median') {
        if (vals.length === 0) resRow[alias] = 0;
        else {
          vals.sort((a, b) => a - b);
          const mid = Math.floor(vals.length / 2);
          resRow[alias] = vals.length % 2 !== 0 ? vals[mid] : Number(((vals[mid - 1] + vals[mid]) / 2).toFixed(2));
        }
      } else if (agg.function === 'min') {
        resRow[alias] = vals.length > 0 ? Math.min(...vals) : 0;
      } else if (agg.function === 'max') {
        resRow[alias] = vals.length > 0 ? Math.max(...vals) : 0;
      } else if (agg.function === 'nunique') {
        const uniqueSet = new Set(items.map((it) => it[agg.column]));
        resRow[alias] = uniqueSet.size;
      }
    });
    results.push(resRow);
  });

  // Sorting
  if (req.sortBy) {
    const sortField = req.sortBy;
    const asc = req.ascending ?? false;
    results.sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return asc ? vA - vB : vB - vA;
      }
      return asc ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });
  }

  const limit = req.limit || 50;
  const totalGroups = results.length;
  const truncated = totalGroups > limit;

  return {
    by: byCols,
    aggregations: req.aggregations,
    groups: results.slice(0, limit),
    totalGroups,
    truncated,
  };
}

// ----------------------------------------------------
// 5. Outliers Detection
// ----------------------------------------------------
export function computeDeterministicOutliers(
  profile: DatasetProfile,
  columnName: string,
  method: 'iqr' | 'zscore' = 'iqr',
  threshold = 1.5
): OutlierResponse {
  const nums = extractNumericValues(profile, columnName);
  const totalObservations = profile.rowCount;
  const validObservations = nums.length;

  if (validObservations < 4) {
    return {
      column: columnName,
      method,
      threshold,
      totalObservations,
      validObservations,
      outlierCount: 0,
      outlierPercentage: 0,
      lowerBound: null,
      upperBound: null,
      sampleOutliers: [],
    };
  }

  const sorted = [...nums].sort((a, b) => a - b);
  let lowerBound = 0;
  let upperBound = 0;

  if (method === 'iqr') {
    const q1Idx = Math.floor(sorted.length * 0.25);
    const q3Idx = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    const iqr = q3 - q1;
    lowerBound = q1 - threshold * iqr;
    upperBound = q3 + threshold * iqr;
  } else {
    // Z-Score
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sorted.length;
    const std = Math.sqrt(variance) || 1;
    lowerBound = mean - threshold * std;
    upperBound = mean + threshold * std;
  }

  const rows = profile.previewRows || [];
  const sampleOutliers: Record<string, any>[] = [];
  let outlierCount = 0;

  rows.forEach((row, idx) => {
    const val = Number(row[columnName]);
    if (!isNaN(val) && (val < lowerBound || val > upperBound)) {
      outlierCount++;
      if (sampleOutliers.length < 50) {
        sampleOutliers.push({
          rowIndex: idx + 1,
          value: val,
          deviation: Number((val > upperBound ? val - upperBound : lowerBound - val).toFixed(2)),
          ...row,
        });
      }
    }
  });

  const outlierPercentage = validObservations > 0 ? (outlierCount / validObservations) * 100 : 0;

  return {
    column: columnName,
    method,
    threshold,
    totalObservations,
    validObservations,
    outlierCount,
    outlierPercentage: Number(outlierPercentage.toFixed(2)),
    lowerBound: Number(lowerBound.toFixed(3)),
    upperBound: Number(upperBound.toFixed(3)),
    sampleOutliers,
  };
}

// ----------------------------------------------------
// 6. Time-Series Trends
// ----------------------------------------------------
export function computeDeterministicTrends(
  profile: DatasetProfile,
  dateColumn: string,
  valueColumn: string,
  frequency: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
  aggregation: 'sum' | 'mean' | 'median' | 'count' = 'sum'
): TrendResponse {
  const rows = profile.previewRows || [];
  const validRows = rows
    .map((r) => {
      const d = r[dateColumn] ? new Date(r[dateColumn]) : null;
      const v = Number(r[valueColumn]);
      return {
        date: d && !isNaN(d.getTime()) ? d : null,
        val: isNaN(v) ? null : v,
      };
    })
    .filter((r): r is { date: Date; val: number } => r.date !== null && r.val !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (validRows.length === 0) {
    return {
      dateColumn,
      valueColumn,
      aggregation,
      frequency,
      points: [],
      trendDirection: 'insufficient_data',
      overallSummary: `No valid observations with timestamp in '${dateColumn}' and numeric values in '${valueColumn}'.`,
    };
  }

  // Resample into buckets
  const buckets: Record<string, number[]> = {};
  validRows.forEach((r) => {
    const d = r.date;
    let periodKey = '';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    if (frequency === 'year') {
      periodKey = `${year}`;
    } else if (frequency === 'quarter') {
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      periodKey = `${year}-Q${q}`;
    } else if (frequency === 'month') {
      periodKey = `${year}-${month}`;
    } else if (frequency === 'week') {
      const weekNum = Math.ceil(d.getUTCDate() / 7);
      periodKey = `${year}-${month}-W${weekNum}`;
    } else {
      periodKey = `${year}-${month}-${day}`;
    }

    if (!buckets[periodKey]) {
      buckets[periodKey] = [];
    }
    buckets[periodKey].push(r.val);
  });

  const points: TrendPoint[] = Object.entries(buckets).map(([period, vals]) => {
    let aggVal: number | null = null;
    if (aggregation === 'sum') {
      aggVal = vals.reduce((a, b) => a + b, 0);
    } else if (aggregation === 'mean') {
      aggVal = vals.reduce((a, b) => a + b, 0) / vals.length;
    } else if (aggregation === 'median') {
      vals.sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      aggVal = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    } else if (aggregation === 'count') {
      aggVal = vals.length;
    }

    return {
      period,
      value: aggVal !== null ? Number(aggVal.toFixed(2)) : null,
      count: vals.length,
    };
  });

  const validVals = points.map((p) => p.value).filter((v): v is number => v !== null);
  const firstValue = validVals[0] ?? null;
  const lastValue = validVals[validVals.length - 1] ?? null;
  const minValue = validVals.length > 0 ? Math.min(...validVals) : null;
  const maxValue = validVals.length > 0 ? Math.max(...validVals) : null;

  let absoluteChange: number | null = null;
  let percentageChange: number | null = null;
  let trendDirection: TrendResponse['trendDirection'] = 'stable';

  if (firstValue !== null && lastValue !== null) {
    absoluteChange = Number((lastValue - firstValue).toFixed(2));
    if (firstValue !== 0) {
      percentageChange = Number((((lastValue - firstValue) / Math.abs(firstValue)) * 100).toFixed(1));
    }

    if (percentageChange !== null) {
      if (percentageChange > 5) trendDirection = 'increasing';
      else if (percentageChange < -5) trendDirection = 'decreasing';
      else trendDirection = 'stable';
    }
  }

  const overallSummary = `Over ${points.length} periods (${frequency} frequency), metric ${valueColumn} showed a ${trendDirection} trajectory with ${percentageChange !== null ? `${percentageChange > 0 ? '+' : ''}${percentageChange}%` : 'minimal'} overall change.`;

  return {
    dateColumn,
    valueColumn,
    aggregation,
    frequency,
    points,
    firstValue,
    lastValue,
    absoluteChange,
    percentageChange,
    minValue,
    maxValue,
    trendDirection,
    overallSummary,
  };
}

// ----------------------------------------------------
// 7. Distribution & Histograms
// ----------------------------------------------------
export function computeDeterministicDistribution(
  profile: DatasetProfile,
  columnName: string,
  binsCount = 15
): DistributionResponse {
  const nums = extractNumericValues(profile, columnName).sort((a, b) => a - b);
  const count = nums.length;

  if (count === 0) {
    return {
      column: columnName,
      count: 0,
      min: null,
      max: null,
      mean: null,
      median: null,
      std: null,
      skewness: null,
      kurtosis: null,
      percentiles: {},
      bins: [],
    };
  }

  const min = nums[0];
  const max = nums[count - 1];
  const mean = nums.reduce((a, b) => a + b, 0) / count;
  const median = count % 2 === 1 ? nums[Math.floor(count / 2)] : (nums[count / 2 - 1] + nums[count / 2]) / 2;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (count > 1 ? count - 1 : 1);
  const std = Math.sqrt(variance);

  // Moments for Skewness and Kurtosis
  let m3 = 0;
  let m4 = 0;
  nums.forEach((x) => {
    m3 += Math.pow(x - mean, 3);
    m4 += Math.pow(x - mean, 4);
  });
  m3 /= count;
  m4 /= count;

  const skewness = std > 0 ? Number((m3 / Math.pow(std, 3)).toFixed(3)) : 0;
  const kurtosis = std > 0 ? Number((m4 / Math.pow(std, 4) - 3).toFixed(3)) : 0;

  // Build uniform frequency histogram bins
  const binWidth = max > min ? (max - min) / binsCount : 1;
  const bins: HistogramBin[] = [];

  for (let i = 0; i < binsCount; i++) {
    const binStart = min + i * binWidth;
    const binEnd = i === binsCount - 1 ? max + 0.0001 : binStart + binWidth;
    const binItems = nums.filter((x) => x >= binStart && x < binEnd);
    const cnt = binItems.length;

    bins.push({
      binIndex: i,
      binStart: Number(binStart.toFixed(2)),
      binEnd: Number(binEnd.toFixed(2)),
      count: cnt,
      percentage: Number(((cnt / count) * 100).toFixed(1)),
    });
  }

  const getPercentile = (p: number) => {
    const idx = (p / 100) * (count - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return nums[lower] * (1 - weight) + nums[upper] * weight;
  };

  const percentiles: Record<string, number | null> = {
    p1: Number(getPercentile(1).toFixed(2)),
    p5: Number(getPercentile(5).toFixed(2)),
    p10: Number(getPercentile(10).toFixed(2)),
    p25: Number(getPercentile(25).toFixed(2)),
    p50: Number(median.toFixed(2)),
    p75: Number(getPercentile(75).toFixed(2)),
    p90: Number(getPercentile(90).toFixed(2)),
    p95: Number(getPercentile(95).toFixed(2)),
    p99: Number(getPercentile(99).toFixed(2)),
  };

  return {
    column: columnName,
    count,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    skewness,
    kurtosis,
    percentiles,
    bins,
  };
}

// ----------------------------------------------------
// 8. Data Quality Breakdown
// ----------------------------------------------------
export function computeDeterministicDataQuality(profile: DatasetProfile): DataQualityResponse {
  const factors = [
    {
      name: 'Missing Cell Values',
      penalty: profile.missingDataPercentage > 20 ? 30 : profile.missingDataPercentage > 5 ? 15 : profile.missingDataPercentage > 0 ? 5 : 0,
      impact: profile.missingDataPercentage > 20 ? 'High' : profile.missingDataPercentage > 5 ? 'Moderate' : 'Low',
      description: `${profile.missingValueCount.toLocaleString()} cells (${profile.missingDataPercentage.toFixed(1)}%) are null or blank.`,
    },
    {
      name: 'Duplicate Records',
      penalty: profile.duplicateRowPercentage > 10 ? 25 : profile.duplicateRowPercentage > 1 ? 10 : 0,
      impact: profile.duplicateRowPercentage > 10 ? 'High' : profile.duplicateRowPercentage > 1 ? 'Moderate' : 'Low',
      description: `${profile.duplicateRowCount.toLocaleString()} rows (${profile.duplicateRowPercentage.toFixed(1)}%) are identical duplicate copies.`,
    },
    {
      name: 'Empty / Zero-Variance Features',
      penalty: profile.columns.filter((c) => c.nullPercentage === 100).length * 10,
      impact: profile.columns.some((c) => c.nullPercentage === 100) ? 'Moderate' : 'Low',
      description: `${profile.columns.filter((c) => c.nullPercentage === 100).length} columns contain 100% missing values.`,
    },
  ];

  const rating =
    profile.dataQualityScore >= 85
      ? 'High'
      : profile.dataQualityScore >= 70
      ? 'Good'
      : profile.dataQualityScore >= 50
      ? 'Fair'
      : 'Poor';

  const summary = `Overall dataset quality is evaluated at ${profile.dataQualityScore}/100 (${rating} rating) based on completeness, uniqueness, and structural schema consistency.`;

  return {
    score: profile.dataQualityScore,
    rating,
    factors,
    totalMissingCells: profile.missingValueCount,
    missingPercentage: profile.missingDataPercentage,
    duplicateRows: profile.duplicateRowCount,
    duplicatePercentage: profile.duplicateRowPercentage,
    emptyColumnsCount: profile.columns.filter((c) => c.nullPercentage === 100).length,
    zeroVarianceColumnsCount: 0,
    summary,
  };
}

// ----------------------------------------------------
// 9. Query & Table Pagination
// ----------------------------------------------------
export function executeDeterministicQuery(
  profile: DatasetProfile,
  req: QueryRequest
): QueryResponse {
  let rows = [...(profile.previewRows || [])];

  // Apply filters
  if (req.filters && req.filters.length > 0) {
    req.filters.forEach((f) => {
      rows = rows.filter((r) => {
        const val = r[f.column];
        if (f.operator === 'equals') return String(val).toLowerCase() === String(f.value).toLowerCase();
        if (f.operator === 'not_equals') return String(val).toLowerCase() !== String(f.value).toLowerCase();
        if (f.operator === 'contains') return String(val ?? '').toLowerCase().includes(String(f.value).toLowerCase());
        if (f.operator === 'greater_than') return Number(val) > Number(f.value);
        if (f.operator === 'greater_than_or_equal') return Number(val) >= Number(f.value);
        if (f.operator === 'less_than') return Number(val) < Number(f.value);
        if (f.operator === 'less_than_or_equal') return Number(val) <= Number(f.value);
        if (f.operator === 'is_null') return val === null || val === undefined || val === '';
        if (f.operator === 'is_not_null') return val !== null && val !== undefined && val !== '';
        return true;
      });
    });
  }

  // Sort
  if (req.sortBy) {
    const col = req.sortBy;
    const asc = req.ascending ?? true;
    rows.sort((a, b) => {
      const vA = a[col];
      const vB = b[col];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return asc ? vA - vB : vB - vA;
      }
      return asc ? String(vA ?? '').localeCompare(String(vB ?? '')) : String(vB ?? '').localeCompare(String(vA ?? ''));
    });
  }

  const totalMatchingRows = rows.length;
  const offset = req.offset || 0;
  const limit = req.limit || 50;
  const pagedRows = rows.slice(offset, offset + limit);

  const columns = req.columns || profile.columns.map((c) => c.name);

  return {
    rows: pagedRows,
    totalMatchingRows,
    offset,
    limit,
    columns,
  };
}
