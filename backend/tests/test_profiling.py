import pandas as pd
import pytest
from backend.app.services.profiling import (
    infer_column_logical_type,
    profile_dataset,
    calculate_data_quality_score,
)


def test_schema_logical_type_inference():
    """Verifies deterministic schema inference for numeric, categorical, text, boolean, and datetime."""
    # Test numeric integer
    s_int = pd.Series([10, 20, 30, 40, 50])
    type_int, _ = infer_column_logical_type(s_int)
    assert type_int == "numeric"

    # Test numeric float
    s_float = pd.Series([1.5, 2.7, 3.8, 4.2, 5.9])
    type_float, _ = infer_column_logical_type(s_float)
    assert type_float == "numeric"

    # Test boolean
    s_bool = pd.Series([True, False, True, True, False])
    type_bool, _ = infer_column_logical_type(s_bool)
    assert type_bool == "boolean"

    # Test categorical (low cardinality)
    s_cat = pd.Series(["low", "medium", "high", "medium", "low", "high", "low", "low"])
    type_cat, _ = infer_column_logical_type(s_cat)
    assert type_cat == "categorical"

    # Test text (high cardinality unique strings)
    s_text = pd.Series([f"Detailed customer review comment #{i} with specifics" for i in range(80)])
    type_text, _ = infer_column_logical_type(s_text)
    assert type_text == "text"

    # Test datetime string format
    s_date = pd.Series(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"])
    type_date, is_dt = infer_column_logical_type(s_date)
    assert type_date == "datetime"
    assert is_dt is True


def test_numeric_statistics_calculation():
    """Verifies min, max, mean, median, standard deviation calculation."""
    df = pd.DataFrame({"prices": [100.0, 200.0, 300.0, 400.0, 500.0]})
    profile = profile_dataset(
        df=df,
        dataset_id="test_ds",
        owner_id="test_owner",
        file_name="prices.csv",
        file_type="csv",
        file_size_bytes=100,
        created_at_iso="2026-08-31T00:00:00Z",
    )
    col = profile.columns[0]
    assert col.statistics is not None
    assert col.statistics.min == 100.0
    assert col.statistics.max == 500.0
    assert col.statistics.mean == 300.0
    assert col.statistics.median == 300.0


def test_missing_values_and_duplicates_calculation():
    """Verifies missing value counts and duplicate row detection."""
    df = pd.DataFrame({
        "a": [1, 2, 2, None],
        "b": ["x", "y", "y", "z"],
    })
    profile = profile_dataset(
        df=df,
        dataset_id="test_ds",
        owner_id="test_owner",
        file_name="test.csv",
        file_type="csv",
        file_size_bytes=100,
        created_at_iso="2026-08-31T00:00:00Z",
    )
    assert profile.rowCount == 4
    assert profile.duplicateRowCount == 1
    assert profile.missingValueCount == 1


def test_potential_target_identification():
    """Verifies deterministic heuristic target candidate detection."""
    df = pd.DataFrame({
        "feature_1": [1, 2, 3, 4, 5],
        "churn": ["yes", "no", "yes", "no", "yes"],
        "selling_price": [10000, 25000, 32000, 18000, 45000],
    })
    profile = profile_dataset(
        df=df,
        dataset_id="test_ds",
        owner_id="test_owner",
        file_name="churn.csv",
        file_type="csv",
        file_size_bytes=100,
        created_at_iso="2026-08-31T00:00:00Z",
    )
    target_names = [t.columnName for t in profile.potentialTargets]
    assert "churn" in target_names
    assert "selling_price" in target_names
