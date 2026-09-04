import numpy as np
import pandas as pd
import pytest

from backend.app.services.analytics.statistics import (
    compute_boolean_stats,
    compute_categorical_stats,
    compute_column_statistics,
    compute_datetime_stats,
    compute_numeric_stats,
)
from backend.app.utils.errors import AppError


def test_numeric_statistics_calculation(dataset_a_numeric_df):
    stats = compute_numeric_stats(dataset_a_numeric_df["price"])
    assert stats.count == 8
    assert stats.missingCount == 0
    assert stats.missingPercentage == 0.0
    assert stats.min == 10000.0
    assert stats.max == 30000.0
    assert stats.mean == 18250.0
    assert stats.median == 16500.0
    assert stats.percentiles["p50"] == 16500.0
    assert stats.iqr is not None
    assert stats.std is not None


def test_numeric_statistics_with_nan():
    s = pd.Series([10.0, np.nan, 20.0, np.nan, 30.0])
    stats = compute_numeric_stats(s)
    assert stats.count == 5
    assert stats.missingCount == 2
    assert stats.missingPercentage == 40.0
    assert stats.min == 10.0
    assert stats.max == 30.0
    assert stats.mean == 20.0
    assert stats.median == 20.0


def test_categorical_statistics(dataset_b_mixed_df):
    stats = compute_categorical_stats(dataset_b_mixed_df["brand"])
    assert stats.count == 8
    assert stats.uniqueCount == 4  # Toyota, Honda, Ford, BMW
    assert stats.mostFrequentValue == "Toyota"
    assert stats.mostFrequentCount == 3
    assert len(stats.topCategories) <= 10


def test_boolean_statistics(dataset_b_mixed_df):
    stats = compute_boolean_stats(dataset_b_mixed_df["is_new"])
    assert stats.count == 8
    assert stats.trueCount == 1
    assert stats.falseCount == 7
    assert stats.truePercentage == 12.5


def test_datetime_statistics(dataset_e_timeseries_df):
    stats = compute_datetime_stats(dataset_e_timeseries_df["sale_date"])
    assert stats.count == 12
    assert stats.uniqueDates == 12
    assert stats.minDate is not None
    assert stats.maxDate is not None
    assert stats.dateRangeDays is not None


def test_compute_column_statistics_dispatch(dataset_b_mixed_df):
    res_num = compute_column_statistics(dataset_b_mixed_df, "price", "numeric")
    assert res_num.numeric is not None
    assert res_num.numeric.mean is not None

    res_cat = compute_column_statistics(dataset_b_mixed_df, "brand", "categorical")
    assert res_cat.categorical is not None
    assert res_cat.categorical.mostFrequentValue == "Toyota"

    with pytest.raises(AppError):
        compute_column_statistics(dataset_b_mixed_df, "nonexistent_column")
