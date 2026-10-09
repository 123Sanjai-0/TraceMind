from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from app.core.database import get_db
from app.models.database import Service, Anomaly
from app.graph.service_graph import service_graph_engine

router = APIRouter(prefix="/dependency-graph", tags=["Dependency Graph"])

@router.get("")
def get_dependency_graph(
    highlight_incident_id: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    services = db.query(Service).all()
    anomalies = db.query(Anomaly).all()

    service_statuses = {}
    for svc in services:
        svc_anoms = [a for a in anomalies if a.service_name == svc.id]
        service_statuses[svc.id] = {
            "health_status": svc.health_status,
            "error_rate": svc.error_rate,
            "avg_latency": svc.avg_latency,
            "anomaly_count": len(svc_anoms)
        }

    highlighted_path = None
    if highlight_incident_id:
        incident_anomalies = db.query(Anomaly).filter(Anomaly.incident_id == highlight_incident_id).all()
        highlighted_path = list(set(a.service_name for a in incident_anomalies))

    react_flow_data = service_graph_engine.to_react_flow(
        service_statuses=service_statuses,
        highlighted_path=highlighted_path
    )
    return react_flow_data
