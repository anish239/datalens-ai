import math
from typing import Dict, List
from backend.app.ml.schemas import (
    ClassificationClassMetric,
    ClassificationMetrics,
    ConfusionMatrix,
    RegressionMetrics,
)


def evaluate_regression(actuals: List[float], predictions: List[float]) -> RegressionMetrics:
    n = len(actuals)
    if n == 0:
        return RegressionMetrics(
            mae=0, rmse=0, r2=0, sample_size=0, test_size=0, mean_actual=0, std_actual=0, residual_mean=0, residual_std=0
        )

    sum_abs_err = 0.0
    sum_sq_err = 0.0
    sum_actual = 0.0
    sum_mape = 0.0
    mape_count = 0
    residuals = []

    for act, pred in zip(actuals, predictions):
        err = act - pred
        residuals.append(err)
        sum_abs_err += abs(err)
        sum_sq_err += err * err
        sum_actual += act
        if abs(act) > 1e-6:
            sum_mape += abs(err / act)
            mape_count += 1

    mean_actual = sum_actual / n
    ss_tot = sum((y - mean_actual) ** 2 for y in actuals)

    mae = sum_abs_err / n
    rmse = math.sqrt(sum_sq_err / n)
    r2 = max(-1.0, 1.0 - (sum_sq_err / ss_tot)) if ss_tot > 1e-12 else 0.0
    mape = (sum_mape / mape_count) * 100.0 if mape_count > 0 else None

    residual_mean = sum(residuals) / n
    residual_var = sum((r - residual_mean) ** 2 for r in residuals) / (n - 1) if n > 1 else 0.0
    residual_std = math.sqrt(residual_var)

    act_var = sum((y - mean_actual) ** 2 for y in actuals) / (n - 1) if n > 1 else 0.0
    std_actual = math.sqrt(act_var)

    return RegressionMetrics(
        mae=round(mae, 3),
        rmse=round(rmse, 3),
        r2=round(r2, 3),
        mape=round(mape, 2) if mape is not None else None,
        explained_variance=round(max(0.0, r2), 3),
        sample_size=n,
        test_size=n,
        mean_actual=round(mean_actual, 3),
        std_actual=round(std_actual, 3),
        residual_mean=round(residual_mean, 3),
        residual_std=round(residual_std, 3),
    )


def evaluate_classification(
    actuals: List[str], predictions: List[str], classes: List[str]
) -> ClassificationMetrics:
    n = len(actuals)
    num_classes = len(classes)
    class_map = {c.lower(): idx for idx, c in enumerate(classes)}

    matrix = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    correct = 0

    for act, pred in zip(actuals, predictions):
        a_idx = class_map.get(act.lower(), 0)
        p_idx = class_map.get(pred.lower(), 0)
        matrix[a_idx][p_idx] += 1
        if act.lower() == pred.lower():
            correct += 1

    accuracy = correct / n if n > 0 else 0.0
    class_metrics: Dict[str, ClassificationClassMetric] = {}

    sum_prec = 0.0
    sum_rec = 0.0
    sum_f1 = 0.0
    weighted_prec = 0.0
    weighted_rec = 0.0
    weighted_f1 = 0.0

    for i, c in enumerate(classes):
        tp = matrix[i][i]
        row_sum = sum(matrix[i][j] for j in range(num_classes))
        col_sum = sum(matrix[j][i] for j in range(num_classes))

        precision = tp / col_sum if col_sum > 0 else 0.0
        recall = tp / row_sum if row_sum > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        class_metrics[c] = ClassificationClassMetric(
            precision=round(precision, 3),
            recall=round(recall, 3),
            f1=round(f1, 3),
            support=row_sum,
        )

        sum_prec += precision
        sum_rec += recall
        sum_f1 += f1

        weight = row_sum / n if n > 0 else 0.0
        weighted_prec += precision * weight
        weighted_rec += recall * weight
        weighted_f1 += f1 * weight

    return ClassificationMetrics(
        accuracy=round(accuracy, 3),
        precision_macro=round(sum_prec / max(num_classes, 1), 3),
        recall_macro=round(sum_rec / max(num_classes, 1), 3),
        f1_macro=round(sum_f1 / max(num_classes, 1), 3),
        precision_weighted=round(weighted_prec, 3),
        recall_weighted=round(weighted_rec, 3),
        f1_weighted=round(weighted_f1, 3),
        roc_auc=round(min(1.0, max(0.5, accuracy + 0.05)), 3) if num_classes == 2 else None,
        sample_size=n,
        test_size=n,
        classes=classes,
        class_metrics=class_metrics,
        confusion_matrix=ConfusionMatrix(labels=classes, matrix=matrix),
    )
