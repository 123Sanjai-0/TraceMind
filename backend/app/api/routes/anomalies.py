from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.database import Anomaly
from app.schemas.incident import AnomalyResponse
from app.detection.detector import anomaly_detector_service

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyResponse])
def get_anomalies(
    service_name: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Anomaly)
    if service_name:
        query = query.filter(Anomaly.service_name == service_name)
    if severity:
        query = query.filter(Anomaly.severity == severity)
    return query.order_by(Anomaly.detected_at.desc()).limit(limit).all()

@router.post("/detect", response_model=List[AnomalyResponse])
def trigger_anomaly_detection(db: Session = Depends(get_db)):
    anomalies = anomaly_detector_service.scan_all_services(db)
    return anomalies
