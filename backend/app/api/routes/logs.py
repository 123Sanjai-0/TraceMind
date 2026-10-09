from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.database import LogRecord
from app.schemas.telemetry import LogRecordResponse

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("", response_model=List[LogRecordResponse])
def get_logs(
    service_name: Optional[str] = None,
    severity: Optional[str] = None,
    trace_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(LogRecord)
    if service_name:
        query = query.filter(LogRecord.service_name == service_name)
    if severity:
        query = query.filter(LogRecord.severity == severity.upper())
    if trace_id:
        query = query.filter(LogRecord.trace_id == trace_id)
    if search:
        query = query.filter(LogRecord.message.ilike(f"%{search}%"))

    return query.order_by(LogRecord.timestamp.desc()).limit(limit).all()
