'use client';

import { Card, CardHeader, MetricCard } from '@/components/ui/card';
import { cn, formatCompact, formatPercent, formatCurrency } from '@/lib/utils';
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Timer,
  Users,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
  ShoppingBag,
  Activity,
  Download,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import {
  exportCurrentModelExcel,
  exportBundleModelExcel,
  exportCompareExcel,
} from '@/lib/excel-export';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  // Bundle model
  BUNDLE_SCENARIOS,
  type BundleConfig,
  type TierConfig,
  runBundleSimulation,
  runBundleSensitivity,
  // Current model
  CURRENT_SCENARIOS,
  type CurrentModelConfig,
  type ProgramConfig,
  type AddOnConfig,
  type SustainConfig,
  runCurrentSimulation,
  runCurrentSensitivity,
  // Shared
  type SensitivityItem,
} from '@/lib/simulator';

// ═══ Constants ═══

type ModelMode = 'current' | 'bundle' | 'compare';

const TIER_COLORS: Record<string, string> = {
  Foundation: '#3b82f6',
  Comprehensive: '#10b981',
  Premium: '#8b5cf6',
  'À la carte': '#71717a',
};

const PROGRAM_COLORS: Record<string, string> = {
  'CGM Program': '#3b82f6',
  'GLP-1 Program': '#8b5cf6',
  'Sustain': '#10b981',
};

const ADDON_COLORS = ['#f59e0b', '#06b6d4', '#f97316', '#ec4899', '#a3e635', '#e879f9'];

const BUNDLE_SCENARIO_KEYS = ['conservative', 'base', 'optimistic'] as const;
const CURRENT_SCENARIO_KEYS = ['current', 'optimizedAddOns', 'glp1Heavy'] as const;

// ═══ Helper Components ═══

