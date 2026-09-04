import math
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import (
    BooleanStatsResponse,
    CategoricalStatsResponse,
    ColumnStatisticsResponse,
    DateTimeStatsResponse,
    NumericStatsResponse,
    TopCategoryItem,
)
from backend.app.services.profiling import infer_column_logical_type, safe_float
from backend.app.utils.errors import AppError


def compute_numeric_stats(series: pd.Series) -> NumericStatsResponse:
    """Computes deterministic descriptive statistics for a numeric column."""
    total_count = len(series)
    # Coerce to numeric safely
    numeric_series = pd.to_numeric(series, errors="coerce")
    valid = numeric_series.dropna()
    valid_count = len(valid)
    missing_count = total_count - valid_count
    missing_pct = round((missing_count / total_count * 100), 2) if total_count > 0 else 0.0

    if valid_count == 0:
        return NumericStatsResponse(
            count=total_count,
            missingCount=missing_count,
            missingPercentage=missing_pct,
            percentiles={},
        )

    # Compute percentiles and summary statistics using numpy / pandas
    val_min = safe_float(valid.min())
    val_max = safe_float(valid.max())
    val_mean = safe_float(valid.mean())
    val_median = safe_float(valid.median())
    val_std = safe_float(valid.std(ddof=1)) if valid_count > 1 else 0.0
    val_var = safe_float(valid.var(ddof=1)) if valid_count > 1 else 0.0
    val_range = safe_float(valid.max() - valid.min())

    # Percentiles: 1, 5, 10, 25, 50, 75, 90, 95, 99
    quantiles = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
    q_vals = valid.quantile(quantiles)

    q1 = safe_float(q_vals.get(0.25))
    q3 = safe_float(q_vals.get(0.75))
    iqr = safe_float(q_vals.get(0.75) - q_vals.get(0.25)) if (q1 is not None and q3 is not None) else None

    percentiles_dict = {
        "p1": safe_float(q_vals.get(0.01)),
        "p5": safe_float(q_vals.get(0.05)),
        "p10": safe_float(q_vals.get(0.10)),
        "p25": q1,
        "p50": val_median,
        "p75": q3,
        "p90": safe_float(q_vals.get(0.90)),
        "p95": safe_float(q_vals.get(0.95)),
        "p99": safe_float(q_vals.get(0.99)),
    }

    return NumericStatsResponse(
        count=total_count,
        missingCount=missing_count,
        missingPercentage=missing_pct,
        mean=val_mean,
        median=val_median,
        std=val_std,
        variance=val_var,
        min=val_min,
        max=val_max,
        range=val_range,
        q1=q1,
        q3=q3,
        iqr=iqr,
        percentiles=percentiles_dict,
    )


def compute_categorical_stats(series: pd.Series, top_n: int = 10) -> CategoricalStatsResponse:
    """Computes deterministic frequency and cardinality statistics for a categorical or text column."""
    total_count = len(series)
    non_null = series.dropna()
    valid_count = len(non_null)
    missing_count = total_count - valid_count
    missing_pct = round((missing_count / total_count * 100), 2) if total_count > 0 else 0.0

    if valid_count == 0:
        return CategoricalStatsResponse(
            count=total_count,
            missingCount=missing_count,
            missingPercentage=missing_pct,
            uniqueCount=0,
            uniquePercentage=0.0,
            topCategories=[],
        )

    str_series = non_null.astype(str)
    value_counts = str_series.value_counts()
    unique_count = int(len(value_counts))
    unique_pct = round((unique_count / valid_count * 100), 2) if valid_count > 0 else 0.0

    top_val = str(value_counts.index[0])
    top_cnt = int(value_counts.iloc[0])
    top_pct = round((top_cnt / valid_count * 100), 2)

    top_items: List[TopCategoryItem] = []
    for val, cnt in value_counts.head(top_n).items():
        top_items.append(
            TopCategoryItem(
                value=str(val),
                count=int(cnt),
                percentage=round((cnt / valid_count * 100), 2),
            )
        )

    return CategoricalStatsResponse(
        count=total_count,
        missingCount=missing_count,
        missingPercentage=missing_pct,
        uniqueCount=unique_count,
        uniquePercentage=unique_pct,
        mostFrequentValue=top_val,
        mostFrequentCount=top_cnt,
        mostFrequentPercentage=top_pct,
        topCategories=top_items,
    )


