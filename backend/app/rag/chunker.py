from typing import List, Dict, Any

class DocumentChunker:
    """
    Splits text documents into overlapping chunks while preserving document title and section headers.
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str, doc_id: str, doc_title: str, filename: str) -> List[Dict[str, Any]]:
        if not text or not text.strip():
            return []

        paragraphs = text.split("\n\n")
        chunks: List[Dict[str, Any]] = []
        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) < self.chunk_size:
                current_chunk += ("\n\n" if current_chunk else "") + para
            else:
                if current_chunk:
                    chunks.append({
                        "chunk_id": f"{doc_id}_c{chunk_index}",
                        "doc_id": doc_id,
                        "doc_title": doc_title,
                        "filename": filename,
                        "chunk_index": chunk_index,
                        "content": current_chunk.strip()
                    })
                    chunk_index += 1
                    # Keep overlap from previous chunk
                    current_chunk = current_chunk[-self.chunk_overlap:] + "\n\n" + para
                else:
                    # Single paragraph exceeds chunk size, split by lines or characters
                    chunks.append({
                        "chunk_id": f"{doc_id}_c{chunk_index}",
                        "doc_id": doc_id,
                        "doc_title": doc_title,
                        "filename": filename,
                        "chunk_index": chunk_index,
                        "content": para[:self.chunk_size].strip()
                    })
                    chunk_index += 1
                    current_chunk = para[self.chunk_size - self.chunk_overlap:]

        if current_chunk.strip():
            chunks.append({
                "chunk_id": f"{doc_id}_c{chunk_index}",
                "doc_id": doc_id,
                "doc_title": doc_title,
                "filename": filename,
                "chunk_index": chunk_index,
                "content": current_chunk.strip()
            })

        return chunks

document_chunker = DocumentChunker()
