import math
from typing import Any, Dict, List, Tuple


class PreprocessingPipeline:
    def __init__(self, feature_columns: List[str]):
        self.feature_columns = feature_columns
        self.numeric_medians: Dict[str, float] = {}
        self.numeric_means: Dict[str, float] = {}
        self.numeric_stds: Dict[str, float] = {}
        self.categorical_modes: Dict[str, str] = {}
        self.categorical_vocab: Dict[str, List[str]] = {}
        self.encoded_feature_names: List[str] = []

    def fit(self, rows: List[Dict[str, Any]], column_types: Dict[str, str]):
        self.encoded_feature_names = []
        for col in self.feature_columns:
            ctype = column_types.get(col, "numeric")
            if ctype == "numeric":
                vals = [float(r[col]) for r in rows if r.get(col) is not None and str(r.get(col)).strip() != ""]
                sorted_v = sorted(vals)
                n = len(sorted_v)
                med = sorted_v[n // 2] if n > 0 else 0.0
                mean = sum(sorted_v) / n if n > 0 else 0.0
                var = sum((x - mean) ** 2 for x in sorted_v) / (n - 1) if n > 1 else 1.0
                std = math.sqrt(var) or 1.0

                self.numeric_medians[col] = med
                self.numeric_means[col] = mean
                self.numeric_stds[col] = std
                self.encoded_feature_names.append(col)
            else:
                counts: Dict[str, int] = {}
                for r in rows:
                    val = r.get(col)
                    if val is not None and str(val).strip() != "":
                        s = str(val).strip()
                        counts[s] = counts.get(s, 0) + 1

                sorted_cats = [k for k, _ in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20]]
                mode = sorted_cats[0] if sorted_cats else "Missing"

                self.categorical_modes[col] = mode
                self.categorical_vocab[col] = sorted_cats

                for cat in sorted_cats:
                    self.encoded_feature_names.append(f"{col}__{cat}")
                if len(counts) > 20:
                    self.encoded_feature_names.append(f"{col}__Other")

    def transform_row(self, row: Dict[str, Any]) -> List[float]:
        vec: List[float] = []
        for col in self.feature_columns:
            if col in self.numeric_medians:
                raw = row.get(col)
                try:
                    num = float(raw) if raw is not None and str(raw).strip() != "" else self.numeric_medians[col]
                except (ValueError, TypeError):
                    num = self.numeric_medians[col]
                scaled = (num - self.numeric_means[col]) / self.numeric_stds[col]
                vec.append(scaled)
            else:
                raw = row.get(col)
                s = str(raw).strip() if raw is not None else self.categorical_modes.get(col, "Missing")
                cats = self.categorical_vocab.get(col, [])
                matched = False
                for cat in cats:
                    if s.lower() == cat.lower():
                        vec.append(1.0)
                        matched = True
                    else:
                        vec.append(0.0)
                if cats and f"{col}__Other" in self.encoded_feature_names:
                    vec.append(0.0 if matched else 1.0)
        return vec
