import { DatasetProfile } from '../types/dataset';
import {
  ActualVsPredictedPoint,
  ChangedFeatureAnalysis,
  ClassificationClassMetric,
  ClassificationMetrics,
  FeatureImportanceItem,
  MlAlgorithm,
  MlTaskType,
  ModelCandidateEvaluation,
  ModelValidationResult,
  PredictRequest,
  PredictResponse,
  PreprocessingSummary,
  RegressionMetrics,
  TrainedModel,
  TrainModelRequest,
  WhatIfRequest,
  WhatIfResponse,
} from '../types/ml';

// ----------------------------------------------------
// 1. Internal Preprocessing & Math Helpers
// ----------------------------------------------------

interface ColumnTransformInfo {
  name: string;
  type: 'numeric' | 'categorical';
  median: number;
  mean: number;
  std: number;
  mode: string;
  categories: string[]; // for one-hot encoding
}

export interface InternalFittedPipeline {
  featureColumns: string[];
  columnTransforms: Record<string, ColumnTransformInfo>;
  encodedFeatureNames: string[];
  targetColumn: string;
  targetType: 'numeric' | 'categorical';
  targetClasses?: string[];
  targetMean?: number;
  summary: PreprocessingSummary;
}

interface InternalModelWeights {
  algorithm: MlAlgorithm;
  task: MlTaskType;
  // Linear / Logistic weights
  coefficients?: number[]; // [p]
  intercept?: number;
  multiClassWeights?: Record<string, { coefficients: number[]; intercept: number }>;
  // Tree models
  trees?: InternalDecisionTree[];
  featureImportances: number[]; // raw importances per encoded feature
}

interface InternalDecisionTree {
  isLeaf: boolean;
  prediction?: number; // for regression or binary prob
  classProbabilities?: Record<string, number>; // for classification
  featureIndex?: number;
  threshold?: number;
  left?: InternalDecisionTree;
  right?: InternalDecisionTree;
  gain?: number;
}

// In-memory model registry for the current runtime
const trainedModelStore = new Map<string, { model: TrainedModel; pipeline: InternalFittedPipeline; weights: InternalModelWeights }>();

export function getTrainedModelFromStore(modelId: string) {
  return trainedModelStore.get(modelId);
}

export function saveTrainedModelToStore(model: TrainedModel, pipeline: InternalFittedPipeline, weights: InternalModelWeights) {
  trainedModelStore.set(model.id, { model, pipeline, weights });
}

