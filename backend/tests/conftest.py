import os
import pytest
import pandas as pd
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

# Set test environment
os.environ["ENV"] = "test"


@pytest.fixture
def auth_headers_user_a():
    return {"Authorization": "Bearer test_token_user_a_123"}


@pytest.fixture
def auth_headers_user_b():
    return {"Authorization": "Bearer test_token_user_b_456"}


@pytest.fixture
def sample_csv_content():
    return (
        "transaction_id,customer_id,selling_price,is_active,category,created_at\n"
        "101,CUST_1,150.50,true,Electronics,2024-01-15\n"
        "102,CUST_2,89.00,false,Apparel,2024-01-16\n"
        "103,CUST_3,1200.00,true,Electronics,2024-01-17\n"
        "104,CUST_4,45.25,true,Books,2024-01-18\n"
        "105,CUST_5,150.50,true,Electronics,2024-01-19\n"
        "106,CUST_6,,false,Apparel,2024-01-20\n"
        "107,CUST_7,320.00,true,Home,2024-01-21\n"
        "108,CUST_8,15.99,true,Books,2024-01-22\n"
    ).encode("utf-8")


@pytest.fixture
def empty_csv_content():
    return b""


@pytest.fixture
def malformed_csv_content():
    return b"col1,col2\n1,2,3,4,5\nonly_one"


@pytest.fixture
def dataset_a_numeric_df():
    """Dataset A — Pure Numeric: id, price, mileage, engine_size"""
    return pd.DataFrame({
        "id": [1, 2, 3, 4, 5, 6, 7, 8],
        "price": [10000, 15000, 12000, 22000, 18000, 25000, 30000, 14000],
        "mileage": [80000, 50000, 70000, 20000, 40000, 15000, 5000, 65000],
        "engine_size": [1.6, 2.0, 1.8, 2.5, 2.0, 3.0, 3.5, 1.8],
    })


@pytest.fixture
def dataset_b_mixed_df():
    """Dataset B — Mixed data types: brand, price, mileage, transmission, is_new, sale_date"""
    return pd.DataFrame({
        "brand": ["Toyota", "Honda", "Ford", "Toyota", "BMW", "Toyota", "Ford", "Honda"],
        "price": [12000, 14000, 9000, 16000, 32000, 18000, 11000, 15000],
        "mileage": [45000, 38000, 62000, 25000, 12000, 18000, 55000, 30000],
        "transmission": ["Automatic", "Manual", "Automatic", "Automatic", "Automatic", "Manual", "Manual", "Automatic"],
        "is_new": [False, False, False, False, True, False, False, False],
        "sale_date": [
            "2024-01-10", "2024-02-15", "2024-03-20", "2024-04-25",
            "2024-05-30", "2024-06-15", "2024-07-20", "2024-08-25"
        ],
    })


@pytest.fixture
def dataset_c_missing_df():
    """Dataset C — Missing values, duplicate rows, empty column"""
    return pd.DataFrame({
        "brand": ["Toyota", "Toyota", None, "Ford", "Toyota", "Honda"],
        "price": [10000, 10000, 15000, None, 10000, 20000],
        "mileage": [50000, 50000, None, 80000, 50000, 30000],
        "empty_col": [None, None, None, None, None, None],
    })


@pytest.fixture
def dataset_d_outliers_df():
    """Dataset D — Known numerical outliers (e.g. 999999 in price)"""
    return pd.DataFrame({
        "id": list(range(1, 21)),
        "price": [10000, 11000, 12000, 10500, 11500, 12500, 10200, 11800, 12200, 10800,
                  11200, 12100, 10600, 11900, 12300, 10400, 11600, 12400, 500, 95000],
    })


@pytest.fixture
def dataset_e_timeseries_df():
    """Dataset E — Deterministic monthly time-series"""
    dates = pd.date_range("2023-01-01", periods=12, freq="MS")
    return pd.DataFrame({
        "sale_date": dates.strftime("%Y-%m-%d"),
        "revenue": [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320],
        "units_sold": [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32],
    })
