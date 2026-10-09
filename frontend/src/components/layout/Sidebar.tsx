import React from 'react';
import {
  LayoutDashboard, Server, GitFork, AlertTriangle, FileText,
  Network, LineChart, BookOpen, BarChart3, Settings, HelpCircle,
  CreditCard, Terminal
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  openIncidentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, openIncidentsCount }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'services', label: 'Service Inventory', icon: Server },
    { id: 'map', label: 'Dependency Map', icon: GitFork },
    { id: 'query', label: 'AI Query Console', icon: Terminal },
    { id: 'investigation', label: 'Incident RCA', icon: AlertTriangle, badge: openIncidentsCount },
    { id: 'traces', label: 'Trace Waterfall', icon: Network },
    { id: 'logs', label: 'Log Explorer', icon: FileText },
    { id: 'metrics', label: 'Metrics Explorer', icon: LineChart },
    { id: 'knowledge', label: 'Knowledge Base (RAG)', icon: BookOpen },
    { id: 'evaluation', label: 'Benchmark Suite', icon: BarChart3 },
    { id: 'subscription', label: 'Subscription & Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#080d1a]/95 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4">
        <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-3 mb-2">
          Observability Core
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>TraceMind Engine</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multi-signal correlation with graph-based causal ranking and evidence grounding.
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>v1.0.0 (Production)</span>
          <span className="text-cyan-400 font-mono">OpenTelemetry</span>
        </div>
      </div>
    </aside>
  );
};