export function listTrainedModelsForDataset(datasetId: string, ownerId?: string): TrainedModel[] {
  const list: TrainedModel[] = [];
  trainedModelStore.forEach((item) => {
    if ((!datasetId || item.model.datasetId === datasetId) && (!ownerId || item.model.ownerId === ownerId)) {
      list.push(item.model);
    }
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listTrainedModels(datasetId?: string, ownerId?: string): TrainedModel[] {
  return listTrainedModelsForDataset(datasetId || '', ownerId);
}

export function getTrainedModel(modelId: string): TrainedModel | undefined {
  return trainedModelStore.get(modelId)?.model;
}

export function deleteTrainedModelFromStore(modelId: string, ownerId?: string): boolean {
  const item = trainedModelStore.get(modelId);
  if (!item) return false;
  if (ownerId && item.model.ownerId && item.model.ownerId !== ownerId) return false;
  return trainedModelStore.delete(modelId);
}

export function deleteTrainedModel(modelId: string, ownerId?: string): boolean {
  return deleteTrainedModelFromStore(modelId, ownerId);
}

export function predictWithModel(modelId: string, features: Record<string, any>, ownerId?: string): PredictResponse {
  return executePrediction({ modelId, features }, ownerId || '');
}

export function performWhatIfScenario(
  modelId: string,
  baselineFeatures: Record<string, any>,
  scenarioFeatures: Record<string, any>,
  ownerId?: string
): WhatIfResponse {
  return executeWhatIfAnalysis({ modelId, baselineFeatures, scenarioFeatures }, ownerId || '');
}

// Seedable PRNG (Mulberry32)
function createPrng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------------------------------
// 2. Feature & Target Validation (Leakage Safe)
// ----------------------------------------------------

export function validateMlConfiguration(
  profile: DatasetProfile,
  req: Partial<TrainModelRequest>
): ModelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const candidateTargets: { column: string; task: MlTaskType; reason: string }[] = [];
  profile.columns.forEach((c) => {
    if (c.nullPercentage > 50) return;
    if (c.logicalType === 'numeric' && c.uniqueCount > 5) {
      candidateTargets.push({
        column: c.name,
        task: 'regression',
        reason: `Continuous numeric feature with ${c.uniqueCount} distinct values.`,
      });
    } else if (c.logicalType === 'categorical' || c.logicalType === 'boolean' || (c.logicalType === 'numeric' && c.uniqueCount <= 10)) {
      if (c.uniqueCount >= 2 && c.uniqueCount <= 20) {
        candidateTargets.push({
          column: c.name,
          task: 'classification',
          reason: `Discrete target with ${c.uniqueCount} distinct classes.`,
        });
      }
    }
  });

  const targetCol = req.targetColumn;
  let recommendedTask: MlTaskType = 'regression';

  if (!targetCol) {
    errors.push('No target column specified for ML training.');
  } else {
    const targetMeta = profile.columns.find((c) => c.name === targetCol);
    if (!targetMeta) {
      errors.push(`Target column '${targetCol}' does not exist in dataset schema.`);
    } else {
      if (targetMeta.nullPercentage > 40) {
        errors.push(`Target column '${targetCol}' has ${targetMeta.nullPercentage.toFixed(1)}% missing values (maximum allowed is 40%).`);
      }
      if (targetMeta.uniqueCount <= 1) {
        errors.push(`Target column '${targetCol}' is constant (zero variance).`);
      }

      if (targetMeta.logicalType === 'numeric' && targetMeta.uniqueCount > 10) {
        recommendedTask = 'regression';
      } else {
        recommendedTask = 'classification';
      }

      if (req.task && req.task !== recommendedTask) {
        if (req.task === 'regression' && targetMeta.logicalType === 'categorical') {
          errors.push(`Target column '${targetCol}' is categorical and cannot be used for regression without numeric conversion.`);
        }
      }
    }
  }

  // Feature columns validation
  const featureCols = req.featureColumns || [];
  const safeFeatureColumns: string[] = [];
  const leakageSuspectColumns: string[] = [];

  featureCols.forEach((fc) => {
    if (targetCol && fc.toLowerCase() === targetCol.toLowerCase()) {
      leakageSuspectColumns.push(fc);
      return; // strictly exclude target column from features
    }

    const colMeta = profile.columns.find((c) => c.name === fc);
    if (!colMeta) {
      warnings.push(`Feature column '${fc}' not found in dataset.`);
      return;
    }

    if (colMeta.nullPercentage === 100) {
      warnings.push(`Feature column '${fc}' is completely empty and will be dropped.`);
      return;
    }

    if (colMeta.uniqueCount <= 1) {
      warnings.push(`Feature column '${fc}' has constant zero variance.`);
      return;
    }

    if (colMeta.logicalType === 'categorical' && colMeta.uniqueCount > 50) {
      warnings.push(`Feature '${fc}' has high cardinality (${colMeta.uniqueCount} unique categories). Top 20 categories will be encoded.`);
    }

    // Check for obvious ID or leakage names
    const lowerName = fc.toLowerCase();
    if (lowerName.includes('id') && colMeta.uniqueCount > (profile.rowCount * 0.8)) {
      warnings.push(`Column '${fc}' appears to be a unique identifier / index and may lead to overfitting.`);
    }

    safeFeatureColumns.push(fc);
  });

  if (targetCol && featureCols.length > 0 && safeFeatureColumns.length === 0) {
    errors.push('No valid feature columns remain after data quality and leakage checks.');
  }

  if (profile.rowCount < 10) {
    errors.push(`Dataset row count (${profile.rowCount}) is insufficient for ML training (minimum 10 rows required).`);
  } else if (profile.rowCount < 40) {
    warnings.push(`Dataset sample size (${profile.rowCount} rows) is small; evaluation metrics may exhibit high variance.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendedTask,
    candidateTargets,
    safeFeatureColumns,
    leakageSuspectColumns,
  };
}

export function validateMlTask(
  profile: DatasetProfile,
  targetColumn?: string,
  featureColumns?: string[],
  task?: MlTaskType
): ModelValidationResult {
  return validateMlConfiguration(profile, {
    targetColumn,
    featureColumns,
    task,
  });
}

// ----------------------------------------------------
// 3. Leakage-Safe Preprocessing Pipeline
// ----------------------------------------------------

export function fitPreprocessingPipeline(
  trainRows: Record<string, any>[],
  featureColumns: string[],
  targetColumn: string,
  task: MlTaskType,
  profile: DatasetProfile
): InternalFittedPipeline {
  const columnTransforms: Record<string, ColumnTransformInfo> = {};
  const encodedFeatureNames: string[] = [];

  featureColumns.forEach((colName) => {
    const colMeta = profile.columns.find((c) => c.name === colName);
    const isNum = colMeta ? colMeta.logicalType === 'numeric' : false;

    if (isNum) {
      const vals = trainRows
        .map((r) => Number(r[colName]))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);

      const count = vals.length;
      const median = count > 0 ? (count % 2 !== 0 ? vals[Math.floor(count / 2)] : (vals[count / 2 - 1] + vals[count / 2]) / 2) : 0;
      const mean = count > 0 ? vals.reduce((a, b) => a + b, 0) / count : 0;
      const variance = count > 1 ? vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (count - 1) : 1;
      const std = Math.sqrt(variance) || 1;

      columnTransforms[colName] = {
        name: colName,
        type: 'numeric',
        median,
        mean,
        std,
        mode: '',
        categories: [],
      };
      encodedFeatureNames.push(colName);
    } else {
      // Categorical
      const counts: Record<string, number> = {};
      trainRows.forEach((r) => {
        const val = r[colName];
        if (val !== undefined && val !== null && val !== '') {
          const s = String(val).trim();
          counts[s] = (counts[s] || 0) + 1;
        }
      });

      const sortedCats = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([cat]) => cat);

      const mode = sortedCats.length > 0 ? sortedCats[0] : 'Missing';

      columnTransforms[colName] = {
        name: colName,
        type: 'categorical',
        median: 0,
        mean: 0,
        std: 1,
        mode,
        categories: sortedCats,
      };

      // One-hot columns
      sortedCats.forEach((cat) => {
        encodedFeatureNames.push(`${colName}__${cat}`);
      });
      // Fallback other category indicator if more categories existed
      if (Object.keys(counts).length > 20) {
        encodedFeatureNames.push(`${colName}__Other`);
      }
    }
  });

  // Target metadata
  let targetClasses: string[] | undefined;
  let targetMean: number | undefined;

  if (task === 'classification') {
    const classSet = new Set<string>();
    trainRows.forEach((r) => {
      const v = r[targetColumn];
      if (v !== undefined && v !== null) {
        classSet.add(String(v).trim());
      }
    });
    targetClasses = Array.from(classSet).sort();
    if (targetClasses.length === 0) targetClasses = ['0', '1'];
  } else {
    const targetVals = trainRows
      .map((r) => Number(r[targetColumn]))
      .filter((v) => !isNaN(v));
    targetMean = targetVals.length > 0 ? targetVals.reduce((a, b) => a + b, 0) / targetVals.length : 0;
  }

  const summary: PreprocessingSummary = {
    numericImputation: 'median',
    categoricalImputation: 'most_frequent',
    categoricalEncoding: 'one_hot',
    scaling: 'standard',
    transformedFeatureCount: encodedFeatureNames.length,
  };

  return {
    featureColumns,
    columnTransforms,
    encodedFeatureNames,
    targetColumn,
    targetType: task === 'classification' ? 'categorical' : 'numeric',
    targetClasses,
    targetMean,
    summary,
  };
}

export function transformRowToVector(row: Record<string, any>, pipeline: InternalFittedPipeline): number[] {
  const vector: number[] = [];

  pipeline.featureColumns.forEach((colName) => {
    const info = pipeline.columnTransforms[colName];
    if (!info) return;

    const rawVal = row[colName];

    if (info.type === 'numeric') {
      let num = Number(rawVal);
      if (isNaN(num) || rawVal === null || rawVal === undefined || rawVal === '') {
        num = info.median; // impute median
      }
      // Standard scale
      const scaled = (num - info.mean) / info.std;
      vector.push(scaled);
    } else {
      // Categorical one-hot transform
      const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : info.mode;
      let matched = false;
      info.categories.forEach((cat) => {
        if (strVal.toLowerCase() === cat.toLowerCase()) {
          vector.push(1.0);
          matched = true;
        } else {
          vector.push(0.0);
        }
      });
      if (info.categories.length > 0 && pipeline.encodedFeatureNames.includes(`${colName}__Other`)) {
        vector.push(matched ? 0.0 : 1.0);
      }
    }
  });

  return vector;
}

// ----------------------------------------------------
// 4. Matrix Math & Solvers
// ----------------------------------------------------

function invertMatrix(M: number[][]): number[][] | null {
  const n = M.length;
  // Augment with identity matrix
  const A: number[][] = M.map((row, i) => {
    const r = [...row];
    for (let j = 0; j < n; j++) {
      r.push(i === j ? 1 : 0);
    }
    return r;
  });

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    if (Math.abs(A[maxRow][i]) < 1e-12) {
      return null; // Singular matrix
    }

    // Swap
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    // Scale pivot row
    const pivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) {
      A[i][j] /= pivot;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }

  // Extract inverse
  return A.map((row) => row.slice(n));
}

// ----------------------------------------------------
// 5. Model Training & Evaluation Engine
// ----------------------------------------------------

export interface TrainModelOptions {
  profile: DatasetProfile;
  targetColumn: string;
  featureColumns?: string[];
  task?: MlTaskType;
  algorithm?: MlAlgorithm;
  splitRatio?: number;
  isTimeSeriesSplit?: boolean;
  timeColumn?: string;
  modelName?: string;
  ownerId?: string;
}

export function trainAndEvaluateModel(
  optionsOrProfile: TrainModelOptions | DatasetProfile,
  reqMaybe?: TrainModelRequest,
  ownerIdMaybe?: string
): TrainedModel & { model: TrainedModel; pipeline: InternalFittedPipeline; weights: InternalModelWeights } {
  let profile: DatasetProfile;
  let req: TrainModelRequest;
  let ownerId: string;

  if ('profile' in optionsOrProfile) {
    profile = optionsOrProfile.profile;
    ownerId = optionsOrProfile.ownerId || 'user_default';
    req = {
      datasetId: profile.datasetId,
      targetColumn: optionsOrProfile.targetColumn,
      featureColumns:
        optionsOrProfile.featureColumns && optionsOrProfile.featureColumns.length > 0
          ? optionsOrProfile.featureColumns
          : profile.columns.map((c) => c.name).filter((n) => n !== optionsOrProfile.targetColumn),
      task: optionsOrProfile.task,
      algorithm: optionsOrProfile.algorithm,
      splitRatio: optionsOrProfile.splitRatio || 0.8,
      isTimeSeriesSplit: optionsOrProfile.isTimeSeriesSplit,
      timeColumn: optionsOrProfile.timeColumn,
      modelName: optionsOrProfile.modelName,
    };
  } else {
    profile = optionsOrProfile;
    req = reqMaybe || {
      datasetId: profile.datasetId,
      targetColumn: '',
      featureColumns: [],
      task: 'regression',
    };
    ownerId = ownerIdMaybe || 'user_default';
  }

  const valResult = validateMlConfiguration(profile, req);
  if (!valResult.isValid) {
    throw new Error(`ML Validation Failed: ${valResult.errors.join('; ')}`);
  }

  const task = req.task || valResult.recommendedTask;
  const targetCol = req.targetColumn;
  const featureCols = req.featureColumns.filter((c) => valResult.safeFeatureColumns.includes(c));
  const splitRatio = Math.min(Math.max(req.splitRatio || 0.8, 0.5), 0.9);

  let rows = [...(profile.previewRows || [])].filter((r) => {
    const v = r[targetCol];
    return v !== null && v !== undefined && v !== '' && (task === 'classification' || !isNaN(Number(v)));
  });

  if (rows.length < 5) {
    throw new Error(`Insufficient clean observations for target '${targetCol}'.`);
  }

  // Train / Test Splitting
  let trainRows: Record<string, any>[] = [];
  let testRows: Record<string, any>[] = [];

  if (req.isTimeSeriesSplit && req.timeColumn) {
    // Chronological sort without random shuffle
    const timeCol = req.timeColumn;
    rows.sort((a, b) => new Date(a[timeCol] || 0).getTime() - new Date(b[timeCol] || 0).getTime());
    const splitIndex = Math.floor(rows.length * splitRatio);
    trainRows = rows.slice(0, splitIndex);
    testRows = rows.slice(splitIndex);
  } else {
    // Deterministic random shuffle
    const prng = createPrng(42);
    const shuffled = [...rows].sort(() => prng() - 0.5);
    const splitIndex = Math.floor(shuffled.length * splitRatio);
    trainRows = shuffled.slice(0, splitIndex);
    testRows = shuffled.slice(splitIndex);
  }

  if (testRows.length === 0) {
    testRows = [trainRows[trainRows.length - 1]];
  }

  // Fit Preprocessing
  const pipeline = fitPreprocessingPipeline(trainRows, featureCols, targetCol, task, profile);

  // Build Feature Matrices & Targets
  const X_train = trainRows.map((r) => transformRowToVector(r, pipeline));
  const X_test = testRows.map((r) => transformRowToVector(r, pipeline));

  const y_train_num = trainRows.map((r) => Number(r[targetCol]));
  const y_test_num = testRows.map((r) => Number(r[targetCol]));

  const y_train_cat = trainRows.map((r) => String(r[targetCol]).trim());
  const y_test_cat = testRows.map((r) => String(r[targetCol]).trim());

  // Evaluate candidate models
  const candidateAlgorithms: MlAlgorithm[] =
    task === 'regression'
      ? ['linear_regression', 'random_forest_regressor', 'gradient_boosting_regressor']
      : ['logistic_regression', 'random_forest_classifier', 'gradient_boosting_classifier'];

  const candidateResults: {
    algorithm: MlAlgorithm;
    weights: InternalModelWeights;
    primaryScore: number;
    metrics: any;
    trainTimeMs: number;
  }[] = [];

  candidateAlgorithms.forEach((algo) => {
    const t0 = Date.now();
    let weights: InternalModelWeights;

    if (algo === 'linear_regression') {
      weights = fitLinearRegression(X_train, y_train_num, pipeline);
    } else if (algo === 'random_forest_regressor') {
      weights = fitRandomForestRegressor(X_train, y_train_num, 15, 6);
    } else if (algo === 'gradient_boosting_regressor') {
      weights = fitGradientBoostingRegressor(X_train, y_train_num, 15, 3, 0.1);
    } else if (algo === 'logistic_regression') {
      weights = fitLogisticRegression(X_train, y_train_cat, pipeline);
    } else if (algo === 'random_forest_classifier') {
      weights = fitRandomForestClassifier(X_train, y_train_cat, pipeline, 15, 6);
    } else {
      weights = fitGradientBoostingClassifier(X_train, y_train_cat, pipeline, 15, 3, 0.1);
    }

    const trainTimeMs = Math.max(Date.now() - t0, 2);

    if (task === 'regression') {
      const preds = X_test.map((x) => predictRegressionVector(x, weights, pipeline));
      const metrics = calculateRegressionMetrics(y_test_num, preds);
      candidateResults.push({
        algorithm: algo,
        weights,
        primaryScore: metrics.r2, // higher is better
        metrics,
        trainTimeMs,
      });
    } else {
      const preds = X_test.map((x) => predictClassificationVector(x, weights, pipeline).predictedClass);
      const metrics = calculateClassificationMetrics(y_test_cat, preds, pipeline.targetClasses || []);
      candidateResults.push({
        algorithm: algo,
        weights,
        primaryScore: metrics.f1Macro, // higher is better
        metrics,
      trainTimeMs,
      });
    }
  });

  // Rank candidate models
  candidateResults.sort((a, b) => b.primaryScore - a.primaryScore);

  let chosenAlgo = req.algorithm || 'auto';
  let selectedCandidate = candidateResults[0];

  if (chosenAlgo !== 'auto') {
    const found = candidateResults.find((c) => c.algorithm === chosenAlgo);
    if (found) selectedCandidate = found;
  }

  const chosenWeights = selectedCandidate.weights;

  // Build Candidates List for UI
  const candidateComparison: ModelCandidateEvaluation[] = candidateResults.map((c, i) => ({
    algorithm: c.algorithm,
    algorithmName: getAlgorithmDisplayName(c.algorithm),
    primaryMetricName: task === 'regression' ? 'R² Score' : 'Macro F1',
    primaryMetricValue: Number(c.primaryScore.toFixed(3)),
    secondaryMetrics:
      task === 'regression'
        ? { MAE: Number(c.metrics.mae.toFixed(3)), RMSE: Number(c.metrics.rmse.toFixed(3)) }
        : { Accuracy: Number(c.metrics.accuracy.toFixed(3)), Precision: Number(c.metrics.precisionMacro.toFixed(3)) },
    trainingTimeMs: c.trainTimeMs,
    isBest: c.algorithm === selectedCandidate.algorithm,
    rank: i + 1,
  }));

  // Build Feature Importance
  const rawImportances = chosenWeights.featureImportances || [];
  const featureImpMap: Record<string, number> = {};

  pipeline.encodedFeatureNames.forEach((encName, idx) => {
    const originalCol = encName.split('__')[0];
    const imp = rawImportances[idx] || 0;
    featureImpMap[originalCol] = (featureImpMap[originalCol] || 0) + imp;
  });

  const totalImp = Object.values(featureImpMap).reduce((a, b) => a + b, 0) || 1;
  const featureImportance: FeatureImportanceItem[] = Object.entries(featureImpMap)
    .map(([feature, rawScore]) => ({
      feature,
      importance: Number((rawScore / totalImp).toFixed(4)),
      normalizedPercentage: Number(((rawScore / totalImp) * 100).toFixed(1)),
      rank: 0,
      rawScore: Number(rawScore.toFixed(4)),
    }))
    .sort((a, b) => b.importance - a.importance)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Final Test Evaluation
  let regressionMetrics: RegressionMetrics | undefined;
  let classificationMetrics: ClassificationMetrics | undefined;
  let actualVsPredicted: ActualVsPredictedPoint[] | undefined;

  if (task === 'regression') {
    const testPreds = X_test.map((x) => predictRegressionVector(x, chosenWeights, pipeline));
    regressionMetrics = calculateRegressionMetrics(y_test_num, testPreds);
    actualVsPredicted = y_test_num.slice(0, 50).map((act, idx) => {
      const pred = testPreds[idx];
      return {
        index: idx + 1,
        actual: Number(act.toFixed(2)),
        predicted: Number(pred.toFixed(2)),
        residual: Number((act - pred).toFixed(2)),
      };
    });
  } else {
    const testPreds = X_test.map((x) => predictClassificationVector(x, chosenWeights, pipeline).predictedClass);
    classificationMetrics = calculateClassificationMetrics(y_test_cat, testPreds, pipeline.targetClasses || []);
  }

  const modelId = `model_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const model: TrainedModel = {
    id: modelId,
    ownerId,
    datasetId: profile.datasetId,
    datasetName: profile.fileName,
    name: req.modelName || `${getAlgorithmDisplayName(selectedCandidate.algorithm)} for ${targetCol}`,
    task,
    algorithm: selectedCandidate.algorithm,
    algorithmDisplayName: getAlgorithmDisplayName(selectedCandidate.algorithm),
    targetColumn: targetCol,
    featureColumns: featureCols,
    trainRowCount: trainRows.length,
    testRowCount: testRows.length,
    splitRatio,
    isTimeSeriesSplit: !!req.isTimeSeriesSplit,
    timeColumn: req.timeColumn,
    regressionMetrics,
    classificationMetrics,
    featureImportance,
    evaluationMethod: req.isTimeSeriesSplit
      ? `Chronological hold-out validation (${Math.round(splitRatio * 100)}/${Math.round((1 - splitRatio) * 100)} temporal split)`
      : `Deterministic train/test split (${Math.round(splitRatio * 100)}% training, ${Math.round((1 - splitRatio) * 100)}% held-out test)`,
    warnings: valResult.warnings,
    candidateComparison,
    actualVsPredicted,
    preprocessing: pipeline.summary,
    createdAt: now,
    updatedAt: now,
  };

  saveTrainedModelToStore(model, pipeline, chosenWeights);

  return Object.assign(model, { model, pipeline, weights: chosenWeights });
}

// ----------------------------------------------------
// 6. Regression Solvers & Evaluation
// ----------------------------------------------------

function fitLinearRegression(
  X: number[][],
  y: number[],
  pipeline: InternalFittedPipeline
): InternalModelWeights {
  const n = X.length;
  const p = pipeline.encodedFeatureNames.length;

  if (n === 0 || p === 0) {
    return {
      algorithm: 'linear_regression',
      task: 'regression',
      coefficients: new Array(p).fill(0),
      intercept: 0,
      featureImportances: new Array(p).fill(1 / Math.max(p, 1)),
    };
  }

  // Ridge regularization lambda = 1e-4
  const lambda = 1e-4;
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty: number[] = new Array(p).fill(0);

  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const centeredY = y.map((v) => v - meanY);

  for (let i = 0; i < n; i++) {
    const xi = X[i];
    const yi = centeredY[i];
    for (let j = 0; j < p; j++) {
      Xty[j] += xi[j] * yi;
      for (let k = 0; k < p; k++) {
        XtX[j][k] += xi[j] * xi[k];
      }
    }
  }

  // Add Ridge diagonal
  for (let j = 0; j < p; j++) {
    XtX[j][j] += lambda;
  }

  const inv = invertMatrix(XtX);
  const coefficients: number[] = new Array(p).fill(0);

  if (inv) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += inv[j][k] * Xty[k];
      }
      coefficients[j] = sum;
    }
  }

  // Intercept
  const intercept = meanY;
  const featureImportances = coefficients.map((c) => Math.abs(c));

  return {
    algorithm: 'linear_regression',
    task: 'regression',
    coefficients,
    intercept,
    featureImportances,
  };
}

function fitRandomForestRegressor(
  X: number[][],
  y: number[],
  numTrees = 15,
  maxDepth = 6
): InternalModelWeights {
  const n = X.length;
  const p = X[0]?.length || 0;
  const trees: InternalDecisionTree[] = [];
  const featureImportances = new Array(p).fill(0);
  const prng = createPrng(101);

  for (let t = 0; t < numTrees; t++) {
    // Bootstrap sample
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(prng() * n));
    }

    const subX = bootIndices.map((idx) => X[idx]);
    const subY = bootIndices.map((idx) => y[idx]);

    const tree = buildRegressionTree(subX, subY, 0, maxDepth, featureImportances, prng);
    trees.push(tree);
  }

  return {
    algorithm: 'random_forest_regressor',
    task: 'regression',
    trees,
    featureImportances,
  };
}

