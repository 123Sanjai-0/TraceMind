from fastapi import APIRouter
from app.api.routes import (
    services, incidents, anomalies, traces, metrics, logs,
    dependency_graph, deployments, analysis, simulation,
    knowledge_base, settings, evaluation, subscription
)
from app.api.websocket import router as ws_router

api_router = APIRouter()

api_router.include_router(services.router)
api_router.include_router(incidents.router)
api_router.include_router(anomalies.router)
api_router.include_router(traces.router)
api_router.include_router(metrics.router)
api_router.include_router(logs.router)
api_router.include_router(dependency_graph.router)
api_router.include_router(deployments.router)
api_router.include_router(analysis.router)
api_router.include_router(simulation.router)
api_router.include_router(knowledge_base.router)
api_router.include_router(settings.router)
api_router.include_router(evaluation.router)
api_router.include_router(subscription.router)
api_router.include_router(ws_router)
