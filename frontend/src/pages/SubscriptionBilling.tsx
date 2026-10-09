import React, { useState, useEffect } from 'react';
import {
  CreditCard, Check, Zap, Shield, Sparkles, AlertCircle,
  Download, ArrowUpRight, CheckCircle2, Lock, Star, ChevronRight,
  TrendingUp, Clock, Server, FileText, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { SubscriptionData, PlanDefinition } from '../types';

export const SubscriptionBilling: React.FC = () => {
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const data = await api.getSubscription();
      setSubData(data);
      setBillingCycle(data.billing_cycle || 'monthly');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    setSuccessMessage(null);
    try {
      const updated = await api.upgradeSubscription(planId, billingCycle, {
        brand: 'Visa',
        last4: '4242',
        exp: '12/28',
        name: 'TraceMind Engineering Org',
      });
      setSubData(updated);
      setSuccessMessage(`Successfully switched subscription to ${updated.plan_name}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (loading || !subData) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Loading subscription & tenant billing details...</span>
      </div>
    );
  }

  const spansPct = Math.min(Math.round((subData.spans_consumed_this_month / (subData.max_spans_per_month || 1)) * 100), 100);
  const aiQueriesPct = Math.min(Math.round((subData.ai_rca_queries_consumed / (subData.max_ai_rca_queries_per_month || 1)) * 100), 100);
  const servicesPct = Math.min(Math.round((9 / (subData.max_services || 1)) * 100), 100);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-cyan-950/40 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>SaaS Tenant Subscription & Billing Management</span>
          </div>
          <h1 className="text-xl font-black text-slate-100 tracking-tight">
            Plan Tier: <span className="text-cyan-400">{subData.plan_name}</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Manage your observability quotas, telemetry span volume, AI root-cause diagnostic queries, and payment methods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{subData.status} Subscription</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs font-semibold text-emerald-200 flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Resource Quotas & Monthly Consumption Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Monitored Services Gauge */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Service Quota</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            9 <span className="text-xs text-slate-500 font-normal">/ {subData.max_services} Services</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full transition-all" style={{ width: `${servicesPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 block">{subData.max_services - 9} service slots remaining</span>
        </div>

        {/* Telemetry Spans Consumption */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monthly Spans</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {(subData.spans_consumed_this_month / 1000).toFixed(0)}k <span className="text-xs text-slate-500 font-normal">/ {(subData.max_spans_per_month / 1000).toFixed(0)}k</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-400 h-full rounded-full transition-all" style={{ width: `${spansPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 block">{spansPct}% monthly budget utilized</span>
        </div>

        {/* AI Root-Cause Queries */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI RCA Queries</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {subData.ai_rca_queries_consumed} <span className="text-xs text-slate-500 font-normal">/ {subData.max_ai_rca_queries_per_month}</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${aiQueriesPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 block">Resets on {new Date(subData.current_period_end).toLocaleDateString()}</span>
        </div>

        {/* Telemetry Data Retention */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Data Retention</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {subData.retention_days} <span className="text-xs text-slate-500 font-normal">Days Window</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-400 h-full rounded-full w-full" />
          </div>
          <span className="text-[10px] text-slate-500 block">High-resolution raw trace store</span>
        </div>
      </div>

      {/* Interactive Pricing Tier Switcher */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">Subscription Plans & Feature Tiers</h2>
            <p className="text-xs text-slate-400">Choose the right capacity tier for your distributed system architecture.</p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                billingCycle === 'monthly' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-black rounded-full text-[9px]">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {subData.available_plans.map((plan) => {
            const isCurrent = subData.plan_id === plan.id;
            const price = billingCycle === 'monthly' ? plan.monthly_price : Math.round(plan.yearly_price / 12);

            return (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 relative ${
                  isCurrent
                    ? 'bg-slate-900/95 border-cyan-500 ring-2 ring-cyan-500/30 shadow-2xl shadow-cyan-950/50'
                    : plan.is_popular
                    ? 'bg-slate-900/80 border-indigo-500/60 hover:border-indigo-400 shadow-xl'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-lg'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isCurrent ? 'bg-cyan-500 text-slate-950' : 'bg-indigo-500 text-white'
                  }`}>
                    {isCurrent ? 'ACTIVE PLAN' : plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-100">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1 py-2 border-y border-slate-800/80">
                    <span className="text-3xl font-black font-mono text-slate-100">${price}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                    {billingCycle === 'yearly' && plan.yearly_price > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono ml-2">Billed ${plan.yearly_price}/yr</span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Included Features</span>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-300 text-[11px]">
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80">
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrent || upgradingPlanId === plan.id}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default border border-slate-700'
                        : plan.id === 'enterprise'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-900/40 border border-indigo-400/30'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40'
                    }`}
                  >
                    {upgradingPlanId === plan.id ? (
                      'Processing Update...'
                    ) : isCurrent ? (
                      'Current Active Subscription'
                    ) : plan.id === 'enterprise' ? (
                      'Upgrade to Enterprise Ultra'
                    ) : (
                      `Switch to ${plan.name}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Method & Invoices History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Payment Method Details (1 col) */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">Payment Details</h3>
          </div>

          <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">{subData.payment_method.brand || 'Visa'} Corporate</span>
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded text-[10px] font-mono border border-cyan-800">
                Default
              </span>
            </div>
            <div className="font-mono text-slate-300 text-sm tracking-widest">
              •••• •••• •••• {subData.payment_method.last4 || '4242'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Exp: {subData.payment_method.exp || '12/28'}</span>
              <span>{subData.payment_method.name || 'TraceMind Org'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Next renewal payment scheduled for <strong className="text-slate-300">{new Date(subData.current_period_end).toLocaleDateString()}</strong>.
          </p>
        </div>

        {/* Invoice Billing History (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Billing & Invoice History</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Invoice ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {subData.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-bold text-slate-200">{inv.id}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{inv.date}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-bold">{inv.amount}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-sans text-xs">
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
