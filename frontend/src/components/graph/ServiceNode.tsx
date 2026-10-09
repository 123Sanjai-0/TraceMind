import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Server, Database, Zap, Cpu, Globe, MessageSquare,
  ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2
} from 'lucide-react';

const getServiceIcon = (type: string) => {
  switch (type) {
    case 'frontend': return Globe;
    case 'api_gateway': return Zap;
    case 'database': return Database;
    case 'cache': return Cpu;
    case 'queue': return MessageSquare;
    default: return Server;
  }
};

const getHealthBadge = (status: string) => {
  switch (status) {
    case 'critical':
      return {
        bg: 'bg-rose-950/80',
        text: 'text-rose-400',
        border: 'border-rose-500/50',
        glow: 'shadow-rose-900/50',
        icon: AlertOctagon,
      };
    case 'degraded':
      return {
        bg: 'bg-amber-950/80',
        text: 'text-amber-400',
        border: 'border-amber-500/50',
        glow: 'shadow-amber-900/50',
        icon: AlertTriangle,
      };
    default:
      return {
        bg: 'bg-emerald-950/80',
        text: 'text-emerald-400',
        border: 'border-emerald-500/50',
        glow: 'shadow-emerald-900/30',
        icon: CheckCircle2,
      };
  }
};

export const ServiceNode = memo(({ data }: { data: any }) => {
  const Icon = getServiceIcon(data.serviceType);
  const health = getHealthBadge(data.healthStatus);
  const HealthIcon = health.icon;
  const isHighlighted = data.isHighlighted;

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-[#0f172a]/95 border backdrop-blur-md p-3.5 shadow-xl transition-all duration-300 ${
        isHighlighted
          ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-rose-900/60 animate-pulse-slow'
          : `${health.border} hover:border-slate-600`
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-2.5 !h-2.5 !border-slate-900" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800/80 text-cyan-400 border border-slate-700/80">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 tracking-tight">{data.label}</div>
            <div className="text-[10px] text-slate-400 uppercase">{data.serviceType}</div>
          </div>
        </div>

        {/* Health Status Indicator */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${health.bg} ${health.text} ${health.border}`}>
          <HealthIcon className="w-3 h-3" />
          <span className="capitalize">{data.healthStatus}</span>
        </div>
      </div>

      {/* Metric Telemetry Row */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
        <div>
          <span className="text-slate-400 text-[10px] block">Latency</span>
          <span className={`font-mono font-semibold ${data.avgLatency > 200 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
            {data.avgLatency ? `${Math.round(data.avgLatency)}ms` : '0ms'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block">Error Rate</span>
          <span className={`font-mono font-semibold ${data.errorRate > 0.05 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
            {(data.errorRate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {data.anomalyCount > 0 && (
        <div className="mt-2 text-center py-0.5 bg-rose-500/15 border border-rose-500/30 rounded text-[10px] font-bold text-rose-300">
          {data.anomalyCount} Active Anomalies
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-2.5 !h-2.5 !border-slate-900" />
    </div>
  );
});
