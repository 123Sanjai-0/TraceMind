import numpy as np
from typing import List, Dict, Any, Optional

class StatisticalDetector:
    """
    Implements standard statistical anomaly detection techniques:
    - Moving window rolling mean and standard deviation (Z-score)
    - Threshold-based metric deviations
    - Error rate & latency sudden spikes
    - Minimum sample cold-start protection
    """

    def __init__(self, z_threshold: float = 2.5, min_samples: int = 5, min_pct_increase: float = 25.0):
        self.z_threshold = z_threshold
        self.min_samples = min_samples
        self.min_pct_increase = min_pct_increase

    def calculate_z_score(self, values: List[float], current_value: float) -> float:
        if len(values) < self.min_samples:
            return 0.0
        mean = float(np.mean(values))
        std = float(np.std(values))
        if std == 0 or np.isnan(std):
            if current_value != mean:
                return 3.0 if current_value > mean else -3.0
            return 0.0
        return (current_value - mean) / std

    def detect_latency_anomaly(
        self,
        historical_latencies: List[float],
        current_latency: float,
        latency_deviation_pct_threshold: float = 50.0
    ) -> Optional[Dict[str, Any]]:
        """
        Detects if current latency deviates significantly from baseline.
        Requires both statistical Z-score elevation and meaningful percentage/absolute increase.
        """
        if not historical_latencies or len(historical_latencies) < self.min_samples:
            return None

        baseline_mean = float(np.mean(historical_latencies))
        if baseline_mean <= 0:
            baseline_mean = 1.0

        z_score = self.calculate_z_score(historical_latencies, current_latency)
        pct_increase = ((current_latency - baseline_mean) / baseline_mean) * 100.0

        # Require significant deviation (z >= threshold AND meaningful pct increase, or massive absolute surge)
        is_anomalous = (
            (z_score >= self.z_threshold and pct_increase >= self.min_pct_increase) or
            (pct_increase >= latency_deviation_pct_threshold and current_latency >= 100.0) or
            (current_latency >= 500.0 and pct_increase >= 30.0)
        )

        if is_anomalous:
            severity = "critical" if z_score >= 4.0 or pct_increase >= 200.0 or current_latency >= 800.0 else "high" if z_score >= 3.0 or pct_increase >= 100.0 else "medium"
            return {
                "detected": True,
                "metric_name": "latency",
                "observed_value": round(current_latency, 2),
                "baseline_value": round(baseline_mean, 2),
                "deviation_pct": round(pct_increase, 2),
                "z_score": round(z_score, 2),
                "severity": severity,
                "method": "z_score_and_moving_average",
                "evidence": f"Observed latency of {current_latency:.1f}ms exceeds baseline {baseline_mean:.1f}ms by {pct_increase:.1f}% (Z-score: {z_score:.2f})."
            }
        return None

    def detect_error_rate_anomaly(
        self,
        historical_error_rates: List[float],
        current_error_rate: float,
        error_threshold: float = 0.05
    ) -> Optional[Dict[str, Any]]:
        """
        Detects elevated error rates above threshold and baseline deviations.
        """
        baseline_mean = float(np.mean(historical_error_rates)) if historical_error_rates else 0.0
        z_score = self.calculate_z_score(historical_error_rates, current_error_rate) if len(historical_error_rates) >= self.min_samples else 0.0

        if current_error_rate > error_threshold or (current_error_rate >= 0.05 and z_score >= self.z_threshold):
            severity = "critical" if current_error_rate >= 0.20 else "high" if current_error_rate >= 0.08 else "medium"
            pct_dev = ((current_error_rate - baseline_mean) / max(baseline_mean, 0.001)) * 100.0
            return {
                "detected": True,
                "metric_name": "error_rate",
                "observed_value": round(current_error_rate, 4),
                "baseline_value": round(baseline_mean, 4),
                "deviation_pct": round(pct_dev, 2),
                "z_score": round(z_score, 2),
                "severity": severity,
                "method": "threshold_and_z_score",
                "evidence": f"Error rate spiked to {current_error_rate * 100:.1f}% (Baseline: {baseline_mean * 100:.1f}%, Z-score: {z_score:.2f})."
            }
        return None
