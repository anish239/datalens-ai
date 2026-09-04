from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from backend.app.schemas.analytics import CorrelationMatrixResponse, CorrelationPair, CorrelationRequest
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError


def classify_relationship(val: float) -> str:
    """Classifies correlation coefficient into descriptive strength."""
    if val >= 0.7:
        return "strong_positive"
    elif val >= 0.3:
        return "moderate_positive"
    elif val > -0.3:
        return "weak"
    elif val > -0.7:
        return "moderate_negative"
    else:
        return "strong_negative"


def compute_correlation(df: pd.DataFrame, req: CorrelationRequest) -> CorrelationMatrixResponse:
    """
    Computes a deterministic correlation matrix across numeric columns.
    Extracts strongest positive and negative correlation pairs without duplicate pairs.
    """
    # 1. Identify target numeric columns
    target_cols = req.columns if req.columns else [
        c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])
    ]

    # Validate columns
    for col in target_cols:
        if col not in df.columns:
            raise AppError(
                code="INVALID_COLUMN",
                message=f"Column '{col}' does not exist in dataset.",
                status_code=400,
            )

    # Filter to actual numeric series
    numeric_df = pd.DataFrame()
    for col in target_cols:
        s = pd.to_numeric(df[col], errors="coerce")
        if s.dropna().nunique() > 1:  # Must have variation
            numeric_df[col] = s

    if len(numeric_df.columns) < 2:
        raise AppError(
            code="INSUFFICIENT_NUMERIC_COLUMNS",
            message="At least 2 numeric columns with variance are required for correlation analysis.",
            status_code=400,
        )

    # Compute correlation matrix
    method = req.method
    corr_df = numeric_df.corr(method=method, min_periods=req.minSampleSize)

    # Build serializable matrix
    matrix_dict: Dict[str, Dict[str, Optional[float]]] = {}
    valid_cols = list(corr_df.columns)

    for c1 in valid_cols:
        matrix_dict[c1] = {}
        for c2 in valid_cols:
            val = corr_df.loc[c1, c2]
            matrix_dict[c1][c2] = safe_float(val)

    # Extract pairs
    pairs: List[CorrelationPair] = []
    seen_pairs = set()

    for i, c1 in enumerate(valid_cols):
        for j, c2 in enumerate(valid_cols):
            if i >= j:
                continue  # Skip diagonal and duplicate lower-triangle pairs
            
            val = corr_df.loc[c1, c2]
            if pd.isna(val) or np.isinf(val):
                continue

            # Calculate pairwise sample size
            pairwise_valid = numeric_df[[c1, c2]].dropna()
            sample_size = len(pairwise_valid)

            if sample_size < req.minSampleSize:
                continue

            f_val = round(float(val), 4)
            pairs.append(
                CorrelationPair(
                    columnA=c1,
                    columnB=c2,
                    correlation=f_val,
                    method=method,
                    sampleSize=sample_size,
                    relationship=classify_relationship(f_val),
                )
            )

    # Sort positive and negative
    positive_pairs = [p for p in pairs if p.correlation > 0.0]
    negative_pairs = [p for p in pairs if p.correlation < 0.0]

    positive_pairs.sort(key=lambda p: p.correlation, reverse=True)
    negative_pairs.sort(key=lambda p: p.correlation)  # Most negative first

    return CorrelationMatrixResponse(
        method=method,
        columns=valid_cols,
        matrix=matrix_dict,
        strongestPositive=positive_pairs[:10],
        strongestNegative=negative_pairs[:10],
        sampleSize=len(numeric_df.dropna()),
    )
