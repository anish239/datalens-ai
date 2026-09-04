from typing import Any, Dict, List
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import OutlierRequest, OutlierResponse
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def detect_outliers(df: pd.DataFrame, req: OutlierRequest) -> OutlierResponse:
    """
    Detects statistical outliers in a numeric column using IQR or Z-score method.
    Returns bounded outlier records and summary metrics.
    """
    column = req.column
    if column not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"Column '{column}' does not exist in dataset.",
            status_code=400,
        )

    series = pd.to_numeric(df[column], errors="coerce")
    valid_mask = series.notna()
    valid_series = series[valid_mask]
    total_obs = len(df)
    valid_obs = len(valid_series)

    if valid_obs < 4:
        raise AppError(
            code="INSUFFICIENT_OBSERVATIONS",
            message=f"Column '{column}' has fewer than 4 numeric observations, which is insufficient for outlier detection.",
            status_code=400,
        )

    outlier_mask = pd.Series(False, index=df.index)
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

    if req.method == "iqr":
        q1 = valid_series.quantile(0.25)
        q3 = valid_series.quantile(0.75)
        iqr = q3 - q1
        multiplier = req.threshold
        lower_bound = q1 - (multiplier * iqr)
        upper_bound = q3 + (multiplier * iqr)

        outlier_mask = valid_mask & ((series < lower_bound) | (series > upper_bound))

    elif req.method == "zscore":
        mean_val = valid_series.mean()
        std_val = valid_series.std(ddof=1)

        if std_val == 0 or np.isnan(std_val):
            # Constant column has 0 outliers
            outlier_mask = pd.Series(False, index=df.index)
            lower_bound = mean_val
            upper_bound = mean_val
        else:
            z_scores = np.abs((valid_series - mean_val) / std_val)
            threshold = req.threshold
            lower_bound = mean_val - (threshold * std_val)
            upper_bound = mean_val + (threshold * std_val)

            outlier_indices = valid_series.index[z_scores > threshold]
            outlier_mask.loc[outlier_indices] = True

    outlier_count = int(outlier_mask.sum())
    outlier_pct = round((outlier_count / valid_obs * 100), 2) if valid_obs > 0 else 0.0

    # Extract sample outlier rows
    outlier_df = df[outlier_mask].head(req.sampleLimit)
    sample_records: List[Dict[str, Any]] = []

    for idx, row in outlier_df.iterrows():
        record: Dict[str, Any] = {"_rowIndex": int(idx)}
        for c in df.columns:
            val = row[c]
            if pd.isna(val):
                record[c] = None
            elif isinstance(val, (int, np.integer)):
                record[c] = int(val)
            elif isinstance(val, (float, np.floating)):
                record[c] = safe_float(val)
            else:
                record[c] = str(val)
        sample_records.append(record)

    return OutlierResponse(
        column=column,
        method=req.method,
        threshold=req.threshold,
        totalObservations=total_obs,
        validObservations=valid_obs,
        outlierCount=outlier_count,
        outlierPercentage=outlier_pct,
        lowerBound=safe_float(lower_bound),
        upperBound=safe_float(upper_bound),
        sampleOutliers=sample_records,
    )
