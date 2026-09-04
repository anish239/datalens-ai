import { FunctionDeclaration, Type } from '@google/genai';

export const ANALYTICAL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_dataset_profile',
    description:
      'Retrieves the full structural profile of the active dataset: row count, column list, logical data types, missing value percentages, candidate target columns, and overall data quality score.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'get_column_statistics',
    description:
      'Calculates deterministic descriptive statistics for a specific column. For numeric columns: mean, standard deviation, median, min, max, 25th/75th percentiles, skewness, kurtosis. For categorical columns: unique count, top categories with frequencies.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        column: {
          type: Type.STRING,
          description: 'The exact name of the column to calculate statistics for.',
        },
      },
      required: ['dataset_id', 'column'],
    },
  },
  {
    name: 'get_unique_values',
    description:
      'Retrieves distinct unique categories and their occurrence frequencies/percentages for a categorical column.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        column: {
          type: Type.STRING,
          description: 'The column name to extract distinct categories from.',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Maximum number of unique categories to return (default 20, max 50).',
        },
      },
      required: ['dataset_id', 'column'],
    },
  },
  {
    name: 'group_by',
    description:
      'Executes deterministic categorical grouping with aggregated statistical calculations (e.g. mean, sum, median, count, min, max, std) on target numeric columns.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        by: {
          type: Type.STRING,
          description: 'The categorical column name to group by.',
        },
        metric_column: {
          type: Type.STRING,
          description: 'The numeric column to aggregate.',
        },
        aggregation: {
          type: Type.STRING,
          description:
            'The aggregation mathematical function to apply: "mean", "sum", "median", "count", "min", "max", "std", or "nunique".',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Maximum number of ranked groups to return (default 20, max 100).',
        },
        sort_descending: {
          type: Type.BOOLEAN,
          description: 'Whether to sort groups in descending order of aggregated metric.',
        },
      },
      required: ['dataset_id', 'by', 'metric_column', 'aggregation'],
    },
  },
  {
    name: 'calculate_correlation',
    description:
      'Computes the Pearson, Spearman, or Kendall correlation matrix across all numeric features in the dataset, identifying the strongest positive and negative linear/monotonic relationships.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        method: {
          type: Type.STRING,
          description: 'Correlation method: "pearson", "spearman", or "kendall" (default "pearson").',
        },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'detect_outliers',
    description:
      'Detects numerical anomalies and extreme values in a specified numeric column using Tukey IQR (Interquartile Range) fences or standard Z-score deviations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        column: {
          type: Type.STRING,
          description: 'The numeric column to analyze for outliers.',
        },
        method: {
          type: Type.STRING,
          description: 'Outlier detection algorithm: "iqr" or "zscore" (default "iqr").',
        },
        threshold: {
          type: Type.NUMBER,
          description:
            'Threshold multiplier (default 1.5 for IQR, or 3.0 for Z-score). Must be positive.',
        },
      },
      required: ['dataset_id', 'column'],
    },
  },
  {
    name: 'detect_trends',
    description:
      'Analyzes chronological trends and directionality across a date/time column and a target numeric metric, resampling data over standard intervals (day, week, month, quarter, year).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        date_column: {
          type: Type.STRING,
          description: 'The datetime/chronological column name.',
        },
        value_column: {
          type: Type.STRING,
          description: 'The numeric column to aggregate across time.',
        },
        frequency: {
          type: Type.STRING,
          description: 'Resampling frequency: "day", "week", "month", "quarter", or "year".',
        },
        aggregation: {
          type: Type.STRING,
          description: 'Time aggregation method: "sum", "mean", "median", "min", "max", or "count".',
        },
      },
      required: ['dataset_id', 'date_column', 'value_column'],
    },
  },
  {
    name: 'analyze_distribution',
    description:
      'Computes statistical distribution histograms, skewness, kurtosis, and quantile intervals for a numeric column.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        column: {
          type: Type.STRING,
          description: 'The numeric column to analyze.',
        },
        bins: {
          type: Type.INTEGER,
          description: 'Number of histogram bins (default 15, range 5 to 50).',
        },
      },
      required: ['dataset_id', 'column'],
    },
  },
  {
    name: 'assess_data_quality',
    description:
      'Performs a comprehensive data-quality assessment: completeness, column completeness penalties, row duplication rate, and automated hygiene recommendations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'compare_groups',
    description:
      'Compares two specific categories of a grouping column against a numeric metric (e.g. comparing "SUV" vs "Sedan" on "price").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        group_column: {
          type: Type.STRING,
          description: 'The categorical column.',
        },
        category_a: {
          type: Type.STRING,
          description: 'The first category value.',
        },
        category_b: {
          type: Type.STRING,
          description: 'The second category value.',
        },
        metric_column: {
          type: Type.STRING,
          description: 'The numeric metric column to compare.',
        },
      },
      required: ['dataset_id', 'group_column', 'category_a', 'category_b', 'metric_column'],
    },
  },
  {
    name: 'get_sample_records',
    description:
      'Retrieves a small, sanitized sample of representative records (maximum 5 rows) to inspect actual row structure or context. Never dumps full datasets.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Number of sample rows (default 3, maximum 5).',
        },
        filter_column: {
          type: Type.STRING,
          description: 'Optional column name to filter sample rows by.',
        },
        filter_value: {
          type: Type.STRING,
          description: 'Optional column value to match.',
        },
      },
      required: ['dataset_id'],
    },
  },
  {
    name: 'create_chart_specification',
    description:
      'Creates a structured visualization specification grounded in verified deterministic dataset metrics.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        chart_type: {
          type: Type.STRING,
          description: 'Chart archetype: "bar", "line", "scatter", "histogram", or "heatmap".',
        },
        x_column: {
          type: Type.STRING,
          description: 'The primary dimension or X-axis column.',
        },
        y_column: {
          type: Type.STRING,
          description: 'The measure or Y-axis numeric column (optional for histograms/frequencies).',
        },
        title: {
          type: Type.STRING,
          description: 'A descriptive chart title.',
        },
        aggregation: {
          type: Type.STRING,
          description: 'Aggregation function for bar/line charts (e.g. "mean", "sum", "count").',
        },
      },
      required: ['dataset_id', 'chart_type', 'x_column', 'title'],
    },
  },
  {
    name: 'validate_ml_task',
    description:
      'Validates whether a candidate target column and set of feature columns are suitable for machine learning training (checks missingness, cardinality, zero variance, and target leakage).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        task: {
          type: Type.STRING,
          description: 'ML Task: "regression" or "classification".',
        },
        target_column: {
          type: Type.STRING,
          description: 'The target column to predict.',
        },
        feature_columns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of candidate predictor column names.',
        },
      },
      required: ['dataset_id', 'target_column', 'feature_columns'],
    },
  },
  {
    name: 'train_ml_model',
    description:
      'Trains and evaluates a deterministic machine learning model (Linear/Logistic Regression, Random Forest, or Gradient Boosting) using train/test split. Computes test set metrics (MAE, RMSE, R² or Accuracy, F1, Precision, Recall, Confusion Matrix) and feature importances.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        task: {
          type: Type.STRING,
          description: 'ML Task: "regression" or "classification".',
        },
        target_column: {
          type: Type.STRING,
          description: 'The column name to predict.',
        },
        feature_columns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of predictor column names.',
        },
        algorithm: {
          type: Type.STRING,
          description: 'Algorithm: "auto", "linear_regression", "random_forest_regressor", "gradient_boosting_regressor", "logistic_regression", "random_forest_classifier", "gradient_boosting_classifier".',
        },
      },
      required: ['dataset_id', 'target_column', 'feature_columns'],
    },
  },
  {
    name: 'predict_target_value',
    description:
      'Computes deterministic model predictions for a single feature dictionary using a trained model or dataset schema.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        target_column: {
          type: Type.STRING,
          description: 'The target column to predict.',
        },
        features: {
          type: Type.OBJECT,
          description: 'Key-value map of input features.',
        },
      },
      required: ['dataset_id', 'target_column', 'features'],
    },
  },
  {
    name: 'perform_what_if_scenario',
    description:
      'Executes deterministic what-if scenario sensitivity analysis: compares predicted target values between a baseline feature state and a modified scenario state, calculating absolute and percentage deltas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        dataset_id: {
          type: Type.STRING,
          description: 'The unique dataset identifier.',
        },
        target_column: {
          type: Type.STRING,
          description: 'The target column to predict.',
        },
        baseline_features: {
          type: Type.OBJECT,
          description: 'Key-value map of baseline feature values.',
        },
        scenario_features: {
          type: Type.OBJECT,
          description: 'Key-value map of modified scenario feature values.',
        },
      },
      required: ['dataset_id', 'target_column', 'baseline_features', 'scenario_features'],
    },
  },
];