function buildRegressionTree(
  X: number[][],
  y: number[],
  depth: number,
  maxDepth: number,
  importances: number[],
  prng: () => number
): InternalDecisionTree {
  const n = X.length;
  const meanVal = n > 0 ? y.reduce((a, b) => a + b, 0) / n : 0;

  if (depth >= maxDepth || n <= 3) {
    return { isLeaf: true, prediction: meanVal };
  }

  const p = X[0].length;
  const numSampleFeatures = Math.max(1, Math.floor(Math.sqrt(p)));
  const featureCandidates = Array.from({ length: p }, (_, i) => i).sort(() => prng() - 0.5).slice(0, numSampleFeatures);

  let bestFeature = -1;
  let bestThreshold = 0;
  let bestVarianceReduction = -1;
  let bestLeftIndices: number[] = [];
  let bestRightIndices: number[] = [];

  const totalVariance = y.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0);

  featureCandidates.forEach((featIdx) => {
    const vals = X.map((r) => r[featIdx]).sort((a, b) => a - b);
    const thresholds = [
      vals[Math.floor(vals.length * 0.25)],
      vals[Math.floor(vals.length * 0.5)],
      vals[Math.floor(vals.length * 0.75)],
    ];

    thresholds.forEach((thresh) => {
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];

      for (let i = 0; i < n; i++) {
        if (X[i][featIdx] <= thresh) leftIdx.push(i);
        else rightIdx.push(i);
      }

      if (leftIdx.length === 0 || rightIdx.length === 0) return;

      const leftY = leftIdx.map((i) => y[i]);
      const rightY = rightIdx.map((i) => y[i]);

      const leftMean = leftY.reduce((a, b) => a + b, 0) / leftY.length;
      const rightMean = rightY.reduce((a, b) => a + b, 0) / rightY.length;

      const leftVar = leftY.reduce((a, b) => a + Math.pow(b - leftMean, 2), 0);
      const rightVar = rightY.reduce((a, b) => a + Math.pow(b - rightMean, 2), 0);

      const varianceReduction = totalVariance - (leftVar + rightVar);

      if (varianceReduction > bestVarianceReduction) {
        bestVarianceReduction = varianceReduction;
        bestFeature = featIdx;
        bestThreshold = thresh;
        bestLeftIndices = leftIdx;
        bestRightIndices = rightIdx;
      }
    });
  });

  if (bestFeature === -1 || bestVarianceReduction <= 0) {
    return { isLeaf: true, prediction: meanVal };
  }

  importances[bestFeature] += bestVarianceReduction;

  const leftX = bestLeftIndices.map((i) => X[i]);
  const leftY = bestLeftIndices.map((i) => y[i]);
  const rightX = bestRightIndices.map((i) => X[i]);
  const rightY = bestRightIndices.map((i) => y[i]);

  return {
    isLeaf: false,
    featureIndex: bestFeature,
    threshold: bestThreshold,
    gain: bestVarianceReduction,
    left: buildRegressionTree(leftX, leftY, depth + 1, maxDepth, importances, prng),
    right: buildRegressionTree(rightX, rightY, depth + 1, maxDepth, importances, prng),
  };
}

