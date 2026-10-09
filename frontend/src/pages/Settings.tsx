import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, CheckCircle2, Shield, Sliders } from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Platform Thresholds & Algorithm Settings</h1>
        <p className="text-xs text-slate-400">Configure statistical anomaly bounds, root-cause feature weights, and LLM providers.</p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Platform settings updated and persisted successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Anomaly Detection Thresholds */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Statistical Anomaly Detection Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Rolling Z-Score Threshold (σ)</label>
              <input
                type="number"
                step="0.1"
                value={settings.detection_thresholds?.z_score_threshold || 2.5}
                onChange={(e) => setSettings({
                  ...settings,
                  detection_thresholds: { ...settings.detection_thresholds, z_score_threshold: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 2.5 standard deviations</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Latency Deviation Surge Threshold (%)</label>
              <input
                type="number"
                step="5"
                value={settings.detection_thresholds?.latency_deviation_pct || 50}
                onChange={(e) => setSettings({
                  ...settings,
                  detection_thresholds: { ...settings.detection_thresholds, latency_deviation_pct: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 50% increase over baseline</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Error Rate Critical Threshold (Ratio)</label>
              <input
                type="number"
                step="0.01"
                value={settings.detection_thresholds?.error_rate_threshold || 0.05}
                onChange={(e) => setSettings({
                  ...settings,
                  detection_thresholds: { ...settings.detection_thresholds, error_rate_threshold: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 0.05 (5% error rate)</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Correlation Time Window (Minutes)</label>
              <input
                type="number"
                step="1"
                value={settings.detection_thresholds?.time_window_minutes || 15}
                onChange={(e) => setSettings({
                  ...settings,
                  detection_thresholds: { ...settings.detection_thresholds, time_window_minutes: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Default: 15 minutes window</span>
            </div>
          </div>
        </div>

        {/* RCA Feature Weights */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Root-Cause Scoring Feature Weights (Sum = 1.0)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Temporal</label>
              <input
                type="number"
                step="0.05"
                value={settings.scoring_weights?.temporal_weight || 0.25}
                onChange={(e) => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, temporal_weight: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Dependency</label>
              <input
                type="number"
                step="0.05"
                value={settings.scoring_weights?.dependency_weight || 0.25}
                onChange={(e) => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, dependency_weight: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Trace Flow</label>
              <input
                type="number"
                step="0.05"
                value={settings.scoring_weights?.trace_weight || 0.20}
                onChange={(e) => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, trace_weight: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Metric Deviation</label>
              <input
                type="number"
                step="0.05"
                value={settings.scoring_weights?.metric_weight || 0.15}
                onChange={(e) => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, metric_weight: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Deployment</label>
              <input
                type="number"
                step="0.05"
                value={settings.scoring_weights?.deployment_weight || 0.15}
                onChange={(e) => setSettings({
                  ...settings,
                  scoring_weights: { ...settings.scoring_weights, deployment_weight: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* LLM Provider Configuration */}
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">AI Explainer & LLM Provider</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Provider Interface</label>
              <select
                value={settings.llm_configuration?.provider || 'mock'}
                onChange={(e) => setSettings({
                  ...settings,
                  llm_configuration: { ...settings.llm_configuration, provider: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="mock">Deterministic Local Fallback Engine (No API Key Required)</option>
                <option value="openai">OpenAI (GPT-4o-mini / GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">API keys are loaded securely from server-side environment variables (.env).</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Model Identifier</label>
              <input
                type="text"
                value={settings.llm_configuration?.model_name || 'gpt-4o-mini'}
                onChange={(e) => setSettings({
                  ...settings,
                  llm_configuration: { ...settings.llm_configuration, model_name: e.target.value }
                })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Persist Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
