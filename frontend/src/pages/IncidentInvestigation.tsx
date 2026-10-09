import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, AlertOctagon, Sparkles, BookOpen,
  Clock, GitCommit, ShieldAlert, Activity, Network, ArrowRight,
  TrendingUp, RefreshCw, FileText, Check, ChevronDown, ChevronUp,
  Info, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, RootCauseCandidate, LLMIncidentAnalysis, Anomaly, TraceSpan } from '../types';

interface IncidentInvestigationProps {
  initialIncidentId?: string;
}

export const IncidentInvestigation: React.FC<IncidentInvestigationProps> = ({ initialIncidentId }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<LLMIncidentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'rca' | 'ai' | 'timeline' | 'anomalies' | 'traces'>('rca');
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<RootCauseCandidate | null>(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await api.getIncidents();
      setIncidents(data);
      if (data.length > 0) {
        const target = initialIncidentId ? (data.find(i => i.id === initialIncidentId) || data[0]) : data[0];
        selectIncident(target);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectIncident = async (inc: Incident) => {
    setSelectedIncident(inc);
    setSelectedCandidate(inc.candidates && inc.candidates.length > 0 ? inc.candidates[0] : null);
    
    // Load AI analysis for incident
    try {
      setLoadingAi(true);
      const analysis = await api.getAIAnalysis(inc.id);
      setAiAnalysis(analysis);
    } catch (_) {
      // Fallback
    } finally {
      setLoadingAi(false);
    }
  };

  const handleStatusChange = async (newStatus: Incident['status']) => {
    if (!selectedIncident) return;
    try {
      const updated = await api.updateIncident(selectedIncident.id, { status: newStatus });
      setSelectedIncident(updated);
      setIncidents(incidents.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      console.error('Failed to update incident status', err);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!selectedIncident) return;
    try {
      setLoadingAi(true);
      const analysis = await api.runAIAnalysis(selectedIncident.id, true, true);
      setAiAnalysis(analysis);
      // Reload incident to get fresh candidate scores
      const inc = await api.getIncident(selectedIncident.id);
      setSelectedIncident(inc);
      setSelectedCandidate(inc.candidates && inc.candidates.length > 0 ? inc.candidates[0] : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Incident Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-950/80 text-rose-400 border border-rose-800">
              {selectedIncident?.severity || 'CRITICAL'} Incident
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400">
              Detected {selectedIncident ? new Date(selectedIncident.first_detected).toLocaleString() : 'Recently'}
            </span>
          </div>
          <h1 className="text-lg font-extrabold text-slate-100 tracking-tight">
            {selectedIncident?.title || 'No active incident selected'}
          </h1>
        </div>

        {/* Incident Picker & Status Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIncident?.id || ''}
            onChange={(e) => {
              const inc = incidents.find(i => i.id === e.target.value);
              if (inc) selectIncident(inc);
            }}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.title} ({inc.status.toUpperCase()})
              </option>
            ))}
          </select>

          {/* Status Updater */}
          {selectedIncident && (
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              {(['open', 'investigating', 'resolved', 'false_positive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    selectedIncident.status === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleTriggerAnalysis}
            disabled={loadingAi}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
            <span>Re-Run AI Grounding</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rca')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'rca' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Root-Cause Candidates Ranking</span>
          {selectedIncident?.candidates && (
            <span className="px-1.5 py-0.2 bg-slate-800 text-cyan-400 rounded-full text-[10px]">
              {selectedIncident.candidates.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'ai' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI-Grounded Diagnosis & RAG</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'timeline' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Causal Event Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('anomalies')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'anomalies' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Correlated Anomalies ({selectedIncident?.anomalies?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: Root-Cause Candidates Ranking */}
      {activeTab === 'rca' && (
        <div className="space-y-6">
          {/* Candidates Table & Scoring Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidates Table (2 cols) */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-100">Ranked Root-Cause Candidates</h2>
                  <p className="text-[11px] text-slate-400">
                    Transparent formula: <code className="text-cyan-400">Score = 0.25·Temporal + 0.25·Dependency + 0.20·Trace + 0.15·Metric + 0.15·Deploy</code>
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/80">
                {!selectedIncident?.candidates || selectedIncident.candidates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No candidate causes calculated. Run telemetry correlation or simulation.
                  </div>
                ) : (
                  selectedIncident.candidates.map((cand) => (
                    <div
                      key={cand.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedCandidate?.id === cand.id ? 'bg-cyan-950/30 border-l-4 border-cyan-400' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                            cand.rank_order === 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{cand.rank_order}
                          </span>
                          <span className="font-bold text-slate-100 text-sm">{cand.affected_service}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            cand.confidence_category === 'high' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            cand.confidence_category === 'medium' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {cand.confidence_category} Confidence
                          </span>
                        </div>

                        {/* Overall Ranking Score */}
                        <div className="text-right">
                          <div className="text-lg font-mono font-black text-cyan-400">{cand.ranking_score} <span className="text-xs text-slate-500 font-normal">/ 100</span></div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mb-3">{cand.candidate_cause}</p>

                      {/* Feature Breakdown Progress Bars */}
                      <div className="grid grid-cols-5 gap-2 text-[10px] pt-2 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Temporal</span>
                          <span className="font-mono text-slate-200">{cand.temporal_score} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Dependency</span>
                          <span className="font-mono text-slate-200">{cand.dependency_score} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Trace Flow</span>
                          <span className="font-mono text-slate-200">{cand.trace_score} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Metric Spike</span>
                          <span className="font-mono text-slate-200">{cand.metric_score} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Deployment</span>
                          <span className="font-mono text-slate-200">{cand.deployment_score} pts</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Candidate Evidence Dossier (1 col) */}
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Evidence Dossier: <span className="text-cyan-400">{selectedCandidate?.affected_service || 'Select Candidate'}</span>
                </h3>
              </div>

              {selectedCandidate ? (
                <div className="space-y-4 text-xs">
                  {/* Supporting Evidence */}
                  <div>
                    <span className="font-bold text-emerald-400 block mb-2">Supporting Signals ({selectedCandidate.supporting_evidence.length})</span>
                    <ul className="space-y-1.5">
                      {selectedCandidate.supporting_evidence.map((sup, idx) => (
                        <li key={idx} className="p-2 bg-emerald-950/30 border border-emerald-900/50 rounded-lg text-emerald-200 text-[11px] leading-relaxed">
                          ✓ {sup}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contradictory Evidence */}
                  {selectedCandidate.contradictory_evidence.length > 0 && (
                    <div>
                      <span className="font-bold text-rose-400 block mb-2">Contradictory Signals</span>
                      <ul className="space-y-1.5">
                        {selectedCandidate.contradictory_evidence.map((con, idx) => (
                          <li key={idx} className="p-2 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-200 text-[11px]">
                            ✗ {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Downstream Impact */}
                  {selectedCandidate.affected_downstream_services.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300 block mb-1">Downstream Cascading Targets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidate.affected_downstream_services.map(svc => (
                          <span key={svc} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-6 text-xs">
                  Select a root-cause candidate on the left to inspect its evidence dossier.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI-Grounded Diagnosis & RAG */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {aiAnalysis ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Diagnosis Summary & Evidence (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Grounded Summary */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-sm font-bold text-slate-100">AI Grounded Incident Explanation</h2>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                      Model: {aiAnalysis.model_name || 'TraceMind AI Grounding'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {aiAnalysis.incident_summary}
                  </p>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Probable Root Cause</span>
                    <p className="text-sm font-bold text-cyan-300">{aiAnalysis.probable_root_cause}</p>
                  </div>
                </div>

                {/* Recommended Diagnostic & Remediation Actions */}
                <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Safe Diagnostic & Remediation Steps</span>
                  </h3>
                  <p className="text-xs text-slate-400">Human-in-the-loop verified steps. Destructive actions are not executed automatically.</p>

                  <div className="space-y-3">
                    {aiAnalysis.recommended_actions.map((act, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs">{act.action}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            act.risk_level === 'high' ? 'bg-rose-950 text-rose-400' :
                            act.risk_level === 'medium' ? 'bg-amber-950 text-amber-400' :
                            'bg-emerald-950 text-emerald-400'
                          }`}>
                            {act.risk_level} Risk
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{act.reason}</p>
                        <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300">
                          <strong>Verification Procedure:</strong> {act.verification_procedure}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RAG Knowledge Base Citations (1 col) */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">Retrieved Runbook Citations (RAG)</h3>
                </div>

                {aiAnalysis.rag_citations && aiAnalysis.rag_citations.length > 0 ? (
                  <div className="space-y-3">
                    {aiAnalysis.rag_citations.map((cit, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                          <span>{cit.doc_title}</span>
                          <span className="font-mono text-slate-500">{(cit.similarity_score * 100).toFixed(0)}% match</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block">{cit.filename}</span>
                        <p className="text-[11px] text-slate-300 italic bg-slate-900/80 p-2 rounded border border-slate-800/80">
                          "{cit.excerpt}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                    No relevant troubleshooting runbooks indexed in Knowledge Base.
                  </div>
                )}

                {/* Limitations */}
                {aiAnalysis.limitations && (
                  <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Analysis Boundaries & Gaps</span>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                      {aiAnalysis.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
              <div className="font-bold text-sm text-slate-200">AI Grounded Analysis Ready</div>
              <p className="max-w-md mx-auto text-slate-400">
                Generate an evidence-grounded diagnosis cross-referencing telemetry anomalies with troubleshooting documentation.
              </p>
              <button
                onClick={handleTriggerAnalysis}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs"
              >
                Run AI Diagnosis
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Causal Event Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Chronological Causal Progression</h2>
          <p className="text-xs text-slate-400">Progression from initial deployment event to upstream cascading failures.</p>

          <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 mt-4">
            <div className="relative">
              <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-slate-900" />
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">1. Code Deployment</span>
                <p className="text-slate-200 font-semibold">Payment Service v1.8 release deployed to production</p>
                <p className="text-slate-400 text-[11px]">Introduced unindexed payment audit batch query commit.</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-slate-900" />
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-mono text-rose-400 uppercase font-bold">2. Database Latency Escalation</span>
                <p className="text-slate-200 font-semibold">PostgreSQL query duration spiked to 850ms (Sequential Scan)</p>
                <p className="text-slate-400 text-[11px]">Database connection pool lock contention on buffer.</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-slate-900" />
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">3. Upstream Service Timeout</span>
                <p className="text-slate-200 font-semibold">Payment Service and Order Service client deadlines exceeded</p>
                <p className="text-slate-400 text-[11px]">gRPC request deadlines exceeded waiting for PostgreSQL transaction responses.</p>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-rose-600 ring-4 ring-slate-900" />
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-mono text-rose-500 uppercase font-bold">4. Gateway Outage</span>
                <p className="text-slate-200 font-semibold">API Gateway returned HTTP 504 Gateway Timeout on /orders/checkout</p>
                <p className="text-slate-400 text-[11px]">End users experienced checkout payment failures.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Correlated Anomalies */}
      {activeTab === 'anomalies' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60">
            <h2 className="text-sm font-bold text-slate-100">Correlated Metric Anomalies</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Metric</th>
                <th className="py-3 px-4">Observed Value</th>
                <th className="py-3 px-4">Baseline Value</th>
                <th className="py-3 px-4">Deviation</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Detection Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {!selectedIncident?.anomalies || selectedIncident.anomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No anomalies linked to this incident.</td>
                </tr>
              ) : (
                selectedIncident.anomalies.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-slate-200">{a.service_name}</td>
                    <td className="py-3 px-4 font-mono text-cyan-400">{a.metric_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-200">{a.observed_value}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{a.baseline_value}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">+{a.deviation_pct}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-950 text-rose-400 border border-rose-800">
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{a.detection_method}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