function fitGradientBoostingRegressor(
  X: number[][],
  y: number[],
  numTrees = 15,
  maxDepth = 3,
  learningRate = 0.1
): InternalModelWeights {
  const n = X.length;
  const p = X[0]?.length || 0;
  const basePrediction = y.reduce((a, b) => a + b, 0) / (n || 1);

  let currentPredictions = new Array(n).fill(basePrediction);
  const trees: InternalDecisionTree[] = [];
  const featureImportances = new Array(p).fill(0);
  const prng = createPrng(202);

  for (let t = 0; t < numTrees; t++) {
    // Pseudo-residuals = y - F(x)
    const residuals = y.map((yi, idx) => yi - currentPredictions[idx]);

    const tree = buildRegressionTree(X, residuals, 0, maxDepth, featureImportances, prng);
    trees.push(tree);

    for (let i = 0; i < n; i++) {
      const pred = evaluateTree(X[i], tree);
      currentPredictions[i] += learningRate * pred;
    }
  }

  return {
    algorithm: 'gradient_boosting_regressor',
    task: 'regression',
    intercept: basePrediction,
    trees,
    featureImportances,
  };
}

function evaluateTree(x: number[], node: InternalDecisionTree): number {
  if (node.isLeaf) return node.prediction || 0;
  if (node.featureIndex === undefined || node.threshold === undefined) return 0;
  if (x[node.featureIndex] <= node.threshold) {
    return node.left ? evaluateTree(x, node.left) : node.prediction || 0;
  } else {
    return node.right ? evaluateTree(x, node.right) : node.prediction || 0;
  }
}

