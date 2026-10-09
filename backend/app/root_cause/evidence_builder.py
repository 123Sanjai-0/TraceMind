from typing import List, Dict, Any, Optional
from app.models.database import Anomaly, DeploymentEvent, TraceSpan, LogRecord

class EvidenceBuilder:
    """
    Builds supporting, contradictory, and missing evidence lists for a candidate service.
    """

    def build_evidence_dossier(
        self,
        service_id: str,
        anomalies: List[Anomaly],
        deployments: List[DeploymentEvent],
        spans: List[TraceSpan],
        logs: List[LogRecord],
        downstream_affected: List[str]
    ) -> Dict[str, Any]:
        supporting: List[str] = []
        contradictory: List[str] = []
        missing: List[str] = []
        alternatives: List[str] = []

        svc_anomalies = [a for a in anomalies if a.service_name == service_id]
        svc_deployments = [d for d in deployments if d.service_name == service_id]
        svc_spans = [s for s in spans if s.service_name == service_id and s.status_code == "ERROR"]
        svc_logs = [l for l in logs if l.service_name == service_id and l.severity in ("ERROR", "CRITICAL")]

        # Supporting Evidence
        for d in svc_deployments:
            supporting.append(
                f"Deployment event detected on '{service_id}' ({d.previous_version} -> {d.new_version}): {d.change_description}"
            )
        for a in svc_anomalies:
            supporting.append(
                f"Metric anomaly on '{service_id}' ({a.metric_name}): observed {a.observed_value} vs baseline {a.baseline_value} ({a.deviation_pct:+.1f}% deviation, severity {a.severity})"
            )
        for s in svc_spans[:3]:
            supporting.append(
                f"Distributed trace span error in '{service_id}' operation '{s.operation_name}' (duration: {s.duration_ms:.1f}ms): {s.error_message or 'Internal execution failure'}"
            )
        for l in svc_logs[:3]:
            supporting.append(
                f"Application log error on '{service_id}': {l.message}"
            )

        if downstream_affected:
            supporting.append(
                f"Failure propagated downstream to dependent services: {', '.join(downstream_affected)}"
            )

        # Contradictory Evidence
        if not svc_anomalies and (svc_spans or svc_logs):
            contradictory.append(
                f"Service '{service_id}' shows trace/log errors but no statistical metric anomaly threshold breach."
            )
        if not svc_deployments and any(d for d in deployments):
            other_deploys = [d.service_name for d in deployments if d.service_name != service_id]
            contradictory.append(
                f"No recent code deployment on '{service_id}', but recent deployments occurred on {', '.join(other_deploys)}."
            )

        # Missing Evidence
        if not svc_deployments:
            missing.append(f"No deployment or configuration audit trail recorded for '{service_id}' in the time window.")
        if not any(s.service_name == service_id for s in spans):
            missing.append(f"No direct distributed trace spans captured for '{service_id}'.")
        if not svc_logs:
            missing.append(f"No error-level structured logs found for '{service_id}'.")

        # Alternative Explanations
        for other_svc in set(a.service_name for a in anomalies if a.service_name != service_id):
            alternatives.append(f"Transient network partition or resource contention originating in '{other_svc}'")

        return {
            "supporting_evidence": supporting,
            "contradictory_evidence": contradictory,
            "missing_evidence": missing,
            "alternative_explanations": alternatives[:3]
        }

evidence_builder = EvidenceBuilder()
