import os
import uuid
import re
from typing import Tuple
from fastapi import UploadFile
from backend.app.config.settings import settings
from backend.app.utils.errors import AppError

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_FILENAME_LENGTH = 120


def sanitize_original_filename(name: str) -> str:
    """Sanitizes user-provided filename for safe display and metadata."""
    if not name or not isinstance(name, str):
        return f"dataset_{uuid.uuid4().hex[:8]}.csv"
    
    # Strip any directory components
    clean = re.sub(r"^.*[/\\]", "", name)
    # Extract extension
    base, ext = os.path.splitext(clean)
    ext = ext.lower()
    
    # Clean base name
    base = re.sub(r"[^a-zA-Z0-9_\-\. ]", "_", base).strip()
    base = re.sub(r"\s+", " ", base)
    base = base[:MAX_FILENAME_LENGTH]
    
    if not base:
        base = f"dataset_{uuid.uuid4().hex[:8]}"
        
    return f"{base}{ext}"


def validate_file_extension(filename: str) -> str:
    """Validates extension and returns normalized file type ('csv' or 'xlsx')."""
    if not filename:
        raise AppError(
            code="UNSUPPORTED_FILE_TYPE",
            message="No filename provided in upload request.",
            status_code=400,
        )
        
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        return "csv"
    elif lower_name.endswith(".xlsx"):
        return "xlsx"
    elif lower_name.endswith(".xls"):
        raise AppError(
            code="UNSUPPORTED_FILE_TYPE",
            message="Legacy Excel .xls format is not supported for security and parsing reasons. Please save as modern .xlsx or .csv.",
            status_code=400,
        )
    else:
        ext = os.path.splitext(lower_name)[1] or "unknown"
        raise AppError(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file format '{ext}'. Only modern .csv and .xlsx files are supported.",
            status_code=400,
        )


async def safe_stream_file_to_temp(
    upload_file: UploadFile, max_bytes: int = settings.MAX_UPLOAD_SIZE_BYTES
) -> Tuple[str, int, str]:
    """
    Streams uploaded file to a temporary isolated file path.
    Enforces maximum byte limit while reading chunks to prevent memory exhaustion.
    Returns (temp_file_path, total_bytes, sanitized_original_name).
    """
    os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)
    
    sanitized_name = sanitize_original_filename(upload_file.filename or "")
    file_type = validate_file_extension(sanitized_name)
    
    # Generate unique, non-user-controlled temporary filename
    temp_file_id = f"{uuid.uuid4().hex}_{sanitized_name.replace(' ', '_')}"
    temp_path = os.path.join(settings.TEMP_UPLOAD_DIR, temp_file_id)
    
    total_bytes = 0
    chunk_size = 64 * 1024  # 64 KB chunks
    
    try:
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                total_bytes += len(chunk)
                
                if total_bytes > max_bytes:
                    # File exceeded max allowed size
                    raise AppError(
                        code="DATASET_TOO_LARGE",
                        message=f"The uploaded dataset exceeds the maximum allowable limit of {max_bytes // (1024 * 1024)} MB.",
                        status_code=400,
                    )
                
                buffer.write(chunk)
                
        if total_bytes == 0:
            raise AppError(
                code="EMPTY_DATASET",
                message="The uploaded file is empty (0 bytes). Please upload a valid CSV or XLSX dataset.",
                status_code=400,
            )
            
        return temp_path, total_bytes, sanitized_name

    except Exception as e:
        # Guarantee cleanup on failure
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        if isinstance(e, AppError):
            raise e
        raise AppError(
            code="DATASET_PROCESSING_FAILED",
            message="Failed to read and process upload file stream.",
            status_code=400,
            details=str(e),
        )


def cleanup_temp_file(file_path: str) -> None:
    """Safely cleans up temporary uploaded file."""
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
