from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.core.database import get_db
from app.models.database import Incident, AuditLog
from app.schemas.incident import IncidentResponse, IncidentUpdate
from app.root_cause.engine import root_cause_analysis_engine

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    return query.order_by(Incident.first_detected.desc()).limit(limit).all()

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    db: Session = Depends(get_db)
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")

    old_status = inc.status
    if update_data.status is not None:
        inc.status = update_data.status
    if update_data.severity is not None:
        inc.severity = update_data.severity
    if update_data.title is not None:
        inc.title = update_data.title
    if update_data.summary is not None:
        inc.summary = update_data.summary

    inc.last_updated = datetime.datetime.utcnow()

    # Record audit log
    audit = AuditLog(
        id=f"aud-{datetime.datetime.utcnow().timestamp()}",
        user_id="operator",
        action="incident_update",
        entity_type="incident",
        entity_id=incident_id,
        details_json={
            "old_status": old_status,
            "new_status": inc.status,
            "changes": update_data.dict(exclude_unset=True)
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(inc)
    return inc

@router.post("/{incident_id}/analyze", response_model=IncidentResponse)
def trigger_rca(incident_id: str, db: Session = Depends(get_db)):
    try:
        inc = root_cause_analysis_engine.analyze_incident(db, incident_id)
        return inc
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
