from typing import Any, Dict, List, Literal, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class AnalysisMetadata(BaseModel):
    rowsAnalyzed: int
    columnsAnalyzed: int
    generatedAt: str
    executionTimeMs: float


class NumericStatsResponse(BaseModel):
    count: int
    missingCount: int
    missingPercentage: float
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    range: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    percentiles: Dict[str, Optional[float]] = Field(default_factory=dict)


class TopCategoryItem(BaseModel):
    value: str
    count: int
    percentage: float


class CategoricalStatsResponse(BaseModel):
    count: int
    missingCount: int
    missingPercentage: float
    uniqueCount: int
    uniquePercentage: float
    mostFrequentValue: Optional[str] = None
    mostFrequentCount: Optional[int] = None
    mostFrequentPercentage: Optional[float] = None
    topCategories: List[TopCategoryItem] = Field(default_factory=list)


class BooleanStatsResponse(BaseModel):
    count: int
    trueCount: int
    falseCount: int
    missingCount: int
    truePercentage: float
    falsePercentage: float


class DateTimeStatsResponse(BaseModel):
    count: int
    minDate: Optional[str] = None
    maxDate: Optional[str] = None
    dateRangeDays: Optional[int] = None
    uniqueDates: int
    missingCount: int
    missingPercentage: float
    inferredFrequency: Optional[str] = None


class ColumnStatisticsResponse(BaseModel):
    column: str
    logicalType: str  # 'numeric', 'categorical', 'text', 'boolean', 'datetime', 'unknown'
    sampleValues: List[Any] = Field(default_factory=list)
    numeric: Optional[NumericStatsResponse] = None
    categorical: Optional[CategoricalStatsResponse] = None
    boolean: Optional[BooleanStatsResponse] = None
    datetime: Optional[DateTimeStatsResponse] = None


class GroupByAggregation(BaseModel):
    column: str
    function: Literal["count", "sum", "mean", "median", "min", "max", "std", "nunique"]
    alias: Optional[str] = None


class GroupByRequest(BaseModel):
    by: Union[str, List[str]]
    aggregations: List[GroupByAggregation]
    sortBy: Optional[str] = None
    ascending: bool = False
    limit: int = Field(default=100, ge=1, le=1000)


class GroupByResponse(BaseModel):
    by: List[str]
    aggregations: List[GroupByAggregation]
    groups: List[Dict[str, Any]]
    totalGroups: int
    truncated: bool


class CorrelationRequest(BaseModel):
    columns: Optional[List[str]] = None
    method: Literal["pearson", "spearman", "kendall"] = "pearson"
    minSampleSize: int = Field(default=5, ge=3)


class CorrelationPair(BaseModel):
    columnA: str
    columnB: str
    correlation: float
    method: str
    sampleSize: int
    relationship: str  # 'strong_positive', 'moderate_positive', 'weak', 'moderate_negative', 'strong_negative'


class CorrelationMatrixResponse(BaseModel):
    method: str
    columns: List[str]
    matrix: Dict[str, Dict[str, Optional[float]]]
    strongestPositive: List[CorrelationPair]
    strongestNegative: List[CorrelationPair]
    sampleSize: int


class OutlierRequest(BaseModel):
    column: str
    method: Literal["iqr", "zscore"] = "iqr"
    threshold: float = Field(default=1.5, gt=0)
    sampleLimit: int = Field(default=50, ge=1, le=200)


class OutlierResponse(BaseModel):
    column: str
    method: str
    threshold: float
    totalObservations: int
    validObservations: int
    outlierCount: int
    outlierPercentage: float
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None
    sampleOutliers: List[Dict[str, Any]] = Field(default_factory=list)


class TrendRequest(BaseModel):
    dateColumn: str
    valueColumn: str
    aggregation: Literal["sum", "mean", "median", "count"] = "sum"
    frequency: Literal["day", "week", "month", "quarter", "year"] = "month"


class TrendPoint(BaseModel):
    period: str
    value: Optional[float]
    count: int


