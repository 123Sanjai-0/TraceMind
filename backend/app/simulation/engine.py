import uuid
import time
import datetime
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.database import (
    Service, Incident, Anomaly, DeploymentEvent, TraceSpan, LogRecord, MetricRecord, RootCauseCandidate
)
from app.simulation.scenarios import SCENARIOS
from app.detection.detector import anomaly_detector_service
from app.root_cause.engine import root_cause_analysis_engine
from app.llm.explainer import incident_explainer
from app.schemas.simulation import SimulationResponse
from app.schemas.incident import IncidentResponse

class SimulationEngine:
    """
    Reproducible Incident Simulation Engine.
    Generates consistent synthetic telemetry (logs, metrics, traces, deployments),
    triggers anomaly detection, runs graph-based RCA, and produces grounded AI analysis.
    """

    def initialize_services(self, db: Session):
        """Initializes default 9 microservices if not already in DB."""
        default_services = [
            {"id": "frontend", "name": "Frontend", "type": "frontend"},
            {"id": "api-gateway", "name": "API Gateway", "type": "api_gateway"},
            {"id": "auth-service", "name": "Auth Service", "type": "service"},
            {"id": "order-service", "name": "Order Service", "type": "service"},
            {"id": "payment-service", "name": "Payment Service", "type": "service"},
            {"id": "postgres-db", "name": "PostgreSQL Database", "type": "database"},
            {"id": "redis-cache", "name": "Redis Cache", "type": "cache"},
            {"id": "message-queue", "name": "Message Queue", "type": "queue"},
            {"id": "external-payment-api", "name": "External Payment API", "type": "external_api"},
        ]

        for s in default_services:
            existing = db.query(Service).filter(Service.id == s["id"]).first()
            if not existing:
                svc = Service(
                    id=s["id"],
                    name=s["name"],
                    type=s["type"],
                    health_status="healthy",
                    request_rate=round(random.uniform(50.0, 200.0), 1),
                    error_rate=0.001,
                    avg_latency=round(random.uniform(10.0, 30.0), 1),
                    p95_latency=round(random.uniform(25.0, 55.0), 1),
                    p99_latency=round(random.uniform(45.0, 85.0), 1),
                    cpu_util=round(random.uniform(20.0, 38.0), 1),
                    memory_util=round(random.uniform(30.0, 48.0), 1),
                    last_observed=datetime.datetime.utcnow(),
                    is_simulated=True
                )
                db.add(svc)
        db.commit()

    async def run_simulation(
        self,
        db: Session,
        scenario_id: str = "db_query_regression",
        noise_level: float = 0.05,
        run_llm: bool = True
    ) -> SimulationResponse:
        start_exec_time = time.time()
        self.initialize_services(db)

        scenario = SCENARIOS.get(scenario_id, SCENARIOS["db_query_regression"])
        now = datetime.datetime.utcnow()
        incident_id = f"inc-{uuid.uuid4().hex[:8]}"

        logs_count = 0
        metrics_count = 0
        traces_count = 0

        # 1. Generate Baseline Metrics (past 15 minutes, 15 points per service)
        services = db.query(Service).all()
        for svc in services:
            base_lat = 20.0 if svc.type != "database" else 12.0
            for i in range(15, 0, -1):
                ts = now - datetime.timedelta(minutes=i)
                m_lat = MetricRecord(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    timestamp=ts,
                    service_name=svc.id,
                    metric_name="latency",
                    metric_value=round(base_lat + random.uniform(-3, 3), 2),
                    unit="ms",
                    is_simulated=True
                )
                m_err = MetricRecord(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    timestamp=ts,
                    service_name=svc.id,
                    metric_name="error_rate",
                    metric_value=round(random.uniform(0.0001, 0.003), 4),
                    unit="ratio",
                    is_simulated=True
                )
                db.add(m_lat)
                db.add(m_err)
                metrics_count += 2

        # 2. Add Deployment Event
        dep_data = scenario.get("deployment")
        if dep_data:
            dep = DeploymentEvent(
                id=f"dep-{uuid.uuid4().hex[:8]}",
                service_name=dep_data["service_name"],
                previous_version=dep_data["previous_version"],
                new_version=dep_data["new_version"],
                deployed_at=now - datetime.timedelta(minutes=6),
                environment="production",
                change_description=dep_data["change_description"],
                commit_hash=uuid.uuid4().hex[:7],
                author="release-bot",
                is_simulated=True
            )
            db.add(dep)

        # 3. Apply Scenario Failure Effects to Services & Telemetry
        effects = scenario["service_effects"]
        for svc in services:
            eff = effects.get(svc.id, {"latency": 25.0, "error_rate": 0.0, "cpu": 25.0, "health": "healthy"})
            svc.health_status = eff["health"]
            svc.p95_latency = round(eff["latency"] * (1.0 + random.uniform(-noise_level, noise_level)), 1)
            svc.avg_latency = round(svc.p95_latency * 0.75, 1)
            svc.p99_latency = round(svc.p95_latency * 1.35, 1)
            svc.error_rate = round(eff["error_rate"], 4)
            svc.cpu_util = round(eff["cpu"], 1)
            svc.last_observed = now

            # Insert anomalous metric records
            for m_offset in [4, 2, 0]:
                ts = now - datetime.timedelta(minutes=m_offset)
                db.add(MetricRecord(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    timestamp=ts,
                    service_name=svc.id,
                    metric_name="latency",
                    metric_value=svc.p95_latency,
                    unit="ms",
                    is_simulated=True
                ))
                db.add(MetricRecord(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    timestamp=ts,
                    service_name=svc.id,
                    metric_name="error_rate",
                    metric_value=svc.error_rate,
                    unit="ratio",
                    is_simulated=True
                ))
                metrics_count += 2

        # 4. Generate Correlated Distributed Traces & Logs
        for req_idx in range(12):
            trace_id = f"trc-{uuid.uuid4().hex[:12]}"
            req_id = f"req-{uuid.uuid4().hex[:8]}"
            is_err_trace = req_idx % 2 == 0

            # Root Gateway Span
            gw_span_id = f"sp-{uuid.uuid4().hex[:8]}"
            gw_dur = 1100.0 if is_err_trace else 180.0
            gw_span = TraceSpan(
                id=f"span-{uuid.uuid4().hex[:8]}",
                trace_id=trace_id,
                span_id=gw_span_id,
                parent_span_id=None,
                service_name="api-gateway",
                operation_name="POST /api/v1/orders/checkout",
                start_time=now - datetime.timedelta(seconds=req_idx * 15),
                duration_ms=gw_dur,
                status_code="ERROR" if is_err_trace else "OK",
                error_message="HTTP 504 Gateway Timeout upstream" if is_err_trace else None,
                attributes_json={"http.status_code": 504 if is_err_trace else 200, "http.method": "POST"},
                is_simulated=True
            )
            db.add(gw_span)
            traces_count += 1

            # Order Service Child Span
            order_span_id = f"sp-{uuid.uuid4().hex[:8]}"
            order_dur = 950.0 if is_err_trace else 140.0
            order_span = TraceSpan(
                id=f"span-{uuid.uuid4().hex[:8]}",
                trace_id=trace_id,
                span_id=order_span_id,
                parent_span_id=gw_span_id,
                service_name="order-service",
                operation_name="OrderService::CreateOrder",
                start_time=now - datetime.timedelta(seconds=req_idx * 15) + datetime.timedelta(milliseconds=10),
                duration_ms=order_dur,
                status_code="ERROR" if is_err_trace else "OK",
                error_message="Payment service client timeout (deadline exceeded: 800ms)" if is_err_trace else None,
                attributes_json={"order.id": f"ord-{req_idx+100}"},
                is_simulated=True
            )
            db.add(order_span)
            traces_count += 1

            # Payment Service Child Span
            pay_span_id = f"sp-{uuid.uuid4().hex[:8]}"
            pay_dur = 900.0 if is_err_trace else 90.0
            pay_span = TraceSpan(
                id=f"span-{uuid.uuid4().hex[:8]}",
                trace_id=trace_id,
                span_id=pay_span_id,
                parent_span_id=order_span_id,
                service_name="payment-service",
                operation_name="PaymentService::AuthorizePayment",
                start_time=now - datetime.timedelta(seconds=req_idx * 15) + datetime.timedelta(milliseconds=20),
                duration_ms=pay_dur,
                status_code="ERROR" if is_err_trace else "OK",
                error_message="PostgreSQL query execution time exceeded threshold" if is_err_trace else None,
                attributes_json={"payment.method": "credit_card"},
                is_simulated=True
            )
            db.add(pay_span)
            traces_count += 1

            # Postgres Leaf Span
            db_span_id = f"sp-{uuid.uuid4().hex[:8]}"
            db_dur = 840.0 if is_err_trace else 15.0
            db_span = TraceSpan(
                id=f"span-{uuid.uuid4().hex[:8]}",
                trace_id=trace_id,
                span_id=db_span_id,
                parent_span_id=pay_span_id,
                service_name="postgres-db",
                operation_name="SELECT * FROM payment_audit WHERE customer_id = ?",
                start_time=now - datetime.timedelta(seconds=req_idx * 15) + datetime.timedelta(milliseconds=30),
                duration_ms=db_dur,
                status_code="ERROR" if is_err_trace else "OK",
                error_message="Query execution slow (missing index on customer_id)" if is_err_trace else None,
                attributes_json={"db.system": "postgresql", "db.statement": "SELECT * FROM payment_audit WHERE customer_id = ?"},
                is_simulated=True
            )
            db.add(db_span)
            traces_count += 1

            # Logs
            if is_err_trace:
                db.add(LogRecord(
                    id=f"log-{uuid.uuid4().hex[:8]}",
                    timestamp=now - datetime.timedelta(seconds=req_idx * 15),
                    service_name="postgres-db",
                    severity="ERROR",
                    trace_id=trace_id,
                    span_id=db_span_id,
                    request_id=req_id,
                    message="Sequential scan on payment_audit table took 840ms (lock contention on buffer)",
                    error_type="SlowQueryWarning",
                    deployment_version="1.8.0",
                    is_simulated=True
                ))
                db.add(LogRecord(
                    id=f"log-{uuid.uuid4().hex[:8]}",
                    timestamp=now - datetime.timedelta(seconds=req_idx * 15) + datetime.timedelta(milliseconds=25),
                    service_name="payment-service",
                    severity="ERROR",
                    trace_id=trace_id,
                    span_id=pay_span_id,
                    request_id=req_id,
                    message="Database operation timeout after 800ms while persisting payment audit batch",
                    error_type="DatabaseTimeoutException",
                    deployment_version="1.8.0",
                    is_simulated=True
                ))
                db.add(LogRecord(
                    id=f"log-{uuid.uuid4().hex[:8]}",
                    timestamp=now - datetime.timedelta(seconds=req_idx * 15) + datetime.timedelta(milliseconds=50),
                    service_name="api-gateway",
                    severity="CRITICAL",
                    trace_id=trace_id,
                    span_id=gw_span_id,
                    request_id=req_id,
                    message="Upstream request failed with HTTP 504 for /api/v1/orders/checkout",
                    error_type="GatewayTimeout",
                    deployment_version="1.4.2",
                    is_simulated=True
                ))
                logs_count += 3
            else:
                db.add(LogRecord(
                    id=f"log-{uuid.uuid4().hex[:8]}",
                    timestamp=now - datetime.timedelta(seconds=req_idx * 15),
                    service_name="api-gateway",
                    severity="INFO",
                    trace_id=trace_id,
                    span_id=gw_span_id,
                    request_id=req_id,
                    message="HTTP 200 OK /api/v1/orders/checkout",
                    is_simulated=True
                ))
                logs_count += 1

        db.commit()

        # 5. Create Incident Record
        incident = Incident(
            id=incident_id,
            title=f"Incident: {scenario['name']}",
            severity="critical",
            status="open",
            first_detected=now - datetime.timedelta(minutes=5),
            last_updated=now,
            affected_services=scenario["affected_services"],
            is_simulated=True,
            simulation_scenario=scenario_id
        )
        db.add(incident)
        db.commit()

        # 6. Run Anomaly Detection
        anomalies = anomaly_detector_service.scan_all_services(db, incident_id=incident_id)

        # 7. Run Root-Cause Analysis
        incident = root_cause_analysis_engine.analyze_incident(db, incident_id)

        # 8. Run AI Grounded Explanation
        ai_analysis = None
        if run_llm:
            try:
                ai_analysis = await incident_explainer.explain_incident(db, incident_id, include_rag=True)
            except Exception as e:
                print(f"[SimulationEngine] LLM explanation failed: {e}")

        exec_time_ms = round((time.time() - start_exec_time) * 1000.0, 2)

        # Build response
        db.refresh(incident)
        incident_res = IncidentResponse.model_validate(incident)

        return SimulationResponse(
            simulation_id=f"sim-{uuid.uuid4().hex[:8]}",
            scenario_id=scenario_id,
            scenario_name=scenario["name"],
            incident=incident_res,
            logs_generated_count=logs_count,
            metrics_generated_count=metrics_count,
            traces_generated_count=traces_count,
            anomalies_detected_count=len(anomalies),
            ai_analysis=ai_analysis,
            execution_time_ms=exec_time_ms,
            status="success"
        )

simulation_engine = SimulationEngine()
