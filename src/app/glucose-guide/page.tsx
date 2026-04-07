'use client';

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Moon,
  Dumbbell,
  Footprints,
  Coffee,
  Sun,
  Sunset,
  Activity,
  Heart,
  ExternalLink,
  Shield,
  AlertTriangle,
  Check,
  Lightbulb,
  ArrowRight,
  Banana,
  Clock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data — will be replaced with real Signos API data             */
/* ------------------------------------------------------------------ */

const FOOD = {
  name: 'Banana',
  serving: '1 medium (118g)',
  calories: 105,
  carbs: 27,
  protein: 1.3,
  fat: 0.4,
  fiber: 3.1,
  sugar: 14,
  giValue: 51,
  giLabel: 'Low',
};

const STATS = {
  avgSpike: 32,
  sampleSize: 14_200,
  pctSpiking: 58,
};

const DISTRIBUTION = {
  low: { pct: 42, label: 'Small or no spike', description: 'under 20 mg/dL' },
  moderate: { pct: 36, label: 'Moderate spike', description: '20–40 mg/dL' },
  high: { pct: 22, label: 'Large spike', description: 'above 40 mg/dL' },
};

const GAP = {
  label: {
    claim: '"Low Glycemic Index"',
    detail: 'GI 51 — tested on ~10 fasting subjects in a lab',
    verdict: 'Should be fine for blood sugar',
  },
  reality: {
    claim: '58% of real people spike significantly',
    detail: `${STATS.sampleSize.toLocaleString()} real meals, real conditions`,
    verdict: 'Highly dependent on context',
  },
  punchLine: 'The glycemic index ignores sleep, activity, ripeness, and what you eat with it. That\'s why it fails in real life.',
};

const MODIFIERS = [
  { id: 'baseline', label: 'Baseline (banana alone)', avgSpike: 32, pctSpiking: 58, change: null, direction: null, icon: Banana },
  { id: 'bad-sleep', label: 'Sleep < 6 hours', avgSpike: 41, pctSpiking: 72, change: '+28%', direction: 'worse' as const, icon: Moon },
  { id: 'good-sleep', label: 'Sleep 7+ hours', avgSpike: 27, pctSpiking: 44, change: '−16%', direction: 'better' as const, icon: Moon },
  { id: 'post-walk', label: 'Walk after eating', avgSpike: 24, pctSpiking: 36, change: '−25%', direction: 'better' as const, icon: Footprints },
  { id: 'morning-exercise', label: 'Exercised that morning', avgSpike: 25, pctSpiking: 38, change: '−22%', direction: 'better' as const, icon: Dumbbell },
  { id: 'protein-pairing', label: 'Paired with protein/fat', avgSpike: 23, pctSpiking: 32, change: '−28%', direction: 'better' as const, icon: Heart },
  { id: 'morning', label: 'Morning (before 10am)', avgSpike: 38, pctSpiking: 68, change: '+19%', direction: 'worse' as const, icon: Coffee },
  { id: 'afternoon', label: 'Afternoon (2–5pm)', avgSpike: 26, pctSpiking: 40, change: '−19%', direction: 'better' as const, icon: Sun },
];

const INSIGHTS = [
  {
    title: 'Sleep matters more than ripeness',
    body: 'We expected banana ripeness to be the dominant factor. It wasn\'t. A person eating a ripe banana after 8 hours of sleep spiked less on average than someone eating a green banana after a poor night. Sleep quality was the single strongest predictor of glucose response — stronger than any dietary modification.',
  },
  {
    title: 'Afternoon bananas behave like a different food',
    body: 'The same banana eaten at 3pm produces a 19% lower spike than one eaten at 8am. This isn\'t about the banana — it\'s about your body. Insulin sensitivity peaks in the afternoon, meaning your cells are simply better at processing glucose later in the day. Morning banana eaters may want to add protein to compensate.',
  },
];

