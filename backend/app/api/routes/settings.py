from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.models.database import ApplicationSetting
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "detection_thresholds": {
        "z_score_threshold": settings.Z_SCORE_THRESHOLD,
        "latency_deviation_pct": settings.LATENCY_DEVIATION_PCT_THRESHOLD,
        "error_rate_threshold": settings.ERROR_RATE_THRESHOLD,
        "time_window_minutes": settings.TIME_WINDOW_MINUTES
    },
    "scoring_weights": {
        "temporal_weight": 0.25,
        "dependency_weight": 0.25,
        "trace_weight": 0.20,
        "metric_weight": 0.15,
        "deployment_weight": 0.15
    },
    "llm_configuration": {
        "provider": settings.LLM_PROVIDER,
        "model_name": settings.LLM_MODEL_NAME,
        "rag_enabled": True,
        "temperature": 0.2
    }
}

@router.get("")
def get_application_settings(db: Session = Depends(get_db)) -> Dict[str, Any]:
    db_settings = db.query(ApplicationSetting).all()
    current = dict(DEFAULT_SETTINGS)
    for s in db_settings:
        current[s.key] = s.value_json
    return current

@router.put("")
def update_application_settings(new_settings: Dict[str, Any], db: Session = Depends(get_db)) -> Dict[str, Any]:
    for key, value in new_settings.items():
        obj = db.query(ApplicationSetting).filter(ApplicationSetting.key == key).first()
        if obj:
            obj.value_json = value
        else:
            obj = ApplicationSetting(key=key, value_json=value)
            db.add(obj)
    db.commit()
    return get_application_settings(db)
