import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  GitFork, Server, Activity, ShieldAlert, Zap, Filter,
  Maximize2, RefreshCw, X, Info
} from 'lucide-react';
import { api } from '../services/api';
import { Incident } from '../types';
import { ServiceNode } from '../components/graph/ServiceNode';

export const DependencyMap: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({ serviceNode: ServiceNode }), []);

  const loadGraph = useCallback(async (incId?: string) => {
    setLoading(true);
    try {
      const graphData = await api.getDependencyGraph(incId || undefined);
      
      // Transform edges to add arrows and styling
      const formattedEdges = (graphData.edges || []).map((e: any) => ({
        ...e,
        style: {
          stroke: e.data?.isHighlighted ? '#f43f5e' : '#475569',
          strokeWidth: e.data?.isHighlighted ? 3 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: e.data?.isHighlighted ? '#f43f5e' : '#64748b',
          width: 14,
          height: 14,
        },
      }));

      setNodes(graphData.nodes || []);
      setEdges(formattedEdges);
    } catch (err) {
      console.error('Failed to load dependency graph', err);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    api.getIncidents().then(incs => {
      setIncidents(incs);
      if (incs.length > 0) {
        setSelectedIncidentId(incs[0].id);
        loadGraph(incs[0].id);
      } else {
        loadGraph();
      }
    });
  }, [loadGraph]);

  const handleIncidentFilterChange = (id: string) => {
    setSelectedIncidentId(id);
    loadGraph(id);
  };

  const onNodeClick = (_: any, node: any) => {
    setSelectedNodeData(node.data);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative bg-[#090d16]">
      {/* Top Controls Toolbar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-[#0c1222]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">Service Dependency Topology Map</h1>
            <p className="text-[11px] text-slate-400">Live directed call graph with failure propagation traversal.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Incident Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Highlight Incident:</span>
            <select
              value={selectedIncidentId}
              onChange={(e) => handleIncidentFilterChange(e.target.value)}
              className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">None (Normal Topology)</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.title} ({inc.severity.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadGraph(selectedIncidentId)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title="Reload Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#090d16]"
        >
          <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-200" />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 p-3 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl backdrop-blur-md text-[11px] space-y-1.5 pointer-events-none">
          <div className="font-bold text-slate-300 mb-1">Graph Health Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Healthy Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Degraded Latency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Critical Error Cascade</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <span className="w-3 h-0.5 bg-rose-500" />
            <span className="text-rose-400 font-semibold">Incident Causal Edge</span>
          </div>
        </div>

        {/* Node Inspection Side Sheet */}
        {selectedNodeData && (
          <div className="absolute top-6 right-6 w-80 p-5 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-4 animate-fade-in z-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-100">{selectedNodeData.label}</span>
              </div>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Type:</span>
                <span className="font-mono text-slate-200 uppercase">{selectedNodeData.serviceType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Health State:</span>
                <span className="font-bold text-slate-200 capitalize">{selectedNodeData.healthStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Avg Latency:</span>
                <span className="font-mono text-cyan-400">{Math.round(selectedNodeData.avgLatency || 0)}ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Error Rate:</span>
                <span className="font-mono text-slate-200">{((selectedNodeData.errorRate || 0) * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Active Anomalies:</span>
                <span className="font-bold text-rose-400">{selectedNodeData.anomalyCount || 0}</span>
              </div>
            </div>

            {selectedNodeData.isHighlighted && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-[11px]">
                <strong className="block mb-0.5">Part of Active Incident</strong>
                This node is in the correlated failure propagation path.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
