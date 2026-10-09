import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.database import Anomaly, DeploymentEvent, TraceSpan, LogRecord
from app.graph.service_graph import service_graph_engine

class CorrelatedEventChain:
    def __init__(
        self,
        incident_id: str,
        anomalies: List[Anomaly],
        deployments: List[DeploymentEvent],
        spans: List[TraceSpan],
        logs: List[LogRecord]
    ):
        self.incident_id = incident_id
        self.anomalies = anomalies
        self.deployments = deployments
        self.spans = spans
        self.logs = logs
        self.affected_services = list(set([a.service_name for a in anomalies] + [l.service_name for l in logs if l.severity in ("ERROR", "CRITICAL")]))
        self.causal_chain: List[Dict[str, Any]] = []

class EventCorrelationEngine:
    """
    Correlates multi-modal telemetry signals:
    - Temporal proximity (timestamps of anomalies, errors, deployments)
    - Structural dependency graph traversal (upstream causes propagating to downstream callers)
    - Distributed trace error waterfalls (originating vs propagating spans)
    - Deployment changes within window
    """

    def __init__(self, correlation_window_minutes: int = 30):
        self.correlation_window_minutes = correlation_window_minutes

    def correlate_incident_events(
        self,
        db: Session,
        incident_id: str,
        start_time: datetime.datetime,
        end_time: datetime.datetime
    ) -> CorrelatedEventChain:
        window_start = start_time - datetime.timedelta(minutes=self.correlation_window_minutes)
        window_end = end_time + datetime.timedelta(minutes=5)

        # 1. Fetch anomalies
        anomalies = db.query(Anomaly).filter(
            Anomaly.detected_at >= window_start,
            Anomaly.detected_at <= window_end
        ).order_by(Anomaly.detected_at.asc()).all()

        # 2. Fetch deployments
        deployments = db.query(DeploymentEvent).filter(
            DeploymentEvent.deployed_at >= window_start,
            DeploymentEvent.deployed_at <= window_end
        ).order_by(DeploymentEvent.deployed_at.asc()).all()

        # 3. Fetch error spans
        error_spans = db.query(TraceSpan).filter(
            TraceSpan.start_time >= window_start,
            TraceSpan.start_time <= window_end,
            TraceSpan.status_code == "ERROR"
        ).order_by(TraceSpan.start_time.asc()).limit(50).all()

        # 4. Fetch error logs
        error_logs = db.query(LogRecord).filter(
            LogRecord.timestamp >= window_start,
            LogRecord.timestamp <= window_end,
            LogRecord.severity.in_(["ERROR", "CRITICAL"])
        ).order_by(LogRecord.timestamp.asc()).limit(50).all()

        chain = CorrelatedEventChain(
            incident_id=incident_id,
            anomalies=anomalies,
            deployments=deployments,
            spans=error_spans,
            logs=error_logs
        )

        # Build causal sequence
        events_timeline = []

        # Add deployments
        for dep in deployments:
            events_timeline.append({
                "type": "deployment",
                "timestamp": dep.deployed_at,
                "service": dep.service_name,
                "description": f"Deployment on {dep.service_name}: {dep.previous_version} -> {dep.new_version} ({dep.change_description})",
                "severity": "info"
            })

        # Add anomalies
        for anom in anomalies:
            events_timeline.append({
                "type": "anomaly",
                "timestamp": anom.detected_at,
                "service": anom.service_name,
                "metric": anom.metric_name,
                "description": anom.supporting_evidence or f"Anomaly on {anom.service_name}: {anom.metric_name}",
                "severity": anom.severity
            })

        # Add key error logs
        for log in error_logs[:10]:
            events_timeline.append({
                "type": "log_error",
                "timestamp": log.timestamp,
                "service": log.service_name,
                "description": f"[{log.severity}] {log.service_name}: {log.message}",
                "severity": log.severity.lower()
            })

        # Sort combined timeline chronologically
        events_timeline.sort(key=lambda x: x["timestamp"])
        chain.causal_chain = events_timeline

        return chain

event_correlation_engine = EventCorrelationEngine()
