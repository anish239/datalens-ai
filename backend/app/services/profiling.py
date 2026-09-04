import math
import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.models.dataset import (
    CategoricalValueFrequency,
    ColumnProfile,
    DatasetProfile,
    NumericStatistics,
    PotentialTarget,
)


def safe_float(val: Any) -> Optional[float]:
    """Converts numpy / pandas numeric to a JSON-compliant float (None if NaN or Inf)."""
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    except (ValueError, TypeError):
        return None


def is_boolean_series(series: pd.Series) -> bool:
    """Checks if a series contains purely boolean representations."""
    if pd.api.types.is_bool_dtype(series):
        return True
    
    non_null = series.dropna()
    if len(non_null) == 0:
        return False
        
    unique_vals = set(non_null.unique())
    if len(unique_vals) <= 2:
        # Check for common boolean string / integer pairs
        str_vals = {str(v).strip().lower() for v in unique_vals}
        known_pairs = [
            {"0", "1"},
            {"true", "false"},
            {"yes", "no"},
            {"y", "n"},
            {"t", "f"},
        ]
        for pair in known_pairs:
            if str_vals.issubset(pair):
                return True
                
    return False


def is_datetime_series(series: pd.Series) -> Tuple[bool, Optional[str]]:
    """Conservative datetime detection."""
    if pd.api.types.is_datetime64_any_dtype(series):
        return True, "native_datetime"
        
    if not (pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)):
        return False, None
        
    non_null = series.dropna()
    if len(non_null) < 3:
        return False, None
        
    # Sample up to 50 non-null values for performance
    sample = non_null.head(50).astype(str)
    
    # Check if samples match standard date patterns (e.g. YYYY-MM-DD, MM/DD/YYYY, etc.)
    date_patterns = [
        r"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}",
        r"^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}",
        r"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}",
    ]
    
    pattern_matches = sum(
        1 for val in sample if any(re.match(p, val.strip()) for p in date_patterns)
    )
    
    if pattern_matches / len(sample) >= 0.7:
        try:
            pd.to_datetime(sample, errors="raise")
            return True, "date_format_match"
        except Exception:
            return False, None
            
    return False, None


def infer_column_logical_type(series: pd.Series) -> Tuple[str, bool]:
    """
    Infers logical type: 'numeric', 'categorical', 'text', 'boolean', 'datetime', 'unknown'.
    Returns (logical_type, is_datetime_candidate).
    """
    total_count = len(series)
    non_null_count = series.count()
    
    if non_null_count == 0:
        return "unknown", False

    # 1. Boolean check
    if is_boolean_series(series):
        return "boolean", False

    # 2. Datetime check
    is_dt, _ = is_datetime_series(series)
    if is_dt:
        return "datetime", True

    # 3. Numeric check
    if pd.api.types.is_numeric_dtype(series):
        unique_count = series.nunique()
        # If integer with very low cardinality (e.g. 2-5 values in large dataset), consider categorical if user flags, but default numeric
        return "numeric", False

    # 4. Categorical vs Text check
    unique_count = series.nunique()
    cardinality_ratio = unique_count / total_count if total_count > 0 else 0
    
    if unique_count <= 50 or cardinality_ratio <= 0.20:
        return "categorical", False
    else:
        return "text", False


def calculate_data_quality_score(
    total_cells: int,
    missing_value_count: int,
    duplicate_row_count: int,
    total_rows: int,
    column_profiles: List[ColumnProfile],
) -> Tuple[int, str]:
    """
    Deterministic Data Quality Score calculation:
    - Base score = 100
    - Missing data penalty: min(35, round(missing_data_pct * 1.5))
    - Duplicate rows penalty: min(25, round(duplicate_row_pct * 1.5))
    - Empty columns penalty: 10 points per 100% empty column (capped at 25)
    - Zero variance columns penalty: 5 points per single-value column (capped at 15)
    """
    base_score = 100
    missing_pct = (missing_value_count / total_cells * 100) if total_cells > 0 else 0.0
    duplicate_pct = (duplicate_row_count / total_rows * 100) if total_rows > 0 else 0.0
    
    missing_penalty = min(35, round(missing_pct * 1.5))
    duplicate_penalty = min(25, round(duplicate_pct * 1.5))
    
    empty_cols = sum(1 for col in column_profiles if col.nullPercentage >= 99.9)
    empty_col_penalty = min(25, empty_cols * 10)
    
    zero_var_cols = sum(1 for col in column_profiles if col.uniqueCount == 1 and col.nullPercentage < 100)
    zero_var_penalty = min(15, zero_var_cols * 5)
    
    total_penalty = missing_penalty + duplicate_penalty + empty_col_penalty + zero_var_penalty
    final_score = max(0, min(100, base_score - total_penalty))
    
    reasons = []
    if missing_penalty > 0:
        reasons.append(f"-{missing_penalty} pts for {missing_pct:.1f}% missing values")
    if duplicate_penalty > 0:
        reasons.append(f"-{duplicate_penalty} pts for {duplicate_pct:.1f}% duplicate rows")
    if empty_col_penalty > 0:
        reasons.append(f"-{empty_col_penalty} pts for {empty_cols} empty column(s)")
    if zero_var_penalty > 0:
        reasons.append(f"-{zero_var_penalty} pts for {zero_var_cols} zero-variance column(s)")
        
    if not reasons:
        explanation = "Excellent dataset hygiene with 0% missing values, no duplicate rows, and complete column variance."
    else:
        explanation = f"Base score 100 minus: {', '.join(reasons)}."
        
    return int(final_score), explanation