const COMPARISONS = [
  { food: 'Apple', spike: 24, n: 18_400, color: 'emerald' },
  { food: 'Banana', spike: 32, n: 14_200, color: 'amber', highlight: true },
  { food: 'Orange', spike: 28, n: 9_800, color: 'amber' },
  { food: 'Grapes', spike: 38, n: 6_200, color: 'red' },
  { food: 'Mango', spike: 42, n: 4_600, color: 'red' },
];

const STRATEGIES = {
  before: [
    'Eat a handful of nuts or a spoonful of peanut butter first',
    'A 10-minute walk primes your muscles to absorb glucose',
  ],
  during: [
    'Pair with Greek yogurt, cottage cheese, or nut butter',
    'Choose a slightly green banana over a spotty ripe one',
  ],
  after: [
    'A 10–15 minute walk within 30 minutes of eating',
    'Even standing and moving reduces the spike vs. sitting',
  ],
};

const PERSONA_FIT = {
  better: ['Slept 7+ hours', 'Active lifestyle or exercised today', 'Eating it as part of a balanced meal', 'Afternoon timing'],
  worse: ['Slept poorly (<6 hours)', 'Sedentary day', 'Eating it alone on an empty stomach', 'First thing in the morning'],
};

const FAQS = [
  {
    q: 'Are bananas bad for blood sugar?',
    a: 'Not for everyone. Based on 14,200 Signos CGM readings, 42% of people barely spike at all. But 22% spike significantly (40+ mg/dL). Whether a banana is "good" or "bad" for your blood sugar depends far more on your sleep, timing, and pairings than the banana itself.',
  },
  {
    q: 'When is the best time to eat a banana for blood sugar?',
    a: 'Afternoon. Signos data shows the average spike at 3pm is +26 mg/dL compared to +38 mg/dL at 8am — a 32% difference. This is driven by your body\'s natural insulin sensitivity cycle, not the banana.',
  },
  {
    q: 'Does peanut butter with a banana help blood sugar?',
    a: 'Yes, significantly. Pairing a banana with a fat or protein source reduced the average spike by 28% in our data (from +32 to +23 mg/dL). The fat and protein slow gastric emptying, which blunts the glucose response.',
  },
  {
    q: 'Are green bananas better for blood sugar?',
    a: 'Generally yes. Less-ripe bananas contain more resistant starch, which acts like fiber. Our data suggests about a 20% lower spike from greener bananas, though sleep quality had an even larger effect.',
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-12 md:py-16 ${className}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">{children}</div>
    </section>
  );
}

