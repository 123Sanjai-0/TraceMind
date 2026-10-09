import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Search, Trash2, FileText, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { api } from '../services/api';
import { KnowledgeDoc } from '../types';

export const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadSuccess(null);
    try {
      const res = await api.uploadDocument(file, title || undefined);
      setUploadSuccess(`Indexed "${res.title}" into ${res.chunks_created} semantic chunks.`);
      setFile(null);
      setTitle('');
      loadDocs();
    } catch (err: any) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      loadDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchKnowledgeBase(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Troubleshooting Knowledge Base & RAG Index</h1>
        <p className="text-xs text-slate-400">
          Upload runbooks and postmortems (Markdown, Plaintext, PDF) to ground AI diagnoses with exact source citations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form (1 col) */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Upload className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Upload Runbook Guide</h2>
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Document Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Postgres DB Query Runbook"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Select File (.md, .txt, .pdf)</label>
              <input
                type="file"
                accept=".md,.txt,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              {uploading ? 'Parsing & Indexing Chunks...' : 'Upload & Index into RAG'}
            </button>
          </form>
        </div>

        {/* Indexed Runbooks List (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Indexed Knowledge Documents ({documents.length})</h2>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                No documents uploaded. Standard default runbooks are indexed on startup.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-200">{doc.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                        {doc.file_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{doc.preview}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>{doc.chunk_count} semantic chunks</span>
                      <span>•</span>
                      <span>Filename: {doc.filename}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Semantic Search Tester */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-100">Semantic RAG Retrieval Tester</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            placeholder="Test search query (e.g. slow database query postgres explain analyze)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
          >
            {searching ? 'Searching...' : 'Search Vectors'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400">Top Semantic Matches:</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {searchResults.map((r, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>{r.doc_title}</span>
                    <span className="font-mono text-[10px] text-slate-500">{(r.similarity_score * 100).toFixed(0)}% score</span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/90 p-2 rounded border border-slate-800/80">
                    "{r.content}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
