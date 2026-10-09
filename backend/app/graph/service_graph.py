import networkx as nx
from typing import Dict, List, Any, Optional

class ServiceGraphEngine:
    """
    Manages the distributed service dependency graph using NetworkX.
    Provides topological analysis, root-cause path tracing, and graph visualization schemas.
    """
    
    DEFAULT_TOPOLOGY = [
        {"source": "frontend", "target": "api-gateway", "label": "HTTP/REST"},
        {"source": "api-gateway", "target": "auth-service", "label": "gRPC"},
        {"source": "api-gateway", "target": "order-service", "label": "HTTP/REST"},
        {"source": "auth-service", "target": "redis-cache", "label": "TCP/Redis"},
        {"source": "auth-service", "target": "postgres-db", "label": "PostgreSQL"},
        {"source": "order-service", "target": "payment-service", "label": "gRPC"},
        {"source": "order-service", "target": "postgres-db", "label": "PostgreSQL"},
        {"source": "order-service", "target": "message-queue", "label": "AMQP"},
        {"source": "payment-service", "target": "postgres-db", "label": "PostgreSQL"},
        {"source": "payment-service", "target": "redis-cache", "label": "TCP/Redis"},
        {"source": "payment-service", "target": "external-payment-api", "label": "HTTPS"},
        {"source": "message-queue", "target": "payment-service", "label": "AMQP Consumer"},
    ]

    SERVICE_METADATA = {
        "frontend": {"name": "Frontend", "type": "frontend", "tier": 0},
        "api-gateway": {"name": "API Gateway", "type": "api_gateway", "tier": 1},
        "auth-service": {"name": "Auth Service", "type": "service", "tier": 2},
        "order-service": {"name": "Order Service", "type": "service", "tier": 2},
        "payment-service": {"name": "Payment Service", "type": "service", "tier": 3},
        "postgres-db": {"name": "PostgreSQL Database", "type": "database", "tier": 4},
        "redis-cache": {"name": "Redis Cache", "type": "cache", "tier": 4},
        "message-queue": {"name": "Message Queue", "type": "queue", "tier": 4},
        "external-payment-api": {"name": "External Payment API", "type": "external_api", "tier": 4},
    }

    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_default_graph()

    def _build_default_graph(self):
        self.graph.clear()
        for svc_id, meta in self.SERVICE_METADATA.items():
            self.graph.add_node(svc_id, **meta)
        for edge in self.DEFAULT_TOPOLOGY:
            self.graph.add_edge(edge["source"], edge["target"], label=edge["label"], weight=1.0)

    def get_graph(self) -> nx.DiGraph:
        return self.graph

    def get_downstream_dependents(self, service_id: str) -> List[str]:
        """Returns all services that directly or indirectly depend on service_id."""
        if not self.graph.has_node(service_id):
            return []
        # In a dependency flow (A -> B means A calls B, so A depends on B)
        # Downstream impact of B failing means callers of B (ancestors in call graph)
        try:
            return list(nx.ancestors(self.graph, service_id))
        except Exception:
            return []

    def get_dependencies_of(self, service_id: str) -> List[str]:
        """Returns all services that service_id calls (descendants in call graph)."""
        if not self.graph.has_node(service_id):
            return []
        try:
            return list(nx.descendants(self.graph, service_id))
        except Exception:
            return []

    def get_topological_depth(self, service_id: str) -> int:
        """Returns the tier/depth of the service in the graph."""
        if self.graph.has_node(service_id):
            return self.SERVICE_METADATA.get(service_id, {}).get("tier", 2)
        return 2

    def is_upstream_of(self, candidate_id: str, target_id: str) -> bool:
        """
        Check if candidate_id is a dependency of target_id (i.e., target_id calls candidate_id,
        or candidate_id is an ancestor/descendant in failure propagation).
        """
        if not self.graph.has_node(candidate_id) or not self.graph.has_node(target_id):
            return False
        # If target calls candidate, candidate failure propagates to target
        return nx.has_path(self.graph, target_id, candidate_id)

    def to_react_flow(self, service_statuses: Optional[Dict[str, Dict[str, Any]]] = None, highlighted_path: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Exports the graph to React Flow compatible nodes and edges.
        """
        nodes = []
        # Layout positions mapped by tier and column
        positions = {
            "frontend": {"x": 400, "y": 50},
            "api-gateway": {"x": 400, "y": 180},
            "auth-service": {"x": 180, "y": 320},
            "order-service": {"x": 620, "y": 320},
            "payment-service": {"x": 620, "y": 460},
            "postgres-db": {"x": 400, "y": 620},
            "redis-cache": {"x": 180, "y": 520},
            "message-queue": {"x": 840, "y": 460},
            "external-payment-api": {"x": 840, "y": 620},
        }

        for node_id in self.graph.nodes():
            meta = self.graph.nodes[node_id]
            svc_status = (service_statuses or {}).get(node_id, {})
            health = svc_status.get("health_status", "healthy")
            error_rate = svc_status.get("error_rate", 0.0)
            avg_latency = svc_status.get("avg_latency", 0.0)
            anomaly_count = svc_status.get("anomaly_count", 0)

            is_highlighted = highlighted_path and node_id in highlighted_path

            nodes.append({
                "id": node_id,
                "type": "serviceNode",
                "position": positions.get(node_id, {"x": 300, "y": 300}),
                "data": {
                    "id": node_id,
                    "label": meta.get("name", node_id),
                    "serviceType": meta.get("type", "service"),
                    "healthStatus": health,
                    "errorRate": error_rate,
                    "avgLatency": avg_latency,
                    "anomalyCount": anomaly_count,
                    "isHighlighted": bool(is_highlighted),
                    "tier": meta.get("tier", 0)
                }
            })

        edges = []
        for src, dst, data in self.graph.edges(data=True):
            edge_id = f"{src}->{dst}"
            is_edge_highlighted = False
            if highlighted_path and src in highlighted_path and dst in highlighted_path:
                is_edge_highlighted = True

            edges.append({
                "id": edge_id,
                "source": src,
                "target": dst,
                "animated": is_edge_highlighted,
                "label": data.get("label", ""),
                "data": {
                    "protocol": data.get("label", ""),
                    "isHighlighted": is_edge_highlighted
                }
            })

        return {"nodes": nodes, "edges": edges}

service_graph_engine = ServiceGraphEngine()
