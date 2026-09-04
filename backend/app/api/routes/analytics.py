from typing import Optional
from fastapi import APIRouter, Depends

from backend.app.auth.firebase_auth import AuthenticatedUser, get_current_user
from backend.app.schemas.analytics import (
    AnalyticsEnvelope,
    AnalyticsOverviewResponse,
    ChartRequest,
    CorrelationRequest,
    DistributionRequest,
    GroupByRequest,
    OutlierRequest,
    QueryRequest,
    QueryResponse,
    ToolRegistryResponse,
    TrendRequest,
)
from backend.app.services.analytics import AnalyticsEngine, get_analytical_tool_registry
from backend.app.services.firestore import get_user_dataset

router = APIRouter(tags=["analytics"])


@router.get("/analytics/registry", response_model=ToolRegistryResponse)
async def get_tool_registry() -> ToolRegistryResponse:
    """
    Returns the deterministic analytical tool registry with formal parameter schemas.
    """
    return get_analytical_tool_registry()


@router.get("/datasets/{dataset_id}/analytics/overview", response_model=AnalyticsOverviewResponse)
async def get_dataset_overview(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsOverviewResponse:
    """
    Retrieves deterministic dataset overview and dimension summary.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.get_overview(dataset_id, profile)


@router.get("/datasets/{dataset_id}/analytics/statistics/{column}", response_model=AnalyticsEnvelope)
async def get_column_statistics_endpoint(
    dataset_id: str,
    column: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Computes univariate descriptive statistics (numeric, categorical, boolean, datetime) for a column.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.get_column_statistics(dataset_id, column, profile)


@router.post("/datasets/{dataset_id}/analytics/group-by", response_model=AnalyticsEnvelope)
async def run_group_by_endpoint(
    dataset_id: str,
    req: GroupByRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Performs deterministic multi-column aggregation.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_group_by(dataset_id, req, profile)


@router.post("/datasets/{dataset_id}/analytics/correlation", response_model=AnalyticsEnvelope)
async def run_correlation_endpoint(
    dataset_id: str,
    req: CorrelationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Computes Pearson, Spearman, or Kendall correlation matrix across numeric columns.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_correlation(dataset_id, req, profile)


@router.post("/datasets/{dataset_id}/analytics/outliers", response_model=AnalyticsEnvelope)
async def run_outliers_endpoint(
    dataset_id: str,
    req: OutlierRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Detects statistical outliers using IQR or Z-score thresholds with bounded row samples.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_outliers(dataset_id, req, profile)


@router.post("/datasets/{dataset_id}/analytics/trends", response_model=AnalyticsEnvelope)
async def run_trends_endpoint(
    dataset_id: str,
    req: TrendRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Computes time-series trend analysis with resampled aggregation and deterministic direction.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_trends(dataset_id, req, profile)


@router.post("/datasets/{dataset_id}/analytics/distribution", response_model=AnalyticsEnvelope)
async def run_distribution_endpoint(
    dataset_id: str,
    req: DistributionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Computes histogram bins, skewness, kurtosis, and percentiles for a numeric column.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_distribution(dataset_id, req, profile)


@router.get("/datasets/{dataset_id}/analytics/data-quality", response_model=AnalyticsEnvelope)
async def run_data_quality_endpoint(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Returns transparent penalty and factor breakdown of the DataLens Data Quality Score.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_data_quality(dataset_id, profile)


@router.post("/datasets/{dataset_id}/analytics/chart", response_model=AnalyticsEnvelope)
async def run_chart_endpoint(
    dataset_id: str,
    req: ChartRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AnalyticsEnvelope:
    """
    Generates structured chart-ready coordinates for Bar, Line, Scatter, or Histogram visualizations.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.run_chart(dataset_id, req, profile)


@router.post("/datasets/{dataset_id}/analytics/query", response_model=QueryResponse)
async def run_query_endpoint(
    dataset_id: str,
    req: QueryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> QueryResponse:
    """
    Executes a structured, deterministic filtered query without eval() or arbitrary code execution.
    Enforces UID ownership authorization.
    """
    profile = await get_user_dataset(dataset_id, current_user.uid)
    return AnalyticsEngine.execute_query(dataset_id, req, profile)
