import pytest
from backend.app.schemas.analytics import FilterCondition, QueryRequest
from backend.app.services.analytics.engine import AnalyticsEngine


def test_engine_register_and_retrieve(dataset_a_numeric_df):
    dataset_id = "test_ds_engine_1"
    AnalyticsEngine.register_dataframe(dataset_id, dataset_a_numeric_df)

    retrieved = AnalyticsEngine.get_dataframe(dataset_id)
    assert len(retrieved) == 8

    AnalyticsEngine.evict_dataframe(dataset_id)
    with pytest.raises(Exception):
        AnalyticsEngine.get_dataframe(dataset_id)


def test_engine_filtered_query(dataset_b_mixed_df):
    dataset_id = "test_ds_engine_2"
    AnalyticsEngine.register_dataframe(dataset_id, dataset_b_mixed_df)

    req = QueryRequest(
        filters=[
            FilterCondition(column="brand", operator="equals", value="Toyota"),
            FilterCondition(column="price", operator="greater_than", value=13000),
        ],
        sortBy="price",
        ascending=False,
    )

    res = AnalyticsEngine.execute_query(dataset_id, req)
    assert res.totalMatchingRows == 2  # Toyota with price 16000 and 18000
    assert res.rows[0]["brand"] == "Toyota"
    assert res.rows[0]["price"] == 18000.0

    AnalyticsEngine.evict_dataframe(dataset_id)
