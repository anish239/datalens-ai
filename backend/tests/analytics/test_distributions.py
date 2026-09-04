import pytest
from backend.app.schemas.analytics import DistributionRequest
from backend.app.services.analytics.distributions import compute_distribution
from backend.app.utils.errors import AppError


def test_distribution_bins_and_percentiles(dataset_a_numeric_df):
    req = DistributionRequest(column="price", bins=5)
    res = compute_distribution(dataset_a_numeric_df, req)

    assert res.column == "price"
    assert res.count == 8
    assert len(res.bins) == 5
    assert sum(b.count for b in res.bins) == 8
    assert res.mean == 18250.0
    assert res.median == 16500.0
    assert res.skewness is not None
    assert "p50" in res.percentiles


def test_distribution_invalid_column(dataset_a_numeric_df):
    req = DistributionRequest(column="nonexistent_col")
    with pytest.raises(AppError):
        compute_distribution(dataset_a_numeric_df, req)
