import math
from typing import Dict, List, Tuple


class ClassificationModel:
    def __init__(self, algorithm: str, classes: List[str]):
        self.algorithm = algorithm
        self.classes = classes
        self.weights: Dict[str, List[float]] = {}
        self.intercepts: Dict[str, float] = {}
        self.feature_importances: List[float] = []

    def fit(self, X: List[List[float]], y: List[str]):
        n = len(X)
        p = len(X[0]) if n > 0 else 0
        self.feature_importances = [0.0] * p

        for c in self.classes:
            binary_y = [1.0 if label.lower() == c.lower() else 0.0 for label in y]
            coeffs = [0.0] * p
            intercept = 0.0
            lr = 0.05

            for _ in range(30):
                for i in range(n):
                    z = intercept + sum(coeffs[j] * X[i][j] for j in range(p))
                    prob = 1.0 / (1.0 + math.exp(-max(-15.0, min(15.0, z))))
                    err = binary_y[i] - prob
                    intercept += lr * err
                    for j in range(p):
                        coeffs[j] += lr * (err * X[i][j] - 1e-4 * coeffs[j])

            self.weights[c] = coeffs
            self.intercepts[c] = intercept
            for j in range(p):
                self.feature_importances[j] += abs(coeffs[j])

    def predict_vector(self, x: List[float]) -> Tuple[str, Dict[str, float]]:
        scores: Dict[str, float] = {}
        sum_exp = 0.0
        for c in self.classes:
            z = self.intercepts.get(c, 0.0)
            coeffs = self.weights.get(c, [])
            for coeff, val in zip(coeffs, x):
                z += coeff * val
            exp_z = math.exp(max(-15.0, min(15.0, z)))
            scores[c] = exp_z
            sum_exp += exp_z

        probabilities = {c: round(scores[c] / max(sum_exp, 1e-6), 3) for c in self.classes}
        best_class = max(probabilities.items(), key=lambda item: item[1])[0] if probabilities else (self.classes[0] if self.classes else "0")
        return best_class, probabilities