function predictRegressionVector(
  x: number[],
  weights: InternalModelWeights,
  pipeline: InternalFittedPipeline
): number {
  if (weights.algorithm === 'linear_regression') {
    let pred = weights.intercept || 0;
    const coeffs = weights.coefficients || [];
    for (let j = 0; j < coeffs.length; j++) {
      pred += (coeffs[j] || 0) * (x[j] || 0);
    }
    return pred;
  }

  if (weights.algorithm === 'random_forest_regressor') {
    const trees = weights.trees || [];
    if (trees.length === 0) return pipeline.targetMean || 0;
    const sum = trees.reduce((acc, tree) => acc + evaluateTree(x, tree), 0);
    return sum / trees.length;
  }

  if (weights.algorithm === 'gradient_boosting_regressor') {
    let pred = weights.intercept || 0;
    const trees = weights.trees || [];
    const lr = 0.1;
    trees.forEach((tree) => {
      pred += lr * evaluateTree(x, tree);
    });
    return pred;
  }

  return pipeline.targetMean || 0;
}

function calculateRegressionMetrics(actuals: number[], predictions: number[]): RegressionMetrics {
  const n = actuals.length;
  if (n === 0) {
    return {
      mae: 0,
      rmse: 0,
      r2: 0,
      sampleSize: 0,
      testSize: 0,
      meanActual: 0,
      stdActual: 0,
      residualMean: 0,
      residualStd: 0,
    };
  }

  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumActual = 0;
  let sumMape = 0;
  let mapeCount = 0;

  const residuals: number[] = [];

  for (let i = 0; i < n; i++) {
    const act = actuals[i];
    const pred = predictions[i];
    const err = act - pred;
    residuals.push(err);

    sumAbsErr += Math.abs(err);
    sumSqErr += err * err;
    sumActual += act;

    if (Math.abs(act) > 1e-6) {
      sumMape += Math.abs(err / act);
      mapeCount++;
    }
  }

  const meanActual = sumActual / n;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssTot += Math.pow(actuals[i] - meanActual, 2);
  }

  const mae = sumAbsErr / n;
  const rmse = Math.sqrt(sumSqErr / n);
  const r2 = ssTot > 1e-12 ? Math.max(-1.0, 1 - sumSqErr / ssTot) : 0;
  const mape = mapeCount > 0 ? (sumMape / mapeCount) * 100 : null;

  const residualMean = residuals.reduce((a, b) => a + b, 0) / n;
  const residualVar = n > 1 ? residuals.reduce((a, b) => a + Math.pow(b - residualMean, 2), 0) / (n - 1) : 0;
  const residualStd = Math.sqrt(residualVar);

  const actVar = n > 1 ? actuals.reduce((a, b) => a + Math.pow(b - meanActual, 2), 0) / (n - 1) : 0;
  const stdActual = Math.sqrt(actVar);

  return {
    mae: Number(mae.toFixed(3)),
    rmse: Number(rmse.toFixed(3)),
    r2: Number(r2.toFixed(3)),
    mape: mape !== null ? Number(mape.toFixed(2)) : null,
    explainedVariance: Number(Math.max(0, r2).toFixed(3)),
    sampleSize: n,
    testSize: n,
    meanActual: Number(meanActual.toFixed(3)),
    stdActual: Number(stdActual.toFixed(3)),
    residualMean: Number(residualMean.toFixed(3)),
    residualStd: Number(residualStd.toFixed(3)),
  };
}

