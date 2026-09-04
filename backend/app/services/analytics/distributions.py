from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import DistributionRequest, DistributionResponse, HistogramBin
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def compute_distribution(df: pd.DataFrame, req: DistributionRequest) -> DistributionResponse:
    """
    Computes deterministic distribution metrics including histogram bins,
    percentiles, skewness, and kurtosis for a numeric column.
    """
    column = req.column
    if column not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"Column '{column}' does not exist in dataset.",
            status_code=400,
        )

    series = pd.to_numeric(df[column], errors="coerce").dropna()
    valid_count = len(series)

    if valid_count < 2:
        raise AppError(
            code="INSUFFICIENT_DATA",
            message=f"Column '{column}' must have at least 2 valid numeric values for distribution analysis.",
            status_code=400,
        )

    val_min = safe_float(series.min())
    val_max = safe_float(series.max())
    val_mean = safe_float(series.mean())
    val_median = safe_float(series.median())
    val_std = safe_float(series.std(ddof=1)) if valid_count > 1 else 0.0

    # Skewness & Kurtosis
    skew_val = safe_float(series.skew()) if valid_count >= 3 else None
    kurt_val = safe_float(series.kurt()) if valid_count >= 4 else None

    # Percentiles
    quantiles = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
    q_vals = series.quantile(quantiles)
    percentiles_dict: Dict[str, Optional[float]] = {
        f"p{int(q * 100)}": safe_float(q_vals.get(q)) for q in quantiles
    }

    # Histogram Bins
    bins_count = req.bins
    # If all values are identical, create a single discrete bin
    if val_min == val_max:
        bins_list = [
            HistogramBin(
                binIndex=0,
                binStart=val_min or 0.0,
                binEnd=val_max or 0.0,
                count=valid_count,
                percentage=100.0,
            )
        ]
    else:
        counts, bin_edges = np.histogram(series.values, bins=bins_count)
        bins_list = []
        for i in range(len(counts)):
            cnt = int(counts[i])
            pct = round((cnt / valid_count * 100), 2)
            bins_list.append(
                HistogramBin(
                    binIndex=i,
                    binStart=round(float(bin_edges[i]), 4),
                    binEnd=round(float(bin_edges[i + 1]), 4),
                    count=cnt,
                    percentage=pct,
                )
            )

    return DistributionResponse(
        column=column,
        count=valid_count,
        min=val_min,
        max=val_max,
        mean=val_mean,
        median=val_median,
        std=val_std,
        skewness=skew_val,
        kurtosis=kurt_val,
        percentiles=percentiles_dict,
        bins=bins_list,
    )
