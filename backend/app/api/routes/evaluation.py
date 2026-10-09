from fastapi import APIRouter
from typing import Dict, Any
from app.services.evaluation import evaluation_engine

router = APIRouter(prefix="/evaluation", tags=["Evaluation & Benchmark"])

@router.get("/benchmark")
def get_evaluation_benchmark() -> Dict[str, Any]:
    """
    Executes live comparative benchmark across 20 incident scenarios,
    comparing Baseline A (Log-Only), Baseline B (Multi-signal No Graph), and Proposed TraceMind.
    """
    return evaluation_engine.run_comparative_evaluation()
