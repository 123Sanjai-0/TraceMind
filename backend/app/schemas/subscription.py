from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PlanDefinition(BaseModel):
    id: str
    name: str
    tagline: str
    monthly_price: float
    yearly_price: float
    max_services: int
    max_spans_per_month: int
    max_ai_rca_queries: int
    retention_days: int
    features: List[str]
    is_popular: bool = False
    badge: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    plan_id: str
    plan_name: str
    status: str
    billing_cycle: str
    monthly_price_usd: float
    current_period_start: datetime
    current_period_end: datetime
    max_services: int
    max_spans_per_month: int
    spans_consumed_this_month: int
    max_ai_rca_queries_per_month: int
    ai_rca_queries_consumed: int
    retention_days: int
    features: List[str] = Field(default_factory=list)
    payment_method: Dict[str, Any] = Field(default_factory=dict)
    invoices: List[Dict[str, Any]] = Field(default_factory=list)
    available_plans: List[PlanDefinition] = Field(default_factory=list)

class UpgradeSubscriptionRequest(BaseModel):
    plan_id: str  # "starter", "pro", "enterprise"
    billing_cycle: str = "monthly"  # "monthly", "yearly"
    payment_method: Optional[Dict[str, Any]] = None
