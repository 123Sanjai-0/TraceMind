import pytest
from app.detection.statistical import StatisticalDetector
from app.detection.multivariate import MultivariateAnomalyDetector

def test_statistical_detector_z_score():
    detector = StatisticalDetector(z_threshold=2.5, min_samples=5)
    baseline = [20.0, 22.0, 19.5, 21.0, 20.5, 21.5]
    
    # Normal value should not trigger
    res_normal = detector.detect_latency_anomaly(baseline, 23.0)
    assert res_normal is None

    # Spike to 150ms
    res_spike = detector.detect_latency_anomaly(baseline, 150.0)
    assert res_spike is not None
    assert res_spike["detected"] is True
    assert res_spike["z_score"] > 2.5
    assert res_spike["severity"] in ["high", "critical"]

def test_error_rate_detector():
    detector = StatisticalDetector(z_threshold=2.5)
    baseline = [0.001, 0.002, 0.001, 0.001, 0.002]

    # Normal error rate
    res_normal = detector.detect_error_rate_anomaly(baseline, 0.002)
    assert res_normal is None

    # Spike to 18%
    res_spike = detector.detect_error_rate_anomaly(baseline, 0.18)
    assert res_spike is not None
    assert res_spike["detected"] is True
    assert res_spike["severity"] in ["high", "critical"]

def test_multivariate_detector():
    detector = MultivariateAnomalyDetector(contamination=0.1)
    # Realistic training history with normal fluctuations
    history = [
        [20.0 + (i % 4), 0.001 + (i % 3) * 0.0002, 30.0 + (i % 5), 40.0 + (i % 3), 100.0 + (i % 10)]
        for i in range(30)
    ]
    # Normal prediction
    normal_point = [21.0, 0.0012, 31.0, 41.0, 102.0]
    res_norm = detector.fit_and_predict(history, normal_point)
    assert res_norm is None

    # Extreme Outlier point
    anomaly_point = [950.0, 0.35, 95.0, 88.0, 450.0]
    res_anom = detector.fit_and_predict(history, anomaly_point)
    assert res_anom is not None
    assert res_anom["detected"] is True
