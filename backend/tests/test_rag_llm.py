import pytest
from app.rag.chunker import document_chunker
from app.rag.vector_store import InvertedVectorStore
from app.rag.document_parser import document_parser
from app.schemas.analysis import LLMIncidentAnalysis

def test_document_chunking():
    sample_text = (
        "## Section 1\nDatabase latency spikes can occur when indexes are missing.\n\n"
        "## Section 2\nTo mitigate, inspect query plans with EXPLAIN ANALYZE.\n\n"
        "## Section 3\nConnection pool size should be tuned."
    )
    chunks = document_chunker.chunk_text(sample_text, "doc-1", "DB Guide", "db.md")
    assert len(chunks) >= 1
    assert chunks[0]["doc_title"] == "DB Guide"
    assert "latency" in chunks[0]["content"].lower()

def test_rag_vector_search():
    store = InvertedVectorStore()
    chunks = [
        {"chunk_id": "c1", "doc_title": "DB Runbook", "filename": "db.md", "content": "PostgreSQL slow queries require index verification and explain analyze."},
        {"chunk_id": "c2", "doc_title": "Redis Guide", "filename": "redis.md", "content": "Redis cache eviction happens when maxmemory policy is reached."},
        {"chunk_id": "c3", "doc_title": "Gateway Guide", "filename": "gw.md", "content": "API Gateway returns HTTP 504 when upstream services timeout."}
    ]
    store.index_chunks(chunks)

    # Search for database query issues
    results = store.search("database query postgres latency index", top_k=2)
    assert len(results) > 0
    assert results[0]["filename"] == "db.md"
    assert results[0]["similarity_score"] > 0.1

def test_pydantic_llm_analysis_validation():
    sample_json = {
        "incident_summary": "Database query regression in Payment Service v1.8.",
        "probable_root_cause": "Unindexed SQL query on postgres-db",
        "affected_services": ["postgres-db", "payment-service", "order-service", "api-gateway"],
        "supporting_evidence": ["PostgreSQL latency spiked from 12ms to 850ms"],
        "contradictory_evidence": [],
        "confidence_category": "high",
        "alternative_hypotheses": ["Redis cache failure"],
        "recommended_actions": [
            {
                "action": "Add composite index on payment_audit(customer_id)",
                "reason": "Eliminate table scan",
                "supporting_evidence": "Trace span shows sequential scan",
                "expected_benefit": "Latency reduced below 20ms",
                "verification_procedure": "Run EXPLAIN ANALYZE",
                "risk_level": "low"
            }
        ],
        "verification_steps": ["Check active locks in pg_stat_activity"],
        "limitations": ["Requires production replica testing before applying DDL"]
    }
    analysis = LLMIncidentAnalysis(**sample_json)
    assert analysis.probable_root_cause == "Unindexed SQL query on postgres-db"
    assert len(analysis.recommended_actions) == 1
    assert analysis.recommended_actions[0].risk_level == "low"
