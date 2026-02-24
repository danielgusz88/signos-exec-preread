// ═══════════════════════════════════════════════════════════════════════════
// FunnelAI — LTV Simulation Engine
// Two models: Current (Programs + Add-ons + Sustain) and Bundle (Tier-based)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Shared Types ────────────────────────────────────────────────────────

export interface SensitivityItem {
  parameter: string;
  lowLabel: string;
  highLabel: string;
  baseLTV: number;
  lowLTV: number;
  highLTV: number;
  delta: number;
}

// ─── LTV Buildup Types ──────────────────────────────────────────────────

export interface LTVAccumulationPoint {
  age: number;
  cumulativeLTV: number;
  cumulativeBase: number;
  cumulativeAddOn: number;
  cumulativeSustain: number;
  survivalRate: number;
}

export interface CurrentLTVBuildup {
  baseProgramLTV: number;
  addOnLTV: number;
  sustainLTV: number;
  addOnBreakdown: Record<string, number>;
  grossPotentialLTV: number;
  churnImpactLTV: number;
  monthlyAccumulation: LTVAccumulationPoint[];
}

export interface BundleLTVBuildup {
  byTierLTV: Record<string, number>;
  totalLTV: number;
  grossPotentialLTV: number;
  churnImpactLTV: number;
  monthlyAccumulation: Array<{
    age: number;
    cumulativeLTV: number;
    survivalRate: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// BUNDLE MODEL — Tier-based (Foundation / Comprehensive / Premium / À la carte)
// ═══════════════════════════════════════════════════════════════════════════

export interface TierConfig {
  name: string;
  price: number;      // $/month
  cogs: number;       // $/month per customer
  churnRate: number;  // monthly churn as decimal (0.03 = 3%)
  mixPct: number;     // fraction of new customers (0.55 = 55%)
}

export interface BundleConfig {
  name: string;
  description: string;
  tiers: TierConfig[];
  monthlyAcqStart: number;
  monthlyAcqEnd: number;
  rampMonths: number;
  blendedCAC: number;
  cacInflationPct: number; // annual %
  upgradeRate: number;     // monthly Foundation→Comprehensive
  upgradeDelay: number;    // months before upgrades begin
  horizon: number;         // simulation months
}

// Keep backward compat alias
export type ScenarioConfig = BundleConfig;

export interface BundleMonthData {
  month: number;
  newCustomers: number;
  tiers: Record<string, {
    active: number;
    new: number;
    upgradesIn: number;
    upgradesOut: number;
    churned: number;
    revenue: number;
    cogs: number;
    gp: number;
  }>;
  totalActive: number;
  totalRevenue: number;
  totalCOGS: number;
  totalGP: number;
  marketing: number;
  contribution: number;
  gmPct: number;
  cmPct: number;
  cumRevenue: number;
  cumCOGS: number;
  cumMarketing: number;
  cumProfit: number;
}

// Keep backward compat alias
export type MonthData = BundleMonthData;

export interface BundleSimulationResult {
  months: BundleMonthData[];
  cohortLTV: { revenue: number; grossProfit: number };
  tierCohortLTV: Record<string, { revenue: number; grossProfit: number }>;
  ltvBuildup: BundleLTVBuildup;
  summary: {
    totalRevenue: number;
    totalCOGS: number;
    totalGP: number;
    totalMarketing: number;
    totalProfit: number;
    avgGM: number;
    avgCM: number;
    npmPct: number;
    blendedCAC: number;
    ltvCacRatio: number;
    paybackMonths: number;
    totalAcquired: number;
    finalActive: number;
    retentionRate: number;
  };
}

// Keep backward compat alias
export type SimulationResult = BundleSimulationResult;

// ─── Bundle Presets ──────────────────────────────────────────────────────

export const BUNDLE_SCENARIOS: Record<string, BundleConfig> = {
  conservative: {
    name: 'Conservative',
    description: 'Stress test — slower ramp, higher churn, lower attach rates',
    tiers: [
      { name: 'Foundation',    price: 279, cogs: 145, churnRate: 0.04,  mixPct: 0.65 },
      { name: 'Comprehensive', price: 399, cogs: 225, churnRate: 0.035, mixPct: 0.15 },
      { name: 'Premium',       price: 479, cogs: 265, churnRate: 0.03,  mixPct: 0.05 },
      { name: 'À la carte',    price: 199, cogs: 125, churnRate: 0.07,  mixPct: 0.15 },
    ],
    monthlyAcqStart: 800,
    monthlyAcqEnd: 1500,
    rampMonths: 12,
    blendedCAC: 380,
    cacInflationPct: 10,
    upgradeRate: 0.05,
    upgradeDelay: 3,
    horizon: 12,
  },
  base: {
    name: 'Base Case',
    description: 'Realistic projections — moderate ramp, proven retention assumptions',
    tiers: [
      { name: 'Foundation',    price: 279, cogs: 140, churnRate: 0.03,  mixPct: 0.55 },
      { name: 'Comprehensive', price: 399, cogs: 220, churnRate: 0.025, mixPct: 0.25 },
      { name: 'Premium',       price: 479, cogs: 260, churnRate: 0.02,  mixPct: 0.10 },
      { name: 'À la carte',    price: 199, cogs: 120, churnRate: 0.06,  mixPct: 0.10 },
    ],
    monthlyAcqStart: 1000,
    monthlyAcqEnd: 2000,
    rampMonths: 9,
    blendedCAC: 340,
    cacInflationPct: 5,
    upgradeRate: 0.08,
    upgradeDelay: 2,
    horizon: 12,
  },
  optimistic: {
    name: 'Optimistic',
    description: 'Best case — high attach, low churn, fast ramp (previous analysis)',
    tiers: [
      { name: 'Foundation',    price: 279, cogs: 135, churnRate: 0.02,  mixPct: 0.50 },
      { name: 'Comprehensive', price: 399, cogs: 210, churnRate: 0.015, mixPct: 0.30 },
      { name: 'Premium',       price: 479, cogs: 255, churnRate: 0.015, mixPct: 0.15 },
      { name: 'À la carte',    price: 199, cogs: 115, churnRate: 0.05,  mixPct: 0.05 },
    ],
    monthlyAcqStart: 2000,
    monthlyAcqEnd: 2000,
    rampMonths: 1,
    blendedCAC: 340,
    cacInflationPct: 0,
    upgradeRate: 0.12,
    upgradeDelay: 2,
    horizon: 12,
  },
};

// backward compat
export const SCENARIOS = BUNDLE_SCENARIOS;

// ─── Bundle Cohort LTV ──────────────────────────────────────────────────

export function computeBundleCohortLTV(config: BundleConfig) {
  const cohortSize = 1000;
  const active: Record<string, number> = {};
  config.tiers.forEach(t => { active[t.name] = Math.round(cohortSize * t.mixPct); });

  // Zero-churn parallel tracking
  const zcActive: Record<string, number> = {};
  config.tiers.forEach(t => { zcActive[t.name] = Math.round(cohortSize * t.mixPct); });

  let totalRev = 0, totalGP = 0;
  let zcTotalRev = 0;
  let paybackMonths = config.horizon;
  let cumGPPerCustomer = 0;
  let paybackFound = false;

  const tierRev: Record<string, number> = {};
  const tierGP: Record<string, number> = {};
  config.tiers.forEach(t => { tierRev[t.name] = 0; tierGP[t.name] = 0; });

  const monthlyAccum: BundleLTVBuildup['monthlyAccumulation'] = [];

  for (let m = 0; m < config.horizon; m++) {
    let monthGP = 0;
    let zcMonthRev = 0;

    for (const tier of config.tiers) {
      const rev = active[tier.name] * tier.price;
      const gp = active[tier.name] * (tier.price - tier.cogs);
      totalRev += rev;
      totalGP += gp;
      monthGP += gp;
      tierRev[tier.name] += rev;
      tierGP[tier.name] += gp;

      // Zero-churn revenue
      zcMonthRev += zcActive[tier.name] * tier.price;
    }
    zcTotalRev += zcMonthRev;

    cumGPPerCustomer += monthGP / cohortSize;
    if (!paybackFound && cumGPPerCustomer >= config.blendedCAC) {
      paybackMonths = m + 1;
      paybackFound = true;
    }

    // Upgrades — both real and zero-churn paths
    if (m >= config.upgradeDelay && active['Foundation'] > 0) {
      const upgrades = Math.round(active['Foundation'] * config.upgradeRate);
      active['Foundation'] = Math.max(0, active['Foundation'] - upgrades);
      active['Comprehensive'] = (active['Comprehensive'] || 0) + upgrades;
    }
    if (m >= config.upgradeDelay && zcActive['Foundation'] > 0) {
      const upgrades = Math.round(zcActive['Foundation'] * config.upgradeRate);
      zcActive['Foundation'] = Math.max(0, zcActive['Foundation'] - upgrades);
      zcActive['Comprehensive'] = (zcActive['Comprehensive'] || 0) + upgrades;
    }

    // Churn (real path only)
    for (const tier of config.tiers) {
      const churned = Math.round(active[tier.name] * tier.churnRate);
      active[tier.name] = Math.max(0, active[tier.name] - churned);
    }

    const surviving = Object.values(active).reduce((a, b) => a + b, 0);
    monthlyAccum.push({
      age: m + 1,
      cumulativeLTV: totalRev / cohortSize,
      survivalRate: surviving / cohortSize,
    });
  }

  const byTier: Record<string, { revenue: number; grossProfit: number }> = {};
  const byTierLTV: Record<string, number> = {};
  config.tiers.forEach(t => {
    const acquired = Math.round(cohortSize * t.mixPct);
    byTier[t.name] = {
      revenue: acquired > 0 ? tierRev[t.name] / acquired : 0,
      grossProfit: acquired > 0 ? tierGP[t.name] / acquired : 0,
    };
    byTierLTV[t.name] = tierRev[t.name] / cohortSize;
  });

  const actualLTV = totalRev / cohortSize;
  const grossPotentialLTV = zcTotalRev / cohortSize;

  return {
    blended: { revenue: actualLTV, grossProfit: totalGP / cohortSize },
    byTier,
    paybackMonths,
    finalRetention: Object.values(active).reduce((a, b) => a + b, 0) / cohortSize,
    ltvBuildup: {
      byTierLTV,
      totalLTV: actualLTV,
      grossPotentialLTV,
      churnImpactLTV: grossPotentialLTV - actualLTV,
      monthlyAccumulation: monthlyAccum,
    } as BundleLTVBuildup,
  };
}

// backward compat
export const computeCohortLTV = computeBundleCohortLTV;

// ─── Bundle Full Simulation ─────────────────────────────────────────────

export function runBundleSimulation(config: BundleConfig): BundleSimulationResult {
  const months: BundleMonthData[] = [];
  const active: Record<string, number> = {};
  config.tiers.forEach(t => { active[t.name] = 0; });

  let cumRevenue = 0, cumCOGS = 0, cumMarketing = 0, cumProfit = 0;
  let totalAcquired = 0;

  for (let m = 0; m < config.horizon; m++) {
    let acq: number;
    if (config.rampMonths <= 1) {
      acq = config.monthlyAcqEnd;
    } else if (m < config.rampMonths) {
      acq = Math.round(
        config.monthlyAcqStart +
        (config.monthlyAcqEnd - config.monthlyAcqStart) * (m / (config.rampMonths - 1))
      );
    } else {
      acq = config.monthlyAcqEnd;
    }
    totalAcquired += acq;

    const currentCAC = config.blendedCAC * Math.pow(1 + config.cacInflationPct / 100, m / 12);

    let upgradesCount = 0;
    if (m >= config.upgradeDelay && active['Foundation'] > 0) {
      upgradesCount = Math.round(active['Foundation'] * config.upgradeRate);
    }

    const tierData: BundleMonthData['tiers'] = {};
    let monthRev = 0, monthCOGS = 0, monthGP = 0, monthActive = 0;

    for (const tier of config.tiers) {
      const newInTier = Math.round(acq * tier.mixPct);
      const uIn = tier.name === 'Comprehensive' ? upgradesCount : 0;
      const uOut = tier.name === 'Foundation' ? upgradesCount : 0;

      const beforeChurn = active[tier.name] + newInTier + uIn - uOut;
      const churned = Math.round(Math.max(0, beforeChurn) * tier.churnRate);
      const finalActive = Math.max(0, beforeChurn - churned);

      const rev = finalActive * tier.price;
      const cogs = finalActive * tier.cogs;
      const gp = rev - cogs;

      tierData[tier.name] = {
        active: finalActive, new: newInTier,
        upgradesIn: uIn, upgradesOut: uOut, churned, revenue: rev, cogs, gp,
      };

      active[tier.name] = finalActive;
      monthRev += rev;
      monthCOGS += cogs;
      monthGP += gp;
      monthActive += finalActive;
    }

    const marketing = Math.round(acq * currentCAC);
    const contribution = monthGP - marketing;

    cumRevenue += monthRev;
    cumCOGS += monthCOGS;
    cumMarketing += marketing;
    cumProfit += contribution;

    months.push({
      month: m + 1, newCustomers: acq, tiers: tierData,
      totalActive: monthActive, totalRevenue: monthRev,
      totalCOGS: monthCOGS, totalGP: monthGP,
      marketing, contribution,
      gmPct: monthRev > 0 ? (monthGP / monthRev) * 100 : 0,
      cmPct: monthRev > 0 ? (contribution / monthRev) * 100 : 0,
      cumRevenue, cumCOGS, cumMarketing, cumProfit,
    });
  }

  const cohort = computeBundleCohortLTV(config);
  const avgGM = cumRevenue > 0 ? ((cumRevenue - cumCOGS) / cumRevenue) * 100 : 0;
  const finalActive = Object.values(active).reduce((a, b) => a + b, 0);

  return {
    months,
    cohortLTV: cohort.blended,
    tierCohortLTV: cohort.byTier,
    ltvBuildup: cohort.ltvBuildup,
    summary: {
      totalRevenue: cumRevenue,
      totalCOGS: cumCOGS,
      totalGP: cumRevenue - cumCOGS,
      totalMarketing: cumMarketing,
      totalProfit: cumProfit,
      avgGM,
      avgCM: cumRevenue > 0 ? (cumProfit / cumRevenue) * 100 : 0,
      npmPct: cumRevenue > 0 ? (cumProfit / cumRevenue) * 100 : 0,
      blendedCAC: config.blendedCAC,
      ltvCacRatio: config.blendedCAC > 0 ? cohort.blended.grossProfit / config.blendedCAC : 0,
      paybackMonths: cohort.paybackMonths,
      totalAcquired: totalAcquired,
      finalActive,
      retentionRate: totalAcquired > 0 ? (finalActive / totalAcquired) * 100 : 0,
    },
  };
}

// backward compat
export const runSimulation = runBundleSimulation;

// ─── Bundle Sensitivity ─────────────────────────────────────────────────

function cloneBundleConfig(config: BundleConfig): BundleConfig {
  return { ...config, tiers: config.tiers.map(t => ({ ...t })) };
}

export function runBundleSensitivity(config: BundleConfig): SensitivityItem[] {
  const baseCohort = computeBundleCohortLTV(config);
  const baseLTV = baseCohort.blended.grossProfit;
  const ft = (name: string) => config.tiers.find(t => t.name === name);

  const variations: Array<{
    name: string;
    apply: (c: BundleConfig, factor: number) => void;
    lowF: number; highF: number;
    lowLabel: string; highLabel: string;
  }> = [
    {
      name: 'Bundle Churn Rate',
      apply: (c, f) => c.tiers.forEach(t => { if (t.name !== 'À la carte') t.churnRate *= f; }),
      lowF: 0.5, highF: 1.5,
      lowLabel: `${((ft('Foundation')?.churnRate || 0.03) * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `${((ft('Foundation')?.churnRate || 0.03) * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'À la Carte Churn',
      apply: (c, f) => { const t = c.tiers.find(x => x.name === 'À la carte'); if (t) t.churnRate *= f; },
      lowF: 0.5, highF: 1.5,
      lowLabel: `${((ft('À la carte')?.churnRate || 0.06) * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `${((ft('À la carte')?.churnRate || 0.06) * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'Foundation Price',
      apply: (c, f) => { const t = c.tiers.find(x => x.name === 'Foundation'); if (t) t.price = Math.round(t.price * f); },
      lowF: 0.85, highF: 1.15,
      lowLabel: `$${Math.round((ft('Foundation')?.price || 279) * 0.85)}`,
      highLabel: `$${Math.round((ft('Foundation')?.price || 279) * 1.15)}`,
    },
    {
      name: 'Comprehensive Price',
      apply: (c, f) => { const t = c.tiers.find(x => x.name === 'Comprehensive'); if (t) t.price = Math.round(t.price * f); },
      lowF: 0.85, highF: 1.15,
      lowLabel: `$${Math.round((ft('Comprehensive')?.price || 399) * 0.85)}`,
      highLabel: `$${Math.round((ft('Comprehensive')?.price || 399) * 1.15)}`,
    },
    {
      name: 'Blended CAC',
      apply: (c, f) => { c.blendedCAC = Math.round(c.blendedCAC * f); },
      lowF: 0.8, highF: 1.2,
      lowLabel: `$${Math.round(config.blendedCAC * 0.8)}`,
      highLabel: `$${Math.round(config.blendedCAC * 1.2)}`,
    },
    {
      name: 'Upgrade Rate (F→C)',
      apply: (c, f) => { c.upgradeRate *= f; },
      lowF: 0.5, highF: 1.5,
      lowLabel: `${(config.upgradeRate * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `${(config.upgradeRate * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'All COGS',
      apply: (c, f) => c.tiers.forEach(t => { t.cogs = Math.round(t.cogs * f); }),
      lowF: 0.85, highF: 1.15,
      lowLabel: '-15%', highLabel: '+15%',
    },
    {
      name: 'Premium Price',
      apply: (c, f) => { const t = c.tiers.find(x => x.name === 'Premium'); if (t) t.price = Math.round(t.price * f); },
      lowF: 0.85, highF: 1.15,
      lowLabel: `$${Math.round((ft('Premium')?.price || 479) * 0.85)}`,
      highLabel: `$${Math.round((ft('Premium')?.price || 479) * 1.15)}`,
    },
  ];

  return variations.map(v => {
    const lowConfig = cloneBundleConfig(config);
    v.apply(lowConfig, v.lowF);
    const highConfig = cloneBundleConfig(config);
    v.apply(highConfig, v.highF);
    const lowCohort = computeBundleCohortLTV(lowConfig);
    const highCohort = computeBundleCohortLTV(highConfig);
    return {
      parameter: v.name, lowLabel: v.lowLabel, highLabel: v.highLabel, baseLTV,
      lowLTV: lowCohort.blended.grossProfit,
      highLTV: highCohort.blended.grossProfit,
      delta: Math.abs(highCohort.blended.grossProfit - lowCohort.blended.grossProfit),
    };
  }).sort((a, b) => b.delta - a.delta);
}

// backward compat
export const runSensitivity = runBundleSensitivity;


// ═══════════════════════════════════════════════════════════════════════════
// CURRENT MODEL — Entry Programs + À la Carte Add-Ons + Sustain Transition
// ═══════════════════════════════════════════════════════════════════════════

export interface ProgramConfig {
  name: string;
  price: number;        // $/month
  cogs: number;         // $/month
  mixPct: number;       // fraction of new customers (0-1)
  earlyChurn: number;   // monthly churn months 1-3 (0.08 = 8%)
  midChurn: number;     // monthly churn months 4-6
  lateChurn: number;    // monthly churn months 7+
}

export interface AddOnConfig {
  name: string;
  price: number;        // additional $/month
  cogs: number;         // additional $/month
  maxAttachRate: number; // max fraction who adopt (0.10 = 10%)
  rampMonths: number;   // months to reach max from delay start
  attachDelay: number;  // months before customers start buying
}

export interface SustainConfig {
  price: number;           // $/month
  cogs: number;            // $/month
  transitionRate: number;  // monthly fraction of eligible program→sustain
  transitionDelay: number; // months before sustain is offered
  churnRate: number;       // sustain-specific churn (lower)
}

export interface CurrentModelConfig {
  name: string;
  description: string;
  programs: ProgramConfig[];
  addOns: AddOnConfig[];
  sustain: SustainConfig;
  monthlyAcqStart: number;
  monthlyAcqEnd: number;
  rampMonths: number;
  blendedCAC: number;
  cacInflationPct: number;
  horizon: number;
}

export interface CurrentMonthData {
  month: number;
  newCustomers: number;
  totalActive: number;
  totalOnProgram: number;
  totalOnSustain: number;
  totalRevenue: number;
  totalCOGS: number;
  totalGP: number;
  marketing: number;
  contribution: number;
  gmPct: number;
  cmPct: number;
  cumRevenue: number;
  cumCOGS: number;
  cumMarketing: number;
  cumProfit: number;
  blendedARPU: number;
  programRevenue: number;
  addOnRevenue: number;
  sustainRevenue: number;
  addOnDetails: Record<string, { customers: number; revenue: number }>;
  programDetails: Record<string, { active: number; onSustain: number; churned: number }>;
}

export interface CurrentSimulationResult {
  months: CurrentMonthData[];
  cohortLTV: { revenue: number; grossProfit: number };
  programCohortLTV: Record<string, { revenue: number; grossProfit: number }>;
  ltvBuildup: CurrentLTVBuildup;
  arpuByAge: Array<{ age: number; arpu: number; baseArpu: number; addOnArpu: number; sustainArpu: number }>;
  attachByAge: Array<Record<string, number>>;
  summary: {
    totalRevenue: number;
    totalCOGS: number;
    totalGP: number;
    totalMarketing: number;
    totalProfit: number;
    avgGM: number;
    avgCM: number;
    npmPct: number;
    blendedCAC: number;
    ltvCacRatio: number;
    paybackMonths: number;
    totalAcquired: number;
    finalActive: number;
    retentionRate: number;
    peakARPU: number;
    sustainPct: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getAttachRate(age: number, addOn: AddOnConfig): number {
  if (age < addOn.attachDelay) return 0;
  const elapsed = age - addOn.attachDelay;
  if (addOn.rampMonths <= 0) return addOn.maxAttachRate;
  return Math.min(addOn.maxAttachRate, addOn.maxAttachRate * (elapsed / addOn.rampMonths));
}

function getChurnRate(age: number, program: ProgramConfig): number {
  if (age < 3) return program.earlyChurn;
  if (age < 6) return program.midChurn;
  return program.lateChurn;
}

function cloneCurrentConfig(config: CurrentModelConfig): CurrentModelConfig {
  return {
    ...config,
    programs: config.programs.map(p => ({ ...p })),
    addOns: config.addOns.map(a => ({ ...a })),
    sustain: { ...config.sustain },
  };
}

// ─── Current Model Presets ───────────────────────────────────────────────

export const CURRENT_SCENARIOS: Record<string, CurrentModelConfig> = {
  current: {
    name: 'Current State',
    description: 'Signos today — CGM & GLP-1 programs with limited add-on adoption',
    programs: [
      { name: 'CGM Program', price: 199, cogs: 80, mixPct: 0.65, earlyChurn: 0.08, midChurn: 0.05, lateChurn: 0.04 },
      { name: 'GLP-1 Program', price: 299, cogs: 160, mixPct: 0.35, earlyChurn: 0.06, midChurn: 0.04, lateChurn: 0.03 },
    ],
    addOns: [
      { name: 'RD Sessions', price: 75, cogs: 40, maxAttachRate: 0.10, rampMonths: 6, attachDelay: 2 },
      { name: 'Supplements', price: 35, cogs: 12, maxAttachRate: 0.08, rampMonths: 4, attachDelay: 1 },
      { name: 'Side-Effect Kit', price: 25, cogs: 10, maxAttachRate: 0.05, rampMonths: 3, attachDelay: 1 },
    ],
    sustain: { price: 99, cogs: 30, transitionRate: 0.05, transitionDelay: 6, churnRate: 0.02 },
    monthlyAcqStart: 800,
    monthlyAcqEnd: 1200,
    rampMonths: 9,
    blendedCAC: 340,
    cacInflationPct: 5,
    horizon: 12,
  },
  optimizedAddOns: {
    name: 'Optimized Add-ons',
    description: 'Push add-on adoption — better marketing, earlier engagement, more products',
    programs: [
      { name: 'CGM Program', price: 199, cogs: 80, mixPct: 0.60, earlyChurn: 0.07, midChurn: 0.045, lateChurn: 0.035 },
      { name: 'GLP-1 Program', price: 299, cogs: 155, mixPct: 0.40, earlyChurn: 0.055, midChurn: 0.035, lateChurn: 0.025 },
    ],
    addOns: [
      { name: 'RD Sessions', price: 75, cogs: 40, maxAttachRate: 0.25, rampMonths: 4, attachDelay: 1 },
      { name: 'Supplements', price: 35, cogs: 12, maxAttachRate: 0.20, rampMonths: 3, attachDelay: 1 },
      { name: 'Side-Effect Kit', price: 25, cogs: 10, maxAttachRate: 0.12, rampMonths: 3, attachDelay: 1 },
      { name: 'Metabolic Coach', price: 50, cogs: 25, maxAttachRate: 0.15, rampMonths: 4, attachDelay: 2 },
    ],
    sustain: { price: 99, cogs: 30, transitionRate: 0.08, transitionDelay: 4, churnRate: 0.02 },
    monthlyAcqStart: 1000,
    monthlyAcqEnd: 1500,
    rampMonths: 6,
    blendedCAC: 340,
    cacInflationPct: 5,
    horizon: 12,
  },
  glp1Heavy: {
    name: 'GLP-1 Heavy',
    description: 'Shift acquisition toward GLP-1 — higher ARPU, higher COGS',
    programs: [
      { name: 'CGM Program', price: 199, cogs: 80, mixPct: 0.30, earlyChurn: 0.08, midChurn: 0.05, lateChurn: 0.04 },
      { name: 'GLP-1 Program', price: 299, cogs: 155, mixPct: 0.70, earlyChurn: 0.055, midChurn: 0.035, lateChurn: 0.025 },
    ],
    addOns: [
      { name: 'RD Sessions', price: 75, cogs: 40, maxAttachRate: 0.20, rampMonths: 5, attachDelay: 2 },
      { name: 'Supplements', price: 35, cogs: 12, maxAttachRate: 0.12, rampMonths: 4, attachDelay: 1 },
      { name: 'Anti-Nausea Kit', price: 40, cogs: 15, maxAttachRate: 0.30, rampMonths: 2, attachDelay: 0 },
    ],
    sustain: { price: 119, cogs: 45, transitionRate: 0.06, transitionDelay: 6, churnRate: 0.025 },
    monthlyAcqStart: 1000,
    monthlyAcqEnd: 1800,
    rampMonths: 9,
    blendedCAC: 360,
    cacInflationPct: 5,
    horizon: 12,
  },
};

// ─── Current Cohort LTV — Models a single cohort through its lifecycle ──

export function computeCurrentCohortLTV(config: CurrentModelConfig) {
  const cohortSize = 1000;

  // One sub-cohort per program
  const subs = config.programs.map(p => ({
    program: p,
    activeOnProgram: Math.round(cohortSize * p.mixPct),
    activeOnSustain: 0,
    totalRev: 0,
    totalGP: 0,
  }));

  // Fix rounding
  const assigned = subs.reduce((s, c) => s + c.activeOnProgram, 0);
  if (assigned !== cohortSize && subs.length > 0) subs[0].activeOnProgram += cohortSize - assigned;

  // Zero-churn parallel tracking
  const zcSubs = subs.map(s => ({
    activeOnProgram: s.activeOnProgram,
    activeOnSustain: 0,
  }));

  // Revenue source tracking
  let cumBaseRev = 0, cumAddOnRev = 0, cumSustainRev = 0;
  const cumAddOnByName: Record<string, number> = {};
  for (const ao of config.addOns) cumAddOnByName[ao.name] = 0;
  const monthlyAccum: LTVAccumulationPoint[] = [];
  let zcTotalRev = 0;

  let totalRev = 0, totalGP = 0;
  let paybackMonths = config.horizon;
  let cumGPPerCust = 0;
  let paybackFound = false;

  const arpuByAge: CurrentSimulationResult['arpuByAge'] = [];
  const attachByAge: CurrentSimulationResult['attachByAge'] = [];

  for (let age = 0; age < config.horizon; age++) {
    let monthRev = 0, monthCOGS = 0, monthActive = 0;
    let monthBase = 0, monthAddOn = 0, monthSustain = 0;

    // Per-add-on tracking for this month
    const monthAddOnByName: Record<string, number> = {};
    for (const ao of config.addOns) monthAddOnByName[ao.name] = 0;

    for (const sub of subs) {
      const totalSub = sub.activeOnProgram + sub.activeOnSustain;
      if (totalSub <= 0) continue;

      // Revenue
      const baseRev = sub.activeOnProgram * sub.program.price;
      const susRev = sub.activeOnSustain * config.sustain.price;

      let aoRev = 0, aoCogs = 0;
      for (const ao of config.addOns) {
        const rate = getAttachRate(age, ao);
        const cust = totalSub * rate;
        const aoItemRev = cust * ao.price;
        aoRev += aoItemRev;
        aoCogs += cust * ao.cogs;
        monthAddOnByName[ao.name] += aoItemRev;
      }

      const baseCogs = sub.activeOnProgram * sub.program.cogs;
      const susCogs = sub.activeOnSustain * config.sustain.cogs;

      const rev = baseRev + susRev + aoRev;
      const cogs = baseCogs + susCogs + aoCogs;

      monthRev += rev;
      monthCOGS += cogs;
      monthActive += totalSub;
      monthBase += baseRev;
      monthSustain += susRev;
      monthAddOn += aoRev;
      sub.totalRev += rev;
      sub.totalGP += rev - cogs;

      // Sustain transitions (after revenue, before churn)
      if (age >= config.sustain.transitionDelay) {
        const trans = Math.round(sub.activeOnProgram * config.sustain.transitionRate);
        sub.activeOnProgram = Math.max(0, sub.activeOnProgram - trans);
        sub.activeOnSustain += trans;
      }

      // Churn
      const cr = getChurnRate(age, sub.program);
      sub.activeOnProgram = Math.max(0, sub.activeOnProgram - Math.round(sub.activeOnProgram * cr));
      sub.activeOnSustain = Math.max(0, sub.activeOnSustain - Math.round(sub.activeOnSustain * config.sustain.churnRate));
    }

    // Zero-churn parallel path
    let zcMonthRev = 0;
    for (let si = 0; si < zcSubs.length; si++) {
      const zc = zcSubs[si];
      const prog = config.programs[si];
      const zcTotal = zc.activeOnProgram + zc.activeOnSustain;
      if (zcTotal <= 0) continue;
      zcMonthRev += zc.activeOnProgram * prog.price;
      zcMonthRev += zc.activeOnSustain * config.sustain.price;
      for (const ao of config.addOns) {
        zcMonthRev += zcTotal * getAttachRate(age, ao) * ao.price;
      }
      // Sustain transitions but NO churn
      if (age >= config.sustain.transitionDelay) {
        const trans = Math.round(zc.activeOnProgram * config.sustain.transitionRate);
        zc.activeOnProgram = Math.max(0, zc.activeOnProgram - trans);
        zc.activeOnSustain += trans;
      }
    }
    zcTotalRev += zcMonthRev;

    totalRev += monthRev;
    totalGP += monthRev - monthCOGS;

    // Accumulate source totals
    cumBaseRev += monthBase;
    cumAddOnRev += monthAddOn;
    cumSustainRev += monthSustain;
    for (const ao of config.addOns) {
      cumAddOnByName[ao.name] += monthAddOnByName[ao.name];
    }

    // Monthly accumulation entry
    const surviving = subs.reduce((s, c) => s + c.activeOnProgram + c.activeOnSustain, 0);
    monthlyAccum.push({
      age: age + 1,
      cumulativeLTV: totalRev / cohortSize,
      cumulativeBase: cumBaseRev / cohortSize,
      cumulativeAddOn: cumAddOnRev / cohortSize,
      cumulativeSustain: cumSustainRev / cohortSize,
      survivalRate: surviving / cohortSize,
    });

    cumGPPerCust += (monthRev - monthCOGS) / cohortSize;
    if (!paybackFound && cumGPPerCust >= config.blendedCAC) {
      paybackMonths = age + 1;
      paybackFound = true;
    }

    if (monthActive > 0) {
      arpuByAge.push({
        age: age + 1,
        arpu: monthRev / monthActive,
        baseArpu: monthBase / monthActive,
        addOnArpu: monthAddOn / monthActive,
        sustainArpu: monthSustain / monthActive,
      });
    }

    const ageAttach: Record<string, number> = { age: age + 1 };
    for (const ao of config.addOns) {
      ageAttach[ao.name] = getAttachRate(age, ao) * 100;
    }
    attachByAge.push(ageAttach);
  }

  // Per-program LTV
  const byProgram: Record<string, { revenue: number; grossProfit: number }> = {};
  for (const sub of subs) {
    const init = Math.round(cohortSize * sub.program.mixPct);
    byProgram[sub.program.name] = {
      revenue: init > 0 ? sub.totalRev / init : 0,
      grossProfit: init > 0 ? sub.totalGP / init : 0,
    };
  }

  const finalActive = subs.reduce((s, c) => s + c.activeOnProgram + c.activeOnSustain, 0);
  const finalSustain = subs.reduce((s, c) => s + c.activeOnSustain, 0);

  const actualLTV = totalRev / cohortSize;
  const grossPotentialLTV = zcTotalRev / cohortSize;

  const addOnBreakdown: Record<string, number> = {};
  for (const ao of config.addOns) {
    addOnBreakdown[ao.name] = cumAddOnByName[ao.name] / cohortSize;
  }

  return {
    blended: { revenue: actualLTV, grossProfit: totalGP / cohortSize },
    byProgram,
    paybackMonths,
    finalRetention: finalActive / cohortSize,
    sustainPct: finalActive > 0 ? finalSustain / finalActive : 0,
    arpuByAge,
    attachByAge,
    peakARPU: arpuByAge.length > 0 ? Math.max(...arpuByAge.map(a => a.arpu)) : 0,
    ltvBuildup: {
      baseProgramLTV: cumBaseRev / cohortSize,
      addOnLTV: cumAddOnRev / cohortSize,
      sustainLTV: cumSustainRev / cohortSize,
      addOnBreakdown,
      grossPotentialLTV,
      churnImpactLTV: grossPotentialLTV - actualLTV,
      monthlyAccumulation: monthlyAccum,
    } as CurrentLTVBuildup,
  };
}

// ─── Current Full Simulation ─────────────────────────────────────────────

interface CohortTracker {
  entryMonth: number;
  program: ProgramConfig;
  activeOnProgram: number;
  activeOnSustain: number;
  initialSize: number;
}

export function runCurrentSimulation(config: CurrentModelConfig): CurrentSimulationResult {
  const months: CurrentMonthData[] = [];
  const cohorts: CohortTracker[] = [];
  let cumRevenue = 0, cumCOGS = 0, cumMarketing = 0, cumProfit = 0;
  let totalAcquired = 0;

  for (let m = 0; m < config.horizon; m++) {
    // Acquisition ramp
    let acq: number;
    if (config.rampMonths <= 1) {
      acq = config.monthlyAcqEnd;
    } else if (m < config.rampMonths) {
      acq = Math.round(
        config.monthlyAcqStart +
        (config.monthlyAcqEnd - config.monthlyAcqStart) * (m / (config.rampMonths - 1))
      );
    } else {
      acq = config.monthlyAcqEnd;
    }
    totalAcquired += acq;

    // Create new cohorts for this month
    for (const prog of config.programs) {
      const size = Math.round(acq * prog.mixPct);
      if (size > 0) {
        cohorts.push({ entryMonth: m, program: prog, activeOnProgram: size, activeOnSustain: 0, initialSize: size });
      }
    }

    // Process all cohorts
    let monthRev = 0, monthCOGS = 0, monthActive = 0;
    let monthOnProgram = 0, monthOnSustain = 0;
    let monthProgramRev = 0, monthAddOnRev = 0, monthSustainRev = 0;
    const addOnDetails: Record<string, { customers: number; revenue: number }> = {};
    const progDetails: Record<string, { active: number; onSustain: number; churned: number }> = {};

    for (const ao of config.addOns) addOnDetails[ao.name] = { customers: 0, revenue: 0 };
    for (const p of config.programs) progDetails[p.name] = { active: 0, onSustain: 0, churned: 0 };

    for (const cohort of cohorts) {
      const age = m - cohort.entryMonth;
      const totalCohort = cohort.activeOnProgram + cohort.activeOnSustain;
      if (totalCohort <= 0) continue;

      // Revenue calculation
      const baseRev = cohort.activeOnProgram * cohort.program.price;
      const susRev = cohort.activeOnSustain * config.sustain.price;

      let aoRev = 0, aoCogs = 0;
      for (const ao of config.addOns) {
        const rate = getAttachRate(age, ao);
        const cust = totalCohort * rate;
        aoRev += cust * ao.price;
        aoCogs += cust * ao.cogs;
        addOnDetails[ao.name].customers += cust;
        addOnDetails[ao.name].revenue += cust * ao.price;
      }

      const baseCogs = cohort.activeOnProgram * cohort.program.cogs;
      const susCogs = cohort.activeOnSustain * config.sustain.cogs;

      monthRev += baseRev + susRev + aoRev;
      monthCOGS += baseCogs + susCogs + aoCogs;
      monthProgramRev += baseRev;
      monthSustainRev += susRev;
      monthAddOnRev += aoRev;

      // Sustain transitions
      let transitioned = 0;
      if (age >= config.sustain.transitionDelay) {
        transitioned = Math.round(cohort.activeOnProgram * config.sustain.transitionRate);
        cohort.activeOnProgram = Math.max(0, cohort.activeOnProgram - transitioned);
        cohort.activeOnSustain += transitioned;
      }

      // Churn
      const cr = getChurnRate(age, cohort.program);
      const pChurned = Math.round(cohort.activeOnProgram * cr);
      const sChurned = Math.round(cohort.activeOnSustain * config.sustain.churnRate);
      cohort.activeOnProgram = Math.max(0, cohort.activeOnProgram - pChurned);
      cohort.activeOnSustain = Math.max(0, cohort.activeOnSustain - sChurned);

      const nowActive = cohort.activeOnProgram + cohort.activeOnSustain;
      monthActive += nowActive;
      monthOnProgram += cohort.activeOnProgram;
      monthOnSustain += cohort.activeOnSustain;

      const pd = progDetails[cohort.program.name];
      pd.active += cohort.activeOnProgram;
      pd.onSustain += cohort.activeOnSustain;
      pd.churned += pChurned + sChurned;
    }

    const currentCAC = config.blendedCAC * Math.pow(1 + config.cacInflationPct / 100, m / 12);
    const marketing = Math.round(acq * currentCAC);
    const gp = monthRev - monthCOGS;
    const contribution = gp - marketing;

    cumRevenue += monthRev;
    cumCOGS += monthCOGS;
    cumMarketing += marketing;
    cumProfit += contribution;

    months.push({
      month: m + 1,
      newCustomers: acq,
      totalActive: monthActive,
      totalOnProgram: monthOnProgram,
      totalOnSustain: monthOnSustain,
      totalRevenue: monthRev,
      totalCOGS: monthCOGS,
      totalGP: gp,
      marketing,
      contribution,
      gmPct: monthRev > 0 ? (gp / monthRev) * 100 : 0,
      cmPct: monthRev > 0 ? (contribution / monthRev) * 100 : 0,
      cumRevenue,
      cumCOGS,
      cumMarketing,
      cumProfit,
      blendedARPU: monthActive > 0 ? monthRev / monthActive : 0,
      programRevenue: monthProgramRev,
      addOnRevenue: monthAddOnRev,
      sustainRevenue: monthSustainRev,
      addOnDetails,
      programDetails: progDetails,
    });
  }

  // Cohort analysis
  const cohort = computeCurrentCohortLTV(config);
  const avgGM = cumRevenue > 0 ? ((cumRevenue - cumCOGS) / cumRevenue) * 100 : 0;
  const last = months[months.length - 1];
  const finalActive = last ? last.totalActive : 0;

  return {
    months,
    cohortLTV: cohort.blended,
    programCohortLTV: cohort.byProgram,
    ltvBuildup: cohort.ltvBuildup,
    arpuByAge: cohort.arpuByAge,
    attachByAge: cohort.attachByAge,
    summary: {
      totalRevenue: cumRevenue,
      totalCOGS: cumCOGS,
      totalGP: cumRevenue - cumCOGS,
      totalMarketing: cumMarketing,
      totalProfit: cumProfit,
      avgGM,
      avgCM: cumRevenue > 0 ? (cumProfit / cumRevenue) * 100 : 0,
      npmPct: cumRevenue > 0 ? (cumProfit / cumRevenue) * 100 : 0,
      blendedCAC: config.blendedCAC,
      ltvCacRatio: config.blendedCAC > 0 ? cohort.blended.grossProfit / config.blendedCAC : 0,
      paybackMonths: cohort.paybackMonths,
      totalAcquired: totalAcquired,
      finalActive,
      retentionRate: totalAcquired > 0 ? (finalActive / totalAcquired) * 100 : 0,
      peakARPU: cohort.peakARPU,
      sustainPct: last ? (last.totalOnSustain / Math.max(1, last.totalActive)) * 100 : 0,
    },
  };
}

// ─── Current Model Sensitivity ──────────────────────────────────────────

export function runCurrentSensitivity(config: CurrentModelConfig): SensitivityItem[] {
  const baseCohort = computeCurrentCohortLTV(config);
  const baseLTV = baseCohort.blended.grossProfit;

  // Weighted average churn for labels
  const wAvgEarly = config.programs.reduce((s, p) => s + p.earlyChurn * p.mixPct, 0);
  const wAvgLate = config.programs.reduce((s, p) => s + p.lateChurn * p.mixPct, 0);

  const variations: Array<{
    name: string;
    apply: (c: CurrentModelConfig, f: number) => void;
    lowF: number; highF: number;
    lowLabel: string; highLabel: string;
  }> = [
    {
      name: 'Early Churn (Mo 1–3)',
      apply: (c, f) => c.programs.forEach(p => { p.earlyChurn *= f; }),
      lowF: 0.5, highF: 1.5,
      lowLabel: `~${(wAvgEarly * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `~${(wAvgEarly * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'Late Churn (Mo 7+)',
      apply: (c, f) => c.programs.forEach(p => { p.lateChurn *= f; }),
      lowF: 0.5, highF: 1.5,
      lowLabel: `~${(wAvgLate * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `~${(wAvgLate * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'Add-on Attach Rates',
      apply: (c, f) => c.addOns.forEach(a => { a.maxAttachRate = Math.min(1, a.maxAttachRate * f); }),
      lowF: 0.5, highF: 2.0,
      lowLabel: '50% of base',
      highLabel: '2× base',
    },
    {
      name: 'Sustain Transition Rate',
      apply: (c, f) => { c.sustain.transitionRate = Math.min(1, c.sustain.transitionRate * f); },
      lowF: 0.5, highF: 1.5,
      lowLabel: `${(config.sustain.transitionRate * 0.5 * 100).toFixed(1)}%/mo`,
      highLabel: `${(config.sustain.transitionRate * 1.5 * 100).toFixed(1)}%/mo`,
    },
    {
      name: 'Sustain Price',
      apply: (c, f) => { c.sustain.price = Math.round(c.sustain.price * f); },
      lowF: 0.75, highF: 1.25,
      lowLabel: `$${Math.round(config.sustain.price * 0.75)}`,
      highLabel: `$${Math.round(config.sustain.price * 1.25)}`,
    },
    {
      name: 'Program Prices',
      apply: (c, f) => c.programs.forEach(p => { p.price = Math.round(p.price * f); }),
      lowF: 0.85, highF: 1.15,
      lowLabel: '-15%',
      highLabel: '+15%',
    },
    {
      name: 'All COGS',
      apply: (c, f) => {
        c.programs.forEach(p => { p.cogs = Math.round(p.cogs * f); });
        c.sustain.cogs = Math.round(c.sustain.cogs * f);
        c.addOns.forEach(a => { a.cogs = Math.round(a.cogs * f); });
      },
      lowF: 0.85, highF: 1.15,
      lowLabel: '-15%',
      highLabel: '+15%',
    },
    {
      name: 'Blended CAC',
      apply: (c, f) => { c.blendedCAC = Math.round(c.blendedCAC * f); },
      lowF: 0.8, highF: 1.2,
      lowLabel: `$${Math.round(config.blendedCAC * 0.8)}`,
      highLabel: `$${Math.round(config.blendedCAC * 1.2)}`,
    },
  ];

  return variations.map(v => {
    const lowConfig = cloneCurrentConfig(config);
    v.apply(lowConfig, v.lowF);
    const highConfig = cloneCurrentConfig(config);
    v.apply(highConfig, v.highF);
    const lowCohort = computeCurrentCohortLTV(lowConfig);
    const highCohort = computeCurrentCohortLTV(highConfig);
    return {
      parameter: v.name, lowLabel: v.lowLabel, highLabel: v.highLabel, baseLTV,
      lowLTV: lowCohort.blended.grossProfit,
      highLTV: highCohort.blended.grossProfit,
      delta: Math.abs(highCohort.blended.grossProfit - lowCohort.blended.grossProfit),
    };
  }).sort((a, b) => b.delta - a.delta);
}
