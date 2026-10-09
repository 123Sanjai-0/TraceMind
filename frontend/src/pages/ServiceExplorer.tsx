import React, { useState, useEffect } from 'react';
import {
  Server, Search, Filter, ShieldCheck, AlertTriangle, AlertOctagon,
  Clock, Cpu, Zap, X, Activity, FileText, Network, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { Service, MetricRecord, LogRecord, TraceSpan } from '../types';

export const ServiceExplorer: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceMetrics, setServiceMetrics] = useState<MetricRecord[]>([]);
  const [serviceLogs, setServiceLogs] = useState<LogRecord[]>([]);
  const [serviceTraces, setServiceTraces] = useState<TraceSpan[]>([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await api.getServices();
      setServices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectService = async (svc: Service) => {
    setSelectedService(svc);
    setLoadingDrawer(true);
    try {
      const [m, l, t] = await Promise.all([
        api.getServiceMetrics(svc.id, 'latency'),
        api.getServiceLogs(svc.id),
        api.getServiceTraces(svc.id),
      ]);
      setServiceMetrics(m);
      setServiceLogs(l);
      setServiceTraces(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.health_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const chartData = serviceMetrics.slice().reverse().map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: m.metric_value,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Service Inventory & Health Explorer</h1>
          <p className="text-xs text-slate-400">Detailed performance telemetry and live degradation status for all 9 microservices.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy Only</option>
            <option value="degraded">Degraded Only</option>
            <option value="critical">Critical Only</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Health Status</th>
                <th className="py-3 px-4">Throughput</th>
                <th className="py-3 px-4">Error Rate</th>
                <th className="py-3 px-4">Avg Latency</th>
                <th className="py-3 px-4">P95 Latency</th>
                <th className="py-3 px-4">P99 Latency</th>
                <th className="py-3 px-4">CPU / Mem</th>
                <th className="py-3 px-4">Telemetry Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredServices.map((svc) => (
                <tr
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className={`cursor-pointer transition-colors ${
                    selectedService?.id === svc.id ? 'bg-cyan-950/30' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-200 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{svc.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 uppercase text-[10px] font-mono">{svc.type}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      svc.health_status === 'critical' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                      svc.health_status === 'degraded' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                      'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    }`}>
                      {svc.health_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{svc.request_rate} rps</td>
                  <td className="py-3 px-4 font-mono font-semibold">
                    <span className={svc.error_rate > 0.05 ? 'text-rose-400' : 'text-slate-300'}>
                      {(svc.error_rate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{svc.avg_latency}ms</td>
                  <td className="py-3 px-4 font-mono font-semibold">
                    <span className={svc.p95_latency > 200 ? 'text-rose-400' : 'text-slate-200'}>
                      {svc.p95_latency}ms
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{svc.p99_latency}ms</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <span className={svc.cpu_util > 80 ? 'text-rose-400' : 'text-slate-300'}>{svc.cpu_util}%</span> / {svc.memory_util}%
                  </td>
                  <td className="py-3 px-4">
                    {svc.is_simulated ? (
                      <span className="px-1.5 py-0.5 text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800 rounded">
                        Simulated Telemetry
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                        OTel Collector Live
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspection Drawer / Modal */}
      {selectedService && (
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{selectedService.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>ID: <code className="text-cyan-400">{selectedService.id}</code></span>
                  <span>•</span>
                  <span>Type: <strong className="uppercase">{selectedService.type}</strong></span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedService(null)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latency History Chart (2 cols) */}
            <div className="lg:col-span-2 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Recent Latency Time-Series (ms)</span>
              </h3>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Stats Summary (1 col) */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 text-xs">
              <h3 className="font-bold text-slate-200">Health Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Health State</span>
                  <span className="font-bold text-slate-200 capitalize">{selectedService.health_status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">P95 Latency</span>
                  <span className="font-mono text-cyan-400">{selectedService.p95_latency}ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Error Ratio</span>
                  <span className="font-mono text-slate-200">{(selectedService.error_rate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">CPU Usage</span>
                  <span className="font-mono text-slate-200">{selectedService.cpu_util}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Memory Usage</span>
                  <span className="font-mono text-slate-200">{selectedService.memory_util}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Service Logs */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Recent Logs for {selectedService.name}</span>
            </h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
              {serviceLogs.length === 0 ? (
                <div className="text-slate-500 py-2">No recent logs recorded.</div>
              ) : (
                serviceLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="p-2 bg-slate-900/80 border border-slate-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className={`font-bold mr-2 ${l.severity === 'ERROR' || l.severity === 'CRITICAL' ? 'text-rose-400' : 'text-slate-400'}`}>
                        [{l.severity}]
                      </span>
                      <span className="text-slate-300">{l.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
