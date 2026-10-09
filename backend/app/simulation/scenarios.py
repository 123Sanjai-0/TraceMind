from typing import List, Dict, Any

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "db_query_regression": {
        "id": "db_query_regression",
        "name": "Database Query Regression & Downstream Cascading Timeout",
        "description": "Payment Service v1.8 introduces an unindexed query batch regression, inflating DB query latency and cascading 504 timeouts to API Gateway and Frontend.",
        "affected_services": ["postgres-db", "payment-service", "order-service", "api-gateway", "frontend"],
        "root_cause_service": "postgres-db",
        "deployment": {
            "service_name": "payment-service",
            "previous_version": "v1.7.4",
            "new_version": "v1.8.0",
            "change_description": "Added unindexed payment audit batch logging query before transaction commit"
        },
        "service_effects": {
            "postgres-db": {"latency": 850.0, "error_rate": 0.08, "cpu": 92.0, "health": "critical"},
            "payment-service": {"latency": 920.0, "error_rate": 0.18, "cpu": 78.0, "health": "critical"},
            "order-service": {"latency": 980.0, "error_rate": 0.15, "cpu": 60.0, "health": "degraded"},
            "api-gateway": {"latency": 1050.0, "error_rate": 0.22, "cpu": 55.0, "health": "critical"},
            "frontend": {"latency": 1150.0, "error_rate": 0.24, "cpu": 40.0, "health": "degraded"},
            "auth-service": {"latency": 25.0, "error_rate": 0.0, "cpu": 25.0, "health": "healthy"},
            "redis-cache": {"latency": 3.0, "error_rate": 0.0, "cpu": 20.0, "health": "healthy"},
            "message-queue": {"latency": 12.0, "error_rate": 0.0, "cpu": 30.0, "health": "healthy"},
            "external-payment-api": {"latency": 180.0, "error_rate": 0.0, "cpu": 15.0, "health": "healthy"}
        }
    },
    "redis_cache_avalanche": {
        "id": "redis_cache_avalanche",
        "name": "Redis Cache Eviction Avalanche & Database Thundering Herd",
        "description": "Redis memory exhaustion triggers widespread key eviction, causing Auth and Order services to flood PostgreSQL with duplicate queries.",
        "affected_services": ["redis-cache", "postgres-db", "auth-service", "api-gateway"],
        "root_cause_service": "redis-cache",
        "deployment": {
            "service_name": "redis-cache",
            "previous_version": "v7.0",
            "new_version": "v7.2-rc1",
            "change_description": "Updated maxmemory-policy to noeviction without key TTL tuning"
        },
        "service_effects": {
            "redis-cache": {"latency": 150.0, "error_rate": 0.35, "cpu": 98.0, "health": "critical"},
            "postgres-db": {"latency": 620.0, "error_rate": 0.12, "cpu": 89.0, "health": "critical"},
            "auth-service": {"latency": 710.0, "error_rate": 0.28, "cpu": 75.0, "health": "critical"},
            "api-gateway": {"latency": 800.0, "error_rate": 0.19, "cpu": 50.0, "health": "degraded"},
            "frontend": {"latency": 850.0, "error_rate": 0.18, "cpu": 35.0, "health": "degraded"},
            "payment-service": {"latency": 45.0, "error_rate": 0.0, "cpu": 30.0, "health": "healthy"},
            "order-service": {"latency": 50.0, "error_rate": 0.0, "cpu": 30.0, "health": "healthy"},
            "message-queue": {"latency": 12.0, "error_rate": 0.0, "cpu": 20.0, "health": "healthy"},
            "external-payment-api": {"latency": 180.0, "error_rate": 0.0, "cpu": 15.0, "health": "healthy"}
        }
    },
    "queue_consumer_backlog": {
        "id": "queue_consumer_backlog",
        "name": "Message Queue Consumer Deadlock & Pipeline Backlog",
        "description": "Deadlock in Payment Service background consumer causes message queue depth to surge, stalling asynchronous order fulfillment.",
        "affected_services": ["message-queue", "payment-service", "order-service"],
        "root_cause_service": "message-queue",
        "deployment": {
            "service_name": "message-queue",
            "previous_version": "v3.11",
            "new_version": "v3.12",
            "change_description": "Prefetch limit increased without increasing worker concurrency"
        },
        "service_effects": {
            "message-queue": {"latency": 450.0, "error_rate": 0.25, "cpu": 94.0, "health": "critical"},
            "payment-service": {"latency": 320.0, "error_rate": 0.15, "cpu": 85.0, "health": "degraded"},
            "order-service": {"latency": 180.0, "error_rate": 0.08, "cpu": 45.0, "health": "degraded"},
            "frontend": {"latency": 80.0, "error_rate": 0.02, "cpu": 25.0, "health": "healthy"},
            "api-gateway": {"latency": 45.0, "error_rate": 0.01, "cpu": 25.0, "health": "healthy"},
            "auth-service": {"latency": 25.0, "error_rate": 0.0, "cpu": 20.0, "health": "healthy"},
            "postgres-db": {"latency": 18.0, "error_rate": 0.0, "cpu": 30.0, "health": "healthy"},
            "redis-cache": {"latency": 3.0, "error_rate": 0.0, "cpu": 15.0, "health": "healthy"},
            "external-payment-api": {"latency": 180.0, "error_rate": 0.0, "cpu": 15.0, "health": "healthy"}
        }
    }
}
