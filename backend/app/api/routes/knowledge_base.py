import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.models.database import KnowledgeDocument
from app.rag.document_parser import document_parser
from app.rag.chunker import document_chunker
from app.rag.vector_store import vector_store

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    content_bytes = await file.read()
    doc_title = title or file.filename.replace("_", " ").replace(".md", "").replace(".txt", "").replace(".pdf", "")
    
    try:
        text, file_type = document_parser.parse_file(file.filename, content_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse document: {str(e)}")

    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    chunks = document_chunker.chunk_text(text, doc_id, doc_title, file.filename)

    doc_obj = KnowledgeDocument(
        id=doc_id,
        title=doc_title,
        filename=file.filename,
        file_type=file_type,
        content_text=text,
        chunks_json=chunks,
        uploaded_at=datetime.datetime.utcnow(),
        metadata_json={"chunk_count": len(chunks), "size_bytes": len(content_bytes)}
    )
    db.add(doc_obj)
    db.commit()

    # Re-index in vector store
    all_docs = db.query(KnowledgeDocument).all()
    all_chunks = []
    for d in all_docs:
        if d.chunks_json:
            all_chunks.extend(d.chunks_json)
    vector_store.index_chunks(all_chunks)

    return {
        "id": doc_id,
        "title": doc_title,
        "filename": file.filename,
        "file_type": file_type,
        "chunks_created": len(chunks),
        "status": "indexed"
    }

@router.get("/documents")
def get_documents(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    docs = db.query(KnowledgeDocument).order_by(KnowledgeDocument.uploaded_at.desc()).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "file_type": d.file_type,
            "uploaded_at": d.uploaded_at,
            "chunk_count": len(d.chunks_json or []),
            "preview": d.content_text[:200] + "..." if d.content_text else ""
        }
        for d in docs
    ]

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()

    all_docs = db.query(KnowledgeDocument).all()
    all_chunks = []
    for d in all_docs:
        if d.chunks_json:
            all_chunks.extend(d.chunks_json)
    vector_store.index_chunks(all_chunks)

    return {"status": "deleted", "id": doc_id}

@router.get("/search")
def search_knowledge_base(query: str, top_k: int = 3, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    # Ensure index is synced
    docs = db.query(KnowledgeDocument).all()
    all_chunks = []
    for d in docs:
        if d.chunks_json:
            all_chunks.extend(d.chunks_json)
    vector_store.index_chunks(all_chunks)
    
    return vector_store.search(query, top_k=top_k)
