from typing import Any, Dict, List
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import GroupByAggregation, GroupByRequest, GroupByResponse
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def execute_group_by(df: pd.DataFrame, req: GroupByRequest) -> GroupByResponse:
    """
    Executes a deterministic multi-column group-by aggregation on a DataFrame.
    Validates column existence and applies safe numeric aggregation functions.
    """
    group_cols = [req.by] if isinstance(req.by, str) else list(req.by)

    # 1. Validate grouping columns
    for col in group_cols:
        if col not in df.columns:
            raise AppError(
                code="INVALID_COLUMN",
                message=f"Grouping column '{col}' does not exist in dataset.",
                status_code=400,
            )

    # 2. Validate aggregation columns and functions
    agg_dict: Dict[str, List[str]] = {}
    col_function_map: List[Dict[str, str]] = []

    valid_funcs = {"count", "sum", "mean", "median", "min", "max", "std", "nunique"}

    for agg in req.aggregations:
        if agg.column not in df.columns:
            raise AppError(
                code="INVALID_COLUMN",
                message=f"Aggregation column '{agg.column}' does not exist in dataset.",
                status_code=400,
            )
        if agg.function not in valid_funcs:
            raise AppError(
                code="INVALID_AGGREGATION",
                message=f"Aggregation function '{agg.function}' is unsupported.",
                status_code=400,
            )

        # For numeric aggregations (sum, mean, median, min, max, std), verify numeric compatibility
        if agg.function in {"sum", "mean", "median", "std"} and not pd.api.types.is_numeric_dtype(df[agg.column]):
            # Attempt to coerce
            coerced = pd.to_numeric(df[agg.column], errors="coerce")
            if coerced.dropna().empty:
                raise AppError(
                    code="INVALID_COLUMN_TYPE",
                    message=f"Column '{agg.column}' is non-numeric and cannot be aggregated with '{agg.function}'.",
                    status_code=400,
                )

        alias = agg.alias or f"{agg.function}_{agg.column}"
        col_function_map.append({
            "column": agg.column,
            "function": agg.function,
            "alias": alias,
        })

    # Prepare DataFrame for grouping
    work_df = df.copy()
    for item in col_function_map:
        if item["function"] in {"sum", "mean", "median", "std", "min", "max"}:
            work_df[item["column"]] = pd.to_numeric(work_df[item["column"]], errors="coerce")

    # Group by
    try:
        grouped = work_df.groupby(group_cols, observed=True, dropna=False)
    except Exception as e:
        raise AppError(
            code="GROUPBY_FAILED",
            message=f"Failed to group dataset by {group_cols}: {str(e)}",
            status_code=400,
        )

    # Compute aggregations
    result_records: List[Dict[str, Any]] = []
    
    # We construct the aggregated series
    agg_series_list = []
    for item in col_function_map:
        col = item["column"]
        func = item["function"]
        alias = item["alias"]

        if func == "count":
            s = grouped[col].count()
        elif func == "nunique":
            s = grouped[col].nunique()
        elif func == "sum":
            s = grouped[col].sum()
        elif func == "mean":
            s = grouped[col].mean()
        elif func == "median":
            s = grouped[col].median()
        elif func == "min":
            s = grouped[col].min()
        elif func == "max":
            s = grouped[col].max()
        elif func == "std":
            s = grouped[col].std(ddof=1)
        else:
            s = grouped[col].count()

        s.name = alias
        agg_series_list.append(s)

    if agg_series_list:
        res_df = pd.concat(agg_series_list, axis=1).reset_index()
    else:
        res_df = grouped.size().reset_index(name="count")

    # Handle sorting
    sort_target = req.sortBy
    if sort_target and sort_target in res_df.columns:
        res_df = res_df.sort_values(by=sort_target, ascending=req.ascending)
    elif col_function_map:
        # Default sort by first aggregation descending
        first_alias = col_function_map[0]["alias"]
        res_df = res_df.sort_values(by=first_alias, ascending=req.ascending)

    total_groups = len(res_df)
    truncated = total_groups > req.limit
    res_df = res_df.head(req.limit)

    # Format result dictionary safely
    for _, row in res_df.iterrows():
        record: Dict[str, Any] = {}
        for col_name in res_df.columns:
            val = row[col_name]
            if pd.isna(val):
                record[col_name] = None
            elif isinstance(val, (int, np.integer)):
                record[col_name] = int(val)
            elif isinstance(val, (float, np.floating)):
                record[col_name] = safe_float(val)
            elif isinstance(val, (bool, np.bool_)):
                record[col_name] = bool(val)
            else:
                record[col_name] = str(val)
        result_records.append(record)

    return GroupByResponse(
        by=group_cols,
        aggregations=req.aggregations,
        groups=result_records,
        totalGroups=total_groups,
        truncated=truncated,
    )
