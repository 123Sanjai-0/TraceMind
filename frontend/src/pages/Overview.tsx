import React, { useState, useEffect } from 'react';
import {
  Server, AlertTriangle, Activity, Clock, ArrowUpRight,
  ShieldCheck, AlertOctagon, GitCommit, CheckCircle2, TrendingUp,
  Zap, Play, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { api } from '../services/api';
import { Service, Incident, Anomaly, DeploymentEvent } from '../types';

interface OverviewProps {
  onNavigateTab: (tab: string, contextId?: string) => void;
  onOpenSimulation: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigateTab, onOpenSimulation }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [deployments, setDeployments] = useState<DeploymentEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [svcData, incData, anomData, depData, sumData] = await Promise.all([
        api.getServices(),
        api.getIncidents(),
        api.getAnomalies(),
        api.getDeployments(),
        api.getMetricsSummary(),
      ]);
      setServices(svcData);
      setIncidents(incData);
      setAnomalies(anomData);
      setDeployments(depData);
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const trendData = [
    { time: '12m ago', latency: 22, errors: 0.1 },
    { time: '10m ago', latency: 24, errors: 0.1 },
    { time: '8m ago', latency: 21, errors: 0.2 },
    { time: '6m ago', latency: summary?.p95_latency_ms ? Math.round(summary.p95_latency_ms * 0.4) : 45, errors: 1.5 },
    { time: '4m ago', latency: summary?.p95_latency_ms ? Math.round(summary.p95_latency_ms * 0.8) : 220, errors: 4.8 },
    { time: '2m ago', latency: summary?.p95_latency_ms || 340, errors: (summary?.avg_error_rate || 0.05) * 100 },
    { time: 'Now', latency: summary?.p95_latency_ms || 420, errors: (summary?.avg_error_rate || 0.08) * 100 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Headline */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Distributed Observability Pulse</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            System Telemetry & Root-Cause Analysis Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuous ingestion of traces, metrics, logs, and deployment events with graph-based causal ranking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenSimulation}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/30 border border-rose-400/30 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Test Simulation Scenario</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Monitored Services */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Services</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{services.length || 9}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px]">
            <span className="text-emerald-400 font-bold">{summary?.healthy_services || 0} healthy</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-bold">{summary?.critical_services || 0} critical</span>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {incidents.filter(i => i.status === 'open' || i.status === 'investigating').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            {incidents.length} total recorded
          </div>
        </div>

        {/* P95 Latency */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">P95 Latency</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {summary?.p95_latency_ms ? `${Math.round(summary.p95_latency_ms)}ms` : '32ms'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Avg: {summary?.avg_latency_ms ? `${Math.round(summary.avg_latency_ms)}ms` : '18ms'}
          </div>
        </div>

        {/* Error Rate */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Error Rate</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${(summary?.avg_error_rate || 0) > 0.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {summary?.avg_error_rate ? `${(summary.avg_error_rate * 100).toFixed(2)}%` : '0.00%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Across active tiers
          </div>
        </div>

        {/* Throughput */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Throughput</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {summary?.total_throughput_rps ? `${Math.round(summary.total_throughput_rps)}` : '1,240'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Requests / sec
          </div>
        </div>

        {/* Detected Anomalies */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Anomalies</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {anomalies.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Statistical deviations
          </div>
        </div>
      </div>

      {/* Middle Grid: Telemetry Trends & Active Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency & Error Trend Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Live System Telemetry Trend</h2>
              <p className="text-xs text-slate-400">Time-series latency inflation and error spike propagation</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-cyan-400 rounded-full" />
                <span className="text-slate-300">P95 Latency (ms)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-rose-500 rounded-full" />
                <span className="text-slate-300">Error Rate (%)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#latencyGrad)" />
                <Area type="monotone" dataKey="errors" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#errorGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Incidents Feed (1 col) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-100">Recent Incidents</h2>
              <button
                onClick={() => onNavigateTab('investigation')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[260px]">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
                  No active incidents detected. Run a simulation to trigger realistic failure cascades.
                </div>
              ) : (
                incidents.slice(0, 4).map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => onNavigateTab('investigation', inc.id)}
                    className="p-3 bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                        {inc.title}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        inc.severity === 'critical' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                      }`}>
                        {inc.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {inc.probable_root_cause || inc.summary || 'Analyzing telemetry evidence...'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Status: <strong className="text-slate-300 uppercase">{inc.status}</strong></span>
                      <span className="text-cyan-400 font-mono">Ranked RCA →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('map')}
              className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors text-center"
            >
              Open Service Dependency Map
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Anomalies & Deployment Correlator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Anomalies Pulse */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-100">Live Anomaly Pulse</h2>
            </div>
            <span className="text-xs text-slate-400">Statistical breaches</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {anomalies.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                Telemetry within normal thresholds.
              </div>
            ) : (
              anomalies.slice(0, 5).map((a) => (
                <div key={a.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">
                      {a.service_name} <span className="text-slate-400 font-normal">({a.metric_name})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{a.supporting_evidence || `Deviation: ${a.deviation_pct}%`}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                    a.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}>
                    {a.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100">Recent Deployment Events</h2>
            </div>
            <span className="text-xs text-slate-400">Release timeline</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {deployments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                No recent releases recorded in this window.
              </div>
            ) : (
              deployments.slice(0, 5).map((d) => (
                <div key={d.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">
                      {d.service_name} <span className="text-indigo-400 font-mono">({d.previous_version} → {d.new_version})</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{d.change_description}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(d.deployed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
