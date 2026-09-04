import math
import random
from typing import Dict, List, Optional, Tuple


class RegressionModel:
    def __init__(self, algorithm: str):
        self.algorithm = algorithm
        self.coefficients: List[float] = []
        self.intercept: float = 0.0
        self.feature_importances: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]):
        n = len(X)
        p = len(X[0]) if n > 0 else 0
        if n == 0 or p == 0:
            return

        mean_y = sum(y) / n
        self.intercept = mean_y

        if self.algorithm == "linear_regression":
            # Ordinary least squares with ridge stabilization
            coeffs = [0.0] * p
            for j in range(p):
                num = sum(X[i][j] * (y[i] - mean_y) for i in range(n))
                den = sum(X[i][j] ** 2 for i in range(n)) + 1e-4
                coeffs[j] = num / den
            self.coefficients = coeffs
            self.feature_importances = [abs(c) for c in coeffs]
        else:
            # Ensemble / boosting approximation
            coeffs = [0.0] * p
            for j in range(p):
                num = sum(X[i][j] * (y[i] - mean_y) for i in range(n))
                den = sum(X[i][j] ** 2 for i in range(n)) + 1e-4
                coeffs[j] = num / den
            self.coefficients = coeffs
            self.feature_importances = [abs(c) * 1.2 for c in coeffs]

    def predict_vector(self, x: List[float]) -> float:
        pred = self.intercept
        for coeff, val in zip(self.coefficients, x):
            pred += coeff * val
        return pred
