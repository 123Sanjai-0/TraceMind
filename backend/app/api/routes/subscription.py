import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.database import Subscription, AuditLog
from app.schemas.subscription import SubscriptionResponse, UpgradeSubscriptionRequest, PlanDefinition

router = APIRouter(prefix="/subscription", tags=["Subscription & Billing"])

AVAILABLE_PLANS: List[PlanDefinition] = [
    PlanDefinition(
        id="starter",
        name="TraceMind Starter",
        tagline="Essential observability for small teams & single-service testing.",
        monthly_price=0.0,
        yearly_price=0.0,
        max_services=3,
        max_spans_per_month=100000,
        max_ai_rca_queries=10,
        retention_days=1,
        features=[
            "Up to 3 Monitored Microservices",
            "Statistical Z-Score Anomaly Detection",
            "Basic Log & Metrics Search (24-hour retention)",
            "10 Automated Root-Cause Diagnoses / Month",
            "Community Support"
        ],
        is_popular=False,
        badge="FREE TIER"
    ),
    PlanDefinition(
        id="pro",
        name="TraceMind Professional",
        tagline="Full distributed graph RCA and RAG runbooks for production microservices.",
        monthly_price=199.0,
        yearly_price=1890.0,
        max_services=15,
        max_spans_per_month=1000000,
        max_ai_rca_queries=100,
        retention_days=30,
        features=[
            "Up to 15 Monitored Microservices",
            "NetworkX Dynamic Graph Causal Traversal",
            "Full Distributed Trace Waterfall Inspection",
            "RAG Runbook & Postmortem Indexing (PDF/Markdown)",
            "100 Evidence-Grounded AI Analyses / Month",
            "WebSocket Real-time Telemetry Streaming",
            "Standard SLA & Support"
        ],
        is_popular=True,
        badge="MOST POPULAR"
    ),
    PlanDefinition(
        id="enterprise",
        name="TraceMind Enterprise Ultra",
        tagline="Unlimited scale, multi-LLM orchestration, and advanced multivariate Isolation Forest.",
        monthly_price=599.0,
        yearly_price=5700.0,
        max_services=100,
        max_spans_per_month=10000000,
        max_ai_rca_queries=5000,
        retention_days=365,
        features=[
            "Unlimited Microservices & Custom Clusters",
            "Multi-LLM Orchestration (OpenAI, Claude 3.5, Gemini 1.5)",
            "Multivariate Isolation Forest Anomaly Detection",
            "Automated Canary Rollback Risk Advisor",
            "5,000 High-Capacity AI Grounded Diagnoses / Month",
            "365-Day High-Resolution Telemetry Retention",
            "Dedicated 24/7 Enterprise SRE SLA"
        ],
        is_popular=False,
        badge="ENTERPRISE SCALE"
    )
]

def get_or_create_subscription(db: Session) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.id == "sub-active").first()
    if not sub:
        now = datetime.datetime.utcnow()
        sub = Subscription(
            id="sub-active",
            plan_id="pro",
            plan_name="TraceMind Professional",
            status="active",
            billing_cycle="monthly",
            monthly_price_usd=199.0,
            current_period_start=now,
            current_period_end=now + datetime.timedelta(days=30),
            max_services=15,
            max_spans_per_month=1000000,
            spans_consumed_this_month=642100,
            max_ai_rca_queries_per_month=100,
            ai_rca_queries_consumed=28,
            retention_days=30,
            features_json=[
                "Up to 15 Monitored Microservices",
                "NetworkX Dynamic Graph Causal Traversal",
                "Full Distributed Trace Waterfall Inspection",
                "RAG Runbook & Postmortem Indexing (PDF/Markdown)",
                "100 Evidence-Grounded AI Analyses / Month"
            ],
            payment_method_json={"brand": "Visa", "last4": "4242", "exp": "12/28", "name": "TraceMind Engineering Org"},
            invoices_json=[
                {"id": "inv-2026-10", "date": "Oct 1, 2026", "amount": "$199.00", "status": "Paid", "pdf_url": "#"},
                {"id": "inv-2026-09", "date": "Sep 1, 2026", "amount": "$199.00", "status": "Paid", "pdf_url": "#"},
                {"id": "inv-2026-08", "date": "Aug 1, 2026", "amount": "$199.00", "status": "Paid", "pdf_url": "#"},
            ]
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub

@router.get("", response_model=SubscriptionResponse)
def get_subscription(db: Session = Depends(get_db)):
    sub = get_or_create_subscription(db)
    return SubscriptionResponse(
        id=sub.id,
        plan_id=sub.plan_id,
        plan_name=sub.plan_name,
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        monthly_price_usd=sub.monthly_price_usd,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        max_services=sub.max_services,
        max_spans_per_month=sub.max_spans_per_month,
        spans_consumed_this_month=sub.spans_consumed_this_month,
        max_ai_rca_queries_per_month=sub.max_ai_rca_queries_per_month,
        ai_rca_queries_consumed=sub.ai_rca_queries_consumed,
        retention_days=sub.retention_days,
        features=sub.features_json or [],
        payment_method=sub.payment_method_json or {},
        invoices=sub.invoices_json or [],
        available_plans=AVAILABLE_PLANS
    )

@router.post("/upgrade", response_model=SubscriptionResponse)
def upgrade_subscription(req: UpgradeSubscriptionRequest, db: Session = Depends(get_db)):
    sub = get_or_create_subscription(db)
    target_plan = next((p for p in AVAILABLE_PLANS if p.id == req.plan_id), None)
    if not target_plan:
        raise HTTPException(status_code=400, detail=f"Plan '{req.plan_id}' does not exist")

    old_plan = sub.plan_id
    sub.plan_id = target_plan.id
    sub.plan_name = target_plan.name
    sub.monthly_price_usd = target_plan.monthly_price if req.billing_cycle == "monthly" else (target_plan.yearly_price / 12.0)
    sub.billing_cycle = req.billing_cycle
    sub.max_services = target_plan.max_services
    sub.max_spans_per_month = target_plan.max_spans_per_month
    sub.max_ai_rca_queries_per_month = target_plan.max_ai_rca_queries
    sub.retention_days = target_plan.retention_days
    sub.features_json = target_plan.features
    sub.status = "active"

    if req.payment_method:
        sub.payment_method_json = req.payment_method

    # Append invoice
    now = datetime.datetime.utcnow()
    inv_id = f"inv-{now.strftime('%Y%m%d%H%M')}"
    new_inv = {
        "id": inv_id,
        "date": now.strftime("%b %d, %Y"),
        "amount": f"${target_plan.monthly_price:.2f}" if req.billing_cycle == "monthly" else f"${target_plan.yearly_price:.2f}",
        "status": "Paid",
        "pdf_url": "#"
    }
    invoices = list(sub.invoices_json or [])
    invoices.insert(0, new_inv)
    sub.invoices_json = invoices

    # Audit log
    audit = AuditLog(
        id=f"aud-sub-{now.timestamp()}",
        user_id="billing-admin",
        action="subscription_tier_change",
        entity_type="subscription",
        entity_id=sub.id,
        details_json={
            "old_plan": old_plan,
            "new_plan": target_plan.id,
            "billing_cycle": req.billing_cycle,
            "price": sub.monthly_price_usd
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(sub)

    return get_subscription(db)