class TrendResponse(BaseModel):
    dateColumn: str
    valueColumn: str
    aggregation: str
    frequency: str
    points: List[TrendPoint]
    firstValue: Optional[float] = None
    lastValue: Optional[float] = None
    absoluteChange: Optional[float] = None
    percentageChange: Optional[float] = None
    minValue: Optional[float] = None
    maxValue: Optional[float] = None
    trendDirection: Literal["increasing", "decreasing", "stable", "volatile", "insufficient_data"]
    overallSummary: str


class DistributionRequest(BaseModel):
    column: str
    bins: int = Field(default=20, ge=5, le=100)


class HistogramBin(BaseModel):
    binIndex: int
    binStart: float
    binEnd: float
    count: int
    percentage: float


class DistributionResponse(BaseModel):
    column: str
    count: int
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    percentiles: Dict[str, Optional[float]] = Field(default_factory=dict)
    bins: List[HistogramBin] = Field(default_factory=list)


class DataQualityFactor(BaseModel):
    name: str
    penalty: int
    impact: str
    description: str


class DataQualityResponse(BaseModel):
    score: int
    rating: Literal["High", "Good", "Fair", "Poor"]
    factors: List[DataQualityFactor]
    totalMissingCells: int
    missingPercentage: float
    duplicateRows: int
    duplicatePercentage: float
    emptyColumnsCount: int
    zeroVarianceColumnsCount: int
    summary: str


class ChartRequest(BaseModel):
    chartType: Literal["bar", "line", "scatter", "histogram"]
    xColumn: str
    yColumn: Optional[str] = None
    aggregation: Optional[Literal["sum", "mean", "median", "count"]] = None
    groupByColumn: Optional[str] = None
    bins: Optional[int] = Field(default=20, ge=5, le=100)
    limit: Optional[int] = Field(default=50, ge=1, le=500)


class ChartResponse(BaseModel):
    chartType: str
    x: str
    y: Optional[str] = None
    title: str
    data: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FilterCondition(BaseModel):
    column: str
    operator: Literal[
        "equals",
        "not_equals",
        "greater_than",
        "greater_than_or_equal",
        "less_than",
        "less_than_or_equal",
        "contains",
        "is_null",
        "is_not_null",
        "in",
    ]
    value: Optional[Any] = None


class QueryRequest(BaseModel):
    columns: Optional[List[str]] = None
    filters: Optional[List[FilterCondition]] = None
    sortBy: Optional[str] = None
    ascending: bool = True
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class QueryResponse(BaseModel):
    rows: List[Dict[str, Any]]
    totalMatchingRows: int
    offset: int
    limit: int
    columns: List[str]


class AnalyticsOverviewResponse(BaseModel):
    datasetId: str
    fileName: str
    rowCount: int
    columnCount: int
    numericColumnCount: int
    categoricalColumnCount: int
    datetimeColumnCount: int
    booleanColumnCount: int
    missingCellCount: int
    missingDataPercentage: float
    duplicateRowCount: int
    duplicateRowPercentage: float
    dataQualityScore: int
    dataQualityRating: str
    numericColumns: List[str]
    categoricalColumns: List[str]
    datetimeColumns: List[str]
    booleanColumns: List[str]
    textColumns: List[str]
    topMissingColumns: List[Dict[str, Any]]
    potentialTargets: List[Any]
    summaryFacts: List[str]


class ToolParameterSchema(BaseModel):
    name: str
    type: str
    required: bool
    description: str
    allowedValues: Optional[List[str]] = None
    defaultValue: Optional[Any] = None


class AnalyticalToolDefinition(BaseModel):
    toolName: str
    description: str
    category: str
    httpEndpoint: str
    httpMethod: str
    parameters: List[ToolParameterSchema]
    supportedDataTypes: List[str]
    exampleUsage: Dict[str, Any]


class ToolRegistryResponse(BaseModel):
    engineVersion: str = "1.0.0"
    totalTools: int
    tools: List[AnalyticalToolDefinition]


class AnalyticsEnvelope(BaseModel):
    success: bool = True
    datasetId: str
    analysisType: str
    result: Any
    metadata: AnalysisMetadata
