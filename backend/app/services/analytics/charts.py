from typing import Any, Dict, List
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import ChartRequest, ChartResponse
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def generate_chart_data(df: pd.DataFrame, req: ChartRequest) -> ChartResponse:
    """
    Generates chart-ready structured JSON data for Bar, Line, Scatter, and Histogram charts.
    Does NOT generate image files; outputs clean serialized coordinate objects for Recharts.
    """
    x_col = req.xColumn
    y_col = req.yColumn

    if x_col not in df.columns:
        raise AppError(
            code="INVALID_COLUMN",
            message=f"X-axis column '{x_col}' does not exist in dataset.",
            status_code=400,
        )

    chart_type = req.chartType
    chart_data: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {"totalRecords": len(df)}
    title = f"{chart_type.capitalize()} Chart: {x_col}" + (f" vs {y_col}" if y_col else "")

    if chart_type == "bar":
        if y_col:
            if y_col not in df.columns:
                raise AppError(code="INVALID_COLUMN", message=f"Y column '{y_col}' not found.", status_code=400)
            
            work_df = pd.DataFrame({
                "x": df[x_col].astype(str),
                "y": pd.to_numeric(df[y_col], errors="coerce"),
            }).dropna()

            agg_func = req.aggregation or "mean"
            grouped = work_df.groupby("x")["y"].agg(agg_func).reset_index()
            grouped = grouped.sort_values(by="y", ascending=False).head(req.limit or 50)

            for _, row in grouped.iterrows():
                chart_data.append({
                    "x": str(row["x"]),
                    "y": safe_float(row["y"]),
                })
            metadata["aggregation"] = agg_func
        else:
            # Frequency count of X categories
            counts = df[x_col].astype(str).value_counts().head(req.limit or 50)
            for cat, cnt in counts.items():
                chart_data.append({
                    "x": str(cat),
                    "y": int(cnt),
                })
            metadata["aggregation"] = "count"

    elif chart_type == "line":
        if not y_col or y_col not in df.columns:
            raise AppError(code="INVALID_COLUMN", message="Line chart requires a valid 'yColumn'.", status_code=400)

        work_df = pd.DataFrame({
            "x": df[x_col],
            "y": pd.to_numeric(df[y_col], errors="coerce"),
        }).dropna()

        # Try parsing X as datetime or sorting naturally
        try:
            work_df["parsed_x"] = pd.to_datetime(work_df["x"], errors="coerce")
            if work_df["parsed_x"].notna().sum() > len(work_df) * 0.7:
                work_df = work_df.sort_values("parsed_x")
        except Exception:
            work_df = work_df.sort_values("x")

        # Group and aggregate if repeated X values
        agg_func = req.aggregation or "mean"
        grouped = work_df.groupby("x", sort=False)["y"].agg(agg_func).reset_index().head(req.limit or 100)

        for _, row in grouped.iterrows():
            chart_data.append({
                "x": str(row["x"]),
                "y": safe_float(row["y"]),
            })
        metadata["aggregation"] = agg_func

    elif chart_type == "scatter":
        if not y_col or y_col not in df.columns:
            raise AppError(code="INVALID_COLUMN", message="Scatter chart requires a valid 'yColumn'.", status_code=400)

        work_df = pd.DataFrame({
            "x": pd.to_numeric(df[x_col], errors="coerce"),
            "y": pd.to_numeric(df[y_col], errors="coerce"),
        }).dropna().head(req.limit or 200)

        for _, row in work_df.iterrows():
            chart_data.append({
                "x": safe_float(row["x"]),
                "y": safe_float(row["y"]),
            })
        metadata["pointsCount"] = len(chart_data)

    elif chart_type == "histogram":
        series = pd.to_numeric(df[x_col], errors="coerce").dropna()
        if series.empty:
            raise AppError(code="INVALID_COLUMN_TYPE", message=f"Column '{x_col}' has no numeric values for histogram.", status_code=400)

        bins_count = req.bins or 20
        counts, bin_edges = np.histogram(series.values, bins=bins_count)

        for i in range(len(counts)):
            b_start = round(float(bin_edges[i]), 2)
            b_end = round(float(bin_edges[i + 1]), 2)
            chart_data.append({
                "x": f"{b_start} - {b_end}",
                "y": int(counts[i]),
                "binStart": b_start,
                "binEnd": b_end,
                "count": int(counts[i]),
            })
        metadata["binsCount"] = bins_count

    return ChartResponse(
        chartType=chart_type,
        x=x_col,
        y=y_col,
        title=title,
        data=chart_data,
        metadata=metadata,
    )
