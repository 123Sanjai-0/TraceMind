import os
import glob
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.router import api_router
from app.models.database import KnowledgeDocument
from app.simulation.engine import simulation_engine
from app.rag.chunker import document_chunker
from app.rag.vector_store import vector_store

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "TraceMind: AI-Powered Distributed System Root-Cause Analysis Platform. "
        "Correlates logs, metrics, distributed traces, and service dependency topologies to rank failure root causes with explainable evidence."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "platform": "TraceMind",
        "version": "1.0.0",
        "mode": "observability-rca-production-grade"
    }

@app.on_event("startup")
def startup_event():
    """Seed initial microservices and runbooks on startup if empty."""
    db = SessionLocal()
    try:
        simulation_engine.initialize_services(db)

        # Check knowledge base docs
        doc_count = db.query(KnowledgeDocument).count()
        if doc_count == 0:
            sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sample-data/runbooks"))
            md_files = glob.glob(os.path.join(sample_dir, "*.md"))
            all_chunks = []
            for filepath in md_files:
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                    filename = os.path.basename(filepath)
                    title = filename.replace("_", " ").replace(".md", "").title()
                    doc_id = f"doc-{filename.replace('.', '_')}"
                    chunks = document_chunker.chunk_text(content, doc_id, title, filename)
                    doc_obj = KnowledgeDocument(
                        id=doc_id,
                        title=title,
                        filename=filename,
                        file_type="markdown",
                        content_text=content,
                        chunks_json=chunks
                    )
                    db.add(doc_obj)
                    all_chunks.extend(chunks)
                except Exception as e:
                    print(f"[Startup] Error loading {filepath}: {e}")
            db.commit()
            if all_chunks:
                vector_store.index_chunks(all_chunks)
    finally:
        db.close()
