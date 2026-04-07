'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Footprints,
  Moon,
  Dumbbell,
  Utensils,
  Zap,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Coffee,
  Sun,
  Sunset,
  TrendingDown,
  Activity,
  Heart,
  ExternalLink,
  Shield,
  AlertTriangle,
  ArrowRight,
  FlameKindling,
  Wheat,
  ArrowDown,
  Info,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data — Variability Engine                                     */
/* ------------------------------------------------------------------ */

const OATMEAL = {
  avgSpike: 34,
  p25: 16,
  median: 32,
  p75: 52,
  sampleSize: 18_742,
  durationMin: 38,
  pctSpiking: 60,
  gi: 55,
};

const VARIABILITY_TABLE = [
  { context: 'Baseline (no modifiers)', spike: 34, pctSpiking: 60, change: null as string | null, color: 'gray' },
  { context: 'Slept < 6 hours', spike: 42, pctSpiking: 78, change: '+24%', color: 'red' },
  { context: 'Slept 7+ hours', spike: 30, pctSpiking: 48, change: '−12%', color: 'emerald' },
  { context: 'Post-meal walk (10–15 min)', spike: 26, pctSpiking: 42, change: '−24%', color: 'emerald' },
  { context: 'Ate protein first (eggs, yogurt)', spike: 22, pctSpiking: 35, change: '−35%', color: 'emerald' },
  { context: 'Added nut butter', spike: 24, pctSpiking: 38, change: '−29%', color: 'emerald' },
  { context: 'Exercised that morning', spike: 25, pctSpiking: 40, change: '−26%', color: 'emerald' },
  { context: 'Ate on empty stomach', spike: 40, pctSpiking: 72, change: '+18%', color: 'red' },
];

const OAT_TYPES = [
  { name: 'Instant Oats', spike: 44, pct: 74, color: 'red' },
  { name: 'Rolled Oats', spike: 34, pct: 60, color: 'amber' },
  { name: 'Steel-Cut Oats', spike: 26, pct: 41, color: 'emerald' },
  { name: 'Overnight Oats', spike: 28, pct: 44, color: 'emerald' },
];

const TIME_OF_DAY = [
  { label: 'Early Morning', sub: '6–8 am', spike: 38, icon: Coffee },
  { label: 'Mid-Morning', sub: '9–11 am', spike: 32, icon: Sun },
  { label: 'Afternoon', sub: '12–2 pm', spike: 28, icon: Sunset },
];

const STRATEGIES = {
  before: [
    { title: 'Eat 2 eggs or Greek yogurt first', reduction: 35, spike: 22, n: 3_200, detail: 'Protein before carbs slows gastric emptying and blunts the glucose spike. In Signos data, members who ate eggs or Greek yogurt 10–15 minutes before oatmeal saw a 35% lower spike than those who ate oatmeal alone.' },
    { title: 'Handful of walnuts or almonds', reduction: 29, spike: 24, n: 1_400, detail: 'The fat and fiber in nuts create a physical buffer in the gut. Even a small handful (1 oz) meaningfully slows carbohydrate absorption from the oatmeal that follows.' },
  ],
  during: [
    { title: 'Add 2 tbsp nut butter', reduction: 29, spike: 24, n: 4_600, detail: 'Stirring in almond or peanut butter adds fat and protein directly to the oatmeal. This is the easiest single modification in our data — it barely changes the taste but significantly blunts the glucose curve.' },
    { title: 'Use steel-cut oats instead of instant', reduction: 41, spike: 26, n: 2_800, detail: 'Steel-cut oats have a lower surface area and take longer to digest, resulting in slower glucose absorption. The difference is dramatic: instant oats spike 69% more than steel-cut in our data.' },
    { title: 'Add cinnamon (1 tsp)', reduction: 12, spike: 30, n: 1_100, detail: 'Cinnamon may improve insulin sensitivity. Members who added cinnamon to their oatmeal saw a modest but consistent 12% reduction in glucose spike, though this is the smallest effect in our data.' },
    { title: 'Top with berries instead of banana', reduction: 18, spike: 28, n: 1_800, detail: 'Bananas add a concentrated sugar load. Berries (blueberries, strawberries, raspberries) have higher fiber-to-sugar ratios and lower glycemic impact. The swap costs nothing in taste and saves 18% on spike.' },
  ],
  after: [
    { title: '10–15 minute walk within 30 min', reduction: 24, spike: 26, n: 5_200, detail: 'Post-meal walking is consistently one of the top glucose-lowering strategies in our dataset. It activates skeletal muscle glucose uptake (via GLUT4 transporters) and reduces spike duration from 38 minutes to 22 minutes.', note: 'Spike duration: 22 min vs. 38 min baseline' },
  ],
};

