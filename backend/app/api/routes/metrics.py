from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.models.database import MetricRecord, Service
from app.schemas.telemetry import MetricRecordResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("", response_model=List[MetricRecordResponse])
def get_metrics(
    service_name: Optional[str] = None,
    metric_name: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(MetricRecord)
    if service_name:
        query = query.filter(MetricRecord.service_name == service_name)
    if metric_name:
        query = query.filter(MetricRecord.metric_name == metric_name)
    return query.order_by(MetricRecord.timestamp.desc()).limit(limit).all()

@router.get("/summary")
def get_metrics_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    services = db.query(Service).all()
    total_services = len(services)
    healthy_count = sum(1 for s in services if s.health_status == "healthy")
    degraded_count = sum(1 for s in services if s.health_status == "degraded")
    critical_count = sum(1 for s in services if s.health_status == "critical")

    avg_latency = sum(s.avg_latency for s in services) / max(total_services, 1)
    p95_latency = max((s.p95_latency for s in services), default=0.0)
    avg_error_rate = sum(s.error_rate for s in services) / max(total_services, 1)
    total_throughput = sum(s.request_rate for s in services)

    return {
        "total_services": total_services,
        "healthy_services": healthy_count,
        "degraded_services": degraded_count,
        "critical_services": critical_count,
        "avg_latency_ms": round(avg_latency, 1),
        "p95_latency_ms": round(p95_latency, 1),
        "avg_error_rate": round(avg_error_rate, 4),
        "total_throughput_rps": round(total_throughput, 1)
    }
