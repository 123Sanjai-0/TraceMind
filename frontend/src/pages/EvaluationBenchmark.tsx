import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BarChart3, Award, Zap, CheckCircle2, AlertTriangle, ArrowUpRight, HelpCircle } from 'lucide-react';
import { api } from '../services/api';
import { BenchmarkResult } from '../types';

export const EvaluationBenchmark: React.FC = () => {
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBenchmark();
  }, []);

  const loadBenchmark = async () => {
    setLoading(true);
    try {
      const data = await api.getBenchmark();
      setBenchmark(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!benchmark) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading evaluation benchmark dataset...
      </div>
    );
  }

  const accuracyData = [
    {
      metric: 'Top-1 Accuracy (%)',
      'Baseline A (Logs)': benchmark.baselines.baseline_a_log_only.metrics.top1_accuracy,
      'Baseline B (Multi-Signal)': benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.top1_accuracy,
      'TraceMind (Proposed)': benchmark.baselines.proposed_tracemind.metrics.top1_accuracy,
    },
    {
      metric: 'Top-3 Accuracy (%)',
      'Baseline A (Logs)': benchmark.baselines.baseline_a_log_only.metrics.top3_accuracy,
      'Baseline B (Multi-Signal)': benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.top3_accuracy,
      'TraceMind (Proposed)': benchmark.baselines.proposed_tracemind.metrics.top3_accuracy,
    },
    {
      metric: 'F1 Score (x100)',
      'Baseline A (Logs)': benchmark.baselines.baseline_a_log_only.metrics.f1_score * 100,
      'Baseline B (Multi-Signal)': benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.f1_score * 100,
      'TraceMind (Proposed)': benchmark.baselines.proposed_tracemind.metrics.f1_score * 100,
    },
  ];

  const latencyData = [
    {
      metric: 'Detection Latency (ms)',
      'Baseline A (Logs)': benchmark.baselines.baseline_a_log_only.metrics.detection_latency_ms,
      'Baseline B (Multi-Signal)': benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.detection_latency_ms,
      'TraceMind (Proposed)': benchmark.baselines.proposed_tracemind.metrics.detection_latency_ms,
    },
    {
      metric: 'Analysis Latency (ms)',
      'Baseline A (Logs)': benchmark.baselines.baseline_a_log_only.metrics.analysis_latency_ms,
      'Baseline B (Multi-Signal)': benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.analysis_latency_ms,
      'TraceMind (Proposed)': benchmark.baselines.proposed_tracemind.metrics.analysis_latency_ms,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <Award className="w-4 h-4" />
          <span>Academic Evaluation & Comparative Benchmark</span>
        </div>
        <h1 className="text-xl font-bold text-slate-100">RCA Performance Comparison Across 20 Ground-Truth Scenarios</h1>
        <p className="text-xs text-slate-400">
          Empirical evaluation comparing Log-Only (Baseline A), Multi-Signal without Graph (Baseline B), and TraceMind (Proposed System).
        </p>
      </div>

      {/* Comparative Metrics Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Evaluation System</th>
              <th className="py-3 px-4">Top-1 Accuracy</th>
              <th className="py-3 px-4">Top-3 Accuracy</th>
              <th className="py-3 px-4">Precision</th>
              <th className="py-3 px-4">Recall</th>
              <th className="py-3 px-4">F1 Score</th>
              <th className="py-3 px-4">False-Pos Rate</th>
              <th className="py-3 px-4">Detection Latency</th>
              <th className="py-3 px-4">Analysis Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {/* Baseline A */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-4 font-sans font-bold text-slate-300">
                Baseline A: Log-Only
              </td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.top1_accuracy}%</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.top3_accuracy}%</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.precision}</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.recall}</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.f1_score}</td>
              <td className="py-3 px-4 text-rose-400">{benchmark.baselines.baseline_a_log_only.metrics.false_positive_rate}</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.detection_latency_ms}ms</td>
              <td className="py-3 px-4 text-slate-400">{benchmark.baselines.baseline_a_log_only.metrics.analysis_latency_ms}ms</td>
            </tr>

            {/* Baseline B */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-4 font-sans font-bold text-slate-300">
                Baseline B: Multi-Signal (No Graph)
              </td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.top1_accuracy}%</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.top3_accuracy}%</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.precision}</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.recall}</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.f1_score}</td>
              <td className="py-3 px-4 text-amber-400">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.false_positive_rate}</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.detection_latency_ms}ms</td>
              <td className="py-3 px-4 text-slate-300">{benchmark.baselines.baseline_b_multi_signal_no_graph.metrics.analysis_latency_ms}ms</td>
            </tr>

            {/* Proposed TraceMind */}
            <tr className="bg-cyan-950/30 font-bold border-l-4 border-cyan-400">
              <td className="py-3 px-4 font-sans text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Proposed: TraceMind Platform</span>
              </td>
              <td className="py-3 px-4 text-cyan-300 font-black">{benchmark.baselines.proposed_tracemind.metrics.top1_accuracy}%</td>
              <td className="py-3 px-4 text-cyan-300 font-black">{benchmark.baselines.proposed_tracemind.metrics.top3_accuracy}%</td>
              <td className="py-3 px-4 text-cyan-300">{benchmark.baselines.proposed_tracemind.metrics.precision}</td>
              <td className="py-3 px-4 text-cyan-300">{benchmark.baselines.proposed_tracemind.metrics.recall}</td>
              <td className="py-3 px-4 text-cyan-300">{benchmark.baselines.proposed_tracemind.metrics.f1_score}</td>
              <td className="py-3 px-4 text-emerald-400">{benchmark.baselines.proposed_tracemind.metrics.false_positive_rate}</td>
              <td className="py-3 px-4 text-cyan-300">{benchmark.baselines.proposed_tracemind.metrics.detection_latency_ms}ms</td>
              <td className="py-3 px-4 text-cyan-300">{benchmark.baselines.proposed_tracemind.metrics.analysis_latency_ms}ms</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Comparison */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Accuracy & F1-Score Comparison</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline A (Logs)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Baseline B (Multi-Signal)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TraceMind (Proposed)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Comparison */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">Detection & Analysis Speed (ms - Lower is Better)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline A (Logs)" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Baseline B (Multi-Signal)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TraceMind (Proposed)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Discussion & Theoretical Justification */}
      <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Evaluation Analysis & Failure Mode Discussion</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {benchmark.analysis_discussion}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
            <strong className="text-slate-200 block mb-1">Why Log-Only Fails:</strong>
            Upstream edge services log timeouts profusely, drowning out silent database lockups and misleading frequency-based rankers.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
            <strong className="text-slate-200 block mb-1">Why Multi-Signal Alone Struggles:</strong>
            Detects all degraded nodes simultaneously but lacks directed edge reachability to distinguish the origin from downstream victims.
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
            <strong className="text-cyan-300 block mb-1">How TraceMind Wins:</strong>
            Synthesizes NetworkX topological depth, trace span error originators, temporal onset deltas, and deployment proximity into an explainable score.
          </div>
        </div>
      </div>
    </div>
  );
};
