import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile

from backend.app.auth.firebase_auth import AuthenticatedUser, get_current_user
from backend.app.models.dataset import (
    DatasetListResponse,
    DatasetProfile,
    DatasetUploadResponse,
)
from backend.app.services.analytics import AnalyticsEngine
from backend.app.services.firestore import (
    delete_user_dataset,
    get_user_dataset,
    list_user_datasets,
    save_dataset_profile,
)
from backend.app.services.ingestion import load_dataset_from_file
from backend.app.services.profiling import profile_dataset
from backend.app.utils.errors import AppError
from backend.app.utils.files import (
    cleanup_temp_file,
    safe_stream_file_to_temp,
    validate_file_extension,
)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DatasetUploadResponse:
    """
    Ingests an uploaded CSV or XLSX dataset, infers schema, generates deterministic profile,
    and persists metadata in Firestore bound strictly to the authenticated user UID.
    """
    if not file or not file.filename:
        raise AppError(
            code="UNSUPPORTED_FILE_TYPE",
            message="No file uploaded. Please provide a CSV or XLSX file.",
            status_code=400,
        )

    file_type = validate_file_extension(file.filename)
    temp_path: Optional[str] = None

    try:
        # Stream safely to temporary directory, enforcing 50 MB limits
        temp_path, file_size_bytes, sanitized_name = await safe_stream_file_to_temp(file)

        # Ingest with Pandas safely
        df = load_dataset_from_file(temp_path, file_type)

        # Generate unique dataset ID
        dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
        created_at_iso = datetime.now(timezone.utc).isoformat()

        # Compute deterministic schema profile and data quality metrics
        profile = profile_dataset(
            df=df,
            dataset_id=dataset_id,
            owner_id=current_user.uid,
            file_name=sanitized_name,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            created_at_iso=created_at_iso,
        )

        # Persist metadata and profile in Firestore
        await save_dataset_profile(profile)

        # Register in Analytics Engine
        AnalyticsEngine.register_dataframe(dataset_id, df)

        return DatasetUploadResponse(
            dataset=profile,
            message="Dataset successfully ingested and profiled.",
        )

    finally:
        # Guarantee cleanup of temporary uploaded file
        if temp_path:
            cleanup_temp_file(temp_path)


@router.get("", response_model=DatasetListResponse)
async def list_datasets(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DatasetListResponse:
    """
    Lists all dataset profiles owned by the authenticated UID.
    """
    items = await list_user_datasets(current_user.uid)
    return DatasetListResponse(items=items, total=len(items))


@router.get("/{dataset_id}", response_model=DatasetProfile)
async def get_dataset(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DatasetProfile:
    """
    Retrieves a single dataset profile by ID. Enforces ownership authorization.
    """
    return await get_user_dataset(dataset_id, current_user.uid)


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
async def get_dataset_profile_endpoint(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DatasetProfile:
    """
    Retrieves full deterministic profile for a dataset. Enforces ownership authorization.
    """
    return await get_user_dataset(dataset_id, current_user.uid)


@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    """
    Deletes a dataset document from Firestore. Enforces ownership authorization.
    """
    await delete_user_dataset(dataset_id, current_user.uid)
    AnalyticsEngine.evict_dataframe(dataset_id)
    return {"message": "Dataset successfully deleted."}
