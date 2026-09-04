import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from backend.app.models.dataset import DatasetProfile
from backend.app.schemas.analytics import (
    AnalysisMetadata,
    AnalyticsEnvelope,
    AnalyticsOverviewResponse,
    ChartRequest,
    ChartResponse,
    ColumnStatisticsResponse,
    CorrelationMatrixResponse,
    CorrelationRequest,
    DataQualityResponse,
    DistributionRequest,
    DistributionResponse,
    FilterCondition,
    GroupByRequest,
    GroupByResponse,
    OutlierRequest,
    OutlierResponse,
    QueryRequest,
    QueryResponse,
    TrendRequest,
    TrendResponse,
)
from backend.app.services.analytics.charts import generate_chart_data
from backend.app.services.analytics.correlation import compute_correlation
from backend.app.services.analytics.data_quality import compute_data_quality_breakdown
from backend.app.services.analytics.distributions import compute_distribution
from backend.app.services.analytics.groupby import execute_group_by
from backend.app.services.analytics.outliers import detect_outliers
from backend.app.services.analytics.statistics import compute_column_statistics
from backend.app.services.analytics.trends import compute_trends
from backend.app.services.profiling import safe_float
from backend.app.utils.errors import AppError

# In-memory store for active DataFrames mapped by dataset ID
_dataframe_cache: Dict[str, pd.DataFrame] = {}


