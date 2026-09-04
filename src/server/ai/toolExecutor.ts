import { DatasetProfile } from '../../types/dataset';
import { AiToolTraceItem } from '../../types/ai';
import { isSensitiveColumn } from './sensitiveData';
import {
  computeDeterministicColumnStats,
  computeDeterministicCorrelation,
  computeDeterministicDataQuality,
  computeDeterministicDistribution,
  computeDeterministicGroupBy,
  computeDeterministicOutliers,
  computeDeterministicOverview,
  computeDeterministicTrends,
  executeDeterministicQuery,
} from '../../services/deterministicMath';
import {
  performWhatIfScenario,
  predictWithModel,
  trainAndEvaluateModel,
  validateMlTask,
} from '../../services/deterministicMl';

const ALLOWED_AGGREGATIONS = ['mean', 'sum', 'median', 'count', 'min', 'max', 'std', 'nunique'];
const ALLOWED_CORRELATIONS = ['pearson', 'spearman', 'kendall'];
const ALLOWED_OUTLIER_METHODS = ['iqr', 'zscore'];
const ALLOWED_TREND_FREQUENCIES = ['day', 'week', 'month', 'quarter', 'year'];

export async function executeAnalyticalTool(
  toolName: string,
  args: Record<string, any>,
  profile: DatasetProfile
): Promise<{ result: any; trace: AiToolTraceItem }> {
  const startTime = Date.now();
  const availableColumns = profile.columns.map((c) => c.name);

  // Validate dataset ID
  if (args.dataset_id && args.dataset_id !== profile.datasetId) {
    const trace: AiToolTraceItem = {
      toolName,
      parameters: args,
      executionTimeMs: Date.now() - startTime,
      status: 'error',
      summary: `Dataset ID mismatch: expected ${profile.datasetId}, received ${args.dataset_id}`,
      error: 'DATASET_MISMATCH',
    };
    return {
      result: { error: 'Invalid dataset ID provided for tool execution.' },
      trace,
    };
  }

  try {
    switch (toolName) {
      case 'get_dataset_profile': {
        const overview = computeDeterministicOverview(profile);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Retrieved dataset profile for ${profile.fileName} (${profile.rowCount.toLocaleString()} rows, ${profile.columnCount} cols, score: ${profile.dataQualityScore}/100)`,
        };
        return {
          result: {
            fileName: profile.fileName,
            rowCount: profile.rowCount,
            columnCount: profile.columnCount,
            dataQualityScore: profile.dataQualityScore,
            missingDataPercentage: profile.missingDataPercentage,
            numericColumns: profile.numericColumns,
            categoricalColumns: profile.categoricalColumns,
            datetimeColumns: profile.datetimeColumns,
            summaryFacts: overview.summaryFacts,
            topMissingColumns: overview.topMissingColumns,
          },
          trace,
        };
      }

      case 'get_column_statistics': {
        const col = args.column;
        if (!col || !availableColumns.includes(col)) {
          throw new Error(`Column '${col}' does not exist in dataset. Available: ${availableColumns.join(', ')}`);
        }
        if (isSensitiveColumn(col)) {
          throw new Error(`Column '${col}' is flagged as potentially sensitive and cannot be profiled directly.`);
        }

        const stats = computeDeterministicColumnStats(profile, col);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Calculated statistics for column '${col}' (type: ${stats.logicalType})`,
        };
        return { result: stats, trace };
      }

      case 'get_unique_values': {
        const col = args.column;
        const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);

        if (!col || !availableColumns.includes(col)) {
          throw new Error(`Column '${col}' does not exist in dataset.`);
        }
        if (isSensitiveColumn(col)) {
          throw new Error(`Column '${col}' is flagged as sensitive.`);
        }

        const stats = computeDeterministicColumnStats(profile, col);
        const cats = stats.categorical?.topCategories?.slice(0, limit) || [];
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Extracted ${cats.length} unique values for column '${col}'`,
        };
        return {
          result: {
            column: col,
            uniqueCount: stats.categorical?.uniqueCount || cats.length,
            topCategories: cats,
          },
          trace,
        };
      }

      case 'group_by': {
        const by = args.by;
        const metric = args.metric_column;
        const agg = String(args.aggregation || 'mean').toLowerCase() as 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max' | 'std' | 'nunique';
        const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
        const sortDesc = args.sort_descending !== false;

        if (!by || !availableColumns.includes(by)) {
          throw new Error(`Grouping column '${by}' does not exist.`);
        }
        if (!metric || !availableColumns.includes(metric)) {
          throw new Error(`Metric column '${metric}' does not exist.`);
        }
        if (!ALLOWED_AGGREGATIONS.includes(agg)) {
          throw new Error(`Unsupported aggregation '${agg}'. Allowed: ${ALLOWED_AGGREGATIONS.join(', ')}`);
        }

        const gb = computeDeterministicGroupBy(profile, {
          by,
          aggregations: [{ column: metric, function: agg }],
          limit,
        });

        // Apply sort if needed
        const aggKey = `${agg}_${metric}`;
        if (sortDesc) {
          gb.groups.sort((a, b) => (Number(b[aggKey]) || 0) - (Number(a[aggKey]) || 0));
        }

        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Grouped by '${by}' and aggregated '${metric}' using ${agg} across ${gb.totalGroups} groups.`,
        };
        return { result: gb, trace };
      }

      case 'calculate_correlation': {
        const method = String(args.method || 'pearson').toLowerCase();
        if (!ALLOWED_CORRELATIONS.includes(method)) {
          throw new Error(`Unsupported correlation method '${method}'. Allowed: ${ALLOWED_CORRELATIONS.join(', ')}`);
        }

        const matrix = computeDeterministicCorrelation(profile, method as any);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Calculated ${method} correlation across ${matrix.columns.length} numeric columns (${matrix.strongestPositive.length + matrix.strongestNegative.length} strong pairs).`,
        };
        return { result: matrix, trace };
      }

      case 'detect_outliers': {
        const col = args.column;
        const method = String(args.method || 'iqr').toLowerCase();
        const threshold = Number(args.threshold) || (method === 'iqr' ? 1.5 : 3.0);

        if (!col || !availableColumns.includes(col)) {
          throw new Error(`Column '${col}' does not exist.`);
        }
        if (!ALLOWED_OUTLIER_METHODS.includes(method)) {
          throw new Error(`Unsupported outlier method '${method}'. Allowed: ${ALLOWED_OUTLIER_METHODS.join(', ')}`);
        }

        const outliers = computeDeterministicOutliers(profile, col, method as any, threshold);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Detected ${outliers.outlierCount.toLocaleString()} outliers (${outliers.outlierPercentage.toFixed(1)}%) in '${col}' using ${method}.`,
        };
        return { result: outliers, trace };
      }

      case 'detect_trends': {
        const dateCol = args.date_column;
        const valCol = args.value_column;
        const freq = String(args.frequency || 'month').toLowerCase();
        const agg = String(args.aggregation || 'sum').toLowerCase();

        if (!dateCol || !availableColumns.includes(dateCol)) {
          throw new Error(`Date column '${dateCol}' does not exist.`);
        }
        if (!valCol || !availableColumns.includes(valCol)) {
          throw new Error(`Value column '${valCol}' does not exist.`);
        }
        if (!ALLOWED_TREND_FREQUENCIES.includes(freq)) {
          throw new Error(`Unsupported trend frequency '${freq}'.`);
        }

        const trends = computeDeterministicTrends(
          profile,
          dateCol,
          valCol,
          freq as any,
          agg as 'sum' | 'mean' | 'median' | 'count'
        );
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Analyzed trends for '${valCol}' over '${dateCol}' (direction: ${trends.trendDirection}, change: ${(trends.percentageChange || 0).toFixed(1)}%).`,
        };
        return { result: trends, trace };
      }

      case 'analyze_distribution': {
        const col = args.column;
        const bins = Math.min(Math.max(Number(args.bins) || 15, 5), 50);

        if (!col || !availableColumns.includes(col)) {
          throw new Error(`Column '${col}' does not exist.`);
        }

        const dist = computeDeterministicDistribution(profile, col, bins);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Computed distribution for '${col}' (${bins} bins, skewness: ${(dist.skewness || 0).toFixed(2)}, kurtosis: ${(dist.kurtosis || 0).toFixed(2)}).`,
        };
        return { result: dist, trace };
      }

      case 'assess_data_quality': {
        const quality = computeDeterministicDataQuality(profile);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Assessed data quality: overall score ${quality.score}/100 with ${quality.factors.length} penalty factors.`,
        };
        return { result: quality, trace };
      }

      case 'compare_groups': {
        const groupCol = args.group_column;
        const catA = String(args.category_a);
        const catB = String(args.category_b);
        const metricCol = args.metric_column;

        if (!groupCol || !availableColumns.includes(groupCol)) {
          throw new Error(`Group column '${groupCol}' does not exist.`);
        }
        if (!metricCol || !availableColumns.includes(metricCol)) {
          throw new Error(`Metric column '${metricCol}' does not exist.`);
        }

        const gb = computeDeterministicGroupBy(profile, {
          by: groupCol,
          aggregations: [
            { column: metricCol, function: 'mean' },
            { column: metricCol, function: 'median' },
            { column: metricCol, function: 'count' },
            { column: metricCol, function: 'std' },
          ],
          limit: 100,
        });

        const grpA = gb.groups.find((g) => String(g[groupCol]).toLowerCase() === catA.toLowerCase());
        const grpB = gb.groups.find((g) => String(g[groupCol]).toLowerCase() === catB.toLowerCase());

        const meanA = grpA ? Number(grpA[`mean_${metricCol}`]) : null;
        const meanB = grpB ? Number(grpB[`mean_${metricCol}`]) : null;
        const diff = meanA !== null && meanB !== null ? meanA - meanB : null;
        const pctDiff = meanA !== null && meanB !== null && meanB !== 0 ? ((meanA - meanB) / meanB) * 100 : null;

        const comparisonResult = {
          groupColumn: groupCol,
          metricColumn: metricCol,
          categoryA: { name: catA, stats: grpA || 'No records found' },
          categoryB: { name: catB, stats: grpB || 'No records found' },
          meanDifference: diff,
          percentageDifference: pctDiff,
        };

        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Compared '${catA}' vs '${catB}' on metric '${metricCol}'.`,
        };
        return { result: comparisonResult, trace };
      }

      case 'get_sample_records': {
        const limit = Math.min(Math.max(Number(args.limit) || 3, 1), 5);
        const filterCol = args.filter_column;
        const filterVal = args.filter_value;

        let rows = profile.previewRows || [];
        if (filterCol && filterVal !== undefined) {
          rows = rows.filter((r) => String(r[filterCol]).toLowerCase() === String(filterVal).toLowerCase());
        }
        const sampled = rows.slice(0, limit).map((r) => {
          const sanitized: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (!isSensitiveColumn(k)) {
              sanitized[k] = v;
            } else {
              sanitized[k] = '[REDACTED]';
            }
          }
          return sanitized;
        });

        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Sampled ${sampled.length} records safely from dataset.`,
        };
        return { result: { sampledRows: sampled, totalPreviewRows: rows.length }, trace };
      }

      case 'create_chart_specification': {
        const chartType = args.chart_type || 'bar';
        const xCol = args.x_column;
        const yCol = args.y_column;
        const title = args.title || `${chartType} chart`;
        const agg = args.aggregation || 'mean';

        if (!xCol || !availableColumns.includes(xCol)) {
          throw new Error(`X-axis column '${xCol}' does not exist.`);
        }
        if (yCol && !availableColumns.includes(yCol)) {
          throw new Error(`Y-axis column '${yCol}' does not exist.`);
        }

        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Generated chart specification for '${title}' (${chartType}).`,
        };
        return {
          result: {
            recommended: true,
            type: chartType,
            title,
            xAxis: xCol,
            yAxis: yCol || null,
            aggregation: agg,
          },
          trace,
        };
      }

      case 'validate_ml_task': {
        const targetCol = args.target_column;
        const featureCols = args.feature_columns || [];
        const task = args.task;

        const valResult = validateMlTask(profile, targetCol, featureCols, task);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: valResult.isValid ? 'success' : 'error',
          summary: valResult.isValid
            ? `ML Task Validated: Recommended ${valResult.recommendedTask} on target '${targetCol}' with ${valResult.safeFeatureColumns.length} safe features.`
            : `ML Validation Failed: ${valResult.errors.join(', ')}`,
        };
        return {
          result: valResult,
          trace,
        };
      }

      case 'train_ml_model': {
        const targetCol = args.target_column;
        const featureCols = args.feature_columns;
        const task = args.task;
        const algo = args.algorithm || 'auto';

        const trained = trainAndEvaluateModel({
          profile,
          targetColumn: targetCol,
          featureColumns: featureCols,
          task,
          algorithm: algo,
        });

        const primaryMetric =
          trained.task === 'regression'
            ? `R²=${trained.regressionMetrics?.r2.toFixed(3)}, MAE=${trained.regressionMetrics?.mae.toFixed(2)}`
            : `Macro F1=${trained.classificationMetrics?.f1Macro.toFixed(3)}, Acc=${(trained.classificationMetrics?.accuracy! * 100).toFixed(1)}%`;

        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Trained deterministic ${trained.algorithmDisplayName} for '${targetCol}' (${primaryMetric}, evaluated on ${trained.testRowCount} test records).`,
        };

        return {
          result: {
            modelId: trained.id,
            algorithm: trained.algorithmDisplayName,
            task: trained.task,
            targetColumn: trained.targetColumn,
            trainRowCount: trained.trainRowCount,
            testRowCount: trained.testRowCount,
            metrics: trained.regressionMetrics || trained.classificationMetrics,
            featureImportance: trained.featureImportance.slice(0, 5),
            warnings: trained.warnings,
          },
          trace,
        };
      }

      case 'predict_target_value': {
        const targetCol = args.target_column;
        const features = args.features || {};

        // Find or train a fast model on the fly if needed
        const featureCols = Object.keys(features).filter((k) => availableColumns.includes(k));
        const trained = trainAndEvaluateModel({
          profile,
          targetColumn: targetCol,
          featureColumns: featureCols.length > 0 ? featureCols : undefined,
        });

        const predResult = predictWithModel(trained.id, features);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `Predicted ${targetCol}: ${predResult.formattedPrediction} (${trained.algorithmDisplayName}, R²=${trained.regressionMetrics?.r2.toFixed(2) || 'N/A'}).`,
        };

        return {
          result: predResult,
          trace,
        };
      }

      case 'perform_what_if_scenario': {
        const targetCol = args.target_column;
        const baselineFeatures = args.baseline_features || {};
        const scenarioFeatures = args.scenario_features || {};

        const featureCols = Object.keys(baselineFeatures).filter((k) => availableColumns.includes(k));
        const trained = trainAndEvaluateModel({
          profile,
          targetColumn: targetCol,
          featureColumns: featureCols.length > 0 ? featureCols : undefined,
        });

        const scenarioResult = performWhatIfScenario(trained.id, baselineFeatures, scenarioFeatures);
        const trace: AiToolTraceItem = {
          toolName,
          parameters: args,
          executionTimeMs: Date.now() - startTime,
          status: 'success',
          summary: `What-If Scenario: Baseline ${scenarioResult.formattedBaseline} -> Scenario ${scenarioResult.formattedScenario} (${scenarioResult.direction}, delta: ${scenarioResult.percentageDifference ? `${scenarioResult.percentageDifference.toFixed(1)}%` : `${scenarioResult.absoluteDifference}`}).`,
        };

        return {
          result: scenarioResult,
          trace,
        };
      }

      default:
        throw new Error(
          `Unknown analytical tool '${toolName}'. Allowed tools: get_dataset_profile, get_column_statistics, get_unique_values, group_by, calculate_correlation, detect_outliers, detect_trends, analyze_distribution, assess_data_quality, compare_groups, get_sample_records, create_chart_specification, validate_ml_task, train_ml_model, predict_target_value, perform_what_if_scenario.`
        );
    }
  } catch (err: any) {
    const trace: AiToolTraceItem = {
      toolName,
      parameters: args,
      executionTimeMs: Date.now() - startTime,
      status: 'error',
      summary: `Failed to execute tool '${toolName}': ${err.message}`,
      error: err.message,
    };
    return {
      result: { error: err.message },
      trace,
    };
  }
}
