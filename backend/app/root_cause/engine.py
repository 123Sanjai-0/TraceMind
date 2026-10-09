import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.database import Incident, RootCauseCandidate, Anomaly, DeploymentEvent, TraceSpan, LogRecord, EvidenceRecord
from app.correlation.event_correlator import event_correlation_engine
from app.graph.service_graph import service_graph_engine
from app.root_cause.scorer import root_cause_scorer
from app.root_cause.evidence_builder import evidence_builder

class RootCauseAnalysisEngine:
    """
    Dedicated Root-Cause Analysis (RCA) Engine.
    Correlates multi-modal telemetry across the service dependency graph,
    ranks probable root-cause candidates using explainable scoring, and compiles structured evidence.
    """

    def analyze_incident(self, db: Session, incident_id: str) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident with ID {incident_id} not found")

        # 1. Correlate all events
        start_time = incident.first_detected or datetime.datetime.utcnow()
        end_time = incident.last_updated or datetime.datetime.utcnow()
        chain = event_correlation_engine.correlate_incident_events(db, incident_id, start_time, end_time)

        # Clear existing candidates & evidence for this incident
        db.query(RootCauseCandidate).filter(RootCauseCandidate.incident_id == incident_id).delete()
        db.query(EvidenceRecord).filter(EvidenceRecord.incident_id == incident_id).delete()

        affected_services = chain.affected_services
        if not affected_services:
            incident.probable_root_cause = "Root cause not determined — additional evidence required."
            incident.confidence_category = "undetermined"
            incident.summary = "No anomalous telemetry or error logs recorded within the incident time window."
            db.commit()
            db.refresh(incident)
            return incident

        # 2. Identify first incident anomaly time
        first_incident_anomaly_time = min([a.detected_at for a in chain.anomalies]) if chain.anomalies else start_time

        # Find which services have root error trace spans
        trace_originators = set()
        for span in chain.spans:
            if span.status_code == "ERROR" and (span.parent_span_id is None or span.parent_span_id == ""):
                trace_originators.add(span.service_name)

        # If no root span, find the deepest span with error
        if not trace_originators and chain.spans:
            error_spans = [s for s in chain.spans if s.status_code == "ERROR"]
            if error_spans:
                # pick leaf span service
                trace_originators.add(error_spans[-1].service_name)

        candidates_data = []

        for svc_id in affected_services:
            svc_anomalies = [a for a in chain.anomalies if a.service_name == svc_id]
            svc_deployments = [d for d in chain.deployments if d.service_name == svc_id]
            earliest_svc_anom_time = min([a.detected_at for a in svc_anomalies]) if svc_anomalies else None

            # Graph dependency relationships
            downstream_affected = service_graph_engine.get_downstream_dependents(svc_id)
            downstream_affected_in_incident = [s for s in downstream_affected if s in affected_services]
            
            topological_depth = service_graph_engine.get_topological_depth(svc_id)
            # A service is the deepest failing dependency if none of its called dependencies in graph are failing
            dependencies_of_svc = service_graph_engine.get_dependencies_of(svc_id)
            is_deepest = not any(dep in affected_services for dep in dependencies_of_svc)

            # Metric deviations
            max_z = 0.0
            max_dev_pct = 0.0
            for a in svc_anomalies:
                if a.deviation_pct > max_dev_pct:
                    max_dev_pct = a.deviation_pct
                if "Z-score:" in (a.supporting_evidence or ""):
                    try:
                        part = a.supporting_evidence.split("Z-score:")[1].split(")")[0].strip()
                        z_val = float(part)
                        if z_val > max_z:
                            max_z = z_val
                    except Exception:
                        pass

            # Deployment timing
            has_deployment = len(svc_deployments) > 0
            dep_delta_mins = None
            if has_deployment:
                dep_time = svc_deployments[0].deployed_at
                dep_delta_mins = abs((start_time - dep_time).total_seconds()) / 60.0

            # Compute transparent score
            scores = root_cause_scorer.compute_candidate_score(
                service_id=svc_id,
                earliest_anomaly_time=earliest_svc_anom_time,
                first_incident_anomaly_time=first_incident_anomaly_time,
                topological_depth=topological_depth,
                is_deepest_failing_dependency=is_deepest,
                downstream_affected_count=len(downstream_affected_in_incident),
                is_trace_error_originator=(svc_id in trace_originators or any(s.service_name == svc_id for s in chain.spans if s.status_code == "ERROR")),
                max_z_score=max_z if max_z > 0 else (3.0 if max_dev_pct > 100 else 1.0),
                max_deviation_pct=max_dev_pct,
                has_recent_deployment=has_deployment,
                deployment_minutes_delta=dep_delta_mins
            )

            # Build evidence dossier
            dossier = evidence_builder.build_evidence_dossier(
                service_id=svc_id,
                anomalies=chain.anomalies,
                deployments=chain.deployments,
                spans=chain.spans,
                logs=chain.logs,
                downstream_affected=downstream_affected_in_incident
            )

            candidate_cause_desc = f"Service degradation and failure propagation originating in '{svc_id}'"
            if has_deployment:
                candidate_cause_desc = f"Deployment regression on '{svc_id}' triggering cascading downstream failures"
            elif "database" in svc_id or "postgres" in svc_id:
                candidate_cause_desc = f"Database query latency escalation and lock contention on '{svc_id}'"
            elif "cache" in svc_id or "redis" in svc_id:
                candidate_cause_desc = f"Cache hit-rate drop / key eviction storm on '{svc_id}'"

            candidates_data.append({
                "service_id": svc_id,
                "candidate_cause": candidate_cause_desc,
                "scores": scores,
                "dossier": dossier,
                "downstream_affected": downstream_affected_in_incident
            })

        # Sort candidates descending by ranking score
        candidates_data.sort(key=lambda x: x["scores"]["ranking_score"], reverse=True)

        # Persist Candidates
        saved_candidates = []
        for rank, c_data in enumerate(candidates_data, start=1):
            scores = c_data["scores"]
            dossier = c_data["dossier"]
            cand_id = f"cand-{uuid.uuid4().hex[:8]}"

            cand_obj = RootCauseCandidate(
                id=cand_id,
                incident_id=incident_id,
                candidate_cause=c_data["candidate_cause"],
                affected_service=c_data["service_id"],
                ranking_score=scores["ranking_score"],
                confidence_category=scores["confidence_category"],
                rank_order=rank,
                temporal_score=scores["temporal_score"],
                dependency_score=scores["dependency_score"],
                trace_score=scores["trace_score"],
                metric_score=scores["metric_score"],
                deployment_score=scores["deployment_score"],
                downstream_impact_count=len(c_data["downstream_affected"]),
                supporting_evidence=dossier["supporting_evidence"],
                contradictory_evidence=dossier["contradictory_evidence"],
                missing_evidence=dossier["missing_evidence"],
                alternative_explanations=dossier["alternative_explanations"],
                affected_downstream_services=c_data["downstream_affected"]
            )
            db.add(cand_obj)
            saved_candidates.append(cand_obj)

            # Persist Evidence Records
            for sup in dossier["supporting_evidence"][:5]:
                ev_rec = EvidenceRecord(
                    id=f"ev-{uuid.uuid4().hex[:8]}",
                    incident_id=incident_id,
                    candidate_id=cand_id,
                    evidence_type="telemetry_correlation",
                    description=sup,
                    severity="high",
                    confidence=0.85,
                    timestamp=datetime.datetime.utcnow()
                )
                db.add(ev_rec)

        # Update Incident Top Cause & Summary
        if saved_candidates:
            top_cand = saved_candidates[0]
            incident.probable_root_cause = top_cand.candidate_cause
            incident.confidence_category = top_cand.confidence_category
            incident.affected_services = affected_services
            incident.summary = (
                f"Root-cause analysis ranks '{top_cand.affected_service}' as the most probable failure root cause "
                f"(Score: {top_cand.ranking_score}/100, Confidence: {top_cand.confidence_category.upper()}). "
                f"{len(top_cand.supporting_evidence)} supporting evidence signals correlated across dependencies."
            )
        else:
            incident.probable_root_cause = "Root cause not determined — additional evidence required."
            incident.confidence_category = "undetermined"

        incident.last_updated = datetime.datetime.utcnow()
        db.commit()
        db.refresh(incident)
        return incident

root_cause_analysis_engine = RootCauseAnalysisEngine()
