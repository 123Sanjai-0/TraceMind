import pytest
import datetime
from app.root_cause.scorer import RootCauseScorer

def test_root_cause_scorer_deterministic_features():
    scorer = RootCauseScorer()
    now = datetime.datetime.utcnow()

    # Highly anomalous root service: earliest anomaly, leaf dependency, trace originator, high deviation, recent release
    res_high = scorer.compute_candidate_score(
        service_id="payment-service",
        earliest_anomaly_time=now - datetime.timedelta(minutes=5),
        first_incident_anomaly_time=now - datetime.timedelta(minutes=5),
        topological_depth=3,
        is_deepest_failing_dependency=True,
        downstream_affected_count=3,
        is_trace_error_originator=True,
        max_z_score=4.5,
        max_deviation_pct=250.0,
        has_recent_deployment=True,
        deployment_minutes_delta=5.0
    )

    assert res_high["ranking_score"] >= 80.0
    assert res_high["confidence_category"] == "high"
    assert res_high["temporal_score"] > 80.0
    assert res_high["trace_score"] > 80.0

    # Downstream victim service: late anomaly, shallow depth, not trace originator, no deployment
    res_low = scorer.compute_candidate_score(
        service_id="frontend",
        earliest_anomaly_time=now - datetime.timedelta(minutes=1),
        first_incident_anomaly_time=now - datetime.timedelta(minutes=5),
        topological_depth=0,
        is_deepest_failing_dependency=False,
        downstream_affected_count=0,
        is_trace_error_originator=False,
        max_z_score=1.8,
        max_deviation_pct=40.0,
        has_recent_deployment=False,
        deployment_minutes_delta=None
    )

    assert res_low["ranking_score"] < res_high["ranking_score"]
    assert res_low["confidence_category"] in ["low", "medium"]
