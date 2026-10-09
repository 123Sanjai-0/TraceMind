from typing import Dict, Any, List, Optional
import datetime

class RootCauseScorer:
    """
    Transparent, explainable scoring model for root-cause ranking.
    Features:
    - Temporal precedence (earliest anomaly onset)
    - Dependency graph position (dependency depth & downstream cascade)
    - Trace-level error causality (originating span vs propagated span)
    - Metric deviation magnitude (Z-score & percentage increase)
    - Deployment proximity (time delta between release and incident onset)
    """

    WEIGHT_TEMPORAL = 0.25
    WEIGHT_DEPENDENCY = 0.25
    WEIGHT_TRACE = 0.20
    WEIGHT_METRIC = 0.15
    WEIGHT_DEPLOYMENT = 0.15

    def compute_candidate_score(
        self,
        service_id: str,
        earliest_anomaly_time: Optional[datetime.datetime],
        first_incident_anomaly_time: Optional[datetime.datetime],
        topological_depth: int,
        is_deepest_failing_dependency: bool,
        downstream_affected_count: int,
        is_trace_error_originator: bool,
        max_z_score: float,
        max_deviation_pct: float,
        has_recent_deployment: bool,
        deployment_minutes_delta: Optional[float]
    ) -> Dict[str, Any]:
        # 1. Temporal Precedence Score (0 - 100)
        temporal_score = 50.0
        if earliest_anomaly_time and first_incident_anomaly_time:
            time_diff = (earliest_anomaly_time - first_incident_anomaly_time).total_seconds()
            if time_diff <= 30:  # within 30s of initial start
                temporal_score = 95.0
            elif time_diff <= 120:
                temporal_score = 80.0
            elif time_diff <= 300:
                temporal_score = 60.0
            else:
                temporal_score = 30.0

        # 2. Dependency Position Score (0 - 100)
        # Deepest failing dependency or node with many downstream dependents
        dep_score = 40.0
        if is_deepest_failing_dependency:
            dep_score += 35.0
        dep_score += min(downstream_affected_count * 15.0, 25.0)
        dep_score = min(dep_score, 100.0)

        # 3. Trace Error Origin Score (0 - 100)
        trace_score = 85.0 if is_trace_error_originator else 20.0

        # 4. Metric Deviation Score (0 - 100)
        metric_score = 20.0
        if max_z_score >= 4.0 or max_deviation_pct >= 200.0:
            metric_score = 95.0
        elif max_z_score >= 2.5 or max_deviation_pct >= 50.0:
            metric_score = 75.0
        elif max_z_score > 1.5:
            metric_score = 50.0

        # 5. Deployment Proximity Score (0 - 100)
        deployment_score = 0.0
        if has_recent_deployment:
            if deployment_minutes_delta is not None and deployment_minutes_delta <= 15:
                deployment_score = 90.0
            elif deployment_minutes_delta is not None and deployment_minutes_delta <= 60:
                deployment_score = 60.0
            else:
                deployment_score = 30.0

        # Weighted Total Score
        total_score = (
            self.WEIGHT_TEMPORAL * temporal_score +
            self.WEIGHT_DEPENDENCY * dep_score +
            self.WEIGHT_TRACE * trace_score +
            self.WEIGHT_METRIC * metric_score +
            self.WEIGHT_DEPLOYMENT * deployment_score
        )

        # Confidence Category Determination
        evidence_signals_count = 0
        if max_z_score >= 2.0: evidence_signals_count += 1
        if is_trace_error_originator: evidence_signals_count += 1
        if has_recent_deployment: evidence_signals_count += 1
        if downstream_affected_count > 0: evidence_signals_count += 1

        if total_score >= 68.0 and evidence_signals_count >= 3:
            confidence = "high"
        elif total_score >= 45.0:
            confidence = "medium"
        else:
            confidence = "low"

        return {
            "ranking_score": round(total_score, 1),
            "confidence_category": confidence,
            "temporal_score": round(temporal_score, 1),
            "dependency_score": round(dep_score, 1),
            "trace_score": round(trace_score, 1),
            "metric_score": round(metric_score, 1),
            "deployment_score": round(deployment_score, 1),
            "evidence_signals_count": evidence_signals_count
        }

root_cause_scorer = RootCauseScorer()
