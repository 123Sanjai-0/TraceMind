import React, { useState, useEffect } from 'react';
import {
  Search, Sparkles, AlertTriangle, ShieldCheck, Terminal,
  BookOpen, Clock, Activity, ArrowRight, CheckCircle2, History,
  RefreshCw, FileText, Network, Zap, Send, Lightbulb
} from 'lucide-react';
import { api } from '../services/api';
import { UserQueryResponse } from '../types';

export const QueryInvestigation: React.FC = () => {
  const [queryInput, setQueryInput] = useState('');
  const [currentResult, setCurrentResult] = useState<UserQueryResponse | null>(null);
  const [history, setHistory] = useState<UserQueryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getQueryHistory();
      setHistory(data);
      if (data.length > 0 && !currentResult) {
        setCurrentResult(data[0]);
      }
    } catch (_) {}
  };

  const handleRunQuery = async (textToRun?: string) => {
    const q = textToRun || queryInput;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.submitUserQuery(q);
      setCurrentResult(res);
      setHistory(prev => [res, ...prev.filter(h => h.query_id !== res.query_id)]);
      if (!textToRun) setQueryInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Payment checkout is failing with HTTP 504 gateway timeouts after deploying v1.8",
    "PostgreSQL database query latency spiked to 850ms causing upstream thread starvation",
    "Redis cache memory exhausted triggering key eviction storm and DB thundering herd",
    "Message queue consumer deadlock stalling asynchronous order fulfillment pipeline"
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-cyan-950/40 border border-slate-800 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <Terminal className="w-4 h-4" />
          <span>Real-Time Natural Language RCA & Diagnostic Console</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
          Ask TraceMind to Correlate Telemetry & Diagnose Any Incident
        </h1>
        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
          Type or describe real-world system symptoms, error messages, or suspicious releases. TraceMind extracts entities, walks the service dependency graph, correlates logs, metrics, and traces, searches RAG runbooks, and returns an explainable root-cause diagnosis.
        </p>

        {/* Input Bar */}
        <div className="pt-2">
          <div className="flex gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-700/80 shadow-2xl focus-within:border-cyan-500 transition-all">
            <input
              type="text"
              placeholder="Describe symptoms: e.g., 'API Gateway 504 timeouts after deploying Payment Service v1.8'..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunQuery();
              }}
              className="flex-1 bg-transparent px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => handleRunQuery()}
              disabled={loading || !queryInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Correlating Telemetry...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnose Root Cause</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Example Prompts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Try Technical Scenarios:</span>
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQueryInput(prompt);
                handleRunQuery(prompt);
              }}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg text-[11px] border border-slate-700 transition-all text-left truncate max-w-xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Diagnostic Execution Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Diagnostic Results (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {currentResult ? (
            <>
              {/* Diagnosis Summary Header */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {currentResult.confidence_category} Confidence
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-[11px] font-mono text-slate-400">Score: {currentResult.ranking_score}/100</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-100">
                      Query Diagnosis: <span className="text-cyan-300 italic">"{currentResult.user_query}"</span>
                    </h2>
                  </div>
                </div>

                {/* Primary Isolated Root Cause */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Identified Root Cause</span>
                  <p className="text-sm font-extrabold text-cyan-300">{currentResult.probable_root_cause}</p>
                </div>

                {/* Extracted Entity Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] font-semibold">Matched Entities:</span>
                  {currentResult.extracted_entities.map((ent, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded font-mono text-[10px] border border-slate-700">
                      {ent}
                    </span>
                  ))}
                </div>

                {/* Summary narrative */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentResult.analysis_explanation.incident_summary}
                </p>
              </div>

              {/* Supporting Evidence Signals */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Correlated Telemetry Evidence ({currentResult.analysis_explanation.supporting_evidence.length})</span>
                </h3>
                <div className="space-y-2">
                  {currentResult.analysis_explanation.supporting_evidence.map((ev, idx) => (
                    <div key={idx} className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Verification & Safe Remediation */}
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Recommended Diagnostic Procedures & Verification</span>
                </h3>
                <div className="space-y-3">
                  {currentResult.analysis_explanation.recommended_actions.map((act, idx) => (
                    <div key={idx} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{act.action}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {act.risk_level} Risk
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{act.reason}</p>
                      <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300">
                        <strong>Procedure:</strong> {act.verification_procedure}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/80 rounded-2xl border border-slate-800">
              Type an incident description above or click one of the quick scenario prompts to diagnose.
            </div>
          )}
        </div>

        {/* Query History & RAG Runbook Passages (1 col) */}
        <div className="space-y-6">
          {/* RAG Citations */}
          {currentResult?.analysis_explanation.rag_citations && currentResult.analysis_explanation.rag_citations.length > 0 && (
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-slate-200">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Troubleshooting Runbook Match</span>
              </div>
              <div className="space-y-2.5">
                {currentResult.analysis_explanation.rag_citations.map((cit, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                    <div className="font-bold text-cyan-400 text-[11px]">{cit.doc_title}</div>
                    <div className="text-[10px] font-mono text-slate-500">{cit.filename}</div>
                    <p className="text-[11px] text-slate-300 italic bg-slate-900 p-2 rounded">
                      "{cit.excerpt}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persistent Query Investigation History */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Investigation History ({history.length})</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-slate-500 text-center py-6 text-xs">No prior queries in this session.</div>
              ) : (
                history.map((h) => (
                  <div
                    key={h.query_id}
                    onClick={() => setCurrentResult(h)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-xs space-y-1 ${
                      currentResult?.query_id === h.query_id
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-slate-200 truncate">{h.user_query}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{h.probable_root_cause}</div>
                    <div className="text-[9px] text-slate-500">{new Date(h.created_at).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
