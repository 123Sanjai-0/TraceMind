from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.simulation import ScenarioInfo, SimulationRequest, SimulationResponse
from app.simulation.scenarios import SCENARIOS
from app.simulation.engine import simulation_engine

router = APIRouter(prefix="/simulation", tags=["Simulation"])

@router.get("/scenarios", response_model=List[ScenarioInfo])
def get_scenarios():
    res = []
    for sc_id, sc in SCENARIOS.items():
        res.append(ScenarioInfo(
            id=sc["id"],
            name=sc["name"],
            description=sc["description"],
            affected_services=sc["affected_services"],
            root_cause_service=sc["root_cause_service"],
            scenario_type="cascade_failure"
        ))
    return res

@router.post("/run", response_model=SimulationResponse)
async def run_simulation(
    req: SimulationRequest,
    db: Session = Depends(get_db)
):
    try:
        res = await simulation_engine.run_simulation(
            db=db,
            scenario_id=req.scenario_id,
            noise_level=req.noise_level,
            run_llm=req.run_llm_analysis
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
