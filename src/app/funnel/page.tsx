'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { DataSourceRequired } from '@/components/ui/data-source-required';
import { cn, formatPercent, formatNumber } from '@/lib/utils';
import {
  Loader2,
  RefreshCw,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Users,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percent: number;
}

interface ModeData {
  connected: boolean;
  error?: string;
  kpis?: {
    customerConversionRate: number;
    totalLifetimeUsers: number;
  };
  funnel?: {
    totalCustomers: number;
    funnel: FunnelStage[];
    dropOffs: Array<{ stage: string; count: number; percent: number }>;
    currentStageDistribution: Array<{ stage: string; count: number; percent: number }>;
  };
}

export default function FunnelPage() {
  const [data, setData] = useState<ModeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/mode');
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, error: 'Failed to fetch' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isConnected = data?.connected === true;
  const funnel = data?.funnel;
  const kpis = data?.kpis;

  // Compute step drop-offs
  const funnelSteps = funnel?.funnel || [];
  const stepDropOffs = funnelSteps.map((step, i) => {
    const prev = i > 0 ? funnelSteps[i - 1] : null;
    const dropOff = prev ? ((prev.count - step.count) / prev.count) * 100 : 0;
    return { ...step, dropOff, prevCount: prev?.count || step.count };
  });

  // Find biggest drop-off
  const biggestDropOff = stepDropOffs.reduce((max, s) => (s.dropOff > (max?.dropOff || 0) ? s : max), stepDropOffs[0]);

  return (
    <div className="p-6 pb-20">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Acquisition Funnel</h1>
          {isConnected && funnel && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
              MODE LIVE — {formatNumber(funnel.totalCustomers)} customers tracked
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-400">
          Payment Authorization → Clinical Protocol → Doctor Approval → Payment Capture → Shipping → Onboarding
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Loading funnel data from Mode...</span>
        </div>
      )}

      {/* Not connected */}
      {!loading && !isConnected && (
        <DataSourceRequired
          title="Funnel KPIs — Customer Journey Tracking"
          description="The acquisition funnel requires customer stage tracking data from Mode Analytics. Connect Mode to see real conversion rates from payment auth through onboarding."
          className="mb-8"
          sources={[
            {
              name: 'Mode Analytics',
              description: 'Customer stages, onboarding completion, and drop-off tracking (27K+ customers)',
              envVars: ['MODE_API_TOKEN', 'MODE_API_SECRET', 'MODE_WORKSPACE'],
              status: 'not_configured',
            },
          ]}
        />
      )}

      {/* Connected */}
      {!loading && isConnected && funnel && kpis && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-white/[0.08] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4 mb-8">
            <MetricCard
              label="Total Customers"
              value={formatNumber(funnel.totalCustomers)}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Onboarding Completion"
              value={formatPercent(kpis.customerConversionRate)}
              icon={<CheckCircle2 className="h-5 w-5" />}
              valueColor={kpis.customerConversionRate >= 70 ? 'text-emerald-400' : kpis.customerConversionRate >= 50 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Cancelled During Signup"
              value={formatNumber(funnel.dropOffs.find(d => d.stage === 'CUSTOMER_CANCELLED')?.count || 0)}
              icon={<AlertTriangle className="h-5 w-5" />}
              valueColor="text-red-400"
            />
            <MetricCard
              label="Biggest Drop-off"
              value={biggestDropOff ? `${formatPercent(biggestDropOff.dropOff)}` : '—'}
              icon={<ArrowDown className="h-5 w-5" />}
              valueColor="text-amber-400"
            />
          </div>

          {/* ═══ Visual Funnel ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Customer Journey Funnel"
              subtitle={`${formatNumber(funnel.totalCustomers)} customers tracked from payment auth to onboarding completion`}
            />
            <div className="space-y-1 py-4">
              {stepDropOffs.map((step, i) => {
                const maxCount = funnelSteps[0]?.count || 1;
                const barWidth = (step.count / maxCount) * 100;
                const isGood = step.percent >= 80;
                const isWarning = step.percent >= 60 && step.percent < 80;
                const isBad = step.percent < 60;

                return (
                  <div key={step.stage}>
                    {/* Drop-off indicator between steps */}
                    {i > 0 && step.dropOff > 3 && (
                      <div className="flex items-center gap-3 py-1.5 pl-4">
                        <ArrowDown className="h-3 w-3 text-red-500/60" />
                        <span className="text-[10px] font-bold text-red-400">
                          ↓ {formatPercent(step.dropOff)} drop — {formatNumber(step.prevCount - step.count)} customers lost
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 group relative">
                      {/* Stage label */}
                      <div className="w-44 flex-shrink-0 text-right">
                        <p className="text-xs font-medium text-zinc-300">{step.label}</p>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 h-10 rounded-lg bg-zinc-800/40 overflow-hidden relative">
                        <div
                          className={cn(
                            'h-full rounded-lg transition-all flex items-center',
                            isGood ? 'bg-emerald-500/40' : isWarning ? 'bg-amber-500/40' : 'bg-red-500/40'
                          )}
                          style={{ width: `${barWidth}%` }}
                        >
                          <span className="px-3 text-xs font-bold text-white whitespace-nowrap">
                            {formatNumber(step.count)}
                          </span>
                        </div>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">
                          {formatPercent(step.percent)}
                        </span>
                      </div>

                      {/* Status icon */}
                      <div className="w-8">
                        {isGood ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : isBad ? (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ═══ Current Stage Distribution ═══ */}
          <Card className="mb-8">
            <CardHeader
              title="Current Customer Stage Distribution"
              subtitle="Where customers currently sit in their journey"
            />
            <div className="space-y-2">
              {funnel.currentStageDistribution.slice(0, 10).map((stage) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div className="w-56 truncate">
                    <span className="text-xs font-medium text-zinc-300">{stage.stage}</span>
                  </div>
                  <div className="flex-1 h-6 rounded-lg bg-zinc-800/60 overflow-hidden relative">
                    <div
                      className={cn(
                        'h-full rounded-lg transition-all',
                        stage.stage === 'Onboarding Completed' ? 'bg-emerald-500' :
                        stage.stage.includes('Cancel') ? 'bg-red-500' :
                        stage.stage.includes('Reject') ? 'bg-red-500' :
                        'bg-brand-500'
                      )}
                      style={{ width: `${stage.percent}%`, opacity: 0.5 }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[10px] font-medium text-white">
                      {formatNumber(stage.count)} ({formatPercent(stage.percent, 1)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ═══ Insights ═══ */}
          <Card className="border-brand-500/20 bg-gradient-to-br from-brand-500/[0.03] to-transparent">
            <CardHeader title="Funnel Insights" subtitle="Key observations from customer journey data" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg p-4 border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-300">Conversion Strength</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {kpis.customerConversionRate >= 75
                    ? `Strong ${formatPercent(kpis.customerConversionRate)} payment-to-onboarding conversion. The clinical protocol and payment stages flow well.`
                    : `${formatPercent(kpis.customerConversionRate)} conversion rate suggests room for improvement in the payment → onboarding pipeline.`}
                </p>
              </div>
              <div className="rounded-lg p-4 border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-zinc-300">Biggest Drop-off Point</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {biggestDropOff
                    ? `The largest drop occurs at "${biggestDropOff.label}" with ${formatPercent(biggestDropOff.dropOff)} loss. ${
                        biggestDropOff.stage === 'ONBOARDING_STARTED' || biggestDropOff.stage === 'ONBOARDING_COMPLETED'
                          ? 'Consider simplifying the onboarding flow or adding engagement nudges.'
                          : biggestDropOff.stage === 'CLINICAL_PROTOCOL_COMPLETED'
                          ? 'Streamlining the clinical protocol could reduce abandonment.'
                          : 'Investigate UX friction at this step.'
                      }`
                    : 'Unable to determine drop-off point.'}
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
