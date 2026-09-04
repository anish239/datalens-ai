from typing import Any, Dict, List, Optional
from backend.app.ml.schemas import ValidateMlResponse, ValidationCandidateTarget


def validate_ml_dataset(
    dataset: Dict[str, Any],
    task: Optional[str] = None,
    target_column: Optional[str] = None,
    feature_columns: Optional[List[str]] = None,
) -> ValidateMlResponse:
    errors: List[str] = []
    warnings: List[str] = []
    candidate_targets: List[ValidationCandidateTarget] = []

    columns = dataset.get("columns", [])
    row_count = dataset.get("rowCount", len(dataset.get("previewRows", [])))

    for c in columns:
        col_name = c.get("name", "")
        null_pct = c.get("nullPercentage", 0)
        unique_cnt = c.get("uniqueCount", 0)
        logical_type = c.get("logicalType", "unknown")

        if null_pct > 50:
            continue

        if logical_type == "numeric" and unique_cnt > 5:
            candidate_targets.append(
                ValidationCandidateTarget(
                    column=col_name,
                    task="regression",
                    reason=f"Continuous numeric feature with {unique_cnt} distinct values.",
                )
            )
        elif logical_type in ["categorical", "boolean"] or (logical_type == "numeric" and unique_cnt <= 10):
            if 2 <= unique_cnt <= 20:
                candidate_targets.append(
                    ValidationCandidateTarget(
                        column=col_name,
                        task="classification",
                        reason=f"Discrete target with {unique_cnt} classes.",
                    )
                )

    recommended_task = "regression"
    if target_column:
        target_meta = next((c for c in columns if c.get("name") == target_column), None)
        if not target_meta:
            errors.append(f"Target column '{target_column}' does not exist in dataset schema.")
        else:
            if target_meta.get("nullPercentage", 0) > 40:
                errors.append(f"Target column '{target_column}' has {target_meta.get('nullPercentage'):.1f}% missing values.")
            if target_meta.get("uniqueCount", 0) <= 1:
                errors.append(f"Target column '{target_column}' is constant zero variance.")

            if target_meta.get("logicalType") == "numeric" and target_meta.get("uniqueCount", 0) > 10:
                recommended_task = "regression"
            else:
                recommended_task = "classification"

            if task and task != recommended_task and task == "regression" and target_meta.get("logicalType") == "categorical":
                errors.append(f"Target column '{target_column}' is categorical and cannot be used for regression.")
    else:
        errors.append("No target column specified.")

    feature_cols = feature_columns or []
    safe_features: List[str] = []
    leakage_cols: List[str] = []

    for fc in feature_cols:
        if target_column and fc.lower() == target_column.lower():
            leakage_cols.append(fc)
            continue

        col_meta = next((c for c in columns if c.get("name") == fc), None)
        if not col_meta:
            warnings.append(f"Feature column '{fc}' not found in dataset.")
            continue

        if col_meta.get("nullPercentage", 0) == 100:
            warnings.append(f"Feature column '{fc}' is 100% empty and dropped.")
            continue

        if col_meta.get("uniqueCount", 0) <= 1:
            warnings.append(f"Feature column '{fc}' has zero variance.")
            continue

        safe_features.append(fc)

    if target_column and feature_cols and not safe_features:
        errors.append("No valid feature columns remain after validation checks.")

    if row_count < 10:
        errors.append(f"Dataset row count ({row_count}) is insufficient for ML training (minimum 10 required).")
    elif row_count < 40:
        warnings.append(f"Dataset sample size ({row_count}) is small; metric variance may be high.")

    return ValidateMlResponse(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        recommended_task=recommended_task,
        candidate_targets=candidate_targets,
        safe_feature_columns=safe_features,
        leakage_suspect_columns=leakage_cols,
    )
