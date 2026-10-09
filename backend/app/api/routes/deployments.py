from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.database import DeploymentEvent
from app.schemas.telemetry import DeploymentEventResponse

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.get("", response_model=List[DeploymentEventResponse])
def get_deployments(
    service_name: Optional[str] = None,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(DeploymentEvent)
    if service_name:
        query = query.filter(DeploymentEvent.service_name == service_name)
    return query.order_by(DeploymentEvent.deployed_at.desc()).limit(limit).all()
