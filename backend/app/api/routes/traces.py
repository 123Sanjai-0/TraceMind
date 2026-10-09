from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.database import TraceSpan
from app.schemas.telemetry import TraceSpanResponse

router = APIRouter(prefix="/traces", tags=["Traces"])

@router.get("", response_model=List[TraceSpanResponse])
def get_traces(
    service_name: Optional[str] = None,
    status_code: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(TraceSpan)
    if service_name:
        query = query.filter(TraceSpan.service_name == service_name)
    if status_code:
        query = query.filter(TraceSpan.status_code == status_code)
    return query.order_by(TraceSpan.start_time.desc()).limit(limit).all()

@router.get("/{trace_id}", response_model=List[TraceSpanResponse])
def get_trace_waterfall(trace_id: str, db: Session = Depends(get_db)):
    spans = db.query(TraceSpan).filter(TraceSpan.trace_id == trace_id).order_by(TraceSpan.start_time.asc()).all()
    if not spans:
        raise HTTPException(status_code=404, detail=f"Trace with ID '{trace_id}' not found")
    return spans
