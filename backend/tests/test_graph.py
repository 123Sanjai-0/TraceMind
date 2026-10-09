import pytest
from app.graph.service_graph import ServiceGraphEngine

def test_service_graph_topology():
    engine = ServiceGraphEngine()
    g = engine.get_graph()
    
    # Assert critical nodes exist
    assert g.has_node("frontend")
    assert g.has_node("api-gateway")
    assert g.has_node("payment-service")
    assert g.has_node("postgres-db")

    # Assert dependency edges
    assert g.has_edge("frontend", "api-gateway")
    assert g.has_edge("payment-service", "postgres-db")

def test_downstream_dependents():
    engine = ServiceGraphEngine()
    # In call graph: frontend -> api-gateway -> order-service -> payment-service -> postgres-db
    # If postgres-db fails, its downstream dependents (callers affected) should include payment-service, order-service, api-gateway, frontend
    dependents = engine.get_downstream_dependents("postgres-db")
    assert "payment-service" in dependents
    assert "order-service" in dependents
    assert "api-gateway" in dependents
    assert "frontend" in dependents

def test_react_flow_serialization():
    engine = ServiceGraphEngine()
    rf = engine.to_react_flow(
        service_statuses={"postgres-db": {"health_status": "critical", "error_rate": 0.15, "avg_latency": 850.0, "anomaly_count": 2}},
        highlighted_path=["postgres-db", "payment-service"]
    )
    assert len(rf["nodes"]) == 9
    assert len(rf["edges"]) >= 10
    pg_node = next(n for n in rf["nodes"] if n["id"] == "postgres-db")
    assert pg_node["data"]["healthStatus"] == "critical"
    assert pg_node["data"]["isHighlighted"] is True
