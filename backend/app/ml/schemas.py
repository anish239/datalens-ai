from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class MlTaskType(str):
    REGRESSION = "regression"
    CLASSIFICATION = "classification"
    CLUSTERING = "clustering"
    TIME_SERIES = "time_series"


class MlAlgorithm(str):
    AUTO = "auto"
    LINEAR_REGRESSION = "linear_regression"
    RANDOM_FOREST_REGRESSOR = "random_forest_regressor"
    GRADIENT_BOOSTING_REGRESSOR = "gradient_boosting_regressor"
    LOGISTIC_REGRESSION = "logistic_regression"
    RANDOM_FOREST_CLASSIFIER = "random_forest_classifier"
    GRADIENT_BOOSTING_CLASSIFIER = "gradient_boosting_classifier"
    K_MEANS = "k_means"


class ValidateMlRequest(BaseModel):
    dataset_id: str
    task: Optional[str] = None
    target_column: Optional[str] = None
    feature_columns: Optional[List[str]] = None


class ValidationCandidateTarget(BaseModel):
    column: str
    task: str
    reason: str


class ValidateMlResponse(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    recommended_task: str
    candidate_targets: List[ValidationCandidateTarget]
    safe_feature_columns: List[str]
    leakage_suspect_columns: List[str]


class TrainModelRequest(BaseModel):
    dataset_id: str
    task: str
    target_column: str
    feature_columns: List[str]
    algorithm: Optional[str] = "auto"
    split_ratio: Optional[float] = 0.8
    is_time_series_split: Optional[bool] = False
    time_column: Optional[str] = None
    model_name: Optional[str] = None


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    rank: int
    normalized_percentage: float
    raw_score: Optional[float] = None


class RegressionMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float
    mape: Optional[float] = None
    explained_variance: Optional[float] = None
    sample_size: int
    test_size: int
    mean_actual: float
    std_actual: float
    residual_mean: float
    residual_std: float


class ClassificationClassMetric(BaseModel):
    precision: float
    recall: float
    f1: float
    support: int


class ConfusionMatrix(BaseModel):
    labels: List[str]
    matrix: List[List[int]]


class ClassificationMetrics(BaseModel):
    accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    precision_weighted: float
    recall_weighted: float
    f1_weighted: float
    roc_auc: Optional[float] = None
    sample_size: int
    test_size: int
    classes: List[str]
    class_metrics: Dict[str, ClassificationClassMetric]
    confusion_matrix: ConfusionMatrix


class ModelCandidateEvaluation(BaseModel):
    algorithm: str
    algorithm_name: str
    primary_metric_name: str
    primary_metric_value: float
    secondary_metrics: Dict[str, float]
    training_time_ms: int
    is_best: bool
    rank: int


class PreprocessingSummary(BaseModel):
    numeric_imputation: str
    categorical_imputation: str
    categorical_encoding: str
    scaling: str
    transformed_feature_count: int


class ActualVsPredictedPoint(BaseModel):
    index: int
    actual: float
    predicted: float
    residual: float


class TrainedModelResponse(BaseModel):
    id: str
    owner_id: str
    dataset_id: str
    dataset_name: str
    name: str
    task: str
    algorithm: str
    algorithm_display_name: str
    target_column: str
    feature_columns: List[str]
    train_row_count: int
    test_row_count: int
    split_ratio: float
    is_time_series_split: bool
    time_column: Optional[str] = None
    regression_metrics: Optional[RegressionMetrics] = None
    classification_metrics: Optional[ClassificationMetrics] = None
    feature_importance: List[FeatureImportanceItem]
    evaluation_method: str
    warnings: List[str]
    candidate_comparison: List[ModelCandidateEvaluation]
    actual_vs_predicted: Optional[List[ActualVsPredictedPoint]] = None
    preprocessing: PreprocessingSummary
    created_at: str
    updated_at: str


class PredictRequest(BaseModel):
    model_id: str
    dataset_id: Optional[str] = None
    features: Dict[str, Any]


class PredictResponse(BaseModel):
    model_id: str
    model_name: str
    task: str
    algorithm: str
    target_column: str
    prediction: Union[float, str]
    formatted_prediction: str
    probabilities: Optional[Dict[str, float]] = None
    confidence_score: Optional[float] = None
    evaluation_context: Dict[str, Any]
    warnings: Optional[List[str]] = None
    timestamp: str


class ChangedFeatureAnalysis(BaseModel):
    feature: str
    baseline_value: Any
    scenario_value: Any
    delta: Optional[float] = None
    percentage_delta: Optional[float] = None
    is_numeric: bool


class WhatIfRequest(BaseModel):
    model_id: str
    dataset_id: Optional[str] = None
    baseline_features: Dict[str, Any]
    scenario_features: Dict[str, Any]


class WhatIfResponse(BaseModel):
    model_id: str
    model_name: str
    task: str
    algorithm: str
    target_column: str
    baseline_prediction: Union[float, str]
    scenario_prediction: Union[float, str]
    formatted_baseline: str
    formatted_scenario: str
    absolute_difference: Optional[float] = None
    percentage_difference: Optional[float] = None
    direction: str
    changed_features: List[ChangedFeatureAnalysis]
    model_accuracy_summary: str
    caveats: List[str]
    methodology: str
    timestamp: str