function SpikeBar({ spike, maxSpike = 50, color = 'amber' }: { spike: number; maxSpike?: number; color?: string }) {
  const pct = Math.min(100, (spike / maxSpike) * 100);
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    gray: 'bg-gray-300',
  };
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colors[color] || colors.amber} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-20 text-right whitespace-nowrap">+{spike} <span className="text-gray-400 font-normal text-xs">mg/dL</span></span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GlucoseGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAllModifiers, setShowAllModifiers] = useState(false);
  const visibleModifiers = showAllModifiers ? MODIFIERS : MODIFIERS.slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* ---- Sticky header ---- */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:inline">Signos <span className="text-teal-600">Food Intelligence</span></span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Powered by 4.2M CGM readings</span>
        </div>
      </header>

      {/* ---- Breadcrumb ---- */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <a href="/food-intelligence/oatmeal" className="hover:text-teal-600 transition-colors">Food Intelligence</a>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600">Banana</span>
          </nav>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  1. DECISION HEADER (Above the Fold)                         */}
      {/* ============================================================ */}
      <Section className="bg-white pt-10 md:pt-14 pb-0 md:pb-0">
        <p className="text-teal-600 font-bold text-sm tracking-wide uppercase mb-4">Food Intelligence Report</p>
        <h1 className="text-3xl md:text-4xl lg:text-[42px] font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
          Should I Eat a Banana? Here&apos;s What {STATS.sampleSize.toLocaleString()} CGM Readings Say.
        </h1>

        {/* Verdict card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-gray-900">Moderate Spike Risk</p>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Highly variable — context matters more than the food</p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700"><strong className="text-gray-900">Can be stable</strong> if paired with protein, eaten in the afternoon, or after exercise</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700"><strong className="text-gray-900">Likely to spike</strong> if eaten alone in the morning or after poor sleep</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 pt-4 border-t border-amber-200/60">
            <span className="font-bold text-gray-900">+{STATS.avgSpike} mg/dL</span>
            <span className="text-gray-400">avg spike</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="font-bold text-gray-900">{STATS.pctSpiking}%</span>
            <span className="text-gray-400">spike above 20 mg/dL</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="font-bold text-gray-900">{STATS.sampleSize.toLocaleString()}</span>
            <span className="text-gray-400">real meals</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6 text-xs text-gray-400">
          <span>Published Apr 1, 2026</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>Reviewed by Sarah Chen, RD, CDE</span>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  2. WHAT ACTUALLY HAPPENS (3-Bucket Distribution)            */}
      {/* ============================================================ */}
      <Section id="distribution">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">What Actually Happens</h2>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          Not everyone responds the same way. Here&apos;s how {STATS.sampleSize.toLocaleString()} real banana meals broke down.
        </p>

        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Low */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-emerald-600">{DISTRIBUTION.low.pct}%</div>
            <p className="text-sm font-semibold text-gray-800 mt-2">{DISTRIBUTION.low.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{DISTRIBUTION.low.description}</p>
          </div>
          {/* Moderate */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-amber-500">{DISTRIBUTION.moderate.pct}%</div>
            <p className="text-sm font-semibold text-gray-800 mt-2">{DISTRIBUTION.moderate.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{DISTRIBUTION.moderate.description}</p>
          </div>
          {/* High */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-red-500">{DISTRIBUTION.high.pct}%</div>
            <p className="text-sm font-semibold text-gray-800 mt-2">{DISTRIBUTION.high.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{DISTRIBUTION.high.description}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">
          <strong className="text-gray-800">Takeaway:</strong> Bananas are highly variable. Nearly half of people do fine, but over 1 in 5 spike significantly. Your outcome depends more on <em>when</em> you eat it and <em>what you eat it with</em> than the banana itself.
        </p>
      </Section>

      {/* ============================================================ */}
      {/*  3. THE GAP (Label vs. Reality)                              */}
      {/* ============================================================ */}
      <Section id="gap" className="bg-gray-50">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">The Gap Between Labels and Reality</h2>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          The glycemic index says one thing. Real-world data says another.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* What the label says */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">What the Label Says</p>
            <p className="text-lg font-extrabold text-gray-900 mb-2">{GAP.label.claim}</p>
            <p className="text-sm text-gray-500 mb-4">{GAP.label.detail}</p>
            <div className="bg-emerald-50 text-emerald-700 text-sm font-semibold px-3 py-2 rounded-lg inline-block">
              {GAP.label.verdict}
            </div>
          </div>

          {/* What the data shows */}
          <div className="bg-white rounded-2xl border-2 border-amber-300 p-6">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">What the Data Shows</p>
            <p className="text-lg font-extrabold text-gray-900 mb-2">{GAP.reality.claim}</p>
            <p className="text-sm text-gray-500 mb-4">{GAP.reality.detail}</p>
            <div className="bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-2 rounded-lg inline-block">
              {GAP.reality.verdict}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 bg-white rounded-xl border border-gray-200 p-4 leading-relaxed">
          <strong className="text-gray-800">The bottom line:</strong> {GAP.punchLine}
        </p>
      </Section>

      {/* ============================================================ */}
      {/*  4. VARIABILITY ENGINE (What Changes Your Outcome)           */}
      {/* ============================================================ */}
      <Section id="variability">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">What Changes Your Outcome</h2>
            <p className="text-xs text-violet-600 font-bold uppercase tracking-wide">The Variability Engine</p>
          </div>
        </div>
        <p className="text-gray-500 mt-2 mb-8 text-base leading-relaxed">
          The same banana produces dramatically different glucose responses depending on context. These are the levers you can control.
        </p>

        <div className="space-y-3">
          {visibleModifiers.map((mod) => {
            const isBaseline = mod.id === 'baseline';
            const isWorse = mod.direction === 'worse';
            const isBetter = mod.direction === 'better';
            return (
              <div
                key={mod.id}
                className={`rounded-xl border p-4 flex items-center gap-4 ${
                  isBaseline ? 'bg-gray-50 border-gray-200' :
                  isWorse ? 'bg-red-50/50 border-red-100' :
                  'bg-emerald-50/50 border-emerald-100'
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isBaseline ? 'bg-gray-100' :
                  isWorse ? 'bg-red-100' :
                  'bg-emerald-100'
                }`}>
                  <mod.icon className={`h-4.5 w-4.5 ${
                    isBaseline ? 'text-gray-500' :
                    isWorse ? 'text-red-500' :
                    'text-emerald-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{mod.label}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-gray-900">+{mod.avgSpike} mg/dL</span>
                    <span className="text-xs text-gray-400">{mod.pctSpiking}% spike</span>
                  </div>
                </div>
                {mod.change && (
                  <span className={`text-lg font-extrabold flex-shrink-0 ${
                    isWorse ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                    {mod.change}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {MODIFIERS.length > 5 && (
          <button
            onClick={() => setShowAllModifiers(!showAllModifiers)}
            className="w-full mt-3 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1 rounded-xl border border-violet-100"
          >
            {showAllModifiers ? 'Show less' : `Show all ${MODIFIERS.length} factors`}
            {showAllModifiers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </Section>

      {/* ============================================================ */}
      {/*  5. WHAT SURPRISED US (Insight Engine)                       */}
      {/* ============================================================ */}
      <Section id="insights" className="bg-gray-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Lightbulb className="h-4.5 w-4.5 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">What Surprised Us</h2>
        </div>

        <div className="space-y-4">
          {INSIGHTS.map((insight) => (
            <div key={insight.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-base font-bold text-gray-900 mb-2">{insight.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{insight.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          These findings are based on aggregate patterns in {STATS.sampleSize.toLocaleString()} meals and may not reflect your individual response.
        </p>
      </Section>

      {/* ============================================================ */}
      {/*  6. HOW TO EAT IT WITHOUT SPIKING (Action Block)            */}
      {/* ============================================================ */}
      <Section id="strategies">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">How to Eat It Without Spiking</h2>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          You don&apos;t have to give up bananas. These strategies reduce the average spike by 25-35%.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Before */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Before</h3>
            </div>
            <ul className="space-y-2">
              {STRATEGIES.before.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* During */}
          <div className="bg-violet-50/70 border border-violet-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center">
                <Banana className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">During</h3>
            </div>
            <ul className="space-y-2">
              {STRATEGIES.during.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <Footprints className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">After</h3>
            </div>
            <ul className="space-y-2">
              {STRATEGIES.after.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            Members who followed these steps reduced their banana spike by an average of 30–40%
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  7. WHO THIS WORKS FOR (Personalization Without Login)       */}
      {/* ============================================================ */}
      <Section id="persona" className="bg-gray-50">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Who This Works For</h2>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          Your likelihood of a good or bad response based on real patterns in the data.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Good fit */}
          <div className="bg-white rounded-2xl border border-emerald-200 p-5">
            <p className="text-sm font-bold text-emerald-700 mb-3">More likely to be stable if you…</p>
            <ul className="space-y-2">
              {PERSONA_FIT.better.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bad fit */}
          <div className="bg-white rounded-2xl border border-red-200 p-5">
            <p className="text-sm font-bold text-red-600 mb-3">More likely to spike if you…</p>
            <ul className="space-y-2">
              {PERSONA_FIT.worse.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  COMPARISON — How banana stacks up                           */}
      {/* ============================================================ */}
      <Section id="compare">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">How Banana Compares</h2>
        <p className="text-gray-500 mb-8 text-base leading-relaxed">
          Average glucose spike across common fruits, based on real Signos CGM data.
        </p>

        <div className="space-y-3">
          {COMPARISONS.map((item) => (
            <div key={item.food} className={`flex items-center gap-4 p-4 rounded-xl ${
              item.highlight ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-gray-100'
            }`}>
              <span className={`text-sm font-semibold w-20 ${item.highlight ? 'text-amber-700' : 'text-gray-700'}`}>
                {item.food}
              </span>
              <div className="flex-1"><SpikeBar spike={item.spike} color={item.color} /></div>
              <span className="text-[11px] text-gray-400 w-20 text-right">n={item.n.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          All comparisons use the same methodology: meals where the fruit was the primary carbohydrate source, regular PPGR cases only.
        </p>
      </Section>

      {/* ============================================================ */}
      {/*  8. FAQ                                                      */}
      {/* ============================================================ */}
      <Section id="faq" className="bg-gray-50">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-6">Frequently Asked Questions</h2>
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
      {/*  9. DATA TRANSPARENCY + TRUST                                */}
      {/* ============================================================ */}
      <Section>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-gray-900">About This Data</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              This analysis is based on <strong className="text-gray-800">{STATS.sampleSize.toLocaleString()} anonymized glucose readings</strong> from
              Signos members who logged a banana as a meal or snack between January 2024 and March 2026. Glucose response was measured
              using continuous glucose monitors (CGMs) worn during normal daily activities.
            </p>
            <p>
              All data is aggregated and anonymized. Statistics represent population averages and may not reflect your personal
              glucose response, which is influenced by genetics, metabolic health, medication, and many other factors.
            </p>
            <p>
              Modifier analysis (sleep, exercise, time of day) uses subsets of the total sample where cross-referenced data was available.
              Sample sizes for each modifier are noted where shown. Correlation does not imply causation.
            </p>
          </div>

          {/* Nutrition label */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Standard Nutrition — {FOOD.serving}</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {[
                { label: 'Calories', value: `${FOOD.calories}` },
                { label: 'Carbs', value: `${FOOD.carbs}g` },
                { label: 'Sugar', value: `${FOOD.sugar}g` },
                { label: 'Fiber', value: `${FOOD.fiber}g` },
                { label: 'Protein', value: `${FOOD.protein}g` },
                { label: 'Fat', value: `${FOOD.fat}g` },
                { label: 'GI', value: `${FOOD.giValue}` },
              ].map((n) => (
                <div key={n.label} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{n.value}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{n.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviewer */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-teal-700">SC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Reviewed by Sarah Chen, MS, RD, CDE</p>
              <p className="text-xs text-gray-500">Registered Dietitian &amp; Certified Diabetes Educator · Signos Clinical Team</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <Section className="bg-gray-50">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <Heart className="h-8 w-8 mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">This is the average. What&apos;s YOUR response?</h2>
          <p className="text-teal-100 max-w-lg mx-auto leading-relaxed mb-6">
            Everyone&apos;s glucose response is unique. With a Signos CGM, you&apos;ll see exactly how
            your body responds to bananas and every other food — and get personalized guidance to eat smarter.
          </p>
          <a
            href="https://www.signos.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-teal-700 font-bold px-6 py-3 rounded-xl hover:bg-teal-50 transition-colors"
          >
            Try Signos <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Internal links */}
        <div className="mt-8">
          <p className="text-sm font-bold text-gray-900 mb-3">Explore More Food Intelligence</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href="/food-intelligence/oatmeal" className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 transition-colors group">
              <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-50 transition-colors">
                <Activity className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Oatmeal & Blood Sugar</p>
                <p className="text-xs text-gray-400">Is it really heart-healthy?</p>
              </div>
            </a>
            <a href="https://www.signos.com/blog" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 transition-colors group">
              <div className="h-9 w-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-50 transition-colors">
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Signos Blog</p>
                <p className="text-xs text-gray-400">More data-backed health insights</p>
              </div>
            </a>
          </div>
        </div>
      </Section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            This content is for informational purposes only and is not medical advice. Consult a healthcare provider
            before making dietary changes. Data is based on anonymized, aggregated readings from Signos members and
            may not reflect your individual glucose response.
          </p>
          <p className="text-xs text-gray-300 mt-3">&copy; {new Date().getFullYear()} Signos. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
