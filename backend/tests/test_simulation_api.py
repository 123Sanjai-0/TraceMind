import pytest
from fastapi.testclient import TestClient
from app.main import app, startup_event
from app.core.database import SessionLocal, Base, engine

# Ensure startup seeding is triggered
startup_event()
client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["platform"] == "TraceMind"

def test_services_endpoint():
    response = client.get("/api/services")
    assert response.status_code == 200
    services = response.json()
    assert len(services) >= 9
    service_names = [s["id"] for s in services]
    assert "postgres-db" in service_names
    assert "payment-service" in service_names
    assert "api-gateway" in service_names

def test_dependency_graph_endpoint():
    response = client.get("/api/dependency-graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 9

def test_simulation_run_end_to_end():
    response = client.post(
        "/api/simulation/run",
        json={"scenario_id": "db_query_regression", "noise_level": 0.05, "run_llm_analysis": True}
    )
    assert response.status_code == 200
    sim_data = response.json()
    assert sim_data["status"] == "success"
    assert sim_data["scenario_id"] == "db_query_regression"
    assert sim_data["logs_generated_count"] > 0
    assert sim_data["traces_generated_count"] > 0
    assert sim_data["anomalies_detected_count"] > 0
    
    incident = sim_data["incident"]
    assert incident["status"] == "open"
    assert len(incident["candidates"]) > 0
    top_candidate = incident["candidates"][0]
    assert top_candidate["affected_service"] in ["postgres-db", "payment-service"]
    assert top_candidate["ranking_score"] > 50.0

def test_knowledge_base_search():
    response = client.get("/api/knowledge-base/search?query=database+latency+postgres")
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)

def test_evaluation_benchmark_endpoint():
    response = client.get("/api/evaluation/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert data["total_test_scenarios"] == 20
    assert "proposed_tracemind" in data["baselines"]
    assert data["baselines"]["proposed_tracemind"]["metrics"]["top1_accuracy"] >= 90.0