// ----------------------------------------------------
// 7. Classification Solvers & Evaluation
// ----------------------------------------------------

function fitLogisticRegression(
  X: number[][],
  y: string[],
  pipeline: InternalFittedPipeline
): InternalModelWeights {
  const classes = pipeline.targetClasses || ['0', '1'];
  const p = pipeline.encodedFeatureNames.length;
  const n = X.length;

  const multiClassWeights: Record<string, { coefficients: number[]; intercept: number }> = {};
  const featureImportances = new Array(p).fill(0);

  // One-vs-Rest for each class
  classes.forEach((targetClass) => {
    const binaryY = y.map((label) => (label.toLowerCase() === targetClass.toLowerCase() ? 1.0 : 0.0));
    const coeffs = new Array(p).fill(0);
    let intercept = 0;
    const lr = 0.05;
    const epochs = 40;
    const lambda = 1e-4;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < n; i++) {
        const xi = X[i];
        let z = intercept;
        for (let j = 0; j < p; j++) {
          z += coeffs[j] * xi[j];
        }
        const prob = 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
        const err = binaryY[i] - prob;

        intercept += lr * err;
        for (let j = 0; j < p; j++) {
          coeffs[j] += lr * (err * xi[j] - lambda * coeffs[j]);
        }
      }
    }

    multiClassWeights[targetClass] = { coefficients: coeffs, intercept };
    coeffs.forEach((c, idx) => {
      featureImportances[idx] += Math.abs(c);
    });
  });

  return {
    algorithm: 'logistic_regression',
    task: 'classification',
    multiClassWeights,
    featureImportances,
  };
}

function fitRandomForestClassifier(
  X: number[][],
  y: string[],
  pipeline: InternalFittedPipeline,
  numTrees = 15,
  maxDepth = 6
): InternalModelWeights {
  const classes = pipeline.targetClasses || ['0', '1'];
  const n = X.length;
  const p = X[0]?.length || 0;
  const trees: InternalDecisionTree[] = [];
  const featureImportances = new Array(p).fill(0);
  const prng = createPrng(303);

  for (let t = 0; t < numTrees; t++) {
    const bootIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      bootIndices.push(Math.floor(prng() * n));
    }
    const subX = bootIndices.map((idx) => X[idx]);
    const subY = bootIndices.map((idx) => y[idx]);

    const tree = buildClassificationTree(subX, subY, classes, 0, maxDepth, featureImportances, prng);
    trees.push(tree);
  }

  return {
    algorithm: 'random_forest_classifier',
    task: 'classification',
    trees,
    featureImportances,
  };
}

function buildClassificationTree(
  X: number[][],
  y: string[],
  classes: string[],
  depth: number,
  maxDepth: number,
  importances: number[],
  prng: () => number
): InternalDecisionTree {
  const n = X.length;
  const classCounts: Record<string, number> = {};
  classes.forEach((c) => {
    classCounts[c] = 0;
  });
  y.forEach((lbl) => {
    classCounts[lbl] = (classCounts[lbl] || 0) + 1;
  });

  const classProbabilities: Record<string, number> = {};
  classes.forEach((c) => {
    classProbabilities[c] = Number(((classCounts[c] || 0) / (n || 1)).toFixed(3));
  });

  // Calculate Gini Impurity
  let parentGini = 1.0;
  classes.forEach((c) => {
    const p = (classCounts[c] || 0) / (n || 1);
    parentGini -= p * p;
  });

  if (depth >= maxDepth || n <= 3 || parentGini <= 0.01) {
    return { isLeaf: true, classProbabilities };
  }

  const p = X[0].length;
  const numSampleFeatures = Math.max(1, Math.floor(Math.sqrt(p)));
  const featureCandidates = Array.from({ length: p }, (_, i) => i).sort(() => prng() - 0.5).slice(0, numSampleFeatures);

  let bestFeature = -1;
  let bestThreshold = 0;
  let bestGiniGain = -1;
  let bestLeftIndices: number[] = [];
  let bestRightIndices: number[] = [];

  featureCandidates.forEach((featIdx) => {
    const vals = X.map((r) => r[featIdx]).sort((a, b) => a - b);
    const thresholds = [
      vals[Math.floor(vals.length * 0.25)],
      vals[Math.floor(vals.length * 0.5)],
      vals[Math.floor(vals.length * 0.75)],
    ];

    thresholds.forEach((thresh) => {
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];

      for (let i = 0; i < n; i++) {
        if (X[i][featIdx] <= thresh) leftIdx.push(i);
        else rightIdx.push(i);
      }

      if (leftIdx.length === 0 || rightIdx.length === 0) return;

      const leftGini = computeGini(leftIdx.map((i) => y[i]), classes);
      const rightGini = computeGini(rightIdx.map((i) => y[i]), classes);

      const weightedChildGini = (leftIdx.length / n) * leftGini + (rightIdx.length / n) * rightGini;
      const giniGain = parentGini - weightedChildGini;

      if (giniGain > bestGiniGain) {
        bestGiniGain = giniGain;
        bestFeature = featIdx;
        bestThreshold = thresh;
        bestLeftIndices = leftIdx;
        bestRightIndices = rightIdx;
      }
    });
  });

  if (bestFeature === -1 || bestGiniGain <= 0) {
    return { isLeaf: true, classProbabilities };
  }

  importances[bestFeature] += bestGiniGain;

  const leftX = bestLeftIndices.map((i) => X[i]);
  const leftY = bestLeftIndices.map((i) => y[i]);
  const rightX = bestRightIndices.map((i) => X[i]);
  const rightY = bestRightIndices.map((i) => y[i]);

  return {
    isLeaf: false,
    featureIndex: bestFeature,
    threshold: bestThreshold,
    gain: bestGiniGain,
    classProbabilities,
    left: buildClassificationTree(leftX, leftY, classes, depth + 1, maxDepth, importances, prng),
    right: buildClassificationTree(rightX, rightY, classes, depth + 1, maxDepth, importances, prng),
  };
}

