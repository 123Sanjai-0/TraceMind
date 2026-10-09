from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class AnomalyBase(BaseModel):
    id: str
    incident_id: Optional[str] = None
    service_name: str
    metric_name: str
    observed_value: float
    baseline_value: float
    deviation_pct: float
    severity: str
    detected_at: datetime
    detection_method: str
    time_window: str
    supporting_evidence: Optional[str] = None
    is_simulated: bool = True

class AnomalyResponse(AnomalyBase):
    class Config:
        from_attributes = True

class RootCauseCandidateBase(BaseModel):
    id: str
    incident_id: str
    candidate_cause: str
    affected_service: str
    ranking_score: float
    confidence_category: str
    rank_order: int
    temporal_score: float = 0.0
    dependency_score: float = 0.0
    trace_score: float = 0.0
    metric_score: float = 0.0
    deployment_score: float = 0.0
    downstream_impact_count: int = 0
    supporting_evidence: List[str] = Field(default_factory=list)
    contradictory_evidence: List[str] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    alternative_explanations: List[str] = Field(default_factory=list)
    affected_downstream_services: List[str] = Field(default_factory=list)

class RootCauseCandidateResponse(RootCauseCandidateBase):
    class Config:
        from_attributes = True

class EvidenceRecordResponse(BaseModel):
    id: str
    incident_id: str
    candidate_id: Optional[str] = None
    evidence_type: str
    description: str
    severity: str
    confidence: float
    source_ref: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class IncidentBase(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    first_detected: datetime
    last_updated: datetime
    affected_services: List[str] = Field(default_factory=list)
    probable_root_cause: Optional[str] = None
    summary: Optional[str] = None
    confidence_category: str = "medium"
    is_simulated: bool = True
    simulation_scenario: Optional[str] = None

class IncidentResponse(IncidentBase):
    anomalies: List[AnomalyResponse] = Field(default_factory=list)
    candidates: List[RootCauseCandidateResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
