from typing import List
from backend.app.schemas.analytics import AnalyticalToolDefinition, ToolParameterSchema, ToolRegistryResponse


def get_analytical_tool_registry() -> ToolRegistryResponse:
    """
    Returns the comprehensive registry of deterministic analytical tools available in DataLens AI.
    Provides structured parameter specifications and descriptions for API consumers and future AI agent tool-calling.
    """
    tools: List[AnalyticalToolDefinition] = [
        AnalyticalToolDefinition(
            toolName="get_dataset_overview",
            description="Returns high-level deterministic metadata, dimensions, column types, missingness, and data quality metrics for a dataset.",
            category="metadata",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/overview",
            httpMethod="GET",
            parameters=[],
            supportedDataTypes=["all"],
            exampleUsage={"dataset_id": "ds_abc123"},
        ),
        AnalyticalToolDefinition(
            toolName="get_column_statistics",
            description="Calculates comprehensive univariate descriptive statistics for a specified column based on its logical data type.",
            category="descriptive_statistics",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/statistics/{column}",
            httpMethod="GET",
            parameters=[
                ToolParameterSchema(
                    name="column",
                    type="string",
                    required=True,
                    description="The column name to calculate statistics for.",
                )
            ],
            supportedDataTypes=["numeric", "categorical", "text", "boolean", "datetime"],
            exampleUsage={"column": "price"},
        ),
        AnalyticalToolDefinition(
            toolName="execute_group_by",
            description="Performs multi-column aggregation, computing count, sum, mean, median, min, max, std, or nunique across categorical groupings.",
            category="aggregation",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/group-by",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="by",
                    type="array[string] | string",
                    required=True,
                    description="Grouping column(s).",
                ),
                ToolParameterSchema(
                    name="aggregations",
                    type="array[object]",
                    required=True,
                    description="List of column aggregation specs with function and optional alias.",
                ),
                ToolParameterSchema(
                    name="sortBy",
                    type="string",
                    required=False,
                    description="Column alias to sort results by.",
                ),
                ToolParameterSchema(
                    name="ascending",
                    type="boolean",
                    required=False,
                    defaultValue=False,
                    description="Sort order direction.",
                ),
                ToolParameterSchema(
                    name="limit",
                    type="integer",
                    required=False,
                    defaultValue=100,
                    description="Maximum number of group rows returned.",
                ),
            ],
            supportedDataTypes=["categorical", "numeric", "boolean"],
            exampleUsage={
                "by": "brand",
                "aggregations": [{"column": "price", "function": "mean", "alias": "avg_price"}],
                "sortBy": "avg_price",
                "ascending": False,
                "limit": 10,
            },
        ),
        AnalyticalToolDefinition(
            toolName="calculate_correlation",
            description="Computes bivariate correlation matrix (Pearson, Spearman, Kendall) across numeric features and identifies top positive/negative pairs.",
            category="correlation",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/correlation",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="columns",
                    type="array[string]",
                    required=False,
                    description="Subset of numeric column names to analyze. Defaults to all numeric columns.",
                ),
                ToolParameterSchema(
                    name="method",
                    type="string",
                    required=False,
                    allowedValues=["pearson", "spearman", "kendall"],
                    defaultValue="pearson",
                    description="Correlation calculation method.",
                ),
            ],
            supportedDataTypes=["numeric"],
            exampleUsage={"method": "pearson", "columns": ["engine_size", "horsepower", "price"]},
        ),
        AnalyticalToolDefinition(
            toolName="detect_outliers",
            description="Identifies anomalous data points using IQR (interquartile range) or Z-score thresholds on a numeric column.",
            category="anomaly_detection",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/outliers",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="column",
                    type="string",
                    required=True,
                    description="Numeric column name to inspect for outliers.",
                ),
                ToolParameterSchema(
                    name="method",
                    type="string",
                    required=False,
                    allowedValues=["iqr", "zscore"],
                    defaultValue="iqr",
                    description="Outlier detection methodology.",
                ),
                ToolParameterSchema(
                    name="threshold",
                    type="number",
                    required=False,
                    defaultValue=1.5,
                    description="IQR multiplier (e.g. 1.5) or Z-score sigma threshold (e.g. 3.0).",
                ),
            ],
            supportedDataTypes=["numeric"],
            exampleUsage={"column": "price", "method": "iqr", "threshold": 1.5},
        ),
        AnalyticalToolDefinition(
            toolName="compute_trends",
            description="Analyzes time-series trajectory and aggregated changes across daily, weekly, monthly, quarterly, or yearly frequencies.",
            category="time_series",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/trends",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="dateColumn",
                    type="string",
                    required=True,
                    description="Column containing timestamp or date representations.",
                ),
                ToolParameterSchema(
                    name="valueColumn",
                    type="string",
                    required=True,
                    description="Numeric column to aggregate over time.",
                ),
                ToolParameterSchema(
                    name="aggregation",
                    type="string",
                    required=False,
                    allowedValues=["sum", "mean", "median", "count"],
                    defaultValue="sum",
                    description="Aggregation function per time bucket.",
                ),
                ToolParameterSchema(
                    name="frequency",
                    type="string",
                    required=False,
                    allowedValues=["day", "week", "month", "quarter", "year"],
                    defaultValue="month",
                    description="Time aggregation frequency.",
                ),
            ],
            supportedDataTypes=["datetime", "numeric"],
            exampleUsage={
                "dateColumn": "sale_date",
                "valueColumn": "revenue",
                "aggregation": "sum",
                "frequency": "month",
            },
        ),
        AnalyticalToolDefinition(
            toolName="compute_distribution",
            description="Calculates histogram bins, percentiles, skewness, and kurtosis distribution metrics for a numeric variable.",
            category="distribution",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/distribution",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="column",
                    type="string",
                    required=True,
                    description="Numeric column to compute distribution for.",
                ),
                ToolParameterSchema(
                    name="bins",
                    type="integer",
                    required=False,
                    defaultValue=20,
                    description="Number of equal-width histogram bins.",
                ),
            ],
            supportedDataTypes=["numeric"],
            exampleUsage={"column": "price", "bins": 20},
        ),
        AnalyticalToolDefinition(
            toolName="generate_chart_data",
            description="Formats dataset records into clean serialized coordinate objects for Bar, Line, Scatter, or Histogram visualizations.",
            category="visualization",
            httpEndpoint="/api/datasets/{dataset_id}/analytics/chart",
            httpMethod="POST",
            parameters=[
                ToolParameterSchema(
                    name="chartType",
                    type="string",
                    required=True,
                    allowedValues=["bar", "line", "scatter", "histogram"],
                    description="Visual chart representation type.",
                ),
                ToolParameterSchema(
                    name="xColumn",
                    type="string",
                    required=True,
                    description="Column mapped to X-axis coordinate.",
                ),
                ToolParameterSchema(
                    name="yColumn",
                    type="string",
                    required=False,
                    description="Column mapped to Y-axis coordinate (if applicable).",
                ),
                ToolParameterSchema(
                    name="aggregation",
                    type="string",
                    required=False,
                    allowedValues=["sum", "mean", "median", "count"],
                    description="Aggregation function for grouped bars/lines.",
                ),
            ],
            supportedDataTypes=["all"],
            exampleUsage={"chartType": "bar", "xColumn": "brand", "yColumn": "price", "aggregation": "mean"},
        ),
    ]

    return ToolRegistryResponse(
        engineVersion="1.0.0",
        totalTools=len(tools),
        tools=tools,
    )
