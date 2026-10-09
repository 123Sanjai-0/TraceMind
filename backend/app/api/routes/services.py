from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.database import Service, MetricRecord, LogRecord, TraceSpan
from app.schemas.telemetry import ServiceResponse, MetricRecordResponse, LogRecordResponse, TraceSpanResponse

router = APIRouter(prefix="/services", tags=["Services"])

@router.get("", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return services

@router.get("/{service_id}", response_model=ServiceResponse)
def get_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")
    return svc

@router.get("/{service_id}/metrics", response_model=List[MetricRecordResponse])
def get_service_metrics(
    service_id: str,
    metric_name: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(MetricRecord).filter(MetricRecord.service_name == service_id)
    if metric_name:
        query = query.filter(MetricRecord.metric_name == metric_name)
    return query.order_by(MetricRecord.timestamp.desc()).limit(limit).all()

@router.get("/{service_id}/logs", response_model=List[LogRecordResponse])
def get_service_logs(
    service_id: str,
    severity: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(LogRecord).filter(LogRecord.service_name == service_id)
    if severity:
        query = query.filter(LogRecord.severity == severity.upper())
    return query.order_by(LogRecord.timestamp.desc()).limit(limit).all()

@router.get("/{service_id}/traces", response_model=List[TraceSpanResponse])
def get_service_traces(
    service_id: str,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    return db.query(TraceSpan).filter(
        TraceSpan.service_name == service_id
    ).order_by(TraceSpan.start_time.desc()).limit(limit).all()
