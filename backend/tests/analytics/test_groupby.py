import pytest
from backend.app.schemas.analytics import GroupByAggregation, GroupByRequest
from backend.app.services.analytics.groupby import execute_group_by
from backend.app.utils.errors import AppError


def test_group_by_single_column(dataset_b_mixed_df):
    req = GroupByRequest(
        by="brand",
        aggregations=[
            GroupByAggregation(column="price", function="mean", alias="avg_price"),
            GroupByAggregation(column="price", function="count", alias="count"),
        ],
        sortBy="avg_price",
        ascending=False,
    )

    res = execute_group_by(dataset_b_mixed_df, req)
    assert res.totalGroups == 4
    assert len(res.groups) == 4
    # BMW has highest average price (32000)
    assert res.groups[0]["brand"] == "BMW"
    assert res.groups[0]["avg_price"] == 32000.0


def test_group_by_multi_column(dataset_b_mixed_df):
    req = GroupByRequest(
        by=["brand", "transmission"],
        aggregations=[
            GroupByAggregation(column="price", function="sum", alias="total_price"),
        ],
        sortBy="total_price",
        ascending=False,
    )

    res = execute_group_by(dataset_b_mixed_df, req)
    assert res.totalGroups > 0
    assert "brand" in res.groups[0]
    assert "transmission" in res.groups[0]
    assert "total_price" in res.groups[0]


def test_group_by_invalid_column(dataset_b_mixed_df):
    req = GroupByRequest(
        by="invalid_col",
        aggregations=[
            GroupByAggregation(column="price", function="mean"),
        ],
    )
    with pytest.raises(AppError):
        execute_group_by(dataset_b_mixed_df, req)
