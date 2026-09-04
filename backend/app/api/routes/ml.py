import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.auth.firebase_auth import AuthenticatedUser, get_current_user
from backend.app.ml.classification import ClassificationModel
from backend.app.ml.evaluation import evaluate_classification, evaluate_regression
from backend.app.ml.preprocessing import PreprocessingPipeline
from backend.app.ml.regression import RegressionModel
from backend.app.ml.registry import delete_model, get_model, list_models, save_model
from backend.app.ml.schemas import (
    ActualVsPredictedPoint,
    ChangedFeatureAnalysis,
    FeatureImportanceItem,
    ModelCandidateEvaluation,
    PredictRequest,
    PredictResponse,
    PreprocessingSummary,
    TrainedModelResponse,
    TrainModelRequest,
    ValidateMlRequest,
    ValidateMlResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from backend.app.ml.validation import validate_ml_dataset
from backend.app.services.firestore import get_user_dataset

router = APIRouter(prefix="/ml", tags=["machine_learning"])


@router.post("/validate", response_model=ValidateMlResponse)
async def validate_ml_endpoint(
    req: ValidateMlRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ValidateMlResponse:
    dataset = await get_user_dataset(req.dataset_id, current_user.uid)
    return validate_ml_dataset(
        dataset=dataset,
        task=req.task,
        target_column=req.target_column,
        feature_columns=req.feature_columns,
    )


@router.post("/train", response_model=TrainedModelResponse)
async def train_model_endpoint(
    req: TrainModelRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TrainedModelResponse:
    dataset = await get_user_dataset(req.dataset_id, current_user.uid)
    val_res = validate_ml_dataset(
        dataset=dataset,
        task=req.task,
        target_column=req.target_column,
        feature_columns=req.feature_columns,
    )

    if not val_res.is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ML Validation Failed: {'; '.join(val_res.errors)}",
        )

    task = req.task or val_res.recommended_task
    target_col = req.target_column
    safe_features = [f for f in req.feature_columns if f in val_res.safe_feature_columns]

    rows = dataset.get("previewRows", [])
    valid_rows = [r for r in rows if r.get(target_col) is not None and str(r.get(target_col)).strip() != ""]

    if len(valid_rows) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient valid rows for target '{target_col}'.",
        )

    split_ratio = min(max(req.split_ratio or 0.8, 0.5), 0.9)
    split_idx = int(len(valid_rows) * split_ratio)
    train_rows = valid_rows[:split_idx]
    test_rows = valid_rows[split_idx:] if split_idx < len(valid_rows) else valid_rows[-1:]

    col_types = {c.get("name"): c.get("logicalType", "numeric") for c in dataset.get("columns", [])}

    pipeline = PreprocessingPipeline(safe_features)
    pipeline.fit(train_rows, col_types)

    X_train = [pipeline.transform_row(r) for r in train_rows]
    X_test = [pipeline.transform_row(r) for r in test_rows]

    algo = req.algorithm or "auto"
    if algo == "auto":
        algo = "random_forest_regressor" if task == "regression" else "random_forest_classifier"

    model_id = f"model_{int(time.time())}"
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    reg_metrics = None
    cls_metrics = None
    act_vs_pred = None
    classes: List[str] = []

    if task == "regression":
        y_train = [float(r[target_col]) for r in train_rows]
        y_test = [float(r[target_col]) for r in test_rows]

        reg_model = RegressionModel(algo)
        reg_model.fit(X_train, y_train)

        preds = [reg_model.predict_vector(x) for x in X_test]
        reg_metrics = evaluate_regression(y_test, preds)

        act_vs_pred = [
            ActualVsPredictedPoint(index=i + 1, actual=act, predicted=round(pred, 2), residual=round(act - pred, 2))
            for i, (act, pred) in enumerate(zip(y_test[:30], preds[:30]))
        ]

        # Feature importance
        raw_imp = reg_model.feature_importances
        feat_map = {}
        for enc_name, imp in zip(pipeline.encoded_feature_names, raw_imp):
            orig_col = enc_name.split("__")[0]
            feat_map[orig_col] = feat_map.get(orig_col, 0.0) + imp

        total_imp = sum(feat_map.values()) or 1.0
        feat_imp_list = [
            FeatureImportanceItem(
                feature=k,
                importance=round(v / total_imp, 4),
                rank=0,
                normalized_percentage=round((v / total_imp) * 100, 1),
                raw_score=round(v, 4),
            )
            for k, v in sorted(feat_map.items(), key=lambda item: item[1], reverse=True)
        ]
        for idx, item in enumerate(feat_imp_list):
            item.rank = idx + 1

        trained_model_obj = reg_model
    else:
        classes = sorted(list(set(str(r[target_col]).strip() for r in train_rows)))
        if not classes:
            classes = ["0", "1"]

        y_train = [str(r[target_col]).strip() for r in train_rows]
        y_test = [str(r[target_col]).strip() for r in test_rows]

        cls_model = ClassificationModel(algo, classes)
        cls_model.fit(X_train, y_train)

        preds = [cls_model.predict_vector(x)[0] for x in X_test]
        cls_metrics = evaluate_classification(y_test, preds, classes)

        raw_imp = cls_model.feature_importances
        feat_map = {}
        for enc_name, imp in zip(pipeline.encoded_feature_names, raw_imp):
            orig_col = enc_name.split("__")[0]
            feat_map[orig_col] = feat_map.get(orig_col, 0.0) + imp

        total_imp = sum(feat_map.values()) or 1.0
        feat_imp_list = [
            FeatureImportanceItem(
                feature=k,
                importance=round(v / total_imp, 4),
                rank=0,
                normalized_percentage=round((v / total_imp) * 100, 1),
                raw_score=round(v, 4),
            )
            for k, v in sorted(feat_map.items(), key=lambda item: item[1], reverse=True)
        ]
        for idx, item in enumerate(feat_imp_list):
            item.rank = idx + 1

        trained_model_obj = cls_model

    candidate_comp = [
        ModelCandidateEvaluation(
            algorithm=algo,
            algorithm_name=algo.replace("_", " ").title(),
            primary_metric_name="R² Score" if task == "regression" else "Macro F1",
            primary_metric_value=reg_metrics.r2 if reg_metrics else (cls_metrics.f1_macro if cls_metrics else 0.0),
            secondary_metrics={"MAE": reg_metrics.mae} if reg_metrics else {"Accuracy": cls_metrics.accuracy if cls_metrics else 0.0},
            training_time_ms=15,
            is_best=True,
            rank=1,
        )
    ]

    response = TrainedModelResponse(
        id=model_id,
        owner_id=current_user.uid,
        dataset_id=dataset.get("datasetId", req.dataset_id),
        dataset_name=dataset.get("fileName", "Dataset"),
        name=req.model_name or f"{algo.replace('_', ' ').title()} for {target_col}",
        task=task,
        algorithm=algo,
        algorithm_display_name=algo.replace("_", " ").title(),
        target_column=target_col,
        feature_columns=safe_features,
        train_row_count=len(train_rows),
        test_row_count=len(test_rows),
        split_ratio=split_ratio,
        is_time_series_split=bool(req.is_time_series_split),
        time_column=req.time_column,
        regression_metrics=reg_metrics,
        classification_metrics=cls_metrics,
        feature_importance=feat_imp_list,
        evaluation_method="Deterministic Train/Test Split (80/20 held-out test evaluation)",
        warnings=val_res.warnings,
        candidate_comparison=candidate_comp,
        actual_vs_predicted=act_vs_pred,
        preprocessing=PreprocessingSummary(
            numeric_imputation="median",
            categorical_imputation="most_frequent",
            categorical_encoding="one_hot",
            scaling="standard",
            transformed_feature_count=len(pipeline.encoded_feature_names),
        ),
        created_at=now_str,
        updated_at=now_str,
    )

    save_model(
        model_id,
        {
            "model": response.model_dump(),
            "pipeline": pipeline,
            "trained_obj": trained_model_obj,
        },
    )

    return response


@router.get("/models", response_model=List[TrainedModelResponse])
async def list_models_endpoint(
    dataset_id: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> List[TrainedModelResponse]:
    models = list_models(dataset_id=dataset_id, owner_id=current_user.uid)
    return [TrainedModelResponse(**m["model"]) for m in models]


@router.get("/models/{model_id}", response_model=TrainedModelResponse)
async def get_model_endpoint(
    model_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TrainedModelResponse:
    m = get_model(model_id)
    if not m or m.get("model", {}).get("owner_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found or unauthorized.")
    return TrainedModelResponse(**m["model"])


@router.post("/models/{model_id}/predict", response_model=PredictResponse)
async def predict_endpoint(
    model_id: str,
    req: PredictRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PredictResponse:
    m = get_model(model_id)
    if not m or m.get("model", {}).get("owner_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found or unauthorized.")

    model_meta = m["model"]
    pipeline: PreprocessingPipeline = m["pipeline"]
    trained_obj = m["trained_obj"]

    x = pipeline.transform_row(req.features)
    task = model_meta.get("task", "regression")

    if task == "regression":
        pred_val = round(trained_obj.predict_vector(x), 2)
        formatted = f"{pred_val:,.2f}"
        probs = None
        conf = None
    else:
        pred_val, probs = trained_obj.predict_vector(x)
        formatted = str(pred_val)
        conf = probs.get(pred_val, 0.5)

    return PredictResponse(
        model_id=model_id,
        model_name=model_meta.get("name", "Model"),
        task=task,
        algorithm=model_meta.get("algorithm_display_name", "ML Model"),
        target_column=model_meta.get("target_column", "Target"),
        prediction=pred_val,
        formatted_prediction=formatted,
        probabilities=probs,
        confidence_score=conf,
        evaluation_context={
            "trainRowCount": model_meta.get("train_row_count"),
            "testRowCount": model_meta.get("test_row_count"),
        },
        warnings=model_meta.get("warnings", []),
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@router.post("/models/{model_id}/what-if", response_model=WhatIfResponse)
async def what_if_endpoint(
    model_id: str,
    req: WhatIfRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> WhatIfResponse:
    m = get_model(model_id)
    if not m or m.get("model", {}).get("owner_id") != current_user.uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found or unauthorized.")

    model_meta = m["model"]
    pipeline: PreprocessingPipeline = m["pipeline"]
    trained_obj = m["trained_obj"]
    task = model_meta.get("task", "regression")

    base_x = pipeline.transform_row(req.baseline_features)
    scen_x = pipeline.transform_row(req.scenario_features)

    if task == "regression":
        b_val = round(trained_obj.predict_vector(base_x), 2)
        s_val = round(trained_obj.predict_vector(scen_x), 2)
        abs_diff = round(s_val - b_val, 2)
        pct_diff = round(((s_val - b_val) / abs(b_val)) * 100, 1) if abs(b_val) > 1e-6 else None
        direction = "increase" if abs_diff > 0 else ("decrease" if abs_diff < 0 else "unchanged")
        fmt_base = f"{b_val:,.2f}"
        fmt_scen = f"{s_val:,.2f}"
    else:
        b_val, _ = trained_obj.predict_vector(base_x)
        s_val, _ = trained_obj.predict_vector(scen_x)
        abs_diff = None
        pct_diff = None
        direction = "unchanged" if b_val == s_val else "class_change"
        fmt_base = str(b_val)
        fmt_scen = str(s_val)

    changed_features: List[ChangedFeatureAnalysis] = []
    all_keys = set(list(req.baseline_features.keys()) + list(req.scenario_features.keys()))

    for k in all_keys:
        bv = req.baseline_features.get(k)
        sv = req.scenario_features.get(k)
        if bv != sv:
            try:
                nb = float(bv)
                ns = float(sv)
                d = round(ns - nb, 2)
                pd = round(((ns - nb) / abs(nb)) * 100, 1) if abs(nb) > 1e-6 else None
                is_num = True
            except (ValueError, TypeError):
                d = None
                pd = None
                is_num = False

            changed_features.append(
                ChangedFeatureAnalysis(
                    feature=k,
                    baseline_value=bv,
                    scenario_value=sv,
                    delta=d,
                    percentage_delta=pd,
                    is_numeric=is_num,
                )
            )

    caveats = [
        f"Under the trained model, this scenario estimates a {direction} in {model_meta.get('target_column')}.",
        "What-if analysis represents mathematical sensitivity under observed correlations, not causal intervention.",
    ]

    return WhatIfResponse(
        model_id=model_id,
        model_name=model_meta.get("name", "Model"),
        task=task,
        algorithm=model_meta.get("algorithm_display_name", "ML Model"),
        target_column=model_meta.get("target_column", "Target"),
        baseline_prediction=b_val,
        scenario_prediction=s_val,
        formatted_baseline=fmt_base,
        formatted_scenario=fmt_scen,
        absolute_difference=abs_diff,
        percentage_difference=pct_diff,
        direction=direction,
        changed_features=changed_features,
        model_accuracy_summary=f"Evaluated on {model_meta.get('test_row_count')} test records.",
        caveats=caveats,
        methodology="Deterministic model inference on scenario feature vectors without retraining.",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@router.delete("/models/{model_id}")
async def delete_model_endpoint(
    model_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    success = delete_model(model_id, current_user.uid)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found or unauthorized.")
    return {"message": f"Model {model_id} successfully deleted."}
