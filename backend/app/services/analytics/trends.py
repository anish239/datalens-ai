from typing import List, Optional
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import TrendPoint, TrendRequest, TrendResponse
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def compute_trends(df: pd.DataFrame, req: TrendRequest) -> TrendResponse:
    """
    Computes time-series trend aggregation over a datetime and numeric column.
    Calculates deterministic metrics including absolute change, percentage change, and trend direction.
    """
    date_col = req.dateColumn
    val_col = req.valueColumn

    if date_col not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"Date column '{date_col}' does not exist in dataset.",
            status_code=400,
        )
    if val_col not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"Value column '{val_col}' does not exist in dataset.",
            status_code=400,
        )

    # 1. Parse date column
    parsed_dates = pd.to_datetime(df[date_col], errors="coerce")
    parsed_vals = pd.to_numeric(df[val_col], errors="coerce")

    valid_mask = parsed_dates.notna() & parsed_vals.notna()
    if valid_mask.sum() < 2:
        raise AppError(
            code="INSUFFICIENT_DATA",
            message="At least 2 valid date-value observations are required for trend analysis.",
            status_code=400,
        )

    work_df = pd.DataFrame({
        "dt": parsed_dates[valid_mask],
        "val": parsed_vals[valid_mask],
    }).sort_values("dt")

    # 2. Set frequency offset rule
    freq_map = {
        "day": "D",
        "week": "W",
        "month": "MS",  # Month start for clean labeling
        "quarter": "QS",
        "year": "YS",
    }
    freq_rule = freq_map.get(req.frequency, "MS")

    # Group by period
    work_df.set_index("dt", inplace=True)
    resampler = work_df.resample(freq_rule)

    if req.aggregation == "sum":
        agg_val = resampler["val"].sum()
    elif req.aggregation == "mean":
        agg_val = resampler["val"].mean()
    elif req.aggregation == "median":
        agg_val = resampler["val"].median()
    elif req.aggregation == "count":
        agg_val = resampler["val"].count()
    else:
        agg_val = resampler["val"].sum()

    agg_count = resampler["val"].count()

    points: List[TrendPoint] = []
    valid_period_values: List[float] = []

    for dt_idx, v in agg_val.items():
        cnt = int(agg_count.loc[dt_idx])
        if cnt == 0:
            continue  # Skip empty time periods with zero records

        # Format period string based on frequency
        if req.frequency == "day":
            p_str = dt_idx.strftime("%Y-%m-%d")
        elif req.frequency == "week":
            p_str = dt_idx.strftime("%Y-W%U")
        elif req.frequency == "month":
            p_str = dt_idx.strftime("%Y-%m")
        elif req.frequency == "quarter":
            quarter_num = (dt_idx.month - 1) // 3 + 1
            p_str = f"{dt_idx.year}-Q{quarter_num}"
        else:
            p_str = dt_idx.strftime("%Y")

        f_val = safe_float(v)
        if f_val is not None:
            valid_period_values.append(f_val)

        points.append(
            TrendPoint(
                period=p_str,
                value=f_val,
                count=cnt,
            )
        )

    if len(valid_period_values) < 2:
        return TrendResponse(
            dateColumn=date_col,
            valueColumn=val_col,
            aggregation=req.aggregation,
            frequency=req.frequency,
            points=points,
            trendDirection="insufficient_data",
            overallSummary=f"Aggregated {len(points)} periods; insufficient data for trend direction.",
        )

    first_val = valid_period_values[0]
    last_val = valid_period_values[-1]
    min_val = min(valid_period_values)
    max_val = max(valid_period_values)

    abs_change = round(last_val - first_val, 4)
    pct_change = round((abs_change / first_val * 100), 2) if first_val != 0 else None

    # Calculate deterministic trend direction using linear slope over time
    x_indices = np.arange(len(valid_period_values))
    y_values = np.array(valid_period_values)
    slope, _ = np.polyfit(x_indices, y_values, 1)

    # Compute coefficient of variation to detect volatility
    std_val = float(np.std(y_values))
    mean_val = float(np.mean(y_values))
    cv = (std_val / abs(mean_val)) if mean_val != 0 else 0

    if abs(slope) < 1e-4 or (pct_change is not None and abs(pct_change) < 2.0):
        direction = "stable"
    elif slope > 0 and cv < 0.6:
        direction = "increasing"
    elif slope < 0 and cv < 0.6:
        direction = "decreasing"
    else:
        direction = "volatile"

    summary_text = (
        f"{req.aggregation.capitalize()} of '{val_col}' over {len(points)} {req.frequency}ly periods "
        f"changed from {first_val} to {last_val} (net {abs_change:+g}"
        + (f", {pct_change:+g}%" if pct_change is not None else "")
        + f"), demonstrating a {direction} trajectory."
    )

    return TrendResponse(
        dateColumn=date_col,
        valueColumn=val_col,
        aggregation=req.aggregation,
        frequency=req.frequency,
        points=points,
        firstValue=first_val,
        lastValue=last_val,
        absoluteChange=abs_change,
        percentageChange=pct_change,
        minValue=min_val,
        maxValue=max_val,
        trendDirection=direction,
        overallSummary=summary_text,
    )
