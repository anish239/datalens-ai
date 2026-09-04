from typing import List, Optional
import pandas as pd

from backend.app.schemas.analytics import DataQualityFactor, DataQualityResponse


def compute_data_quality_breakdown(df: pd.DataFrame) -> DataQualityResponse:
    """
    Computes a deterministic, transparent breakdown of the DataLens Data Quality Score.
    Identifies penalties for missing values, duplicates, empty columns, and zero-variance columns.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols

    if total_cells == 0:
        return DataQualityResponse(
            score=0,
            rating="Poor",
            factors=[DataQualityFactor(name="Empty Dataset", penalty=100, impact="Critical", description="Dataset contains 0 rows or columns.")],
            totalMissingCells=0,
            missingPercentage=100.0,
            duplicateRows=0,
            duplicatePercentage=0.0,
            emptyColumnsCount=0,
            zeroVarianceColumnsCount=0,
            summary="Empty dataset with 0 rows or columns.",
        )

    # 1. Missing Values
    missing_cells = int(df.isna().sum().sum())
    missing_pct = round((missing_cells / total_cells * 100), 2)
    missing_penalty = min(35, round(missing_pct * 1.5))

    # 2. Duplicate Rows
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0.0
    duplicate_penalty = min(25, round(duplicate_pct * 1.5))

    # 3. Empty Columns (>= 99.9% null)
    null_ratios = df.isna().mean()
    empty_cols = list(null_ratios[null_ratios >= 0.999].index)
    empty_col_count = len(empty_cols)
    empty_col_penalty = min(25, empty_col_count * 10)

    # 4. Zero-Variance Columns
    zero_var_cols = []
    for col in df.columns:
        valid_series = df[col].dropna()
        if len(valid_series) > 0 and valid_series.nunique() == 1:
            zero_var_cols.append(col)
    zero_var_count = len(zero_var_cols)
    zero_var_penalty = min(15, zero_var_count * 5)

    # Compute final score
    total_penalty = missing_penalty + duplicate_penalty + empty_col_penalty + zero_var_penalty
    final_score = max(0, min(100, 100 - total_penalty))

    factors: List[DataQualityFactor] = []
    if missing_penalty > 0:
        factors.append(
            DataQualityFactor(
                name="Missing Values",
                penalty=missing_penalty,
                impact="High" if missing_penalty > 15 else "Moderate",
                description=f"{missing_cells:,} missing cells ({missing_pct}%) across dataset.",
            )
        )
    if duplicate_penalty > 0:
        factors.append(
            DataQualityFactor(
                name="Duplicate Rows",
                penalty=duplicate_penalty,
                impact="Moderate" if duplicate_penalty > 10 else "Low",
                description=f"{duplicate_rows:,} identical duplicate rows ({duplicate_pct}%).",
            )
        )
    if empty_col_penalty > 0:
        factors.append(
            DataQualityFactor(
                name="Empty Columns",
                penalty=empty_col_penalty,
                impact="High",
                description=f"{empty_col_count} column(s) are completely empty: {', '.join(empty_cols[:3])}.",
            )
        )
    if zero_var_penalty > 0:
        factors.append(
            DataQualityFactor(
                name="Zero Variance Columns",
                penalty=zero_var_penalty,
                impact="Low",
                description=f"{zero_var_count} column(s) have only a single static value: {', '.join(zero_var_cols[:3])}.",
            )
        )

    # Rating
    if final_score >= 85:
        rating = "High"
    elif final_score >= 70:
        rating = "Good"
    elif final_score >= 50:
        rating = "Fair"
    else:
        rating = "Poor"

    summary_text = (
        f"DataLens Quality Score: {final_score}/100 ({rating} hygiene). "
        + (f"Penalized by {total_penalty} points across {len(factors)} quality factors." if factors else "No quality defects identified.")
    )

    return DataQualityResponse(
        score=final_score,
        rating=rating,
        factors=factors,
        totalMissingCells=missing_cells,
        missingPercentage=missing_pct,
        duplicateRows=duplicate_rows,
        duplicatePercentage=duplicate_pct,
        emptyColumnsCount=empty_col_count,
        zeroVarianceColumnsCount=zero_var_count,
        summary=summary_text,
    )