def compute_boolean_stats(series: pd.Series) -> BooleanStatsResponse:
    """Computes boolean true/false distribution."""
    total_count = len(series)
    non_null = series.dropna()
    valid_count = len(non_null)
    missing_count = total_count - valid_count

    # Standardize boolean values
    true_count = 0
    false_count = 0

    for val in non_null:
        val_str = str(val).strip().lower()
        if val is True or val_str in ("true", "1", "yes", "y", "t"):
            true_count += 1
        else:
            false_count += 1

    true_pct = round((true_count / valid_count * 100), 2) if valid_count > 0 else 0.0
    false_pct = round((false_count / valid_count * 100), 2) if valid_count > 0 else 0.0

    return BooleanStatsResponse(
        count=total_count,
        trueCount=true_count,
        falseCount=false_count,
        missingCount=missing_count,
        truePercentage=true_pct,
        falsePercentage=false_pct,
    )


def compute_datetime_stats(series: pd.Series) -> DateTimeStatsResponse:
    """Computes date range and distribution statistics for a datetime column."""
    total_count = len(series)
    dt_series = pd.to_datetime(series, errors="coerce")
    valid = dt_series.dropna()
    valid_count = len(valid)
    missing_count = total_count - valid_count
    missing_pct = round((missing_count / total_count * 100), 2) if total_count > 0 else 0.0

    if valid_count == 0:
        return DateTimeStatsResponse(
            count=total_count,
            uniqueDates=0,
            missingCount=missing_count,
            missingPercentage=missing_pct,
        )

    min_date = valid.min()
    max_date = valid.max()
    date_range_days = (max_date - min_date).days if (min_date and max_date) else None
    unique_dates = int(valid.dt.date.nunique())

    # Infer frequency
    inferred_freq: Optional[str] = None
    try:
        if valid_count >= 5:
            sorted_unique = valid.drop_duplicates().sort_values()
            inferred = pd.infer_freq(sorted_unique.head(50))
            if inferred:
                inferred_freq = str(inferred)
    except Exception:
        inferred_freq = None

    return DateTimeStatsResponse(
        count=total_count,
        minDate=min_date.isoformat() if min_date else None,
        maxDate=max_date.isoformat() if max_date else None,
        dateRangeDays=date_range_days,
        uniqueDates=unique_dates,
        missingCount=missing_count,
        missingPercentage=missing_pct,
        inferredFrequency=inferred_freq,
    )


def compute_column_statistics(
    df: pd.DataFrame,
    column: str,
    logical_type: Optional[str] = None,
) -> ColumnStatisticsResponse:
    """Dispatches column statistics calculation based on logical type."""
    if column not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"Column '{column}' does not exist in this dataset.",
            status_code=400,
        )

    series = df[column]
    if not logical_type:
        inferred, _ = infer_column_logical_type(series)
        logical_type = inferred

    # Collect sample non-null values
    sample_values = [
        None if pd.isna(v) else (round(float(v), 4) if isinstance(v, (int, float, np.number)) and not np.isnan(v) else str(v))
        for v in series.dropna().head(5).tolist()
    ]

    response = ColumnStatisticsResponse(
        column=column,
        logicalType=logical_type,
        sampleValues=sample_values,
    )

    if logical_type == "numeric":
        response.numeric = compute_numeric_stats(series)
    elif logical_type in ("categorical", "text", "unknown"):
        response.categorical = compute_categorical_stats(series)
    elif logical_type == "boolean":
        response.boolean = compute_boolean_stats(series)
    elif logical_type == "datetime":
        response.datetime = compute_datetime_stats(series)

    return response
