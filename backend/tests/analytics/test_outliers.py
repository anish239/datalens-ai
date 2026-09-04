import pytest
from backend.app.schemas.analytics import OutlierRequest
from backend.app.services.analytics.outliers import detect_outliers
from backend.app.utils.errors import AppError


def test_outlier_detection_iqr(dataset_d_outliers_df):
    req = OutlierRequest(column="price", method="iqr", threshold=1.5)
    res = detect_outliers(dataset_d_outliers_df, req)

    assert res.column == "price"
    assert res.method == "iqr"
    assert res.outlierCount >= 1  # 95000 is an extreme outlier
    assert len(res.sampleOutliers) >= 1
    assert res.lowerBound is not None
    assert res.upperBound is not None


def test_outlier_detection_zscore(dataset_d_outliers_df):
    req = OutlierRequest(column="price", method="zscore", threshold=3.0)
    res = detect_outliers(dataset_d_outliers_df, req)

    assert res.method == "zscore"
    assert res.outlierCount >= 1
    assert res.validObservations == 20


def test_outlier_invalid_column(dataset_d_outliers_df):
    req = OutlierRequest(column="nonexistent")
    with pytest.raises(AppError):
        detect_outliers(dataset_d_outliers_df, req)
