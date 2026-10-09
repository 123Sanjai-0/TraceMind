import React, { useState, useEffect } from 'react';
import { Network, Search, Filter, Clock, AlertOctagon, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { api } from '../services/api';
import { TraceSpan } from '../types';

export const TraceExplorer: React.FC = () => {
  const [traces, setTraces] = useState<TraceSpan[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string>('');
  const [waterfallSpans, setWaterfallSpans] = useState<TraceSpan[]>([]);
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTraces();
  }, []);

  const loadTraces = async () => {
    setLoading(true);
    try {
      const data = await api.getTraces();
      setTraces(data);
      // Group unique trace IDs
      const uniqueTraceIds = Array.from(new Set(data.map(s => s.trace_id)));
      if (uniqueTraceIds.length > 0) {
        setSelectedTraceId(uniqueTraceIds[0]);
        loadWaterfall(uniqueTraceIds[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWaterfall = async (traceId: string) => {
    try {
      const spans = await api.getTraceWaterfall(traceId);
      setWaterfallSpans(spans);
      setSelectedSpan(spans.length > 0 ? spans[0] : null);
    } catch (err) {
      console.error(err);
    }
  };

  const uniqueTraces = Array.from(new Set(traces.map(s => s.trace_id))).map(tId => {
    const rootSpan = traces.find(s => s.trace_id === tId && !s.parent_span_id) || traces.find(s => s.trace_id === tId);
    const hasError = traces.some(s => s.trace_id === tId && s.status_code === 'ERROR');
    return {
      traceId: tId,
      rootOperation: rootSpan?.operation_name || 'HTTP Request',
      service: rootSpan?.service_name || 'gateway',
      duration: rootSpan?.duration_ms || 100,
      hasError,
    };
  });

  const maxTraceDuration = waterfallSpans.length > 0 ? Math.max(...waterfallSpans.map(s => s.duration_ms)) : 1000;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Distributed Trace Waterfall Explorer</h1>
        <p className="text-xs text-slate-400">Inspect end-to-end distributed span latencies, parent-child hierarchies, and error propagation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trace List (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recent Traces</h2>
          <div className="space-y-2 max-h-[580px] overflow-y-auto">
            {uniqueTraces.map((t) => (
              <div
                key={t.traceId}
                onClick={() => {
                  setSelectedTraceId(t.traceId);
                  loadWaterfall(t.traceId);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTraceId === t.traceId
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-bold text-slate-200 truncate max-w-[160px]">{t.rootOperation}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    t.hasError ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'
                  }`}>
                    {t.hasError ? 'ERROR' : 'OK'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{t.service}</span>
                  <span className="text-cyan-400 font-bold">{t.duration}ms</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-1">
                  ID: {t.traceId}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waterfall View (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Waterfall Timeline: {selectedTraceId}</h2>
              <span className="text-xs text-slate-400">Total spans: {waterfallSpans.length}</span>
            </div>
          </div>

          {/* Waterfall Chart */}
          <div className="space-y-3 overflow-x-auto">
            {waterfallSpans.map((span, idx) => {
              const depth = span.parent_span_id ? (idx % 4) + 1 : 0;
              const widthPct = Math.max((span.duration_ms / (maxTraceDuration || 1)) * 100, 8);
              const leftOffsetPct = depth * 12;

              return (
                <div
                  key={span.id}
                  onClick={() => setSelectedSpan(span)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedSpan?.id === span.id ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 16}px` }}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-slate-200">{span.service_name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">→ {span.operation_name}</span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${span.status_code === 'ERROR' ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {span.duration_ms}ms
                    </span>
                  </div>

                  {/* Relative Duration Bar */}
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        span.status_code === 'ERROR' ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                      }`}
                      style={{ width: `${widthPct}%`, marginLeft: `${leftOffsetPct}%` }}
                    />
                  </div>

                  {span.error_message && (
                    <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-900/60 font-mono">
                      Error: {span.error_message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Span Attributes Drawer */}
          {selectedSpan && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <span className="font-bold text-slate-300 font-sans block">Span Attributes: {selectedSpan.operation_name}</span>
              <pre className="p-3 bg-slate-900 rounded-lg text-cyan-300 text-[11px] overflow-x-auto">
                {JSON.stringify(selectedSpan, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
