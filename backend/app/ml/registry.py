import time
from typing import Any, Dict, List, Optional
from backend.app.ml.schemas import TrainedModelResponse

_MODEL_STORE: Dict[str, Dict[str, Any]] = {}


def save_model(model_id: str, model_data: Dict[str, Any]):
    _MODEL_STORE[model_id] = model_data


def get_model(model_id: str) -> Optional[Dict[str, Any]]:
    return _MODEL_STORE.get(model_id)


def list_models(dataset_id: Optional[str] = None, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    models = list(_MODEL_STORE.values())
    if dataset_id:
        models = [m for m in models if m.get("model", {}).get("dataset_id") == dataset_id]
    if owner_id:
        models = [m for m in models if m.get("model", {}).get("owner_id") == owner_id]
    return models


def delete_model(model_id: str, owner_id: str) -> bool:
    m = _MODEL_STORE.get(model_id)
    if not m:
        return False
    if m.get("model", {}).get("owner_id") != owner_id:
        return False
    del _MODEL_STORE[model_id]
    return True
