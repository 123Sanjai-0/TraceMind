from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class InvertedVectorStore:
    """
    In-memory vector retriever using TF-IDF and Cosine Similarity for fast, deterministic RAG retrieval.
    """

    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None

    def index_chunks(self, all_chunks: List[Dict[str, Any]]):
        self.chunks = all_chunks
        if not all_chunks:
            self.vectorizer = None
            self.tfidf_matrix = None
            return

        corpus = [c["content"] for c in all_chunks]
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        try:
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
        except Exception:
            self.vectorizer = None
            self.tfidf_matrix = None

    def search(self, query: str, top_k: int = 3, min_score: float = 0.05) -> List[Dict[str, Any]]:
        if not self.chunks or self.vectorizer is None or self.tfidf_matrix is None or not query.strip():
            return []

        try:
            query_vec = self.vectorizer.transform([query])
            similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            
            # Sort top indices
            top_indices = np.argsort(similarities)[::-1]
            results = []
            for idx in top_indices:
                score = float(similarities[idx])
                if score < min_score:
                    break
                chunk = self.chunks[idx].copy()
                chunk["similarity_score"] = round(score, 3)
                results.append(chunk)
                if len(results) >= top_k:
                    break
            return results
        except Exception:
            return []

vector_store = InvertedVectorStore()
