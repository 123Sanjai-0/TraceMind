from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class RecommendedAction(BaseModel):
    action: str
    reason: str
    supporting_evidence: str
    expected_benefit: str
    verification_procedure: str
    risk_level: str = "low"  # "low", "medium", "high"

class LLMIncidentAnalysis(BaseModel):
    incident_summary: str
    probable_root_cause: str
    affected_services: List[str] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    contradictory_evidence: List[str] = Field(default_factory=list)
    confidence_category: str = "medium"  # "low", "medium", "high"
    alternative_hypotheses: List[str] = Field(default_factory=list)
    recommended_actions: List[RecommendedAction] = Field(default_factory=list)
    verification_steps: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    rag_citations: List[Dict[str, Any]] = Field(default_factory=list)
    is_ai_generated: bool = True
    model_name: Optional[str] = None

class AnalysisRequest(BaseModel):
    incident_id: str
    use_llm: bool = True
    include_rag: bool = True

class UserQueryInvestigationRequest(BaseModel):
    query: str
    service_hint: Optional[str] = None
    time_window_minutes: int = 30
    use_llm: bool = True

class UserQueryInvestigationResponse(BaseModel):
    query_id: str
    user_query: str
    extracted_entities: List[str] = Field(default_factory=list)
    matched_services: List[str] = Field(default_factory=list)
    probable_root_cause: str
    confidence_category: str
    ranking_score: float
    analysis_explanation: LLMIncidentAnalysis
    correlated_anomalies_count: int
    correlated_spans_count: int
    correlated_logs_count: int
    created_at: str