const SWAP = {
  original: { name: 'Instant Oats + Banana', spike: 48 },
  swap: { name: 'Steel-Cut + Berries + Nut Butter', spike: 18 },
  reduction: 63,
  n: 1_600,
};

const LIFESTYLE = [
  { label: 'Slept < 6 hours', spike: 42, icon: Moon, color: 'red' as const },
  { label: 'Slept 7+ hours', spike: 30, icon: Moon, color: 'emerald' as const },
  { label: 'No exercise that day', spike: 37, icon: Dumbbell, color: 'red' as const },
  { label: 'Exercised that morning', spike: 25, icon: Dumbbell, color: 'emerald' as const },
];

const FAQS = [
  {
    q: 'Is oatmeal good for blood sugar?',
    a: 'It depends on how you prepare and eat it. Oatmeal has a moderate glycemic index (55), but Signos CGM data from 18,742 meals shows 60% of users experience a spike above 30 mg/dL. Steel-cut oats with protein and fat added spike 63% less than plain instant oats with banana.',
  },
  {
    q: 'Why does oatmeal spike my blood sugar even though it\'s "healthy"?',
    a: 'Oatmeal is a concentrated carbohydrate source (27g per cup). The glycemic index is measured in laboratory conditions on fasting subjects — not in your real life. In Signos data, factors like sleep (<6h sleep → +24% spike), preparation method (instant vs. steel-cut → +69% difference), and eating context (empty stomach → +18% spike) dramatically change the outcome.',
  },
  {
    q: 'What is the best type of oatmeal for blood sugar?',
    a: 'Steel-cut oats consistently produce the lowest glucose spike in our data: +26 mg/dL average vs. +44 mg/dL for instant oats — a 41% reduction. Overnight oats are a close second at +28 mg/dL. The key difference is processing: less processing means slower digestion and a gentler glucose curve.',
  },
  {
    q: 'Does walking after oatmeal help with blood sugar?',
    a: 'Yes. Signos members who took a 10–15 minute walk within 30 minutes of eating oatmeal had a 24% lower spike and nearly halved the spike duration (22 min vs. 38 min). This is one of the most effective and easiest strategies in our data.',
  },
  {
    q: 'Does sleep affect how oatmeal impacts blood sugar?',
    a: 'Significantly. The same bowl of oatmeal causes a +42 mg/dL spike after less than 6 hours of sleep, compared to +30 mg/dL after 7+ hours — a 40% difference. Sleep is one of the strongest predictors of glucose response in our entire dataset, not just for oatmeal.',
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */

function ScoreMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct <= 33 ? 'bg-emerald-500' : pct <= 66 ? 'bg-amber-400' : 'bg-red-500';
  const label = pct <= 33 ? 'Low Impact' : pct <= 66 ? 'Moderate' : 'High Impact';
  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-5xl font-extrabold tracking-tight text-gray-900">{score}</span>
          <span className="text-lg font-semibold text-gray-400 ml-1">/100</span>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
          pct <= 33 ? 'bg-emerald-100 text-emerald-700' : pct <= 66 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}>{label}</span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
        <span>Minimal spike</span>
        <span>Moderate</span>
        <span>Large spike</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4.5 w-4.5 text-amber-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SpikeBar({ spike, maxSpike = 55, color = 'amber' }: { spike: number; maxSpike?: number; color?: string }) {
  const pct = Math.min(100, (spike / maxSpike) * 100);
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    emerald: 'bg-emerald-500',
    gray: 'bg-gray-300',
  };
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color] || colorMap.amber} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-16 text-right">+{spike} <span className="text-gray-400 font-normal text-xs">mg/dL</span></span>
    </div>
  );
}

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-12 md:py-16 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">{children}</div>
    </section>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{children}</h2>
      {sub && <p className="text-gray-500 mt-2 text-base leading-relaxed">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OatmealVariabilityPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAllVariables, setShowAllVariables] = useState(false);

  const visibleVars = showAllVariables ? VARIABILITY_TABLE : VARIABILITY_TABLE.slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* ---- Header ---- */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:inline">Signos <span className="text-amber-600">Food Intelligence</span></span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Powered by 4.2 M CGM readings</span>
        </div>
      </header>

      {/* ---- Breadcrumb ---- */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <a href="/glucose-guide" className="hover:text-amber-600 transition-colors">Food Intelligence</a>
            <ChevronRight className="h-3 w-3" />
            <a href="#" className="hover:text-amber-600 transition-colors">Breakfast</a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600">Oatmeal</span>
          </nav>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ANSWER-FIRST BLOCK — optimized for AI Overview extraction    */}
      {/* ============================================================ */}
      <Section className="bg-white pt-10 md:pt-14 pb-0 md:pb-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Contrarian Finding
          </span>
          <span className="text-amber-600 font-bold text-xs tracking-wide uppercase">Real-World Label</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-[42px] font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
          Why Oatmeal Spikes Blood Sugar for 60% of People <span className="text-amber-500">(Real CGM Data)</span>
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed">
          Oatmeal has a moderate glycemic index of <strong className="text-gray-900">55</strong>, earning its &ldquo;heart-healthy&rdquo; label.
          But in Signos data from <strong className="text-gray-900">18,742 meals</strong>, <strong className="text-gray-900">60% of users</strong> experienced
          a glucose spike above 30 mg/dL. The average spike was <strong className="text-gray-900">+34 mg/dL</strong> — and the outcome
          varied dramatically based on sleep, exercise, and preparation method.
          After <strong className="text-gray-900">less than 6 hours of sleep</strong>, the spike jumped 24%.
          But eating <strong className="text-gray-900">protein first</strong> cut it by 35%.
          And <strong className="text-gray-900">steel-cut oats</strong> spiked 41% less than instant.
          The label says &ldquo;heart healthy.&rdquo; Your glucose might disagree — depending on how you eat it.
        </p>

        <div className="flex items-center gap-4 mt-6 text-xs text-gray-400">
          <span>Published Mar 31, 2026</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>Reviewed by Sarah Chen, RD, CDE</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>n = 18,742</span>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  THE GAP — GI vs. Reality                                    */}
      {/* ============================================================ */}
      <Section>
        <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-2xl border border-red-200 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">The Gap: What the Label Says vs. What Actually Happens</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Glycemic Index (Label)</p>
              <p className="text-4xl font-extrabold text-gray-900">{OATMEAL.gi}</p>
              <p className="text-xs text-gray-500 mt-1">&ldquo;Moderate&rdquo; — based on 10 people, lab conditions</p>
            </div>
            <div className="bg-white rounded-xl border-2 border-amber-300 p-5 text-center">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Signos Real-World Data</p>
              <p className="text-4xl font-extrabold text-amber-600">+{OATMEAL.avgSpike} <span className="text-base font-semibold text-gray-400">mg/dL</span></p>
              <p className="text-xs text-gray-500 mt-1">{OATMEAL.pctSpiking}% of users spike &gt; 30 mg/dL &middot; n={OATMEAL.sampleSize.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white/70 rounded-lg p-4 border border-red-100">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong className="text-red-700">Why the gap?</strong> The Glycemic Index is tested on ~10 fasting subjects, eating the food in isolation, under lab conditions.
              Your oatmeal is eaten in the context of your sleep quality, stress level, time of day, and what else you put in the bowl.
              That context changes everything — and that&apos;s what the Signos Variability Engine reveals.
            </p>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  REAL-WORLD LABEL / GLUCOSE SCORE                            */}
      {/* ============================================================ */}
      <Section className="bg-gray-50">
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">Signos Real-World Label</h2>
          </div>
          <p className="text-xs text-gray-400 mb-6">Oatmeal (1 cup cooked) &middot; Glycemic Stability Score</p>

          <ScoreMeter score={58} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <StatCard icon={TrendingDown} label="Avg. Glucose Spike" value={`+${OATMEAL.avgSpike} mg/dL`} sub={`${OATMEAL.pctSpiking}% of users > 30 mg/dL`} />
            <StatCard icon={Clock} label="Spike Duration" value={`${OATMEAL.durationMin} min`} sub="Time above baseline" />
            <StatCard icon={Users} label="Sample Size" value={OATMEAL.sampleSize.toLocaleString()} sub="Real CGM readings" />
          </div>

          {/* Distribution */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Spike distribution across all members</h3>
            <div className="space-y-3">
              {[
                { label: '0–15 mg/dL', pct: 14, color: 'bg-emerald-400' },
                { label: '16–25 mg/dL', pct: 18, color: 'bg-emerald-400' },
                { label: '26–35 mg/dL', pct: 28, color: 'bg-amber-400' },
                { label: '36–50 mg/dL', pct: 26, color: 'bg-amber-500' },
                { label: '51+ mg/dL', pct: 14, color: 'bg-red-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 text-right font-medium">{row.label}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct * 2.5}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 w-10 text-right">{row.pct}%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">25th: +{OATMEAL.p25} mg/dL &middot; Median: +{OATMEAL.median} mg/dL &middot; 75th: +{OATMEAL.p75} mg/dL</p>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  VARIABILITY ENGINE — the core differentiator                 */}
      {/* ============================================================ */}
      <Section id="variability">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">The Variability Engine</h2>
            <p className="text-xs text-violet-600 font-bold uppercase tracking-wide">What Changes the Outcome</p>
          </div>
        </div>
        <p className="text-gray-500 mt-2 mb-8 text-base leading-relaxed">
          The same bowl of oatmeal produces dramatically different glucose responses depending on context.
          This is why the glycemic index — a single number — fails to predict what happens in your body.
        </p>

        {/* Variability table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] gap-0 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 px-5 py-3 bg-gray-50">
            <span>Context</span>
            <span className="text-right">Avg Spike</span>
            <span className="text-right">% Spiking</span>
            <span className="text-right">Change</span>
          </div>
          {visibleVars.map((row, i) => (
            <div
              key={row.context}
              className={`grid grid-cols-[1fr_80px_80px_80px] sm:grid-cols-[1fr_100px_100px_100px] gap-0 px-5 py-3.5 items-center ${
                i !== visibleVars.length - 1 ? 'border-b border-gray-50' : ''
              } ${row.context === 'Baseline (no modifiers)' ? 'bg-gray-50' : ''}`}
            >
              <span className="text-sm font-medium text-gray-800">{row.context}</span>
              <span className="text-sm font-bold text-gray-900 text-right">+{row.spike}</span>
              <span className="text-sm text-gray-600 text-right">{row.pctSpiking}%</span>
              <span className={`text-sm font-bold text-right ${
                !row.change ? 'text-gray-400' :
                row.color === 'red' ? 'text-red-500' : 'text-emerald-600'
              }`}>
                {row.change || '—'}
              </span>
            </div>
          ))}
          {VARIABILITY_TABLE.length > 5 && (
            <button
              onClick={() => setShowAllVariables(!showAllVariables)}
              className="w-full px-5 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
            >
              {showAllVariables ? 'Show less' : `Show all ${VARIABILITY_TABLE.length} variables`}
              {showAllVariables ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        <div className="bg-violet-50 rounded-xl border border-violet-200 p-4 mt-6 flex items-start gap-3">
          <Info className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-violet-800 leading-relaxed">
            <strong>This is the data AI can&apos;t fake.</strong> Multi-variable glucose response data — how the same food behaves
            under different sleep, exercise, and eating conditions — doesn&apos;t exist anywhere else on the internet.
            Every table row is a unique data point derived from real Signos CGM readings.
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  PREPARATION METHOD — Oat Type Comparison                    */}
      {/* ============================================================ */}
      <Section id="oat-types" className="bg-gray-50">
        <SectionTitle sub="Not all oats are created equal. Processing level is one of the strongest predictors of glucose response.">
          Oat Type Matters More Than You Think
        </SectionTitle>

        <div className="space-y-4">
          {OAT_TYPES.map(oat => (
            <div key={oat.name} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    oat.color === 'red' ? 'bg-red-50' : oat.color === 'amber' ? 'bg-amber-50' : 'bg-emerald-50'
                  }`}>
                    <Wheat className={`h-4 w-4 ${
                      oat.color === 'red' ? 'text-red-500' : oat.color === 'amber' ? 'text-amber-500' : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{oat.name}</p>
                    <p className="text-xs text-gray-400">{oat.pct}% of members spike &gt; 30 mg/dL</p>
                  </div>
                </div>
                <span className={`text-xl font-extrabold ${
                  oat.color === 'red' ? 'text-red-500' : oat.color === 'amber' ? 'text-amber-500' : 'text-emerald-600'
                }`}>+{oat.spike}</span>
              </div>
              <SpikeBar spike={oat.spike} color={oat.color} />
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center leading-relaxed">
          Instant oats spike <strong className="text-gray-700">69% more</strong> than steel-cut oats.
          The processing breaks down the fiber structure, turning a slow-release carbohydrate into a fast one.
        </p>
      </Section>

      {/* ============================================================ */}
      {/*  HOW TO EAT IT SMARTER — Before / During / After             */}
      {/* ============================================================ */}
      <Section id="strategies">
        <SectionTitle sub="You don't have to give up oatmeal. These data-backed strategies let you enjoy it while keeping your glucose stable.">
          How to Eat Oatmeal Without the Spike
        </SectionTitle>

        {/* BEFORE */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center">
              <Footprints className="h-3.5 w-3.5 text-sky-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Before You Eat</h3>
          </div>
          <div className="space-y-3">
            {STRATEGIES.before.map(s => (
              <div key={s.title} className="bg-sky-50/50 border border-sky-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.detail}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-extrabold text-sky-600">&minus;{s.reduction}%</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">+{s.spike} mg/dL &middot; n={s.n.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DURING */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center">
              <Utensils className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">While You Eat</h3>
          </div>
          <div className="space-y-3">
            {STRATEGIES.during.map(s => (
              <div key={s.title} className="bg-violet-50/50 border border-violet-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.detail}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-extrabold text-violet-600">&minus;{s.reduction}%</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">+{s.spike} mg/dL &middot; n={s.n.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AFTER */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <Footprints className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">After You Eat</h3>
          </div>
          <div className="space-y-3">
            {STRATEGIES.after.map(s => (
              <div key={s.title} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s.detail}</p>
                    {s.note && <p className="text-xs font-medium text-emerald-700 mt-2 bg-emerald-100/60 inline-block px-2 py-0.5 rounded-full">{s.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-extrabold text-emerald-600">&minus;{s.reduction}%</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">+{s.spike} mg/dL &middot; n={s.n.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  THE ONE SWAP                                                */}
      {/* ============================================================ */}
      <Section id="swap" className="bg-gray-50">
        <SectionTitle sub={`The single biggest upgrade in our data. Based on ${SWAP.n.toLocaleString()} direct comparisons.`}>
          The Swap That Changes Everything
        </SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border-2 border-red-200 p-6 text-center">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Typical Order</p>
            <p className="text-lg font-extrabold text-gray-900">{SWAP.original.name}</p>
            <p className="text-4xl font-extrabold text-red-500 mt-3">+{SWAP.original.spike} <span className="text-base font-semibold text-gray-400">mg/dL</span></p>
          </div>
          <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              &minus;{SWAP.reduction}% spike
            </div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Smarter Swap</p>
            <p className="text-lg font-extrabold text-gray-900">{SWAP.swap.name}</p>
            <p className="text-4xl font-extrabold text-emerald-500 mt-3">+{SWAP.swap.spike} <span className="text-base font-semibold text-gray-400">mg/dL</span></p>
          </div>
        </div>

        <div className="flex items-center justify-center mt-6">
          <ArrowDown className="h-5 w-5 text-gray-300" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-2 text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            Same breakfast. Same satisfaction. <strong className="text-gray-800">63% lower glucose spike.</strong>{' '}
            Steel-cut oats digest slower, the berries have less sugar than banana, and the nut butter adds fat to blunt the curve.
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TIME OF DAY                                                  */}
      {/* ============================================================ */}
      <Section>
        <SectionTitle sub="Insulin sensitivity changes throughout the day. The same oatmeal eaten at different times produces different spikes.">
          When You Eat It Matters
        </SectionTitle>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="space-y-4">
            {TIME_OF_DAY.map(t => (
              <div key={t.label} className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <t.icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-800">{t.label}</span>
                    <span className="text-xs text-gray-400">{t.sub}</span>
                  </div>
                  <SpikeBar spike={t.spike} color={t.spike > 35 ? 'amber' : 'emerald'} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">Early-morning oatmeal spikes 36% more than afternoon oatmeal. Consider timing your oats later if glucose stability is a priority.</p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SLEEP + EXERCISE — Lifestyle layer                          */}
      {/* ============================================================ */}
      <Section id="lifestyle" className="bg-gray-50">
        <SectionTitle sub="The same bowl of oatmeal causes wildly different glucose responses depending on your sleep and exercise that day.">
          It&apos;s Not Just What You Eat — It&apos;s How You Lived
        </SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LIFESTYLE.map(item => (
            <div key={item.label} className={`bg-white rounded-2xl border p-5 ${
              item.color === 'emerald' ? 'border-emerald-200' : 'border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  item.color === 'emerald' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  <item.icon className={`h-4 w-4 ${item.color === 'emerald' ? 'text-emerald-600' : 'text-red-500'}`} />
                </div>
                <span className="text-sm font-semibold text-gray-800">{item.label}</span>
              </div>
              <SpikeBar spike={item.spike} color={item.color} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-6 mt-6 text-center">
          <p className="text-sm font-bold text-amber-700 mb-1">The Best-Case Scenario</p>
          <p className="text-3xl font-extrabold text-gray-900">+18 <span className="text-base font-semibold text-gray-400">mg/dL</span></p>
          <p className="text-xs text-gray-500 mt-2">7+ hours of sleep + morning exercise + steel-cut oats + protein first + nut butter + post-meal walk</p>
          <p className="text-xs font-medium text-emerald-600 mt-1">That&apos;s 57% lower than the worst case (+42 mg/dL after bad sleep with instant oats).</p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FAQ — Long-tail + AI Overview capture                       */}
      {/* ============================================================ */}
      <Section id="faq">
        <SectionTitle>Frequently Asked Questions</SectionTitle>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              >
                <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  METHODOLOGY / TRUST — E-E-A-T                               */}
      {/* ============================================================ */}
      <Section className="bg-gray-50">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">About This Data</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              This analysis is based on <strong className="text-gray-800">18,742 anonymized glucose readings</strong> from Signos members
              who logged oatmeal as a meal between January 2024 and March 2026. Glucose response was measured using
              continuous glucose monitors (CGMs) worn by members during their normal daily activities.
            </p>
            <p>
              Sleep and exercise data were cross-referenced from member activity logs. &ldquo;Spike&rdquo; is defined as the peak glucose
              value minus the pre-meal baseline within 2 hours of eating. The Variability Engine analyzes these modifiers
              across the full population to surface statistically significant patterns.
            </p>
            <p>
              All data is aggregated and anonymized. No individual member&apos;s data is identifiable. Statistics represent population
              averages and may not reflect your personal glucose response. Correlation does not imply causation.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-amber-700">SC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Reviewed by Sarah Chen, MS, RD, CDE</p>
              <p className="text-xs text-gray-500">Registered Dietitian &amp; Certified Diabetes Educator &middot; Signos Clinical Team</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  INTERNAL LINKING — Content Graph                             */}
      {/* ============================================================ */}
      <Section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Explore More Food Intelligence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Chipotle Burrito Bowl', sub: 'Restaurant Glucose Review', spike: 38, href: '/glucose-guide' },
            { title: 'Walking After Meals', sub: 'Does it actually work? (2M data points)', spike: null, href: '#' },
            { title: 'Banana', sub: 'The "healthy" snack that spikes 52% of people', spike: 31, href: '#' },
            { title: 'Sleep & Blood Sugar', sub: 'Why bad sleep makes every meal worse', spike: null, href: '#' },
          ].map(link => (
            <a
              key={link.title}
              href={link.href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all group flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">{link.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{link.sub}</p>
              </div>
              {link.spike && (
                <span className="text-sm font-bold text-amber-500">+{link.spike}</span>
              )}
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <Section>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <Heart className="h-8 w-8 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">This Is the Average. What&apos;s YOUR Response?</h2>
          <p className="text-amber-100 max-w-lg mx-auto leading-relaxed mb-6">
            60% of people spike from oatmeal — but 40% don&apos;t. Are you one of them? With a Signos CGM, you&apos;ll see
            exactly how your body responds to oatmeal, and every other food, in real time.
          </p>
          <a
            href="https://www.signos.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors"
          >
            Try Signos <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            This content is for informational purposes only and is not medical advice. Consult a healthcare provider
            before making dietary changes. Data is based on anonymized, aggregated readings from Signos members and
            may not reflect your individual glucose response. All figures use mock data for demonstration purposes.
          </p>
          <p className="text-xs text-gray-300 mt-3">&copy; {new Date().getFullYear()} Signos. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
