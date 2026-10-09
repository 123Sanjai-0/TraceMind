import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest

class MultivariateAnomalyDetector:
    """
    Multivariate Anomaly Detection using Isolation Forest across multiple metric dimensions:
    [latency_ms, error_rate, cpu_util, memory_util, request_rate].
    """

    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=50
        )
        self.is_fitted = False

    def fit_and_predict(
        self,
        historical_features: List[List[float]],
        current_features: List[float]
    ) -> Optional[Dict[str, Any]]:
        if len(historical_features) < 10:
            return None

        try:
            X = np.array(historical_features, dtype=float)
            # Add subtle jitter if data has 0 variance to prevent degenerate tree splits
            if np.all(np.std(X, axis=0) == 0):
                X += np.random.normal(0, 1e-4, X.shape)

            self.model.fit(X)
            self.is_fitted = True

            curr = np.array([current_features], dtype=float)
            pred = self.model.predict(curr)[0]  # -1 for anomaly, 1 for normal
            score = float(self.model.decision_function(curr)[0])

            if pred == -1 or score < -0.05:
                severity = "critical" if score < -0.15 else "high" if score < -0.05 else "medium"
                return {
                    "detected": True,
                    "metric_name": "multivariate_telemetry",
                    "observed_value": round(score, 4),
                    "baseline_value": 0.0,
                    "deviation_pct": round(abs(score) * 100.0, 2),
                    "severity": severity,
                    "method": "isolation_forest",
                    "evidence": f"Isolation Forest identified multivariate anomaly across telemetry features (Anomaly Score: {score:.3f})."
                }
        except Exception as e:
            pass

        return None
