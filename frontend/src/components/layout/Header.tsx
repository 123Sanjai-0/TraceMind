import React, { useState, useEffect } from 'react';
import {
  Activity, Play, ShieldAlert, Sparkles, Wifi, WifiOff,
  Moon, Sun, RefreshCw, Cpu, CreditCard, Award
} from 'lucide-react';
import { SimulationModal } from '../common/SimulationModal';
import { api } from '../../services/api';

interface HeaderProps {
  onSimulationComplete: () => void;
  activeTab: string;
  onSelectTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSimulationComplete, activeTab, onSelectTab }) => {
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [planId, setPlanId] = useState<string>('pro');

  useEffect(() => {
    api.getSubscription().then(data => {
      if (data?.plan_id) setPlanId(data.plan_id);
    }).catch(() => {});

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/incidents`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);

      return () => {
        ws.close();
      };
    } catch (_) {
      setWsConnected(false);
    }
  }, [activeTab]);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Overview Dashboard';
      case 'services': return 'Service Inventory & Explorer';
      case 'map': return 'Service Dependency Map';
      case 'investigation': return 'Incident Root-Cause Investigation';
      case 'traces': return 'Distributed Trace Waterfall';
      case 'logs': return 'Distributed Log Explorer';
      case 'metrics': return 'Time-Series Metrics Explorer';
      case 'knowledge': return 'Troubleshooting Knowledge Base (RAG)';
      case 'evaluation': return 'System Evaluation & Benchmark';
      case 'subscription': return 'Tenant Subscription & Billing';
      case 'settings': return 'Platform Settings & Thresholds';
      default: return 'Observability Platform';
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  TraceMind
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded uppercase tracking-wider">
                  AI Observability
                </span>
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-2 hidden md:block" />

          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className="text-slate-400">Platform</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">{getPageTitle(activeTab)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Subscription Tier Active Badge */}
          <button
            onClick={() => onSelectTab && onSelectTab('subscription')}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-950/90 to-cyan-950/90 border border-indigo-700/60 hover:border-cyan-400 rounded-lg text-xs transition-all cursor-pointer shadow-sm"
            title="Manage Subscription & Billing"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
              {planId === 'enterprise' ? 'Enterprise Ultra' : planId === 'starter' ? 'Starter Free' : 'Pro Tier'}
            </span>
            <span className="px-1.5 py-0.2 text-[9px] bg-cyan-500/20 text-cyan-300 rounded font-semibold ml-1">
              Active
            </span>
          </button>

          {/* Real-time Stream Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
            {wsConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium hidden sm:inline">Telemetry Live</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400 font-medium hidden sm:inline">Polling Active</span>
              </>
            )}
          </div>

          {/* Quick Action: Run Incident Simulation */}
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-rose-900/30 border border-rose-400/30 transition-all transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run Incident Simulation</span>
          </button>
        </div>
      </header>

      <SimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onSuccess={() => {
          setIsSimModalOpen(false);
          onSimulationComplete();
        }}
      />
    </>
  );
};
