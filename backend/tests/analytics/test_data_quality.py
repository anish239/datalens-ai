from backend.app.services.analytics.data_quality import compute_data_quality_breakdown


def test_clean_data_quality(dataset_a_numeric_df):
    res = compute_data_quality_breakdown(dataset_a_numeric_df)
    assert res.score == 100
    assert res.rating == "High"
    assert res.totalMissingCells == 0
    assert res.duplicateRows == 0
    assert len(res.factors) == 0


def test_degraded_data_quality(dataset_c_missing_df):
    res = compute_data_quality_breakdown(dataset_c_missing_df)
    assert res.score < 100
    assert res.totalMissingCells > 0
    assert res.duplicateRows > 0
    assert res.emptyColumnsCount >= 1  # 'empty_col' is 100% null
    assert len(res.factors) > 0
