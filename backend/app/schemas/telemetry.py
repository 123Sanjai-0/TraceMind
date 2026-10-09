from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class ServiceBase(BaseModel):
    id: str
    name: str
    type: str
    health_status: str = "healthy"
    request_rate: float = 0.0
    error_rate: float = 0.0
    avg_latency: float = 0.0
    p95_latency: float = 0.0
    p99_latency: float = 0.0
    cpu_util: float = 0.0
    memory_util: float = 0.0
    last_observed: datetime
    is_simulated: bool = True
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class ServiceResponse(ServiceBase):
    class Config:
        from_attributes = True

class LogRecordBase(BaseModel):
    id: str
    timestamp: datetime
    service_name: str
    severity: str
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    request_id: Optional[str] = None
    message: str
    error_type: Optional[str] = None
    environment: str = "production"
    deployment_version: str = "1.0.0"
    is_simulated: bool = True

class LogRecordResponse(LogRecordBase):
    class Config:
        from_attributes = True

class MetricRecordBase(BaseModel):
    id: str
    timestamp: datetime
    service_name: str
    metric_name: str
    metric_value: float
    unit: str = "ms"
    environment: str = "production"
    is_simulated: bool = True

class MetricRecordResponse(MetricRecordBase):
    class Config:
        from_attributes = True

class TraceSpanBase(BaseModel):
    id: str
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    service_name: str
    operation_name: str
    start_time: datetime
    duration_ms: float
    status_code: str = "OK"
    error_message: Optional[str] = None
    attributes_json: Dict[str, Any] = Field(default_factory=dict)
    is_simulated: bool = True

class TraceSpanResponse(TraceSpanBase):
    class Config:
        from_attributes = True

class DeploymentEventBase(BaseModel):
    id: str
    service_name: str
    previous_version: str
    new_version: str
    deployed_at: datetime
    environment: str = "production"
    change_description: str
    commit_hash: Optional[str] = None
    author: str = "devops-team"
    is_simulated: bool = True

class DeploymentEventResponse(DeploymentEventBase):
    class Config:
        from_attributes = True
