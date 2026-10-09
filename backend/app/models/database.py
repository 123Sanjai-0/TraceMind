import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False)  # "frontend", "api_gateway", "service", "database", "cache", "queue", "external_api"
    health_status = Column(String, default="healthy")  # "healthy", "degraded", "critical", "unknown"
    request_rate = Column(Float, default=0.0)  # req/sec
    error_rate = Column(Float, default=0.0)    # %
    avg_latency = Column(Float, default=0.0)   # ms
    p95_latency = Column(Float, default=0.0)   # ms
    p99_latency = Column(Float, default=0.0)   # ms
    cpu_util = Column(Float, default=0.0)      # %
    memory_util = Column(Float, default=0.0)   # %
    last_observed = Column(DateTime, default=datetime.datetime.utcnow)
    is_simulated = Column(Boolean, default=True)
    metadata_json = Column(JSON, default=dict)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    severity = Column(String, default="medium")  # "low", "medium", "high", "critical"
    status = Column(String, default="open")      # "open", "investigating", "resolved", "false_positive"
    first_detected = Column(DateTime, default=datetime.datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    affected_services = Column(JSON, default=list)
    probable_root_cause = Column(String, nullable=True)
    summary = Column(Text, nullable=True)
    confidence_category = Column(String, default="medium")  # "low", "medium", "high", "undetermined"
    is_simulated = Column(Boolean, default=True)
    simulation_scenario = Column(String, nullable=True)

    anomalies = relationship("Anomaly", back_populates="incident", cascade="all, delete-orphan")
    candidates = relationship("RootCauseCandidate", back_populates="incident", cascade="all, delete-orphan")

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True, index=True)
    service_name = Column(String, index=True, nullable=False)
    metric_name = Column(String, nullable=False)
    observed_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=False)
    deviation_pct = Column(Float, default=0.0)
    severity = Column(String, default="medium")  # "low", "medium", "high", "critical"
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    detection_method = Column(String, default="z_score")  # "z_score", "moving_window", "threshold", "isolation_forest"
    time_window = Column(String, default="15m")
    supporting_evidence = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True)

    incident = relationship("Incident", back_populates="anomalies")

class DeploymentEvent(Base):
    __tablename__ = "deployment_events"

    id = Column(String, primary_key=True, index=True)
    service_name = Column(String, index=True, nullable=False)
    previous_version = Column(String, nullable=False)
    new_version = Column(String, nullable=False)
    deployed_at = Column(DateTime, default=datetime.datetime.utcnow)
    environment = Column(String, default="production")
    change_description = Column(Text, nullable=False)
    commit_hash = Column(String, nullable=True)
    author = Column(String, default="devops-team")
    is_simulated = Column(Boolean, default=True)

class RootCauseCandidate(Base):
    __tablename__ = "root_cause_candidates"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True, nullable=False)
    candidate_cause = Column(String, nullable=False)
    affected_service = Column(String, nullable=False)
    ranking_score = Column(Float, default=0.0)  # 0.0 to 100.0 explainable score
    confidence_category = Column(String, default="medium")  # "low", "medium", "high"
    rank_order = Column(Integer, default=1)
    
    # Feature scoring breakdown for transparency
    temporal_score = Column(Float, default=0.0)
    dependency_score = Column(Float, default=0.0)
    trace_score = Column(Float, default=0.0)
    metric_score = Column(Float, default=0.0)
    deployment_score = Column(Float, default=0.0)
    downstream_impact_count = Column(Integer, default=0)
    
    supporting_evidence = Column(JSON, default=list)
    contradictory_evidence = Column(JSON, default=list)
    missing_evidence = Column(JSON, default=list)
    alternative_explanations = Column(JSON, default=list)
    affected_downstream_services = Column(JSON, default=list)

    incident = relationship("Incident", back_populates="candidates")

class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True, nullable=False)
    candidate_id = Column(String, ForeignKey("root_cause_candidates.id"), nullable=True)
    evidence_type = Column(String, nullable=False)  # "metric", "log", "trace", "deployment", "dependency"
    description = Column(Text, nullable=False)
    severity = Column(String, default="medium")
    confidence = Column(Float, default=0.8)
    source_ref = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "markdown", "text", "pdf"
    content_text = Column(Text, nullable=False)
    chunks_json = Column(JSON, default=list)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON, default=dict)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, default="operator")
    action = Column(String, nullable=False)  # "status_change", "simulation_run", "doc_upload", "config_update"
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ApplicationSetting(Base):
    __tablename__ = "application_settings"

    key = Column(String, primary_key=True)
    value_json = Column(JSON, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class LogRecord(Base):
    __tablename__ = "log_records"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_name = Column(String, index=True, nullable=False)
    severity = Column(String, index=True, default="INFO")  # "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"
    trace_id = Column(String, index=True, nullable=True)
    span_id = Column(String, nullable=True)
    request_id = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    error_type = Column(String, nullable=True)
    environment = Column(String, default="production")
    deployment_version = Column(String, default="1.0.0")
    is_simulated = Column(Boolean, default=True)

class MetricRecord(Base):
    __tablename__ = "metric_records"

    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    service_name = Column(String, index=True, nullable=False)
    metric_name = Column(String, index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    unit = Column(String, default="ms")
    environment = Column(String, default="production")
    is_simulated = Column(Boolean, default=True)

class TraceSpan(Base):
    __tablename__ = "trace_spans"

    id = Column(String, primary_key=True, index=True)
    trace_id = Column(String, index=True, nullable=False)
    span_id = Column(String, index=True, nullable=False)
    parent_span_id = Column(String, nullable=True)
    service_name = Column(String, index=True, nullable=False)
    operation_name = Column(String, nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    duration_ms = Column(Float, default=0.0)
    status_code = Column(String, default="OK")  # "OK", "ERROR", "UNSET"
    error_message = Column(Text, nullable=True)
    attributes_json = Column(JSON, default=dict)
    is_simulated = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default="sub-active")
    plan_id = Column(String, default="pro")  # "starter", "pro", "enterprise"
    plan_name = Column(String, default="TraceMind Pro")
    status = Column(String, default="active")  # "active", "trialing", "past_due", "canceled"
    billing_cycle = Column(String, default="monthly")
    monthly_price_usd = Column(Float, default=199.0)
    current_period_start = Column(DateTime, default=datetime.datetime.utcnow)
    current_period_end = Column(DateTime, default=lambda: datetime.datetime.utcnow() + datetime.timedelta(days=30))
    max_services = Column(Integer, default=15)
    max_spans_per_month = Column(Integer, default=1000000)
    spans_consumed_this_month = Column(Integer, default=642100)
    max_ai_rca_queries_per_month = Column(Integer, default=100)
    ai_rca_queries_consumed = Column(Integer, default=28)
    retention_days = Column(Integer, default=30)
    features_json = Column(JSON, default=list)
    payment_method_json = Column(JSON, default=dict)
    invoices_json = Column(JSON, default=list)

