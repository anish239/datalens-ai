import re
from typing import Dict, List, Tuple
import pandas as pd
from backend.app.config.settings import settings
from backend.app.utils.errors import AppError


def normalize_column_name(raw_name: str, index: int, seen_names: Dict[str, int]) -> Tuple[str, str]:
    """
    Cleans raw column name for display and creates a deterministic internal normalized identifier.
    Handles duplicate column names, whitespace, and empty strings.
    Returns (display_name, normalized_identifier).
    """
    # Clean display name
    if raw_name is None or pd.isna(raw_name) or str(raw_name).strip() == "":
        display_name = f"Unnamed_Column_{index + 1}"
    else:
        display_name = str(raw_name).strip()
        
    # Internal normalized key: lowercase, alphanumeric + underscore
    clean_id = re.sub(r"[^a-zA-Z0-9_]", "_", display_name).strip("_").lower()
    if not clean_id:
        clean_id = f"col_{index + 1}"
        
    # Disambiguate duplicate names
    if clean_id in seen_names:
        seen_names[clean_id] += 1
        normalized_id = f"{clean_id}_{seen_names[clean_id]}"
        display_name = f"{display_name} ({seen_names[clean_id]})"
    else:
        seen_names[clean_id] = 1
        normalized_id = clean_id
        
    return display_name, normalized_id


def load_dataset_from_file(file_path: str, file_type: str) -> pd.DataFrame:
    """
    Loads dataset into a Pandas DataFrame safely.
    Validates non-emptiness, maximum columns, and maximum rows.
    Normalizes column headers safely.
    """
    df: pd.DataFrame
    
    if file_type == "csv":
        # Attempt reading with UTF-8 first, fallback to latin-1 if needed
        try:
            df = pd.read_csv(
                file_path,
                encoding="utf-8",
                low_memory=False,
                on_bad_lines="error",
            )
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(
                    file_path,
                    encoding="latin-1",
                    low_memory=False,
                    on_bad_lines="error",
                )
            except Exception as e:
                raise AppError(
                    code="INVALID_CSV",
                    message="Failed to parse CSV file with standard UTF-8 or Latin-1 encodings.",
                    status_code=400,
                    details=str(e),
                )
        except pd.errors.EmptyDataError:
            raise AppError(
                code="EMPTY_DATASET",
                message="The uploaded CSV file is empty and contains no readable data.",
                status_code=400,
            )
        except pd.errors.ParserError as e:
            raise AppError(
                code="INVALID_CSV",
                message="Malformed CSV structure. Please check delimiter consistency and formatting.",
                status_code=400,
                details=str(e),
            )
        except Exception as e:
            raise AppError(
                code="INVALID_CSV",
                message="Failed to load and parse CSV file.",
                status_code=400,
                details=str(e),
            )
            
    elif file_type == "xlsx":
        try:
            df = pd.read_excel(file_path, engine="openpyxl")
        except Exception as e:
            raise AppError(
                code="INVALID_XLSX",
                message="Failed to parse Excel (.xlsx) spreadsheet. Please ensure the workbook is not password-protected or corrupted.",
                status_code=400,
                details=str(e),
            )
    else:
        raise AppError(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file type '{file_type}'.",
            status_code=400,
        )

    # Validate shape
    if df is None or df.empty or len(df.columns) == 0:
        raise AppError(
            code="EMPTY_DATASET",
            message="The parsed dataset contains 0 rows or 0 columns.",
            status_code=400,
        )
        
    if len(df.columns) > settings.MAX_COLS_LIMIT:
        raise AppError(
            code="DATASET_LIMIT_EXCEEDED",
            message=f"Dataset contains {len(df.columns)} columns, exceeding the maximum supported limit of {settings.MAX_COLS_LIMIT}.",
            status_code=400,
        )
        
    if len(df) > settings.MAX_ROWS_LIMIT:
        raise AppError(
            code="DATASET_LIMIT_EXCEEDED",
            message=f"Dataset contains {len(df)} rows, exceeding the maximum supported limit of {settings.MAX_ROWS_LIMIT}.",
            status_code=400,
        )

    # Normalize column names while preserving mapping
    seen_names: Dict[str, int] = {}
    renamed_columns: List[str] = []
    
    for idx, col in enumerate(df.columns):
        display_name, _ = normalize_column_name(col, idx, seen_names)
        renamed_columns.append(display_name)
        
    df.columns = pd.Index(renamed_columns)
    return df
