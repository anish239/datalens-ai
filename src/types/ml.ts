export type MlTaskType = 'regression' | 'classification' | 'clustering' | 'time_series';

export type MlAlgorithm =
  | 'auto'
  | 'linear_regression'
  | 'random_forest_regressor'
  | 'gradient_boosting_regressor'
  | 'logistic_regression'
  | 'random_forest_classifier'
  | 'gradient_boosting_classifier'
  | 'k_means';

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  rank: number;
  normalizedPercentage: number;
  rawScore?: number;
}

export interface RegressionMetrics {
  mae: number;
  rmse: number;
  r2: number;
  mape?: number | null;
  explainedVariance?: number;
  sampleSize: number;
  testSize: number;
  meanActual: number;
  stdActual: number;
  residualMean: number;
  residualStd: number;
}

export interface ClassificationClassMetric {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precisionMacro: number;
  recallMacro: number;
  f1Macro: number;
  precisionWeighted: number;
  recallWeighted: number;
  f1Weighted: number;
  rocAuc?: number | null;
  sampleSize: number;
  testSize: number;
  classes: string[];
  classMetrics: Record<string, ClassificationClassMetric>;
  confusionMatrix: {
    labels: string[];
    matrix: number[][];
  };
}

export interface ActualVsPredictedPoint {
  index: number;
  actual: number;
  predicted: number;
  residual: number;
}

export interface ModelCandidateEvaluation {
  algorithm: MlAlgorithm;
  algorithmName: string;
  primaryMetricName: string;
  primaryMetricValue: number;
  secondaryMetrics: Record<string, number>;
  trainingTimeMs: number;
  isBest: boolean;
  rank: number;
}

export interface PreprocessingSummary {
  numericImputation: 'median' | 'mean';
  categoricalImputation: 'most_frequent' | 'constant';
  categoricalEncoding: 'one_hot';
  scaling: 'standard' | 'none';
  transformedFeatureCount: number;
  droppedColumns?: string[];
}

export interface TrainedModel {
  id: string;
  ownerId: string;
  datasetId: string;
  datasetName: string;
  name: string;
  task: MlTaskType;
  algorithm: MlAlgorithm;
  algorithmDisplayName: string;
  targetColumn: string;
  featureColumns: string[];
  trainRowCount: number;
  testRowCount: number;
  splitRatio: number;
  isTimeSeriesSplit: boolean;
  timeColumn?: string;
  regressionMetrics?: RegressionMetrics;
  classificationMetrics?: ClassificationMetrics;
  featureImportance: FeatureImportanceItem[];
  evaluationMethod: string;
  warnings: string[];
  candidateComparison: ModelCandidateEvaluation[];
  actualVsPredicted?: ActualVsPredictedPoint[];
  preprocessing: PreprocessingSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendedTask: MlTaskType;
  candidateTargets: { column: string; task: MlTaskType; reason: string }[];
  safeFeatureColumns: string[];
  leakageSuspectColumns: string[];
}

export interface TrainModelRequest {
  datasetId: string;
  task: MlTaskType;
  targetColumn: string;
  featureColumns: string[];
  algorithm?: MlAlgorithm;
  splitRatio?: number;
  isTimeSeriesSplit?: boolean;
  timeColumn?: string;
  modelName?: string;
}

export interface PredictRequest {
  modelId: string;
  datasetId?: string;
  features: Record<string, any>;
}

export interface PredictResponse {
  modelId: string;
  modelName: string;
  task: MlTaskType;
  algorithm: string;
  targetColumn: string;
  prediction: number | string;
  formattedPrediction: string;
  probabilities?: Record<string, number>;
  confidenceScore?: number;
  evaluationContext: {
    primaryMetric: string;
    primaryScore: number;
    testRowCount: number;
  };
  warnings?: string[];
  timestamp: string;
}

export type TrainedModelResponse = TrainedModel;
export type ValidateMlResponse = ModelValidationResult;

export interface ChangedFeatureAnalysis {
  feature: string;
  baselineValue: any;
  scenarioValue: any;
  delta?: number;
  percentageDelta?: number;
  isNumeric: boolean;
}

export interface WhatIfRequest {
  modelId: string;
  datasetId?: string;
  baselineFeatures: Record<string, any>;
  scenarioFeatures: Record<string, any>;
}

export interface WhatIfResponse {
  modelId: string;
  modelName: string;
  task: MlTaskType;
  algorithm: string;
  targetColumn: string;
  baselinePrediction: number | string;
  scenarioPrediction: number | string;
  formattedBaseline: string;
  formattedScenario: string;
  absoluteDifference: number | null;
  percentageDifference: number | null;
  direction: 'increase' | 'decrease' | 'unchanged' | 'class_change';
  changedFeatures: ChangedFeatureAnalysis[];
  modelAccuracySummary: string;
  caveats: string[];
  methodology: string;
  timestamp: string;
}
