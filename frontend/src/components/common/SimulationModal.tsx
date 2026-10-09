import React, { useState, useEffect } from 'react';
import { Play, X, Sparkles, AlertCircle, Database, Server, Cpu, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { ScenarioInfo, SimulationResponse } from '../../types';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('db_query_regression');
  const [noiseLevel, setNoiseLevel] = useState<number>(0.05);
  const [runLlm, setRunLlm] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getScenarios()
        .then(data => setScenarios(data))
        .catch(err => console.error(err));
      setSimResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runSimulation(selectedScenario, noiseLevel, runLlm);
      setSimResult(res);
      setTimeout(() => {
        onSuccess();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Play className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Run Distributed Incident Simulation</h3>
              <p className="text-xs text-slate-400">Inject synthetic failure cascades across telemetry channels and trigger automated RCA.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {simResult ? (
            <div className="p-5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Simulation Successfully Injected & Analyzed!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Logs Emitted</span>
                  <span className="text-slate-100 font-bold text-sm">{simResult.logs_generated_count}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Traces Captured</span>
                  <span className="text-slate-100 font-bold text-sm">{simResult.traces_generated_count}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Anomalies Detected</span>
                  <span className="text-rose-400 font-bold text-sm">{simResult.anomalies_detected_count}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Execution Latency</span>
                  <span className="text-cyan-400 font-bold text-sm">{simResult.execution_time_ms}ms</span>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Identified Root Cause: <strong className="text-cyan-300">{simResult.incident.probable_root_cause}</strong>
              </p>
            </div>
          ) : (
            <>
              {/* Scenario Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Incident Failure Scenario
                </label>
                <div className="space-y-2.5">
                  {scenarios.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedScenario(sc.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedScenario === sc.id
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-200">{sc.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded border border-slate-700">
                          Origin: {sc.root_cause_service}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{sc.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-500">Affected Services:</span>
                        {sc.affected_services.map(svc => (
                          <span key={svc} className="text-[10px] px-1.5 py-0.2 bg-slate-800/80 text-cyan-400 rounded">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Telemetry Gaussian Noise: {(noiseLevel * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.2"
                    step="0.01"
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Deterministic</span>
                    <span>Realistic Variance</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">AI Grounded Analysis</span>
                      <span className="text-[10px] text-slate-400">Run LLM + RAG diagnosis</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={runLlm}
                    onChange={(e) => setRunLlm(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-900/40 border border-rose-400/30 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Injecting & Correlating Telemetry...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
