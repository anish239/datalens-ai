import pytest
from backend.app.schemas.analytics import CorrelationRequest
from backend.app.services.analytics.correlation import compute_correlation
from backend.app.utils.errors import AppError


def test_correlation_matrix_pearson(dataset_a_numeric_df):
    req = CorrelationRequest(method="pearson", minSampleSize=3)
    res = compute_correlation(dataset_a_numeric_df, req)

    assert res.method == "pearson"
    assert "price" in res.matrix
    assert "mileage" in res.matrix
    assert res.matrix["price"]["price"] == 1.0

    # Negative correlation expected between price and mileage
    price_mileage_corr = res.matrix["price"]["mileage"]
    assert price_mileage_corr is not None
    assert price_mileage_corr < 0.0

    # Positive correlation expected between engine_size and price
    price_engine_corr = res.matrix["price"]["engine_size"]
    assert price_engine_corr is not None
    assert price_engine_corr > 0.0

    assert len(res.strongestPositive) > 0 or len(res.strongestNegative) > 0


def test_correlation_insufficient_numeric_columns(dataset_c_missing_df):
    # Only price has numeric data, other columns non-numeric or empty
    req = CorrelationRequest(columns=["price"])
    with pytest.raises(AppError):
        compute_correlation(dataset_c_missing_df, req)