function NumInput({
  label, value, onChange, min, max, step, prefix, suffix,
}: {
  label?: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex flex-col">
      {label && <label className="text-[10px] text-zinc-500 font-medium mb-1 truncate">{label}</label>}
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[10px] text-zinc-600">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          min={min} max={max} step={step || 1}
          className="w-full rounded bg-white/[0.04] border border-white/[0.06] px-2 py-1.5 text-xs text-white
                     focus:border-brand-500/40 focus:outline-none transition-colors [appearance:textfield]
                     [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-[10px] text-zinc-600 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltipContent({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  const fmt = formatter || formatCompact;
  return (
    <div className="rounded-lg bg-zinc-900/95 border border-white/10 p-3 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-medium text-zinc-400 mb-1.5">{typeof label === 'number' ? `Month ${label}` : label}</p>
      {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="font-medium text-white">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function TornadoChart({ sensitivity }: { sensitivity: SensitivityItem[] }) {
  const maxSensRange = Math.max(...sensitivity.map(item => {
    const low = Math.min(item.lowLTV - item.baseLTV, item.highLTV - item.baseLTV);
    const high = Math.max(item.lowLTV - item.baseLTV, item.highLTV - item.baseLTV);
    return Math.max(Math.abs(low), Math.abs(high));
  }), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[9px] text-zinc-600 font-medium">
        <div className="w-36 text-right">Parameter</div>
        <div className="flex-1 flex justify-between px-2">
          <span>← LTV Decrease</span>
          <span className="text-zinc-500">Base: {formatCurrency(Math.round(sensitivity[0]?.baseLTV || 0))}</span>
          <span>LTV Increase →</span>
        </div>
        <div className="w-28 text-center">Range</div>
      </div>

      {sensitivity.map((item) => {
        const lowDelta = item.lowLTV - item.baseLTV;
        const highDelta = item.highLTV - item.baseLTV;
        const negative = Math.min(lowDelta, highDelta);
        const positive = Math.max(lowDelta, highDelta);
        const negPct = maxSensRange > 0 ? (Math.abs(negative) / maxSensRange) * 45 : 0;
        const posPct = maxSensRange > 0 ? (Math.abs(positive) / maxSensRange) * 45 : 0;

        return (
          <div key={item.parameter} className="flex items-center gap-3 group">
            <div className="w-36 text-right">
              <span className="text-[11px] text-zinc-400 font-medium">{item.parameter}</span>
            </div>
            <div className="flex-1 h-7 relative flex items-center">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
              {negative < 0 && (
                <div
                  className="absolute right-1/2 h-5 bg-red-500/50 rounded-l group-hover:bg-red-500/70 transition-colors"
                  style={{ width: `${negPct}%` }}
                >
                  <span className="absolute right-full mr-1 text-[9px] text-red-400 font-medium whitespace-nowrap top-1/2 -translate-y-1/2">
                    {item.lowLabel}
                  </span>
                </div>
              )}
              {positive > 0 && (
                <div
                  className="absolute left-1/2 h-5 bg-emerald-500/50 rounded-r group-hover:bg-emerald-500/70 transition-colors"
                  style={{ width: `${posPct}%` }}
                >
                  <span className="absolute left-full ml-1 text-[9px] text-emerald-400 font-medium whitespace-nowrap top-1/2 -translate-y-1/2">
                    {item.highLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="w-28 text-center">
              <span className="text-[10px] text-red-400">{negative < 0 ? `−$${Math.abs(Math.round(negative))}` : '$0'}</span>
              <span className="text-[10px] text-zinc-600 mx-1">→</span>
              <span className="text-[10px] text-emerald-400">{positive > 0 ? `+$${Math.round(positive)}` : '$0'}</span>
            </div>
          </div>
        );
      })}

      <div className="mt-4 flex items-center gap-4 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-red-500/50" />
          <span>Decreases LTV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded bg-emerald-500/50" />
          <span>Increases LTV</span>
        </div>
      </div>
    </div>
  );
}


// ═══ Main Simulator Page ═══

export default function SimulatorPage() {
  // ─── Mode ───
  const [mode, setMode] = useState<ModelMode>('current');

  // ─── Current Model State ───
  const [activeCurrentKey, setActiveCurrentKey] = useState<string>('current');
  const [currentConfig, setCurrentConfig] = useState<CurrentModelConfig>(() =>
    cloneCurrent(CURRENT_SCENARIOS.current)
  );
  const [showCurrentCustomize, setShowCurrentCustomize] = useState(false);

  // ─── Bundle Model State ───
  const [activeBundleKey, setActiveBundleKey] = useState<string>('base');
  const [bundleConfig, setBundleConfig] = useState<BundleConfig>(() => ({
    ...BUNDLE_SCENARIOS.base,
    tiers: BUNDLE_SCENARIOS.base.tiers.map(t => ({ ...t })),
  }));
  const [showBundleCustomize, setShowBundleCustomize] = useState(false);

  // ─── Computed Results ───
  const currentResult = useMemo(() => runCurrentSimulation(currentConfig), [currentConfig]);
  const bundleResult = useMemo(() => runBundleSimulation(bundleConfig), [bundleConfig]);
  const currentSens = useMemo(() => runCurrentSensitivity(currentConfig), [currentConfig]);
  const bundleSens = useMemo(() => runBundleSensitivity(bundleConfig), [bundleConfig]);

  // ─── Handlers: Current ───
  function selectCurrentScenario(key: string) {
    setActiveCurrentKey(key);
    if (key !== 'custom') {
      setCurrentConfig(cloneCurrent(CURRENT_SCENARIOS[key]));
      setShowCurrentCustomize(false);
    } else {
      setShowCurrentCustomize(true);
    }
  }

  function updateCurrentConfig(updates: Partial<CurrentModelConfig>) {
    setCurrentConfig(prev => ({ ...prev, ...updates }));
    if (activeCurrentKey !== 'custom') setActiveCurrentKey('custom');
  }

  function updateProgram(index: number, updates: Partial<ProgramConfig>) {
    setCurrentConfig(prev => ({
      ...prev,
      programs: prev.programs.map((p, i) => i === index ? { ...p, ...updates } : p),
    }));
    if (activeCurrentKey !== 'custom') setActiveCurrentKey('custom');
  }

  function updateAddOn(index: number, updates: Partial<AddOnConfig>) {
    setCurrentConfig(prev => ({
      ...prev,
      addOns: prev.addOns.map((a, i) => i === index ? { ...a, ...updates } : a),
    }));
    if (activeCurrentKey !== 'custom') setActiveCurrentKey('custom');
  }

  function updateSustain(updates: Partial<SustainConfig>) {
    setCurrentConfig(prev => ({ ...prev, sustain: { ...prev.sustain, ...updates } }));
    if (activeCurrentKey !== 'custom') setActiveCurrentKey('custom');
  }

  // ─── Handlers: Bundle ───
  function selectBundleScenario(key: string) {
    setActiveBundleKey(key);
    if (key !== 'custom') {
      const s = BUNDLE_SCENARIOS[key];
      setBundleConfig({ ...s, tiers: s.tiers.map(t => ({ ...t })) });
      setShowBundleCustomize(false);
    } else {
      setShowBundleCustomize(true);
    }
  }

  function updateBundleConfig(updates: Partial<BundleConfig>) {
    setBundleConfig(prev => ({ ...prev, ...updates }));
    if (activeBundleKey !== 'custom') setActiveBundleKey('custom');
  }

  function updateTier(index: number, updates: Partial<TierConfig>) {
    setBundleConfig(prev => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => i === index ? { ...t, ...updates } : t),
    }));
    if (activeBundleKey !== 'custom') setActiveBundleKey('custom');
  }

  // ─── Shared ───
  const cs = currentResult.summary;
  const bs = bundleResult.summary;

  // ─── Excel Download ───
  const [isExporting, setIsExporting] = useState(false);
  const handleExportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      if (mode === 'current') {
        await exportCurrentModelExcel(currentConfig, currentResult, currentSens);
      } else if (mode === 'bundle') {
        await exportBundleModelExcel(bundleConfig, bundleResult, bundleSens);
      } else {
        await exportCompareExcel(currentConfig, bundleConfig, currentResult, bundleResult, currentSens, bundleSens);
      }
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [mode, currentConfig, currentResult, currentSens, bundleConfig, bundleResult, bundleSens]);

  return (
    <div className="p-6 pb-20">
      {/* ═══ Header ═══ */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">LTV Strategy Simulator</h1>
          <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-400 border border-brand-500/20">
            LIVE MODEL
          </span>
          <div className="flex-1" />
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all border',
              'bg-white/[0.03] text-zinc-300 border-white/[0.06] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.12]',
              isExporting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>
        <p className="text-sm text-zinc-400">
          Compare the current à la carte model (CGM/GLP-1 → Add-ons → Sustain) against a proposed bundle strategy.
        </p>
      </div>

      {/* ═══ Model Toggle ═══ */}
      <div className="flex gap-2 mb-6 p-1 rounded-lg bg-white/[0.02] border border-white/[0.04] w-fit">
        {([
          { key: 'current', label: 'Current Model', icon: <ShoppingBag className="h-3.5 w-3.5" />, desc: 'Programs + Add-ons + Sustain' },
          { key: 'bundle', label: 'Bundle Model', icon: <Layers className="h-3.5 w-3.5" />, desc: 'Proposed Tier Pricing' },
          { key: 'compare', label: 'Compare', icon: <ArrowRightLeft className="h-3.5 w-3.5" />, desc: 'Side-by-Side' },
        ] as const).map(({ key, label, icon, desc }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium transition-all',
              mode === key
                ? 'bg-brand-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            {icon}
            <div className="text-left">
              <div>{label}</div>
              <div className={cn('text-[9px]', mode === key ? 'text-brand-200' : 'text-zinc-600')}>{desc}</div>
            </div>
          </button>
        ))}
      </div>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* CURRENT MODEL VIEW                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mode === 'current' && (
        <>
          {/* Scenario Selector + Horizon */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex gap-2">
              {CURRENT_SCENARIO_KEYS.map(key => {
                const sc = CURRENT_SCENARIOS[key];
                return (
                  <button
                    key={key}
                    onClick={() => selectCurrentScenario(key)}
                    className={cn(
                      'rounded-lg px-4 py-2 text-xs font-medium transition-all border',
                      activeCurrentKey === key
                        ? 'bg-brand-600 text-white border-brand-500'
                        : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    {sc.name}
                  </button>
                );
              })}
              <button
                onClick={() => selectCurrentScenario('custom')}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-medium transition-all border',
                  activeCurrentKey === 'custom'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                )}
              >
                Custom
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-medium">Horizon:</span>
              {[12, 24, 36].map(h => (
                <button
                  key={h}
                  onClick={() => updateCurrentConfig({ horizon: h })}
                  className={cn(
                    'rounded px-2.5 py-1 text-[10px] font-bold transition-all',
                    currentConfig.horizon === h ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {h}mo
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <MetricCard label="LTV (Revenue)" value={formatCurrency(Math.round(currentResult.cohortLTV.revenue))} icon={<DollarSign className="h-5 w-5" />} />
            <MetricCard label="LTV (Gross Profit)" value={formatCurrency(Math.round(currentResult.cohortLTV.grossProfit))} icon={<TrendingUp className="h-5 w-5" />} valueColor="text-emerald-400" />
            <MetricCard label="Blended CAC" value={formatCurrency(currentConfig.blendedCAC)} icon={<Target className="h-5 w-5" />} />
            <MetricCard
              label="LTV:CAC Ratio"
              value={`${cs.ltvCacRatio.toFixed(1)}:1`}
              icon={<Zap className="h-5 w-5" />}
              valueColor={cs.ltvCacRatio >= 5 ? 'text-emerald-400' : cs.ltvCacRatio >= 3 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Payback Period"
              value={`${cs.paybackMonths < currentConfig.horizon ? `~${cs.paybackMonths}` : `>${currentConfig.horizon}`} mo`}
              icon={<Timer className="h-5 w-5" />}
              valueColor={cs.paybackMonths <= 3 ? 'text-emerald-400' : cs.paybackMonths <= 6 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard label="Peak ARPU" value={formatCurrency(Math.round(cs.peakARPU))} icon={<Activity className="h-5 w-5" />} valueColor="text-brand-400" />
          </div>

          {/* ═══ LTV Revenue Buildup ═══ */}
          <Card className="mb-6">
            <CardHeader
              title="LTV Revenue Buildup"
              subtitle={`How the ${formatCurrency(Math.round(currentResult.cohortLTV.revenue))} cohort LTV is composed — per customer over ${currentConfig.horizon} months`}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left: Component Decomposition */}
              <div className="space-y-4">
                {/* Horizontal component bars */}
                <div className="space-y-3">
                  {[
                    { label: 'Base Program', value: currentResult.ltvBuildup.baseProgramLTV, color: '#3b82f6' },
                    { label: '+ Add-on Revenue', value: currentResult.ltvBuildup.addOnLTV, color: '#f59e0b' },
                    { label: '+ Sustain Revenue', value: currentResult.ltvBuildup.sustainLTV, color: '#10b981' },
                  ].map(({ label, value, color }) => {
                    const pct = currentResult.cohortLTV.revenue > 0 ? (value / currentResult.cohortLTV.revenue) * 100 : 0;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-32 text-right">
                          <span className="text-[11px] text-zinc-400 font-medium">{label}</span>
                        </div>
                        <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden relative">
                          <div className="h-full rounded-md transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color, opacity: 0.7 }} />
                          {pct >= 5 && (
                            <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white/80">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-xs font-bold text-white">{formatCurrency(Math.round(value))}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total stacked bar */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                    <div className="w-32 text-right">
                      <span className="text-[11px] text-white font-bold">= Total LTV</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 rounded-md overflow-hidden flex">
                        {[
                          { value: currentResult.ltvBuildup.baseProgramLTV, color: '#3b82f6' },
                          { value: currentResult.ltvBuildup.addOnLTV, color: '#f59e0b' },
                          { value: currentResult.ltvBuildup.sustainLTV, color: '#10b981' },
                        ].map(({ value, color }, i) => {
                          const pct = currentResult.cohortLTV.revenue > 0 ? (value / currentResult.cohortLTV.revenue) * 100 : 0;
                          return <div key={i} className="h-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />;
                        })}
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-bold text-white">{formatCurrency(Math.round(currentResult.cohortLTV.revenue))}</span>
                    </div>
                  </div>
                </div>

                {/* Add-on itemized breakdown */}
                {currentResult.ltvBuildup.addOnLTV > 0 && (
                  <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                    <p className="text-[10px] font-semibold text-zinc-500 mb-2 tracking-wide">ADD-ON BREAKDOWN</p>
                    {Object.entries(currentResult.ltvBuildup.addOnBreakdown).map(([name, value], i) => (
                      <div key={name} className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ADDON_COLORS[i % ADDON_COLORS.length] }} />
                          <span className="text-[10px] text-zinc-400">{name}</span>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-300">+{formatCurrency(Math.round(value))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Churn impact callout */}
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-semibold text-zinc-500 tracking-wide">GROSS POTENTIAL (0% churn)</span>
                    <span className="text-xs font-bold text-zinc-300">{formatCurrency(Math.round(currentResult.ltvBuildup.grossPotentialLTV))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-red-400 tracking-wide">LOST TO CHURN</span>
                    <span className="text-xs font-bold text-red-400">
                      −{formatCurrency(Math.round(currentResult.ltvBuildup.churnImpactLTV))}
                      {' '}({currentResult.ltvBuildup.grossPotentialLTV > 0
                        ? (currentResult.ltvBuildup.churnImpactLTV / currentResult.ltvBuildup.grossPotentialLTV * 100).toFixed(0)
                        : '0'}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Cumulative LTV Accumulation Chart */}
              <div>
                <p className="text-[10px] text-zinc-500 font-medium mb-2">Cumulative Revenue per Customer by Age</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={currentResult.ltvBuildup.monthlyAccumulation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Customer Age (months)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#71717a' } }} />
                      <YAxis yAxisId="ltv" tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis yAxisId="surv" orientation="right" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg bg-zinc-900/95 border border-white/10 p-3 shadow-xl backdrop-blur-sm">
                            <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Month {label}</p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-zinc-400">{entry.name}:</span>
                                <span className="font-medium text-white">
                                  {entry.name === 'Survival %' ? `${(entry.value * 100).toFixed(0)}%` : formatCurrency(Math.round(entry.value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }} />
                      <Area yAxisId="ltv" type="monotone" dataKey="cumulativeBase" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" strokeWidth={0} name="Base Program" />
                      <Area yAxisId="ltv" type="monotone" dataKey="cumulativeAddOn" stackId="1" fill="#f59e0b" fillOpacity={0.6} stroke="#f59e0b" strokeWidth={0} name="Add-ons" />
                      <Area yAxisId="ltv" type="monotone" dataKey="cumulativeSustain" stackId="1" fill="#10b981" fillOpacity={0.6} stroke="#10b981" strokeWidth={0} name="Sustain" />
                      <Line yAxisId="surv" type="monotone" dataKey="survivalRate" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Survival %" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 text-center">
                  Stacked areas show cumulative LTV per customer. Dashed red line shows cohort survival rate.
                </p>
              </div>
            </div>
          </Card>

          {/* ─── Customize Panel ─── */}
          <Card className="mb-6">
            <button onClick={() => setShowCurrentCustomize(!showCurrentCustomize)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-semibold text-white">Customize Parameters</span>
                <span className="text-[10px] text-zinc-500">
                  {activeCurrentKey !== 'custom'
                    ? `Using ${CURRENT_SCENARIOS[activeCurrentKey]?.name || 'Current State'} preset`
                    : 'Custom configuration'}
                </span>
              </div>
              {showCurrentCustomize ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
            </button>

            {showCurrentCustomize && (
              <div className="mt-5 space-y-6">
                {/* Mix warning */}
                {Math.abs(currentConfig.programs.reduce((s, p) => s + p.mixPct, 0) - 1) >= 0.01 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">
                      Mix percentages sum to {(currentConfig.programs.reduce((s, p) => s + p.mixPct, 0) * 100).toFixed(0)}% — should be 100%
                    </p>
                  </div>
                )}

                {/* Programs Table */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-3">Entry Programs</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-32">Program</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Price/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">COGS/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Margin</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Early Churn</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Mid Churn</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Late Churn</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Mix %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentConfig.programs.map((prog, i) => (
                          <tr key={prog.name} className="border-b border-white/[0.03]">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROGRAM_COLORS[prog.name] || '#71717a' }} />
                                <span className="text-zinc-300 font-medium">{prog.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-1"><NumInput value={prog.price} onChange={v => updateProgram(i, { price: v })} prefix="$" min={0} step={10} /></td>
                            <td className="py-2 px-1"><NumInput value={prog.cogs} onChange={v => updateProgram(i, { cogs: v })} prefix="$" min={0} step={5} /></td>
                            <td className="py-2 px-1 text-center">
                              <span className={cn('text-xs font-bold', ((prog.price - prog.cogs) / prog.price) >= 0.45 ? 'text-emerald-400' : 'text-amber-400')}>
                                {((1 - prog.cogs / prog.price) * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((prog.earlyChurn * 100).toFixed(1))} onChange={v => updateProgram(i, { earlyChurn: v / 100 })} suffix="%" min={0} max={50} step={0.5} /></td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((prog.midChurn * 100).toFixed(1))} onChange={v => updateProgram(i, { midChurn: v / 100 })} suffix="%" min={0} max={50} step={0.5} /></td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((prog.lateChurn * 100).toFixed(1))} onChange={v => updateProgram(i, { lateChurn: v / 100 })} suffix="%" min={0} max={50} step={0.5} /></td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((prog.mixPct * 100).toFixed(0))} onChange={v => updateProgram(i, { mixPct: v / 100 })} suffix="%" min={0} max={100} step={5} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add-ons Table */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-3">À la Carte Add-ons</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-32">Add-on</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Price/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">COGS/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Max Attach</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Ramp (mo)</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Delay (mo)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentConfig.addOns.map((ao, i) => (
                          <tr key={ao.name} className="border-b border-white/[0.03]">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ADDON_COLORS[i % ADDON_COLORS.length] }} />
                                <span className="text-zinc-300 font-medium">{ao.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-1"><NumInput value={ao.price} onChange={v => updateAddOn(i, { price: v })} prefix="$" min={0} step={5} /></td>
                            <td className="py-2 px-1"><NumInput value={ao.cogs} onChange={v => updateAddOn(i, { cogs: v })} prefix="$" min={0} step={5} /></td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((ao.maxAttachRate * 100).toFixed(0))} onChange={v => updateAddOn(i, { maxAttachRate: v / 100 })} suffix="%" min={0} max={100} step={1} /></td>
                            <td className="py-2 px-1"><NumInput value={ao.rampMonths} onChange={v => updateAddOn(i, { rampMonths: v })} min={0} max={36} /></td>
                            <td className="py-2 px-1"><NumInput value={ao.attachDelay} onChange={v => updateAddOn(i, { attachDelay: v })} min={0} max={12} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sustain Config */}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-3">Sustain Plan Transition</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <NumInput label="Price/mo" value={currentConfig.sustain.price} onChange={v => updateSustain({ price: v })} prefix="$" min={0} step={10} />
                    <NumInput label="COGS/mo" value={currentConfig.sustain.cogs} onChange={v => updateSustain({ cogs: v })} prefix="$" min={0} step={5} />
                    <NumInput label="Transition Rate/mo" value={parseFloat((currentConfig.sustain.transitionRate * 100).toFixed(1))} onChange={v => updateSustain({ transitionRate: v / 100 })} suffix="%" min={0} max={100} step={0.5} />
                    <NumInput label="Transition Delay" value={currentConfig.sustain.transitionDelay} onChange={v => updateSustain({ transitionDelay: v })} suffix="mo" min={0} max={24} />
                    <NumInput label="Sustain Churn/mo" value={parseFloat((currentConfig.sustain.churnRate * 100).toFixed(1))} onChange={v => updateSustain({ churnRate: v / 100 })} suffix="%" min={0} max={50} step={0.5} />
                  </div>
                </div>

                {/* Acquisition */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <NumInput label="Acq. Start/mo" value={currentConfig.monthlyAcqStart} onChange={v => updateCurrentConfig({ monthlyAcqStart: v })} min={0} step={100} />
                  <NumInput label="Acq. End/mo" value={currentConfig.monthlyAcqEnd} onChange={v => updateCurrentConfig({ monthlyAcqEnd: v })} min={0} step={100} />
                  <NumInput label="Ramp Months" value={currentConfig.rampMonths} onChange={v => updateCurrentConfig({ rampMonths: v })} min={1} max={36} />
                  <NumInput label="Blended CAC" value={currentConfig.blendedCAC} onChange={v => updateCurrentConfig({ blendedCAC: v })} prefix="$" min={0} step={10} />
                  <NumInput label="CAC Inflation/yr" value={currentConfig.cacInflationPct} onChange={v => updateCurrentConfig({ cacInflationPct: v })} suffix="%" min={0} max={50} />
                </div>
              </div>
            )}
          </Card>

          {/* Program LTV cards */}
          <Card className="mb-6">
            <CardHeader title="Cohort LTV by Entry Program" subtitle={`${currentConfig.horizon}-month expected value per customer acquired`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentConfig.programs.map(prog => {
                const ltv = currentResult.programCohortLTV[prog.name];
                if (!ltv) return null;
                return (
                  <div key={prog.name} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROGRAM_COLORS[prog.name] || '#71717a' }} />
                      <span className="text-[11px] font-semibold text-zinc-300">{prog.name}</span>
                      <span className="text-[9px] text-zinc-600 ml-auto">{(prog.mixPct * 100).toFixed(0)}% mix</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-zinc-500">LTV (Rev)</span>
                        <span className="text-xs font-bold text-white">{formatCurrency(Math.round(ltv.revenue))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-zinc-500">LTV (GP)</span>
                        <span className="text-xs font-bold text-emerald-400">{formatCurrency(Math.round(ltv.grossProfit))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-zinc-500">Gross Margin</span>
                        <span className="text-[10px] font-medium text-zinc-400">{((1 - prog.cogs / prog.price) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ═══ Charts ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">

            {/* ARPU by Customer Age */}
            <Card>
              <CardHeader title="ARPU by Customer Age" subtitle="How per-customer revenue evolves through the lifecycle" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentResult.arpuByAge}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Customer Age (months)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#71717a' } }} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toFixed(0)}`} />} />
                    <Area type="monotone" dataKey="baseArpu" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" strokeWidth={0} name="Program Base" />
                    <Area type="monotone" dataKey="addOnArpu" stackId="1" fill="#f59e0b" fillOpacity={0.6} stroke="#f59e0b" strokeWidth={0} name="Add-on Revenue" />
                    <Area type="monotone" dataKey="sustainArpu" stackId="1" fill="#10b981" fillOpacity={0.6} stroke="#10b981" strokeWidth={0} name="Sustain Revenue" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Add-on Attach Rate Curves */}
            <Card>
              <CardHeader title="Add-on Attach Rate Curves" subtitle="% of active customers on each add-on by age" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentResult.attachByAge}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Customer Age (months)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#71717a' } }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    {currentConfig.addOns.map((ao, i) => (
                      <Line key={ao.name} type="monotone" dataKey={ao.name} stroke={ADDON_COLORS[i % ADDON_COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Customer Lifecycle */}
            <Card>
              <CardHeader title="Customer Lifecycle" subtitle="Active customers by program status + Sustain" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentResult.months.map(m => ({
                    month: m.month,
                    'On Program': m.totalOnProgram,
                    'On Sustain': m.totalOnSustain,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => v.toLocaleString()} />} />
                    <Area type="monotone" dataKey="On Program" stackId="1" fill="#3b82f6" fillOpacity={0.7} stroke="#3b82f6" strokeWidth={0} />
                    <Area type="monotone" dataKey="On Sustain" stackId="1" fill="#10b981" fillOpacity={0.7} stroke="#10b981" strokeWidth={0} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Revenue Composition */}
            <Card>
              <CardHeader title="Revenue Composition" subtitle="Program base + Add-on + Sustain revenue over time" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentResult.months.map(m => ({
                    month: m.month,
                    'Program Revenue': m.programRevenue,
                    'Add-on Revenue': m.addOnRevenue,
                    'Sustain Revenue': m.sustainRevenue,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="Program Revenue" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" strokeWidth={0} />
                    <Area type="monotone" dataKey="Add-on Revenue" stackId="1" fill="#f59e0b" fillOpacity={0.6} stroke="#f59e0b" strokeWidth={0} />
                    <Area type="monotone" dataKey="Sustain Revenue" stackId="1" fill="#10b981" fillOpacity={0.6} stroke="#10b981" strokeWidth={0} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Margin Trends */}
            <Card>
              <CardHeader title="Margin % Trends" subtitle="Gross margin and contribution margin over time" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentResult.months.map(m => ({
                    month: m.month,
                    'Gross Margin': parseFloat(m.gmPct.toFixed(1)),
                    'Contribution Margin': parseFloat(m.cmPct.toFixed(1)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Line type="monotone" dataKey="Gross Margin" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Contribution Margin" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Cumulative Profitability */}
            <Card>
              <CardHeader title="Cumulative Profitability" subtitle="Running totals" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentResult.months.map(m => ({
                    month: m.month,
                    Revenue: m.cumRevenue,
                    COGS: m.cumCOGS,
                    Marketing: m.cumMarketing,
                    'Net Profit': m.cumProfit,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="COGS" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Marketing" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Net Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    <ReferenceLine y={0} stroke="#ffffff20" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Summary + Sensitivity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader title={`${currentConfig.horizon}-Month Summary`} subtitle="Key financial metrics" />
              <div className="rounded-lg bg-surface-0 p-4 font-mono text-[11px] leading-relaxed">
                <p className="text-zinc-500 font-bold mb-2">REVENUE & PROFITABILITY:</p>
                <p className="text-zinc-300">• Total Revenue: <span className="text-white font-bold">{formatCompact(cs.totalRevenue)}</span></p>
                <p className="text-zinc-300">• Total COGS: <span className="text-red-400">{formatCompact(cs.totalCOGS)}</span></p>
                <p className="text-zinc-300">• Total Gross Profit: <span className="text-emerald-400">{formatCompact(cs.totalGP)}</span></p>
                <p className="text-zinc-300">• Total Marketing: <span className="text-amber-400">{formatCompact(cs.totalMarketing)}</span></p>
                <p className="text-zinc-300">• Total Net Profit: <span className="text-emerald-400 font-bold">{formatCompact(cs.totalProfit)}</span></p>

                <p className="text-zinc-500 font-bold mt-4 mb-2">UNIT ECONOMICS:</p>
                <p className="text-zinc-300">• LTV (Revenue): <span className="text-white font-bold">{formatCurrency(Math.round(currentResult.cohortLTV.revenue))}</span></p>
                <p className="text-zinc-300">• LTV (Gross Profit): <span className="text-emerald-400 font-bold">{formatCurrency(Math.round(currentResult.cohortLTV.grossProfit))}</span></p>
                <p className="text-zinc-300">• CAC: <span className="text-white">{formatCurrency(cs.blendedCAC)}</span></p>
                <p className="text-zinc-300">• LTV:CAC Ratio: <span className={cn('font-bold', cs.ltvCacRatio >= 3 ? 'text-emerald-400' : 'text-red-400')}>{cs.ltvCacRatio.toFixed(2)}:1</span></p>
                <p className="text-zinc-300">• Payback: <span className="text-white">~{cs.paybackMonths} months</span></p>
                <p className="text-zinc-300">• Peak ARPU: <span className="text-brand-400 font-bold">{formatCurrency(Math.round(cs.peakARPU))}</span></p>

                <p className="text-zinc-500 font-bold mt-4 mb-2">CUSTOMERS:</p>
                <p className="text-zinc-300">• Total Acquired: <span className="text-white">{cs.totalAcquired.toLocaleString()}</span></p>
                <p className="text-zinc-300">• Mo {currentConfig.horizon} Active: <span className="text-white">{Math.round(cs.finalActive).toLocaleString()}</span></p>
                <p className="text-zinc-300">• Retention Rate: <span className="text-white">{cs.retentionRate.toFixed(1)}%</span></p>
                <p className="text-zinc-300">• On Sustain: <span className="text-emerald-400">{cs.sustainPct.toFixed(1)}%</span></p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Sensitivity Analysis — LTV Impact" subtitle="How varying each parameter affects cohort LTV (Gross Profit)" />
              <TornadoChart sensitivity={currentSens} />
            </Card>
          </div>

          {/* Scenario comparison table */}
          <Card>
            <CardHeader title="Scenario Comparison" subtitle="Side-by-side view of all three presets" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-44">Metric</th>
                    {CURRENT_SCENARIO_KEYS.map(key => (
                      <th key={key} className={cn('py-2 text-center text-[10px] font-medium', activeCurrentKey === key ? 'text-brand-400' : 'text-zinc-500')}>
                        {CURRENT_SCENARIOS[key].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const results = CURRENT_SCENARIO_KEYS.map(key => runCurrentSimulation({ ...CURRENT_SCENARIOS[key], horizon: currentConfig.horizon }));
                    const rows = [
                      { label: 'LTV (Revenue)', values: results.map(r => formatCurrency(Math.round(r.cohortLTV.revenue))) },
                      { label: 'LTV (Gross Profit)', values: results.map(r => formatCurrency(Math.round(r.cohortLTV.grossProfit))), highlight: true },
                      { label: 'LTV:CAC Ratio', values: results.map(r => `${r.summary.ltvCacRatio.toFixed(1)}:1`) },
                      { label: 'Payback', values: results.map(r => `${r.summary.paybackMonths} mo`) },
                      { label: 'Peak ARPU', values: results.map(r => formatCurrency(Math.round(r.summary.peakARPU))) },
                      { label: 'Sustain %', values: results.map(r => `${r.summary.sustainPct.toFixed(1)}%`) },
                      { label: `${currentConfig.horizon}-Mo Revenue`, values: results.map(r => formatCompact(r.summary.totalRevenue)) },
                      { label: `${currentConfig.horizon}-Mo Net Profit`, values: results.map(r => formatCompact(r.summary.totalProfit)) },
                      { label: 'Retention Rate', values: results.map(r => `${r.summary.retentionRate.toFixed(1)}%`) },
                    ];
                    return rows.map(row => (
                      <tr key={row.label} className="border-b border-white/[0.03]">
                        <td className="py-2 text-zinc-400">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={cn('py-2 text-center font-medium', row.highlight ? 'text-emerald-400' : 'text-zinc-300', activeCurrentKey === CURRENT_SCENARIO_KEYS[i] && 'bg-brand-500/5')}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* BUNDLE MODEL VIEW                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mode === 'bundle' && (
        <>
          {/* Scenario Selector + Horizon */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex gap-2">
              {BUNDLE_SCENARIO_KEYS.map(key => {
                const sc = BUNDLE_SCENARIOS[key];
                return (
                  <button
                    key={key}
                    onClick={() => selectBundleScenario(key)}
                    className={cn(
                      'rounded-lg px-4 py-2 text-xs font-medium transition-all border',
                      activeBundleKey === key
                        ? 'bg-brand-600 text-white border-brand-500'
                        : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    {sc.name}
                  </button>
                );
              })}
              <button
                onClick={() => selectBundleScenario('custom')}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-medium transition-all border',
                  activeBundleKey === 'custom'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                )}
              >
                Custom
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-medium">Horizon:</span>
              {[12, 24, 36].map(h => (
                <button
                  key={h}
                  onClick={() => updateBundleConfig({ horizon: h })}
                  className={cn(
                    'rounded px-2.5 py-1 text-[10px] font-bold transition-all',
                    bundleConfig.horizon === h ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {h}mo
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <MetricCard label="LTV (Revenue)" value={formatCurrency(Math.round(bundleResult.cohortLTV.revenue))} icon={<DollarSign className="h-5 w-5" />} />
            <MetricCard label="LTV (Gross Profit)" value={formatCurrency(Math.round(bundleResult.cohortLTV.grossProfit))} icon={<TrendingUp className="h-5 w-5" />} valueColor="text-emerald-400" />
            <MetricCard label="Blended CAC" value={formatCurrency(bundleConfig.blendedCAC)} icon={<Target className="h-5 w-5" />} />
            <MetricCard
              label="LTV:CAC Ratio"
              value={`${bs.ltvCacRatio.toFixed(1)}:1`}
              icon={<Zap className="h-5 w-5" />}
              valueColor={bs.ltvCacRatio >= 5 ? 'text-emerald-400' : bs.ltvCacRatio >= 3 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard
              label="Payback Period"
              value={`${bs.paybackMonths < bundleConfig.horizon ? `~${bs.paybackMonths}` : `>${bundleConfig.horizon}`} mo`}
              icon={<Timer className="h-5 w-5" />}
              valueColor={bs.paybackMonths <= 3 ? 'text-emerald-400' : bs.paybackMonths <= 6 ? 'text-amber-400' : 'text-red-400'}
            />
            <MetricCard label={`${bundleConfig.horizon}-Mo Net Profit`} value={formatCompact(bs.totalProfit)} icon={<BarChart3 className="h-5 w-5" />} valueColor={bs.totalProfit > 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>

          {/* ═══ LTV Revenue Buildup (Bundle) ═══ */}
          <Card className="mb-6">
            <CardHeader
              title="LTV Revenue Buildup"
              subtitle={`How the ${formatCurrency(Math.round(bundleResult.cohortLTV.revenue))} cohort LTV is composed — per customer over ${bundleConfig.horizon} months`}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left: Tier Decomposition */}
              <div className="space-y-4">
                <div className="space-y-3">
                  {bundleConfig.tiers.map(tier => {
                    const tierLTV = bundleResult.ltvBuildup.byTierLTV[tier.name] || 0;
                    const pct = bundleResult.cohortLTV.revenue > 0 ? (tierLTV / bundleResult.cohortLTV.revenue) * 100 : 0;
                    return (
                      <div key={tier.name} className="flex items-center gap-3">
                        <div className="w-32 text-right">
                          <span className="text-[11px] text-zinc-400 font-medium">{tier.name}</span>
                        </div>
                        <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden relative">
                          <div className="h-full rounded-md transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: TIER_COLORS[tier.name] || '#71717a', opacity: 0.7 }} />
                          {pct >= 5 && (
                            <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white/80">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-xs font-bold text-white">{formatCurrency(Math.round(tierLTV))}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total stacked bar */}
                  <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                    <div className="w-32 text-right">
                      <span className="text-[11px] text-white font-bold">= Total LTV</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 rounded-md overflow-hidden flex">
                        {bundleConfig.tiers.map(tier => {
                          const tierLTV = bundleResult.ltvBuildup.byTierLTV[tier.name] || 0;
                          const pct = bundleResult.cohortLTV.revenue > 0 ? (tierLTV / bundleResult.cohortLTV.revenue) * 100 : 0;
                          return <div key={tier.name} className="h-full" style={{ width: `${pct}%`, backgroundColor: TIER_COLORS[tier.name] || '#71717a', opacity: 0.7 }} />;
                        })}
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm font-bold text-white">{formatCurrency(Math.round(bundleResult.cohortLTV.revenue))}</span>
                    </div>
                  </div>
                </div>

                {/* Per-tier detail */}
                <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                  <p className="text-[10px] font-semibold text-zinc-500 mb-2 tracking-wide">WEIGHTED TIER CONTRIBUTION</p>
                  {bundleConfig.tiers.map(tier => {
                    const tierLTV = bundleResult.ltvBuildup.byTierLTV[tier.name] || 0;
                    return (
                      <div key={tier.name} className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_COLORS[tier.name] || '#71717a' }} />
                          <span className="text-[10px] text-zinc-400">{tier.name} ({(tier.mixPct * 100).toFixed(0)}% mix)</span>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-300">{formatCurrency(Math.round(tierLTV))}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Churn impact callout */}
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-semibold text-zinc-500 tracking-wide">GROSS POTENTIAL (0% churn)</span>
                    <span className="text-xs font-bold text-zinc-300">{formatCurrency(Math.round(bundleResult.ltvBuildup.grossPotentialLTV))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-red-400 tracking-wide">LOST TO CHURN</span>
                    <span className="text-xs font-bold text-red-400">
                      −{formatCurrency(Math.round(bundleResult.ltvBuildup.churnImpactLTV))}
                      {' '}({bundleResult.ltvBuildup.grossPotentialLTV > 0
                        ? (bundleResult.ltvBuildup.churnImpactLTV / bundleResult.ltvBuildup.grossPotentialLTV * 100).toFixed(0)
                        : '0'}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Cumulative LTV Accumulation Chart */}
              <div>
                <p className="text-[10px] text-zinc-500 font-medium mb-2">Cumulative Revenue per Customer by Age</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={bundleResult.ltvBuildup.monthlyAccumulation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Customer Age (months)', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#71717a' } }} />
                      <YAxis yAxisId="ltv" tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis yAxisId="surv" orientation="right" domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg bg-zinc-900/95 border border-white/10 p-3 shadow-xl backdrop-blur-sm">
                            <p className="text-[11px] font-medium text-zinc-400 mb-1.5">Month {label}</p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-zinc-400">{entry.name}:</span>
                                <span className="font-medium text-white">
                                  {entry.name === 'Survival %' ? `${(entry.value * 100).toFixed(0)}%` : formatCurrency(Math.round(entry.value))}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }} />
                      <Area yAxisId="ltv" type="monotone" dataKey="cumulativeLTV" fill="#8b5cf6" fillOpacity={0.4} stroke="#8b5cf6" strokeWidth={2} name="Cumulative LTV" />
                      <Line yAxisId="surv" type="monotone" dataKey="survivalRate" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Survival %" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 text-center">
                  Purple area shows cumulative LTV per customer. Dashed red line shows cohort survival rate.
                </p>
              </div>
            </div>
          </Card>

          {/* Customize */}
          <Card className="mb-6">
            <button onClick={() => setShowBundleCustomize(!showBundleCustomize)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-semibold text-white">Customize Parameters</span>
                <span className="text-[10px] text-zinc-500">
                  {activeBundleKey !== 'custom' ? `Using ${BUNDLE_SCENARIOS[activeBundleKey]?.name || 'Base Case'} preset` : 'Custom configuration'}
                </span>
              </div>
              {showBundleCustomize ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
            </button>

            {showBundleCustomize && (
              <div className="mt-5 space-y-6">
                {Math.abs(bundleConfig.tiers.reduce((a, t) => a + t.mixPct, 0) - 1) >= 0.01 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">Mix percentages sum to {(bundleConfig.tiers.reduce((a, t) => a + t.mixPct, 0) * 100).toFixed(0)}% — should be 100%</p>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-3">Tier Pricing & Costs</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-32">Tier</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Price/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">COGS/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Margin</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Churn/mo</th>
                          <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Mix %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundleConfig.tiers.map((tier, i) => (
                          <tr key={tier.name} className="border-b border-white/[0.03]">
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier.name] }} />
                                <span className="text-zinc-300 font-medium">{tier.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-1"><NumInput value={tier.price} onChange={v => updateTier(i, { price: v })} prefix="$" min={0} step={10} /></td>
                            <td className="py-2 px-1"><NumInput value={tier.cogs} onChange={v => updateTier(i, { cogs: v })} prefix="$" min={0} step={5} /></td>
                            <td className="py-2 px-1 text-center">
                              <span className={cn('text-xs font-bold', ((tier.price - tier.cogs) / tier.price) >= 0.45 ? 'text-emerald-400' : 'text-amber-400')}>
                                {((1 - tier.cogs / tier.price) * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((tier.churnRate * 100).toFixed(1))} onChange={v => updateTier(i, { churnRate: v / 100 })} suffix="%" min={0} max={50} step={0.5} /></td>
                            <td className="py-2 px-1"><NumInput value={parseFloat((tier.mixPct * 100).toFixed(0))} onChange={v => updateTier(i, { mixPct: v / 100 })} suffix="%" min={0} max={100} step={5} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                  <NumInput label="Acq. Start/mo" value={bundleConfig.monthlyAcqStart} onChange={v => updateBundleConfig({ monthlyAcqStart: v })} min={0} step={100} />
                  <NumInput label="Acq. End/mo" value={bundleConfig.monthlyAcqEnd} onChange={v => updateBundleConfig({ monthlyAcqEnd: v })} min={0} step={100} />
                  <NumInput label="Ramp Months" value={bundleConfig.rampMonths} onChange={v => updateBundleConfig({ rampMonths: v })} min={1} max={36} />
                  <NumInput label="Blended CAC" value={bundleConfig.blendedCAC} onChange={v => updateBundleConfig({ blendedCAC: v })} prefix="$" min={0} step={10} />
                  <NumInput label="CAC Inflation/yr" value={bundleConfig.cacInflationPct} onChange={v => updateBundleConfig({ cacInflationPct: v })} suffix="%" min={0} max={50} step={1} />
                  <NumInput label="Upgrade Rate/mo" value={parseFloat((bundleConfig.upgradeRate * 100).toFixed(1))} onChange={v => updateBundleConfig({ upgradeRate: v / 100 })} suffix="%" min={0} max={50} step={0.5} />
                  <NumInput label="Upgrade Delay" value={bundleConfig.upgradeDelay} onChange={v => updateBundleConfig({ upgradeDelay: v })} suffix="mo" min={0} max={12} />
                </div>
              </div>
            )}
          </Card>

          {/* Tier LTV */}
          <Card className="mb-6">
            <CardHeader title="Cohort LTV by Tier" subtitle={`${bundleConfig.horizon}-month expected value per customer acquired`} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bundleConfig.tiers.map(tier => {
                const ltv = bundleResult.tierCohortLTV[tier.name];
                if (!ltv) return null;
                return (
                  <div key={tier.name} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[tier.name] }} />
                      <span className="text-[11px] font-semibold text-zinc-300">{tier.name}</span>
                      <span className="text-[9px] text-zinc-600 ml-auto">{(tier.mixPct * 100).toFixed(0)}% mix</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span className="text-[10px] text-zinc-500">LTV (Rev)</span><span className="text-xs font-bold text-white">{formatCurrency(Math.round(ltv.revenue))}</span></div>
                      <div className="flex justify-between"><span className="text-[10px] text-zinc-500">LTV (GP)</span><span className="text-xs font-bold text-emerald-400">{formatCurrency(Math.round(ltv.grossProfit))}</span></div>
                      <div className="flex justify-between"><span className="text-[10px] text-zinc-500">GM</span><span className="text-[10px] font-medium text-zinc-400">{((1 - tier.cogs / tier.price) * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Bundle Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader title="Monthly Revenue Breakdown" subtitle="Revenue = COGS + Gross Profit" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bundleResult.months.map(m => ({ month: m.month, COGS: m.totalCOGS, 'Gross Profit': m.totalGP }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="COGS" stackId="1" fill="#ef4444" fillOpacity={0.6} stroke="#ef4444" strokeWidth={0} />
                    <Area type="monotone" dataKey="Gross Profit" stackId="1" fill="#10b981" fillOpacity={0.6} stroke="#10b981" strokeWidth={0} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Active Customers by Tier" subtitle="Stacked by bundle tier over time" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bundleResult.months.map(m => {
                    const d: Record<string, number> = { month: m.month };
                    bundleConfig.tiers.forEach(t => { d[t.name] = m.tiers[t.name]?.active || 0; });
                    return d;
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => v.toLocaleString()} />} />
                    {bundleConfig.tiers.map(tier => (
                      <Area key={tier.name} type="monotone" dataKey={tier.name} stackId="1" fill={TIER_COLORS[tier.name]} fillOpacity={0.7} stroke={TIER_COLORS[tier.name]} strokeWidth={0} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Margin % Trends" subtitle="Gross margin and contribution margin over time" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bundleResult.months.map(m => ({ month: m.month, 'Gross Margin': parseFloat(m.gmPct.toFixed(1)), 'Contribution Margin': parseFloat(m.cmPct.toFixed(1)) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent formatter={(v: number) => `${v.toFixed(1)}%`} />} />
                    <Line type="monotone" dataKey="Gross Margin" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Contribution Margin" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="Cumulative Profitability" subtitle="Running totals" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bundleResult.months.map(m => ({ month: m.month, Revenue: m.cumRevenue, COGS: m.cumCOGS, Marketing: m.cumMarketing, 'Net Profit': m.cumProfit }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="COGS" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Marketing" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="Net Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    <ReferenceLine y={0} stroke="#ffffff20" />
                    <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bundle Summary + Sensitivity */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader title={`${bundleConfig.horizon}-Month Summary`} subtitle="Key financial metrics" />
              <div className="rounded-lg bg-surface-0 p-4 font-mono text-[11px] leading-relaxed">
                <p className="text-zinc-500 font-bold mb-2">REVENUE & PROFITABILITY:</p>
                <p className="text-zinc-300">• Total Revenue: <span className="text-white font-bold">{formatCompact(bs.totalRevenue)}</span></p>
                <p className="text-zinc-300">• Total COGS: <span className="text-red-400">{formatCompact(bs.totalCOGS)}</span></p>
                <p className="text-zinc-300">• Total Gross Profit: <span className="text-emerald-400">{formatCompact(bs.totalGP)}</span></p>
                <p className="text-zinc-300">• Total Marketing: <span className="text-amber-400">{formatCompact(bs.totalMarketing)}</span></p>
                <p className="text-zinc-300">• Total Net Profit: <span className="text-emerald-400 font-bold">{formatCompact(bs.totalProfit)}</span></p>
                <p className="text-zinc-500 font-bold mt-4 mb-2">UNIT ECONOMICS:</p>
                <p className="text-zinc-300">• LTV (Revenue): <span className="text-white font-bold">{formatCurrency(Math.round(bundleResult.cohortLTV.revenue))}</span></p>
                <p className="text-zinc-300">• LTV (Gross Profit): <span className="text-emerald-400 font-bold">{formatCurrency(Math.round(bundleResult.cohortLTV.grossProfit))}</span></p>
                <p className="text-zinc-300">• CAC: <span className="text-white">{formatCurrency(bs.blendedCAC)}</span></p>
                <p className="text-zinc-300">• LTV:CAC Ratio: <span className={cn('font-bold', bs.ltvCacRatio >= 3 ? 'text-emerald-400' : 'text-red-400')}>{bs.ltvCacRatio.toFixed(2)}:1</span></p>
                <p className="text-zinc-300">• Payback: <span className="text-white">~{bs.paybackMonths} months</span></p>
                <p className="text-zinc-500 font-bold mt-4 mb-2">CUSTOMERS:</p>
                <p className="text-zinc-300">• Total Acquired: <span className="text-white">{bs.totalAcquired.toLocaleString()}</span></p>
                <p className="text-zinc-300">• Mo {bundleConfig.horizon} Active: <span className="text-white">{bs.finalActive.toLocaleString()}</span></p>
                <p className="text-zinc-300">• Retention Rate: <span className="text-white">{bs.retentionRate.toFixed(1)}%</span></p>
              </div>
            </Card>
            <Card>
              <CardHeader title="Sensitivity Analysis — LTV Impact" subtitle="How varying each parameter affects cohort LTV (Gross Profit)" />
              <TornadoChart sensitivity={bundleSens} />
            </Card>
          </div>

          {/* Bundle Scenario Comparison */}
          <Card>
            <CardHeader title="Scenario Comparison" subtitle="Side-by-side view of all three presets" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-44">Metric</th>
                    {BUNDLE_SCENARIO_KEYS.map(key => (
                      <th key={key} className={cn('py-2 text-center text-[10px] font-medium', activeBundleKey === key ? 'text-brand-400' : 'text-zinc-500')}>
                        {BUNDLE_SCENARIOS[key].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const results = BUNDLE_SCENARIO_KEYS.map(key => runBundleSimulation({ ...BUNDLE_SCENARIOS[key], horizon: bundleConfig.horizon }));
                    const rows = [
                      { label: 'LTV (Revenue)', values: results.map(r => formatCurrency(Math.round(r.cohortLTV.revenue))) },
                      { label: 'LTV (Gross Profit)', values: results.map(r => formatCurrency(Math.round(r.cohortLTV.grossProfit))), highlight: true },
                      { label: 'LTV:CAC Ratio', values: results.map(r => `${r.summary.ltvCacRatio.toFixed(1)}:1`) },
                      { label: 'Payback', values: results.map(r => `${r.summary.paybackMonths} mo`) },
                      { label: 'Gross Margin', values: results.map(r => `${r.summary.avgGM.toFixed(1)}%`) },
                      { label: `${bundleConfig.horizon}-Mo Revenue`, values: results.map(r => formatCompact(r.summary.totalRevenue)) },
                      { label: `${bundleConfig.horizon}-Mo Net Profit`, values: results.map(r => formatCompact(r.summary.totalProfit)) },
                      { label: 'Retention Rate', values: results.map(r => `${r.summary.retentionRate.toFixed(1)}%`) },
                    ];
                    return rows.map(row => (
                      <tr key={row.label} className="border-b border-white/[0.03]">
                        <td className="py-2 text-zinc-400">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={cn('py-2 text-center font-medium', row.highlight ? 'text-emerald-400' : 'text-zinc-300', activeBundleKey === BUNDLE_SCENARIO_KEYS[i] && 'bg-brand-500/5')}>{v}</td>
                        ))}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}


      {/* ═══════════════════════════════════════════════════════ */}
      {/* COMPARE VIEW                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mode === 'compare' && (() => {
        // Use aligned horizon for fair comparison
        const horizon = Math.max(currentConfig.horizon, bundleConfig.horizon);
        const cResult = runCurrentSimulation({ ...currentConfig, horizon });
        const bResult = runBundleSimulation({ ...bundleConfig, horizon });
        const cS = cResult.summary;
        const bS = bResult.summary;

        // ARPU comparison data
        const arpuCompare = Array.from({ length: horizon }, (_, i) => ({
          month: i + 1,
          'Current ARPU': cResult.months[i]?.blendedARPU || 0,
          'Bundle ARPU': bResult.months[i] ? bResult.months[i].totalRevenue / Math.max(1, bResult.months[i].totalActive) : 0,
        }));

        const revCompare = Array.from({ length: horizon }, (_, i) => ({
          month: i + 1,
          'Current Revenue': cResult.months[i]?.totalRevenue || 0,
          'Bundle Revenue': bResult.months[i]?.totalRevenue || 0,
        }));

        const profitCompare = Array.from({ length: horizon }, (_, i) => ({
          month: i + 1,
          'Current Profit': cResult.months[i]?.cumProfit || 0,
          'Bundle Profit': bResult.months[i]?.cumProfit || 0,
        }));

        const activeCompare = Array.from({ length: horizon }, (_, i) => ({
          month: i + 1,
          'Current Active': cResult.months[i]?.totalActive || 0,
          'Bundle Active': bResult.months[i]?.totalActive || 0,
        }));

        return (
          <>
            {/* Hero comparison */}
            <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 border border-white/[0.04] p-6">
              <h2 className="text-lg font-bold text-white mb-4">Current Model vs Bundle Strategy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">Current: {CURRENT_SCENARIOS[activeCurrentKey]?.name || 'Custom'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">LTV (GP)</div>
                      <div className="text-lg font-bold text-blue-400">{formatCurrency(Math.round(cResult.cohortLTV.grossProfit))}</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">LTV:CAC</div>
                      <div className="text-lg font-bold text-blue-400">{cS.ltvCacRatio.toFixed(1)}:1</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">Payback</div>
                      <div className="text-lg font-bold text-blue-400">{cS.paybackMonths} mo</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">{horizon}-Mo Profit</div>
                      <div className="text-lg font-bold text-blue-400">{formatCompact(cS.totalProfit)}</div>
                    </div>
                  </div>
                </div>
                {/* Bundle */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">Bundle: {BUNDLE_SCENARIOS[activeBundleKey]?.name || 'Custom'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">LTV (GP)</div>
                      <div className="text-lg font-bold text-purple-400">{formatCurrency(Math.round(bResult.cohortLTV.grossProfit))}</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">LTV:CAC</div>
                      <div className="text-lg font-bold text-purple-400">{bS.ltvCacRatio.toFixed(1)}:1</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">Payback</div>
                      <div className="text-lg font-bold text-purple-400">{bS.paybackMonths} mo</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-2.5">
                      <div className="text-[10px] text-zinc-500">{horizon}-Mo Profit</div>
                      <div className="text-lg font-bold text-purple-400">{formatCompact(bS.totalProfit)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delta callout */}
              <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-4 flex-wrap text-[11px]">
                  <span className="text-zinc-500 font-medium">Bundle vs Current Δ:</span>
                  <span className={cn('font-bold', bResult.cohortLTV.grossProfit > cResult.cohortLTV.grossProfit ? 'text-emerald-400' : 'text-red-400')}>
                    LTV: {bResult.cohortLTV.grossProfit > cResult.cohortLTV.grossProfit ? '+' : ''}{formatCurrency(Math.round(bResult.cohortLTV.grossProfit - cResult.cohortLTV.grossProfit))}
                    {' '}({((bResult.cohortLTV.grossProfit / Math.max(1, cResult.cohortLTV.grossProfit) - 1) * 100).toFixed(0)}%)
                  </span>
                  <span className={cn('font-bold', bS.ltvCacRatio > cS.ltvCacRatio ? 'text-emerald-400' : 'text-red-400')}>
                    LTV:CAC: {bS.ltvCacRatio > cS.ltvCacRatio ? '+' : ''}{(bS.ltvCacRatio - cS.ltvCacRatio).toFixed(1)}
                  </span>
                  <span className={cn('font-bold', bS.totalProfit > cS.totalProfit ? 'text-emerald-400' : 'text-red-400')}>
                    Profit: {bS.totalProfit > cS.totalProfit ? '+' : ''}{formatCompact(bS.totalProfit - cS.totalProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
              {/* ARPU Over Time */}
              <Card>
                <CardHeader title="ARPU Comparison" subtitle="Per-customer revenue: Current model (lifecycle-driven) vs Bundle (tier-driven)" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={arpuCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent formatter={(v: number) => `$${v.toFixed(0)}`} />} />
                      <Line type="monotone" dataKey="Current ARPU" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Bundle ARPU" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="6 3" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Monthly Revenue */}
              <Card>
                <CardHeader title="Monthly Revenue" subtitle="Total revenue generated each month" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="Current Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} />
                      <Line type="monotone" dataKey="Bundle Revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} strokeDasharray="6 3" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Cumulative Profit */}
              <Card>
                <CardHeader title="Cumulative Profit" subtitle="Running net profit comparison" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <ReferenceLine y={0} stroke="#ffffff20" />
                      <Line type="monotone" dataKey="Current Profit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} />
                      <Line type="monotone" dataKey="Bundle Profit" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} strokeDasharray="6 3" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Active Customers */}
              <Card>
                <CardHeader title="Active Customers" subtitle="Total active customer base over time" />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeCompare}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} tick={{ fontSize: 10, fill: '#71717a' }} />
                      <Tooltip content={<ChartTooltipContent formatter={(v: number) => v.toLocaleString()} />} />
                      <Line type="monotone" dataKey="Current Active" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} />
                      <Line type="monotone" dataKey="Bundle Active" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} strokeDasharray="6 3" />
                      <Legend wrapperStyle={{ fontSize: '10px' }} formatter={(value: string) => <span className="text-zinc-400 text-[10px]">{value}</span>} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Full Comparison Table */}
            <Card>
              <CardHeader title="Complete Model Comparison" subtitle="All key metrics side-by-side" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="py-2 text-left text-[10px] font-medium text-zinc-500 w-52">Metric</th>
                      <th className="py-2 text-center text-[10px] font-medium text-blue-400">
                        <div className="flex items-center justify-center gap-1"><ShoppingBag className="h-3 w-3" /> Current Model</div>
                      </th>
                      <th className="py-2 text-center text-[10px] font-medium text-purple-400">
                        <div className="flex items-center justify-center gap-1"><Layers className="h-3 w-3" /> Bundle Model</div>
                      </th>
                      <th className="py-2 text-center text-[10px] font-medium text-zinc-500">Δ (Bundle advantage)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'LTV (Revenue)', c: formatCurrency(Math.round(cResult.cohortLTV.revenue)), b: formatCurrency(Math.round(bResult.cohortLTV.revenue)), delta: bResult.cohortLTV.revenue - cResult.cohortLTV.revenue, fmt: formatCurrency },
                      { label: 'LTV (Gross Profit)', c: formatCurrency(Math.round(cResult.cohortLTV.grossProfit)), b: formatCurrency(Math.round(bResult.cohortLTV.grossProfit)), delta: bResult.cohortLTV.grossProfit - cResult.cohortLTV.grossProfit, fmt: formatCurrency, highlight: true },
                      { label: 'LTV:CAC Ratio', c: `${cS.ltvCacRatio.toFixed(1)}:1`, b: `${bS.ltvCacRatio.toFixed(1)}:1`, delta: bS.ltvCacRatio - cS.ltvCacRatio, fmt: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}` },
                      { label: 'Payback Period', c: `${cS.paybackMonths} mo`, b: `${bS.paybackMonths} mo`, delta: cS.paybackMonths - bS.paybackMonths, fmt: (v: number) => `${v > 0 ? '+' : ''}${v} mo faster`, invert: true },
                      { label: 'Gross Margin', c: `${cS.avgGM.toFixed(1)}%`, b: `${bS.avgGM.toFixed(1)}%`, delta: bS.avgGM - cS.avgGM, fmt: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}pp` },
                      { label: `${horizon}-Mo Revenue`, c: formatCompact(cS.totalRevenue), b: formatCompact(bS.totalRevenue), delta: bS.totalRevenue - cS.totalRevenue, fmt: formatCompact },
                      { label: `${horizon}-Mo Net Profit`, c: formatCompact(cS.totalProfit), b: formatCompact(bS.totalProfit), delta: bS.totalProfit - cS.totalProfit, fmt: formatCompact },
                      { label: 'Total Acquired', c: cS.totalAcquired.toLocaleString(), b: bS.totalAcquired.toLocaleString(), delta: bS.totalAcquired - cS.totalAcquired, fmt: (v: number) => v.toLocaleString() },
                      { label: `Mo ${horizon} Active`, c: Math.round(cS.finalActive).toLocaleString(), b: bS.finalActive.toLocaleString(), delta: bS.finalActive - cS.finalActive, fmt: (v: number) => Math.round(v).toLocaleString() },
                      { label: 'Retention Rate', c: `${cS.retentionRate.toFixed(1)}%`, b: `${bS.retentionRate.toFixed(1)}%`, delta: bS.retentionRate - cS.retentionRate, fmt: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}pp` },
                    ].map(row => (
                      <tr key={row.label} className="border-b border-white/[0.03]">
                        <td className="py-2 text-zinc-400 font-medium">{row.label}</td>
                        <td className={cn('py-2 text-center font-medium', row.highlight ? 'text-blue-400' : 'text-zinc-300')}>{row.c}</td>
                        <td className={cn('py-2 text-center font-medium', row.highlight ? 'text-purple-400' : 'text-zinc-300')}>{row.b}</td>
                        <td className={cn('py-2 text-center text-[10px] font-bold',
                          (row.invert ? row.delta >= 0 : row.delta > 0) ? 'text-emerald-400' : row.delta === 0 ? 'text-zinc-500' : 'text-red-400'
                        )}>
                          {row.delta > 0 && !row.invert ? '+' : ''}{row.fmt(Math.round(row.delta))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        );
      })()}
    </div>
  );
}


// ─── Utility ─────────────────────────────────────────────────────────────

function cloneCurrent(config: CurrentModelConfig): CurrentModelConfig {
  return {
    ...config,
    programs: config.programs.map(p => ({ ...p })),
    addOns: config.addOns.map(a => ({ ...a })),
    sustain: { ...config.sustain },
  };
}
