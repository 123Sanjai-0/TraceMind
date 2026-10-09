import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, RefreshCw, Terminal, ArrowDownRight } from 'lucide-react';
import { api } from '../services/api';
import { LogRecord, Service } from '../types';

export const LogExplorer: React.FC = () => {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceFilter, setServiceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [traceIdFilter, setTraceIdFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);

  useEffect(() => {
    api.getServices().then(setServices);
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs(
        serviceFilter || undefined,
        severityFilter || undefined,
        traceIdFilter || undefined,
        search || undefined
      );
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Distributed Log Explorer</h1>
          <p className="text-xs text-slate-400">Search and correlate structured logs across microservice boundaries.</p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl flex flex-wrap items-center gap-3">
        {/* Full Text Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search log messages (e.g. timeout, SQL, lock)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Service Filter */}
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Warn</option>
          <option value="INFO">Info</option>
        </select>

        {/* Trace ID Filter */}
        <input
          type="text"
          placeholder="Filter by Trace ID..."
          value={traceIdFilter}
          onChange={(e) => setTraceIdFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
        />

        <button
          type="submit"
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs transition-colors"
        >
          Query
        </button>
      </form>

      {/* Logs Table Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Trace ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No log records match current query filter.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLog(l)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        l.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        l.severity === 'ERROR' ? 'bg-rose-950/80 text-rose-400' :
                        l.severity === 'WARN' ? 'bg-amber-950/80 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {l.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-300">{l.service_name}</td>
                    <td className="py-2.5 px-4 text-slate-200 max-w-lg truncate">{l.message}</td>
                    <td className="py-2.5 px-4 text-cyan-400 text-[11px] truncate max-w-[120px]">
                      {l.trace_id || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Log JSON Drawer */}
      {selectedLog && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200">Log Record Payload ({selectedLog.id})</span>
            <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-200 font-sans">✕</button>
          </div>
          <pre className="p-4 bg-slate-900 rounded-xl overflow-x-auto text-cyan-300 text-[11px]">
            {JSON.stringify(selectedLog, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