class AnalyticsEngine:
    """
    Central deterministic analytics engine for DataLens AI.
    Executes reproducible Pandas/NumPy/SciPy operations without LLMs or arbitrary code execution.
    """

    @staticmethod
    def register_dataframe(dataset_id: str, df: pd.DataFrame) -> None:
        """Stores or caches an active DataFrame in memory for fast analytics."""
        _dataframe_cache[dataset_id] = df.copy()

    @staticmethod
    def get_dataframe(dataset_id: str, profile: Optional[DatasetProfile] = None) -> pd.DataFrame:
        """
        Retrieves DataFrame from cache. If not found, attempts reconstruction from profile preview rows.
        """
        if dataset_id in _dataframe_cache:
            return _dataframe_cache[dataset_id]

        if profile and profile.previewRows:
            df = pd.DataFrame(profile.previewRows)
            _dataframe_cache[dataset_id] = df
            return df

        raise AppError(
            code="DATASET_NOT_LOADED",
            message=f"Dataset '{dataset_id}' data is not loaded in memory. Please re-upload or select the dataset.",
            status_code=404,
        )

    @staticmethod
    def evict_dataframe(dataset_id: str) -> None:
        """Evicts DataFrame from cache upon deletion."""
        if dataset_id in _dataframe_cache:
            del _dataframe_cache[dataset_id]

    @classmethod
    def get_overview(cls, dataset_id: str, profile: DatasetProfile) -> AnalyticsOverviewResponse:
        """Generates deterministic analytics overview."""
        df = cls.get_dataframe(dataset_id, profile)
        
        # Build factual summary bullet points
        summary_facts = [
            f"Dataset contains {len(df):,} total rows and {len(df.columns)} columns.",
            f"DataLens Quality Score is {profile.dataQualityScore}/100 with {profile.missingDataPercentage:.1f}% missing cells.",
        ]

        if profile.numericColumns:
            summary_facts.append(f"{len(profile.numericColumns)} numeric features available for statistical and correlation analysis.")
        if profile.datetimeColumns:
            summary_facts.append(f"{len(profile.datetimeColumns)} datetime feature(s) detected ({', '.join(profile.datetimeColumns[:2])}) available for trend analysis.")
        if profile.potentialTargets:
            summary_facts.append(f"{len(profile.potentialTargets)} potential outcome/target variable(s) identified.")

        top_missing = [
            {
                "column": col.name,
                "nullCount": col.nullCount,
                "nullPercentage": col.nullPercentage,
                "logicalType": col.logicalType,
            }
            for col in sorted(profile.columns, key=lambda c: c.nullPercentage, reverse=True)
            if col.nullCount > 0
        ][:5]

        # Rating
        if profile.dataQualityScore >= 85:
            rating = "High"
        elif profile.dataQualityScore >= 70:
            rating = "Good"
        elif profile.dataQualityScore >= 50:
            rating = "Fair"
        else:
            rating = "Poor"

        return AnalyticsOverviewResponse(
            datasetId=dataset_id,
            fileName=profile.fileName,
            rowCount=profile.rowCount,
            columnCount=profile.columnCount,
            numericColumnCount=len(profile.numericColumns),
            categoricalColumnCount=len(profile.categoricalColumns),
            datetimeColumnCount=len(profile.datetimeColumns),
            booleanColumnCount=len(profile.booleanColumns),
            missingCellCount=profile.missingValueCount,
            missingDataPercentage=profile.missingDataPercentage,
            duplicateRowCount=profile.duplicateRowCount,
            duplicateRowPercentage=profile.duplicateRowPercentage,
            dataQualityScore=profile.dataQualityScore,
            dataQualityRating=rating,
            numericColumns=profile.numericColumns,
            categoricalColumns=profile.categoricalColumns,
            datetimeColumns=profile.datetimeColumns,
            booleanColumns=profile.booleanColumns,
            textColumns=profile.textColumns,
            topMissingColumns=top_missing,
            potentialTargets=profile.potentialTargets,
            summaryFacts=summary_facts,
        )

    @classmethod
    def get_column_statistics(
        cls, dataset_id: str, column: str, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)

        # Lookup logical type if profile provided
        logical_type = None
        if profile:
            for col_prof in profile.columns:
                if col_prof.name == column:
                    logical_type = col_prof.logicalType
                    break

        result = compute_column_statistics(df, column, logical_type)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="statistics",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=len(df),
                columnsAnalyzed=1,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_group_by(
        cls, dataset_id: str, req: GroupByRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = execute_group_by(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        cols_count = (1 if isinstance(req.by, str) else len(req.by)) + len(req.aggregations)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="group_by",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=len(df),
                columnsAnalyzed=cols_count,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_correlation(
        cls, dataset_id: str, req: CorrelationRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = compute_correlation(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="correlation",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=result.sampleSize,
                columnsAnalyzed=len(result.columns),
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_outliers(
        cls, dataset_id: str, req: OutlierRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = detect_outliers(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="outliers",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=result.validObservations,
                columnsAnalyzed=1,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_trends(
        cls, dataset_id: str, req: TrendRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = compute_trends(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="trends",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=len(df),
                columnsAnalyzed=2,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_distribution(
        cls, dataset_id: str, req: DistributionRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = compute_distribution(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="distribution",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=result.count,
                columnsAnalyzed=1,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_data_quality(
        cls, dataset_id: str, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = compute_data_quality_breakdown(df)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="data_quality",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=len(df),
                columnsAnalyzed=len(df.columns),
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def run_chart(
        cls, dataset_id: str, req: ChartRequest, profile: Optional[DatasetProfile] = None
    ) -> AnalyticsEnvelope:
        start_time = time.perf_counter()
        df = cls.get_dataframe(dataset_id, profile)
        result = generate_chart_data(df, req)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AnalyticsEnvelope(
            datasetId=dataset_id,
            analysisType="chart",
            result=result,
            metadata=AnalysisMetadata(
                rowsAnalyzed=len(df),
                columnsAnalyzed=2 if req.yColumn else 1,
                generatedAt=datetime.now(timezone.utc).isoformat(),
                executionTimeMs=elapsed_ms,
            ),
        )

    @classmethod
    def execute_query(
        cls, dataset_id: str, req: QueryRequest, profile: Optional[DatasetProfile] = None
    ) -> QueryResponse:
        """
        Executes a safe, deterministic filtered query on the dataset without eval() or raw code execution.
        """
        df = cls.get_dataframe(dataset_id, profile)
        filtered_df = df.copy()

        # Apply filters safely
        if req.filters:
            for flt in req.filters:
                col = flt.column
                if col not in filtered_df.columns:
                    raise AppError(
                        code="INVALID_COLUMN",
                        message=f"Filter column '{col}' does not exist.",
                        status_code=400,
                    )

                op = flt.operator
                val = flt.value

                if op == "equals":
                    filtered_df = filtered_df[filtered_df[col] == val]
                elif op == "not_equals":
                    filtered_df = filtered_df[filtered_df[col] != val]
                elif op == "greater_than":
                    filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors="coerce") > float(val)]
                elif op == "greater_than_or_equal":
                    filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors="coerce") >= float(val)]
                elif op == "less_than":
                    filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors="coerce") < float(val)]
                elif op == "less_than_or_equal":
                    filtered_df = filtered_df[pd.to_numeric(filtered_df[col], errors="coerce") <= float(val)]
                elif op == "contains":
                    filtered_df = filtered_df[filtered_df[col].astype(str).str.contains(str(val), case=False, na=False)]
                elif op == "is_null":
                    filtered_df = filtered_df[filtered_df[col].isna()]
                elif op == "is_not_null":
                    filtered_df = filtered_df[filtered_df[col].notna()]
                elif op == "in":
                    if not isinstance(val, (list, tuple, set)):
                        val = [val]
                    filtered_df = filtered_df[filtered_df[col].isin(val)]

        # Sorting
        if req.sortBy and req.sortBy in filtered_df.columns:
            filtered_df = filtered_df.sort_values(by=req.sortBy, ascending=req.ascending)

        total_matching = len(filtered_df)

        # Pagination
        paged_df = filtered_df.iloc[req.offset : req.offset + req.limit]

        # Column projection
        target_cols = [c for c in req.columns if c in paged_df.columns] if req.columns else list(paged_df.columns)
        paged_df = paged_df[target_cols]

        records: List[Dict[str, Any]] = []
        for _, row in paged_df.iterrows():
            rec = {}
            for col in target_cols:
                v = row[col]
                if pd.isna(v):
                    rec[col] = None
                elif isinstance(v, (int, np.integer)):
                    rec[col] = int(v)
                elif isinstance(v, (float, np.floating)):
                    rec[col] = safe_float(v)
                elif isinstance(v, (bool, np.bool_)):
                    rec[col] = bool(v)
                else:
                    rec[col] = str(v)
            records.append(rec)

        return QueryResponse(
            rows=records,
            totalMatchingRows=total_matching,
            offset=req.offset,
            limit=req.limit,
            columns=target_cols,
        )
