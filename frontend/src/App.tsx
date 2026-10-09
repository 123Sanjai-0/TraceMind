import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Overview } from './pages/Overview';
import { ServiceExplorer } from './pages/ServiceExplorer';
import { DependencyMap } from './pages/DependencyMap';
import { IncidentInvestigation } from './pages/IncidentInvestigation';
import { LogExplorer } from './pages/LogExplorer';
import { TraceExplorer } from './pages/TraceExplorer';
import { MetricsExplorer } from './pages/MetricsExplorer';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { EvaluationBenchmark } from './pages/EvaluationBenchmark';
import { SubscriptionBilling } from './pages/SubscriptionBilling';
import { Settings } from './pages/Settings';
import { QueryInvestigation } from './pages/QueryInvestigation';
import { SimulationModal } from './components/common/SimulationModal';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [targetIncidentId, setTargetIncidentId] = useState<string | undefined>(undefined);
  const [openIncidentsCount, setOpenIncidentsCount] = useState<number>(0);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);

  const fetchIncidentCount = async () => {
    try {
      const incs = await api.getIncidents('open');
      setOpenIncidentsCount(incs.length);
    } catch (_) {}
  };

  useEffect(() => {
    fetchIncidentCount();
    const interval = setInterval(fetchIncidentCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateTab = (tab: string, contextId?: string) => {
    setActiveTab(tab);
    if (contextId) {
      setTargetIncidentId(contextId);
    }
  };

  const handleSimulationComplete = () => {
    fetchIncidentCount();
    setActiveTab('investigation');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header
        onSimulationComplete={handleSimulationComplete}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setTargetIncidentId(undefined);
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setTargetIncidentId(undefined);
          }}
          openIncidentsCount={openIncidentsCount}
        />

        <main className="flex-1 overflow-y-auto bg-[#090d16]/50">
          {activeTab === 'overview' && (
            <Overview
              onNavigateTab={handleNavigateTab}
              onOpenSimulation={() => setIsSimModalOpen(true)}
            />
          )}
          {activeTab === 'services' && <ServiceExplorer />}
          {activeTab === 'map' && <DependencyMap />}
          {activeTab === 'query' && <QueryInvestigation />}
          {activeTab === 'investigation' && (
            <IncidentInvestigation initialIncidentId={targetIncidentId} />
          )}
          {activeTab === 'traces' && <TraceExplorer />}
          {activeTab === 'logs' && <LogExplorer />}
          {activeTab === 'metrics' && <MetricsExplorer />}
          {activeTab === 'knowledge' && <KnowledgeBase />}
          {activeTab === 'evaluation' && <EvaluationBenchmark />}
          {activeTab === 'subscription' && <SubscriptionBilling />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

      <SimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onSuccess={() => {
          setIsSimModalOpen(false);
          handleSimulationComplete();
        }}
      />
    </div>
  );
};

export default App;