def identify_potential_targets(column_profiles: List[ColumnProfile], total_rows: int) -> List[PotentialTarget]:
    """
    Identifies potential candidate target variables using deterministic heuristics:
    1. Keyword matching on column name (e.g. price, sales, churn, label, status, revenue, target, outcome)
    2. Numerical columns with continuous variance
    3. Categorical/Boolean columns with balanced class distribution (2 to 20 classes)
    """
    target_keywords = [
        r"target", r"label", r"class", r"outcome", r"result",
        r"price", r"cost", r"salary", r"revenue", r"sales", r"amount", r"profit",
        r"churn", r"attrition", r"converted", r"conversion", r"default", r"fraud",
        r"score", r"rating", r"status", r"is_", r"has_",
    ]
    
    candidates: List[PotentialTarget] = []
    
    for col in column_profiles:
        col_lower = col.name.lower()
        
        # Check keyword matches
        keyword_match = any(re.search(kw, col_lower) for kw in target_keywords)
        
        if keyword_match:
            if col.logicalType in ["numeric", "categorical", "boolean"]:
                candidates.append(
                    PotentialTarget(
                        columnName=col.name,
                        logicalType=col.logicalType,
                        reason=f"Column name '{col.name}' matches standard target / outcome keywords.",
                        confidence="high",
                    )
                )
                continue
                
        # Secondary candidate: Binary or low-cardinality categorical columns (Classification targets)
        if col.logicalType in ["boolean", "categorical"] and 2 <= col.uniqueCount <= 10:
            if col.nullPercentage <= 30.0:
                candidates.append(
                    PotentialTarget(
                        columnName=col.name,
                        logicalType=col.logicalType,
                        reason=f"Discrete distribution with {col.uniqueCount} distinct classes suitable for classification.",
                        confidence="medium",
                    )
                )
        # Secondary candidate: Continuous numeric column with >20 unique values
        elif col.logicalType == "numeric" and col.uniqueCount > 20 and col.nullPercentage <= 30.0:
            candidates.append(
                PotentialTarget(
                    columnName=col.name,
                    logicalType=col.logicalType,
                    reason=f"Continuous numeric variable with {col.uniqueCount} distinct values suitable for regression.",
                    confidence="medium",
                )
            )
            
    # Deduplicate candidates by column name
    seen = set()
    unique_candidates = []
    for c in candidates:
        if c.columnName not in seen:
            seen.add(c.columnName)
            unique_candidates.append(c)
            
    # Sort high confidence first
    unique_candidates.sort(key=lambda x: 0 if x.confidence == "high" else 1)
    return unique_candidates[:5]