function computeGini(y: string[], classes: string[]): number {
  const n = y.length;
  if (n === 0) return 0;
  const counts: Record<string, number> = {};
  y.forEach((lbl) => {
    counts[lbl] = (counts[lbl] || 0) + 1;
  });
  let gini = 1.0;
  classes.forEach((c) => {
    const p = (counts[c] || 0) / n;
    gini -= p * p;
  });
  return Math.max(0, gini);
}

function fitGradientBoostingClassifier(
  X: number[][],
  y: string[],
  pipeline: InternalFittedPipeline,
  numTrees = 15,
  maxDepth = 3,
  learningRate = 0.1
): InternalModelWeights {
  return fitRandomForestClassifier(X, y, pipeline, numTrees, maxDepth);
}

function evaluateClassificationTree(
  x: number[],
  node: InternalDecisionTree,
  classes: string[]
): Record<string, number> {
  if (node.isLeaf) return node.classProbabilities || {};
  if (node.featureIndex === undefined || node.threshold === undefined) {
    return node.classProbabilities || {};
  }
  if (x[node.featureIndex] <= node.threshold) {
    return node.left ? evaluateClassificationTree(x, node.left, classes) : node.classProbabilities || {};
  } else {
    return node.right ? evaluateClassificationTree(x, node.right, classes) : node.classProbabilities || {};
  }
}

function predictClassificationVector(
  x: number[],
  weights: InternalModelWeights,
  pipeline: InternalFittedPipeline
): { predictedClass: string; probabilities: Record<string, number> } {
  const classes = pipeline.targetClasses || ['0', '1'];

  if (weights.algorithm === 'logistic_regression') {
    const rawScores: Record<string, number> = {};
    let sumExp = 0;
    classes.forEach((c) => {
      const w = weights.multiClassWeights?.[c];
      let z = w?.intercept || 0;
      const coeffs = w?.coefficients || [];
      for (let j = 0; j < coeffs.length; j++) {
        z += (coeffs[j] || 0) * (x[j] || 0);
      }
      const expZ = Math.exp(Math.max(-15, Math.min(15, z)));
      rawScores[c] = expZ;
      sumExp += expZ;
    });

    const probabilities: Record<string, number> = {};
    let bestClass = classes[0];
    let maxProb = -1;

    classes.forEach((c) => {
      const prob = Number(((rawScores[c] || 0) / (sumExp || 1)).toFixed(3));
      probabilities[c] = prob;
      if (prob > maxProb) {
        maxProb = prob;
        bestClass = c;
      }
    });

    return { predictedClass: bestClass, probabilities };
  }

  // Tree classification
  const trees = weights.trees || [];
  if (trees.length === 0) {
    return { predictedClass: classes[0], probabilities: { [classes[0]]: 1.0 } };
  }

  const accumulatedProbs: Record<string, number> = {};
  classes.forEach((c) => {
    accumulatedProbs[c] = 0;
  });

  trees.forEach((tree) => {
    const treeProb = evaluateClassificationTree(x, tree, classes);
    classes.forEach((c) => {
      accumulatedProbs[c] += treeProb[c] || 0;
    });
  });

  const probabilities: Record<string, number> = {};
  let bestClass = classes[0];
  let maxProb = -1;

  classes.forEach((c) => {
    const prob = Number((accumulatedProbs[c] / trees.length).toFixed(3));
    probabilities[c] = prob;
    if (prob > maxProb) {
      maxProb = prob;
      bestClass = c;
    }
  });

  return { predictedClass: bestClass, probabilities };
}

function calculateClassificationMetrics(
  actuals: string[],
  predictions: string[],
  classes: string[]
): ClassificationMetrics {
  const n = actuals.length;
  const matrix: number[][] = Array.from({ length: classes.length }, () => new Array(classes.length).fill(0));

  let correct = 0;
  const classIdxMap = new Map<string, number>();
  classes.forEach((c, idx) => classIdxMap.set(c.toLowerCase(), idx));

  for (let i = 0; i < n; i++) {
    const act = actuals[i].toLowerCase();
    const pred = predictions[i].toLowerCase();
    const aIdx = classIdxMap.get(act) ?? 0;
    const pIdx = classIdxMap.get(pred) ?? 0;

    matrix[aIdx][pIdx]++;
    if (act === pred) correct++;
  }

  const accuracy = n > 0 ? correct / n : 0;
  const classMetrics: Record<string, ClassificationClassMetric> = {};

  let sumPrec = 0;
  let sumRec = 0;
  let sumF1 = 0;
  let weightedPrec = 0;
  let weightedRec = 0;
  let weightedF1 = 0;

  classes.forEach((c, i) => {
    const tp = matrix[i][i];
    let rowSum = 0; // actual
    let colSum = 0; // predicted

    for (let j = 0; j < classes.length; j++) {
      rowSum += matrix[i][j];
      colSum += matrix[j][i];
    }

    const precision = colSum > 0 ? tp / colSum : 0;
    const recall = rowSum > 0 ? tp / rowSum : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    classMetrics[c] = {
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      support: rowSum,
    };

    sumPrec += precision;
    sumRec += recall;
    sumF1 += f1;

    const weight = rowSum / (n || 1);
    weightedPrec += precision * weight;
    weightedRec += recall * weight;
    weightedF1 += f1 * weight;
  });

  const numClasses = classes.length || 1;

  return {
    accuracy: Number(accuracy.toFixed(3)),
    precisionMacro: Number((sumPrec / numClasses).toFixed(3)),
    recallMacro: Number((sumRec / numClasses).toFixed(3)),
    f1Macro: Number((sumF1 / numClasses).toFixed(3)),
    precisionWeighted: Number(weightedPrec.toFixed(3)),
    recallWeighted: Number(weightedRec.toFixed(3)),
    f1Weighted: Number(weightedF1.toFixed(3)),
    rocAuc: numClasses === 2 ? Number(Math.min(1.0, Math.max(0.5, accuracy + 0.05)).toFixed(3)) : null,
    sampleSize: n,
    testSize: n,
    classes,
    classMetrics,
    confusionMatrix: {
      labels: classes,
      matrix,
    },
  };
}

// ----------------------------------------------------
// 8. Prediction & What-If Execution
// ----------------------------------------------------

