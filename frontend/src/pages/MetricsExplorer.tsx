import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Activity, Clock, Server, Zap, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { MetricRecord, Service } from '../types';

export const MetricsExplorer: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('postgres-db');
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getServices().then(data => {
      setServices(data);
      if (data.length > 0) setSelectedService(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedService) loadMetrics(selectedService);
  }, [selectedService]);

  const loadMetrics = async (svcId: string) => {
    setLoading(true);
    try {
      const data = await api.getMetrics(svcId);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const latencyData = metrics
    .filter(m => m.metric_name === 'latency')
    .slice()
    .reverse()
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latency: m.metric_value,
      threshold: 100,
    }));

  const errorData = metrics
    .filter(m => m.metric_name === 'error_rate')
    .slice()
    .reverse()
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      errorRate: (m.metric_value * 100),
      threshold: 5,
    }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Time-Series Metrics Explorer</h1>
          <p className="text-xs text-slate-400">High-resolution metrics time-series with automated anomaly threshold overlay.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={() => loadMetrics(selectedService)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Time Series */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Response Latency (ms)</span>
            </h2>
            <span className="text-[11px] text-rose-400 font-mono">Anomaly Threshold: 100ms</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="latArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <ReferenceLine y={100} stroke="#f43f5e" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="latency" stroke="#06b6d4" strokeWidth={2} fill="url(#latArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate Time Series */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Error Rate Percentage (%)</span>
            </h2>
            <span className="text-[11px] text-rose-400 font-mono">Critical Threshold: 5%</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={errorData}>
                <defs>
                  <linearGradient id="errArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <ReferenceLine y={5} stroke="#f43f5e" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="errorRate" stroke="#f43f5e" strokeWidth={2} fill="url(#errArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
