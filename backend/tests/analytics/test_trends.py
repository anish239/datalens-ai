import pytest
from backend.app.schemas.analytics import TrendRequest
from backend.app.services.analytics.trends import compute_trends
from backend.app.utils.errors import AppError


def test_time_series_trend_increasing(dataset_e_timeseries_df):
    req = TrendRequest(
        dateColumn="sale_date",
        valueColumn="revenue",
        aggregation="sum",
        frequency="month",
    )
    res = compute_trends(dataset_e_timeseries_df, req)

    assert res.dateColumn == "sale_date"
    assert res.valueColumn == "revenue"
    assert len(res.points) == 12
    assert res.firstValue == 100.0
    assert res.lastValue == 320.0
    assert res.absoluteChange == 220.0
    assert res.trendDirection == "increasing"


def test_trend_invalid_column(dataset_e_timeseries_df):
    req = TrendRequest(
        dateColumn="invalid_date",
        valueColumn="revenue",
    )
    with pytest.raises(AppError):
        compute_trends(dataset_e_timeseries_df, req)
