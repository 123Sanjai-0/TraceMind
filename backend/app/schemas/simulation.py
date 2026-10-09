from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.schemas.incident import IncidentResponse
from app.schemas.analysis import LLMIncidentAnalysis

class ScenarioInfo(BaseModel):
    id: str
    name: str
    description: str
    affected_services: List[str]
    root_cause_service: str
    scenario_type: str

class SimulationRequest(BaseModel):
    scenario_id: str = "db_query_regression"  # "db_query_regression", "redis_cache_avalanche", "auth_token_exhaustion", "queue_consumer_backlog"
    noise_level: float = 0.05
    run_llm_analysis: bool = True

class SimulationResponse(BaseModel):
    simulation_id: str
    scenario_id: str
    scenario_name: str
    incident: IncidentResponse
    logs_generated_count: int
    metrics_generated_count: int
    traces_generated_count: int
    anomalies_detected_count: int
    ai_analysis: Optional[LLMIncidentAnalysis] = None
    execution_time_ms: float
    status: str = "success"
