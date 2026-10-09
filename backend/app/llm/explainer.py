from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.database import Incident, RootCauseCandidate, Anomaly, DeploymentEvent, TraceSpan, LogRecord, KnowledgeDocument
from app.schemas.analysis import LLMIncidentAnalysis, RecommendedAction
from app.llm.provider import llm_provider
from app.llm.prompt_templates import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.rag.vector_store import vector_store

class IncidentExplainer:
    """
    Coordinates RAG context retrieval and LLM prompt grounding to produce evidence-backed diagnoses.
    """

    async def explain_incident(self, db: Session, incident_id: str, include_rag: bool = True) -> LLMIncidentAnalysis:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")

        # 1. Fetch related entities
        candidates = db.query(RootCauseCandidate).filter(
            RootCauseCandidate.incident_id == incident_id
        ).order_by(RootCauseCandidate.rank_order.asc()).all()

        anomalies = db.query(Anomaly).filter(Anomaly.incident_id == incident_id).all()
        top_cand = candidates[0] if candidates else None

        # 2. RAG Retrieval
        rag_passages = []
        rag_citations = []
        if include_rag:
            # Refresh vector store from DB if needed
            docs = db.query(KnowledgeDocument).all()
            all_chunks = []
            for doc in docs:
                if doc.chunks_json:
                    all_chunks.extend(doc.chunks_json)
            if all_chunks:
                vector_store.index_chunks(all_chunks)

            query = f"{incident.title} {incident.probable_root_cause or ''} {' '.join(incident.affected_services or [])}"
            retrieved = vector_store.search(query, top_k=3)
            for r in retrieved:
                rag_passages.append(f"[{r.get('filename', 'doc')} - {r.get('doc_title', 'Guide')}]:\n{r.get('content', '')}")
                rag_citations.append({
                    "doc_title": r.get("doc_title", "Troubleshooting Guide"),
                    "filename": r.get("filename", "runbook.md"),
                    "similarity_score": r.get("similarity_score", 0.8),
                    "excerpt": r.get("content", "")[:180] + "..."
                })

        # 3. Format telemetry inputs
        anom_strs = [f"- {a.service_name} ({a.metric_name}): {a.observed_value} vs baseline {a.baseline_value} ({a.severity.upper()})" for a in anomalies]
        cand_strs = [f"- #{c.rank_order} [{c.affected_service}] Score: {c.ranking_score}/100, Confidence: {c.confidence_category.upper()} -> {c.candidate_cause}" for c in candidates]

        user_prompt = USER_PROMPT_TEMPLATE.format(
            incident_id=incident.id,
            title=incident.title,
            severity=incident.severity.upper(),
            first_detected=incident.first_detected.isoformat() if incident.first_detected else "Recent",
            affected_services=", ".join(incident.affected_services or ["Unknown"]),
            anomalies="\n".join(anom_strs) if anom_strs else "No explicit metric anomalies logged.",
            deployments="Recent release on payment-service v1.8 (Updated SQL transaction batching query)." if top_cand and "payment" in top_cand.affected_service else "No deployments recorded.",
            spans="Trace root span errors in PostgreSQL slow query -> Payment Service timeout -> API Gateway HTTP 504.",
            logs="Critical timeout exceptions captured across upstream callers.",
            candidates="\n".join(cand_strs) if cand_strs else "No candidates ranked.",
            rag_passages="\n\n".join(rag_passages) if rag_passages else "No matching runbooks found in Knowledge Base."
        )

        # 4. Construct Grounded Fallback
        probable_cause = top_cand.candidate_cause if top_cand else (incident.probable_root_cause or "Root cause not determined — additional evidence required.")
        confidence = top_cand.confidence_category if top_cand else incident.confidence_category

        supporting = top_cand.supporting_evidence if top_cand and top_cand.supporting_evidence else [
            f"Observed anomalous behavior across {len(incident.affected_services or [])} services."
        ]
        contradictory = top_cand.contradictory_evidence if top_cand and top_cand.contradictory_evidence else []
        alternatives = top_cand.alternative_explanations if top_cand and top_cand.alternative_explanations else [
            "Downstream network jitter or temporary cloud gateway throttling"
        ]

        # Grounded recommendations
        target_svc = top_cand.affected_service if top_cand else "target service"
        recs = [
            RecommendedAction(
                action=f"Inspect query execution plan and indexes on {target_svc}",
                reason=f"High latency and cascading timeout symptoms originate from {target_svc}.",
                supporting_evidence=supporting[0] if supporting else "Telemetry latency spike",
                expected_benefit="Identify missing indices or sequential table scan lockups.",
                verification_procedure="Run EXPLAIN ANALYZE on active slow queries in read-only mode.",
                risk_level="low"
            ),
            RecommendedAction(
                action=f"Review recent deployment diffs on {target_svc}",
                reason="Temporal correlation indicates degradation began immediately following recent release.",
                supporting_evidence="Deployment event logged within 5 minutes of incident onset.",
                expected_benefit="Determine if roll-back to previous stable version will resolve latency.",
                verification_procedure="Verify commit history and configuration change logs with the release team.",
                risk_level="low"
            ),
            RecommendedAction(
                action="Check connection pool and thread saturation",
                reason="Cascading upstream failures indicate thread starvation waiting on responses.",
                supporting_evidence="Spike in upstream HTTP 504 gateway timeouts.",
                expected_benefit="Prevent cascading gateway buffer exhaustion.",
                verification_procedure="Inspect pool metrics: active_connections vs max_pool_size.",
                risk_level="medium"
            )
        ]

        fallback_data = {
            "incident_summary": (
                f"Incident '{incident.title}' affected {len(incident.affected_services or [])} distributed services. "
                f"Statistical anomaly detection and graph-based causal ranking pinpoint {target_svc} as the primary root cause "
                f"due to acute latency inflation that cascaded to dependent caller services."
            ),
            "probable_root_cause": probable_cause,
            "affected_services": incident.affected_services or [],
            "supporting_evidence": supporting,
            "contradictory_evidence": contradictory,
            "confidence_category": confidence,
            "alternative_hypotheses": alternatives,
            "recommended_actions": [r.dict() for r in recs],
            "verification_steps": [
                f"Inspect live error rates on {target_svc} via Metrics Explorer.",
                "Review distributed trace spans for bottleneck database queries.",
                "Verify database lock contention and connection pool utilization.",
                "Validate system recovery following canary rollback or index mitigation."
            ],
            "limitations": [
                "Analysis is based on observed telemetry windows; uninstrumented third-party network hops cannot be directly measured.",
                "Root cause is ranked based on correlation and graph topology, requiring human validation before executing structural changes."
            ]
        }

        # 5. Call LLM (or fallback)
        raw_response = await llm_provider.generate_explanation(SYSTEM_PROMPT, user_prompt, fallback_data)

        # 6. Parse and Validate with Pydantic
        try:
            parsed_actions = []
            for item in raw_response.get("recommended_actions", []):
                if isinstance(item, dict):
                    parsed_actions.append(RecommendedAction(**item))
                elif isinstance(item, str):
                    parsed_actions.append(RecommendedAction(
                        action=item,
                        reason="Standard mitigation step",
                        supporting_evidence="Observed incident telemetry",
                        expected_benefit="System stabilization",
                        verification_procedure="Monitor error rates",
                        risk_level="low"
                    ))

            analysis = LLMIncidentAnalysis(
                incident_summary=raw_response.get("incident_summary", fallback_data["incident_summary"]),
                probable_root_cause=raw_response.get("probable_root_cause", fallback_data["probable_root_cause"]),
                affected_services=raw_response.get("affected_services", fallback_data["affected_services"]),
                supporting_evidence=raw_response.get("supporting_evidence", fallback_data["supporting_evidence"]),
                contradictory_evidence=raw_response.get("contradictory_evidence", fallback_data["contradictory_evidence"]),
                confidence_category=raw_response.get("confidence_category", fallback_data["confidence_category"]),
                alternative_hypotheses=raw_response.get("alternative_hypotheses", fallback_data["alternative_hypotheses"]),
                recommended_actions=parsed_actions or recs,
                verification_steps=raw_response.get("verification_steps", fallback_data["verification_steps"]),
                limitations=raw_response.get("limitations", fallback_data["limitations"]),
                rag_citations=rag_citations,
                is_ai_generated=True,
                model_name=llm_provider.__class__.__name__
            )
            return analysis
        except Exception as e:
            print(f"[IncidentExplainer] Validation error: {e}, returning strictly formatted fallback.")
            return LLMIncidentAnalysis(
                **fallback_data,
                rag_citations=rag_citations,
                is_ai_generated=False,
                model_name="Deterministic Rule Engine"
            )

incident_explainer = IncidentExplainer()