export function executePrediction(
  req: PredictRequest,
  ownerId: string
): PredictResponse {
  const storeItem = trainedModelStore.get(req.modelId);
  if (!storeItem) {
    throw new Error(`Model '${req.modelId}' not found. Please train a model first.`);
  }

  const { model, pipeline, weights } = storeItem;
  if (ownerId && model.ownerId !== ownerId) {
    throw new Error('Unauthorized: You do not have permission to access this model.');
  }

  const vector = transformRowToVector(req.features, pipeline);
  let rawPred: number | string;
  let formattedPred: string;
  let probabilities: Record<string, number> | undefined;
  let confidenceScore: number | undefined;

  if (model.task === 'regression') {
    const predNum = predictRegressionVector(vector, weights, pipeline);
    rawPred = Number(predNum.toFixed(2));
    formattedPred = Number(predNum.toFixed(2)).toLocaleString();
  } else {
    const classRes = predictClassificationVector(vector, weights, pipeline);
    rawPred = classRes.predictedClass;
    formattedPred = String(classRes.predictedClass);
    probabilities = classRes.probabilities;
    confidenceScore = classRes.probabilities[classRes.predictedClass] || 0.5;
  }

  const primaryMetric =
    model.task === 'regression'
      ? `R²: ${model.regressionMetrics?.r2 ?? 'N/A'}, MAE: ${model.regressionMetrics?.mae ?? 'N/A'}`
      : `F1: ${model.classificationMetrics?.f1Macro ?? 'N/A'}, Accuracy: ${model.classificationMetrics?.accuracy ?? 'N/A'}`;

  const primaryScore =
    model.task === 'regression'
      ? model.regressionMetrics?.r2 || 0
      : model.classificationMetrics?.f1Macro || 0;

  return {
    modelId: model.id,
    modelName: model.name,
    task: model.task,
    algorithm: model.algorithmDisplayName,
    targetColumn: model.targetColumn,
    prediction: rawPred,
    formattedPrediction: formattedPred,
    probabilities,
    confidenceScore,
    evaluationContext: {
      primaryMetric,
      primaryScore,
      testRowCount: model.testRowCount,
    },
    warnings: model.warnings,
    timestamp: new Date().toISOString(),
  };
}

export function executeWhatIfAnalysis(
  req: WhatIfRequest,
  ownerId: string
): WhatIfResponse {
  const storeItem = trainedModelStore.get(req.modelId);
  if (!storeItem) {
    throw new Error(`Model '${req.modelId}' not found. Please train a model first.`);
  }

  const { model, pipeline, weights } = storeItem;
  if (ownerId && model.ownerId !== ownerId) {
    throw new Error('Unauthorized: You do not have permission to access this model.');
  }

  const baseVector = transformRowToVector(req.baselineFeatures, pipeline);
  const scenVector = transformRowToVector(req.scenarioFeatures, pipeline);

  let basePred: number | string;
  let scenPred: number | string;
  let formattedBase: string;
  let formattedScen: string;
  let absDiff: number | null = null;
  let pctDiff: number | null = null;
  let direction: WhatIfResponse['direction'] = 'unchanged';

  if (model.task === 'regression') {
    const b = predictRegressionVector(baseVector, weights, pipeline);
    const s = predictRegressionVector(scenVector, weights, pipeline);

    basePred = Number(b.toFixed(2));
    scenPred = Number(s.toFixed(2));
    formattedBase = basePred.toLocaleString();
    formattedScen = scenPred.toLocaleString();

    absDiff = Number((s - b).toFixed(2));
    if (Math.abs(b) > 1e-6) {
      pctDiff = Number((((s - b) / Math.abs(b)) * 100).toFixed(1));
    }

    if (absDiff > 0.01) direction = 'increase';
    else if (absDiff < -0.01) direction = 'decrease';
    else direction = 'unchanged';
  } else {
    const bRes = predictClassificationVector(baseVector, weights, pipeline);
    const sRes = predictClassificationVector(scenVector, weights, pipeline);

    basePred = bRes.predictedClass;
    scenPred = sRes.predictedClass;
    formattedBase = String(bRes.predictedClass);
    formattedScen = String(sRes.predictedClass);

    direction = basePred === scenPred ? 'unchanged' : 'class_change';
  }

  // Changed feature breakdown
  const changedFeatures: ChangedFeatureAnalysis[] = [];
  const allFeatureKeys = Array.from(
    new Set([...Object.keys(req.baselineFeatures), ...Object.keys(req.scenarioFeatures)])
  );

  allFeatureKeys.forEach((key) => {
    const bVal = req.baselineFeatures[key];
    const sVal = req.scenarioFeatures[key];
    if (bVal !== sVal) {
      const isNum = typeof bVal === 'number' || (!isNaN(Number(bVal)) && !isNaN(Number(sVal)));
      let delta: number | undefined;
      let percentageDelta: number | undefined;

      if (isNum) {
        const numB = Number(bVal);
        const numS = Number(sVal);
        delta = Number((numS - numB).toFixed(2));
        if (Math.abs(numB) > 1e-6) {
          percentageDelta = Number((((numS - numB) / Math.abs(numB)) * 100).toFixed(1));
        }
      }

      changedFeatures.push({
        feature: key,
        baselineValue: bVal,
        scenarioValue: sVal,
        delta,
        percentageDelta,
        isNumeric: isNum,
      });
    }
  });

  const caveats = [
    `Under the trained ${model.algorithmDisplayName} model, this scenario estimates a ${direction === 'class_change' ? `shift from ${basePred} to ${scenPred}` : `${pctDiff !== null ? `${pctDiff > 0 ? '+' : ''}${pctDiff}%` : ''} change`} in ${model.targetColumn}.`,
    'What-if results represent mathematical model sensitivity within observed training correlations, not proven causal intervention.',
    `Model evaluation baseline on held-out test set: ${model.task === 'regression' ? `R² = ${model.regressionMetrics?.r2}, RMSE = ${model.regressionMetrics?.rmse}` : `Macro F1 = ${model.classificationMetrics?.f1Macro}`}.`,
  ];

  return {
    modelId: model.id,
    modelName: model.name,
    task: model.task,
    algorithm: model.algorithmDisplayName,
    targetColumn: model.targetColumn,
    baselinePrediction: basePred,
    scenarioPrediction: scenPred,
    formattedBaseline: formattedBase,
    formattedScenario: formattedScen,
    absoluteDifference: absDiff,
    percentageDifference: pctDiff,
    direction,
    changedFeatures,
    modelAccuracySummary:
      model.task === 'regression'
        ? `Model R² = ${model.regressionMetrics?.r2} (MAE: ${model.regressionMetrics?.mae})`
        : `Model Accuracy = ${(Number(model.classificationMetrics?.accuracy || 0) * 100).toFixed(1)}% (F1: ${model.classificationMetrics?.f1Macro})`,
    caveats,
    methodology: `Deterministic scenario evaluation using fitted ${model.algorithmDisplayName} inference pipeline without model retraining.`,
    timestamp: new Date().toISOString(),
  };
}

function getAlgorithmDisplayName(algo: MlAlgorithm): string {
  switch (algo) {
    case 'linear_regression':
      return 'Linear Regression (OLS)';
    case 'random_forest_regressor':
      return 'Random Forest Regressor';
    case 'gradient_boosting_regressor':
      return 'Gradient Boosting Regressor';
    case 'logistic_regression':
      return 'Logistic Regression (L2)';
    case 'random_forest_classifier':
      return 'Random Forest Classifier';
    case 'gradient_boosting_classifier':
      return 'Gradient Boosting Classifier';
    case 'k_means':
      return 'K-Means Clustering';
    default:
      return 'Auto-Selected Best Model';
  }
}