def profile_dataset(
    df: pd.DataFrame,
    dataset_id: str,
    owner_id: str,
    file_name: str,
    file_type: str,
    file_size_bytes: int,
    created_at_iso: str,
) -> DatasetProfile:
    """
    Performs complete deterministic profiling on the dataset DataFrame.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    
    duplicate_rows = int(df.duplicated().sum())
    duplicate_row_pct = round((duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0.0
    
    total_missing_values = int(df.isna().sum().sum())
    missing_data_pct = round((total_missing_values / total_cells * 100), 2) if total_cells > 0 else 0.0
    
    column_profiles: List[ColumnProfile] = []
    numeric_cols: List[str] = []
    categorical_cols: List[str] = []
    text_cols: List[str] = []
    boolean_cols: List[str] = []
    datetime_cols: List[str] = []
    cols_with_missing = 0
    
    for col_idx, col_name in enumerate(df.columns):
        series = df[col_name]
        col_null_count = int(series.isna().sum())
        col_null_pct = round((col_null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
        if col_null_count > 0:
            cols_with_missing += 1
            
        col_unique_count = int(series.nunique(dropna=True))
        
        # Sample non-null values (up to 5 for UI sample display)
        non_null_samples = series.dropna().head(5).tolist()
        clean_samples = []
        for s in non_null_samples:
            if isinstance(s, (np.integer, int)):
                clean_samples.append(int(s))
            elif isinstance(s, (np.floating, float)):
                clean_samples.append(safe_float(s))
            elif isinstance(s, (bool, np.bool_)):
                clean_samples.append(bool(s))
            else:
                clean_samples.append(str(s)[:60])
                
        logical_type, is_dt = infer_column_logical_type(series)
        
        # Categorize column into lists
        if logical_type == "numeric":
            numeric_cols.append(col_name)
        elif logical_type == "categorical":
            categorical_cols.append(col_name)
        elif logical_type == "text":
            text_cols.append(col_name)
        elif logical_type == "boolean":
            boolean_cols.append(col_name)
        elif logical_type == "datetime":
            datetime_cols.append(col_name)
            
        # Compute Numeric Statistics if applicable
        num_stats: Optional[NumericStatistics] = None
        if logical_type == "numeric":
            valid_num = series.dropna()
            if len(valid_num) > 0:
                num_stats = NumericStatistics(
                    min=safe_float(valid_num.min()),
                    max=safe_float(valid_num.max()),
                    mean=safe_float(valid_num.mean()),
                    median=safe_float(valid_num.median()),
                    std=safe_float(valid_num.std()) if len(valid_num) > 1 else 0.0,
                    q25=safe_float(valid_num.quantile(0.25)),
                    q75=safe_float(valid_num.quantile(0.75)),
                )
                
        # Compute Categorical Value Frequencies if applicable
        top_values: Optional[List[CategoricalValueFrequency]] = None
        if logical_type in ["categorical", "boolean"]:
            val_counts = series.value_counts(dropna=True).head(10)
            total_valid = series.count()
            top_values = []
            for val, count in val_counts.items():
                pct = round((count / total_valid * 100), 2) if total_valid > 0 else 0.0
                top_values.append(
                    CategoricalValueFrequency(
                        value=str(val)[:50],
                        count=int(count),
                        percentage=pct,
                    )
                )
                
        col_prof = ColumnProfile(
            name=col_name,
            normalizedName=re.sub(r"[^a-zA-Z0-9_]", "_", col_name).strip("_").lower() or f"col_{col_idx}",
            logicalType=logical_type,
            pandasDtype=str(series.dtype),
            nullCount=col_null_count,
            nullPercentage=col_null_pct,
            uniqueCount=col_unique_count,
            sampleValues=clean_samples,
            statistics=num_stats,
            topValues=top_values,
            isDateTimeCandidate=is_dt,
        )
        column_profiles.append(col_prof)

    # Data Quality Score
    dq_score, dq_explanation = calculate_data_quality_score(
        total_cells=total_cells,
        missing_value_count=total_missing_values,
        duplicate_row_count=duplicate_rows,
        total_rows=total_rows,
        column_profiles=column_profiles,
    )
    
    # Potential Targets
    potential_targets = identify_potential_targets(column_profiles, total_rows)
    for target in potential_targets:
        for col in column_profiles:
            if col.name == target.columnName:
                col.isPotentialTarget = True
                col.targetReason = target.reason
                
    # Preview rows (first 10 rows converted to serializable dicts)
    preview_df = df.head(10).replace({np.nan: None, np.inf: None, -np.inf: None})
    preview_rows: List[Dict[str, Any]] = []
    for _, row in preview_df.iterrows():
        row_dict = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, (np.integer, int)):
                row_dict[col] = int(val)
            elif isinstance(val, (np.floating, float)):
                row_dict[col] = safe_float(val)
            elif isinstance(val, (bool, np.bool_)):
                row_dict[col] = bool(val)
            elif val is None:
                row_dict[col] = None
            else:
                row_dict[col] = str(val)
        preview_rows.append(row_dict)

    return DatasetProfile(
        datasetId=dataset_id,
        ownerId=owner_id,
        fileName=file_name,
        fileType=file_type,
        fileSizeBytes=file_size_bytes,
        rowCount=total_rows,
        columnCount=total_cols,
        duplicateRowCount=duplicate_rows,
        duplicateRowPercentage=duplicate_row_pct,
        missingValueCount=total_missing_values,
        missingDataPercentage=missing_data_pct,
        columnsWithMissingValues=cols_with_missing,
        dataQualityScore=dq_score,
        dataQualityExplanation=dq_explanation,
        columns=column_profiles,
        numericColumns=numeric_cols,
        categoricalColumns=categorical_cols,
        textColumns=text_cols,
        booleanColumns=boolean_cols,
        datetimeColumns=datetime_cols,
        potentialTargets=potential_targets,
        previewRows=preview_rows,
        createdAt=created_at_iso,
        profileStatus="completed",
    )
