'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  ExternalLink,
  Shield,
  AlertTriangle,
  Check,
  Lightbulb,
  ArrowRight,
  Salad,
  Beef,
  Clock,
  Moon,
  Dumbbell,
  Footprints,
  Coffee,
  Sun,
  Sunset,
} from 'lucide-react';

/* —— Signos CGM aggregates —— */
const SALAD = {
  n: 35,
  users: 13,
  avgSpike: 32.8,
  pctAbove30: 66,
  dist: { low: 11, mod: 51, high: 37 },
  mealtime: 'All 35 meals logged at lunch (midday).',
  stable: { n: 29, avg: 29.0, pctSpiking: 59 },
  volatile: { n: 6, avg: 51.0, pctSpiking: 100 },
};

const BIGMAC = {
  n: 25,
  avgSpike: 11.1,
  pctAbove30: 0,
  dist: { low: 72, mod: 28, high: 0 },
};

const RANKING = [
  { name: 'Grilled chicken salad', n: 35, spike: 32.8, highlight: true, href: '/foods/grilled-chicken-salad' as const },
  { name: 'Steak + sweet potato', n: 37, spike: 31.2, highlight: false, href: '/foods/steak-sweet-potato' as const },
  { name: 'Pasta + marinara', n: 28, spike: 30.4, highlight: false, href: null },
  { name: 'Smoothie bowl', n: 47, spike: 21.0, highlight: false, href: '/foods/smoothie-bowl' as const },
  { name: 'Oatmeal', n: 34, spike: 19.2, highlight: false, href: '/foods/oatmeal' as const },
  { name: 'Big Mac', n: 25, spike: 11.1, highlight: false, href: null },
  { name: 'Protein bar', n: 27, spike: 10.1, highlight: false, href: null },
  { name: 'Apple + almond butter', n: 35, spike: 7.2, highlight: false, href: '/foods/apple-almond-butter' as const },
];

const MAX_SPIKE = Math.max(...RANKING.map((r) => r.spike));

const FAQS = [
  {
    q: 'Can a salad spike blood sugar more than fast food?',
    a: 'Yes — in this Signos dataset, grilled chicken salad meals averaged a +32.8 mg/dL glucose spike compared to +11.1 mg/dL for a Big Mac. Labels like “healthy” do not guarantee a lower glucose response; dressings, croutons, dried fruit, and portion size can add substantial carbohydrates.',
  },
  {
    q: 'Why would grilled chicken salad spike blood sugar?',
    a: 'Even with lean protein and greens, common salad components add fast-absorbing carbs: sweet dressings, croutons, candied nuts, dried cranberries, and large portions. Fat and protein in a Big Mac can slow gastric emptying and blunt the glucose curve compared to a carb-heavy salad.',
  },
  {
    q: 'How can I eat salad without spiking blood sugar?',
    a: 'Skip or limit croutons and sugary dressings, request dressing on the side, prioritize unsweetened fats like avocado or olive oil, eat protein and non-starchy vegetables first, and watch portions of dried fruit and sweet toppings.',
  },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-gray-900 hover:bg-rose-50/50 transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp className="h-5 w-5 shrink-0 text-rose-500" /> : <ChevronDown className="h-5 w-5 shrink-0 text-rose-500" />}
      </button>
      {open && <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600 border-t border-rose-50 pt-3">{a}</p>}
    </div>
  );
}

export default function GrilledChickenSaladPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-gray-50">
      {/* 1. Shocking header */}
      <section className="relative overflow-hidden border-b border-rose-200/60 bg-gradient-to-br from-rose-100 via-white to-red-50/80">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-red-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            Signos CGM · Real-world comparison
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            This &ldquo;healthy&rdquo; salad spiked{' '}
            <span className="text-rose-600">more than a Big Mac</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-700">
            Average glucose rise after grilled chicken salad: <strong>+32.8 mg/dL</strong>. Big Mac:{' '}
            <strong>+11.1 mg/dL</strong>. The narrative that salad is always the safe choice does not hold in our data.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-rose-400 bg-white p-6 shadow-lg shadow-rose-200/50 ring-2 ring-rose-100">
              <div className="flex items-center gap-3 text-rose-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
                  <Salad className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide">Grilled chicken salad</p>
                  <p className="text-xs text-rose-600/90">n = {SALAD.n} meals · {SALAD.users} users</p>
                </div>
              </div>
              <p className="mt-5 text-5xl font-black tabular-nums text-rose-600">+{SALAD.avgSpike.toFixed(1)}</p>
              <p className="text-sm font-medium text-gray-600">mg/dL avg spike</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                  {SALAD.pctAbove30}% spike &gt; 30 mg/dL
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-6 shadow-md">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200/80">
                  <Beef className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide">Big Mac</p>
                  <p className="text-xs text-gray-500">n = {BIGMAC.n} meals</p>
                </div>
              </div>
              <p className="mt-5 text-5xl font-black tabular-nums text-gray-800">+{BIGMAC.avgSpike.toFixed(1)}</p>
              <p className="text-sm font-medium text-gray-600">mg/dL avg spike</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {BIGMAC.pctAbove30}% above 30 mg/dL
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-16 px-4 py-14">
        {/* 2. The comparison */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-6 w-6 text-rose-500" />
            <h2 className="text-2xl font-bold text-gray-900">The comparison</h2>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              <div>
                <p className="text-sm font-semibold text-rose-600">Chicken salad</p>
                <p className="mt-1 text-4xl font-black text-gray-900">+32.8</p>
                <p className="text-sm text-gray-500">mg/dL · Signos aggregate</p>
                <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500" style={{ width: `${(32.8 / MAX_SPIKE) * 100}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Big Mac</p>
                <p className="mt-1 text-4xl font-black text-gray-800">+11.1</p>
                <p className="text-sm text-gray-500">mg/dL · Signos aggregate</p>
                <div className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-gray-400 to-gray-500" style={{ width: `${(11.1 / MAX_SPIKE) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
              <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0" />
                Why?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
                Restaurant-style grilled chicken salads often pack <strong>hidden carbs</strong>: croutons, sweet dressings,
                dried fruit, and sugary sauces. Those add up fast on top of greens. A Big Mac is high in fat and protein,
                which <strong>slow absorption</strong> and can produce a lower, broader glucose curve than a carb-heavy
                salad — even though nobody mistakes the burger for &ldquo;health food.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* 3. Where it ranks */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <ArrowRight className="h-6 w-6 text-rose-500" />
            <h2 className="text-2xl font-bold text-gray-900">Where it ranks</h2>
          </div>
          <p className="mb-6 text-gray-600">
            Among these foods tested in our dataset, grilled chicken salad sits at the <strong>worst</strong> end for average
            spike — not because chicken or lettuce are inherently bad, but because of how this meal is usually composed.
          </p>
          <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            {RANKING.map((row) => {
              const pct = (row.spike / MAX_SPIKE) * 100;
              const inner = (
                <>
                  <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                    <span className={`truncate font-medium ${row.highlight ? 'text-rose-700' : 'text-gray-900'}`}>
                      {row.name}
                      {row.highlight && (
                        <span className="ml-2 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                          Highest avg spike
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm font-bold text-gray-700">
                      +{row.spike.toFixed(1)} <span className="font-normal text-gray-400">n={row.n}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${row.highlight ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              );
              return row.href ? (
                <Link
                  key={row.name}
                  href={row.href}
                  className={`block rounded-2xl border p-4 transition-colors ${row.highlight ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50' : 'border-transparent hover:bg-gray-50'}`}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={row.name}
                  className={`rounded-2xl border p-4 ${row.highlight ? 'border-rose-200 bg-rose-50/40' : 'border-transparent'}`}
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. What actually happens */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <h2 className="text-2xl font-bold text-gray-900">What actually happens</h2>
          </div>
          <p className="mb-6 text-gray-600">
            Spike size for grilled chicken salad in this cohort was not uniform — but most observations were moderate or
            high.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Low', sub: '< 20 mg/dL spike', pct: SALAD.dist.low, tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
              { label: 'Moderate', sub: '20–35 mg/dL spike', pct: SALAD.dist.mod, tone: 'bg-amber-50 border-amber-200 text-amber-900' },
              { label: 'High', sub: '> 35 mg/dL spike', pct: SALAD.dist.high, tone: 'bg-rose-50 border-rose-300 text-rose-900' },
            ].map((b) => (
              <div key={b.label} className={`rounded-2xl border p-5 ${b.tone}`}>
                <p className="text-3xl font-black tabular-nums">{b.pct}%</p>
                <p className="mt-1 font-semibold">{b.label}</p>
                <p className="text-xs opacity-90">{b.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400" />
            {SALAD.mealtime}
          </p>
        </section>

        {/* 5. Metabolic state */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-rose-500" />
            <h2 className="text-2xl font-bold text-gray-900">The metabolic state effect</h2>
          </div>
          <p className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm leading-relaxed text-gray-800">
            <strong>Your metabolic state can matter more than the food on the plate.</strong> We split members by CGM
            variability patterns: &ldquo;stable&rdquo; vs &ldquo;volatile&rdquo; responders. The same salad category produced very
            different averages.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Activity className="h-5 w-5 text-emerald-600" />
                <span className="font-bold">CGM-stable users</span>
              </div>
              <p className="mt-3 text-3xl font-black text-gray-900">+{SALAD.stable.avg.toFixed(1)}</p>
              <p className="text-sm text-gray-500">mg/dL avg · n = {SALAD.stable.n}</p>
              <p className="mt-2 text-sm font-semibold text-gray-700">{SALAD.stable.pctSpiking}% spiking</p>
            </div>
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/30 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">CGM-volatile users</span>
              </div>
              <p className="mt-3 text-3xl font-black text-rose-700">+{SALAD.volatile.avg.toFixed(1)}</p>
              <p className="text-sm text-gray-600">mg/dL avg · n = {SALAD.volatile.n}</p>
              <p className="mt-2 text-sm font-semibold text-rose-800">{SALAD.volatile.pctSpiking}% spiking</p>
            </div>
          </div>
        </section>

        {/* 6. What surprised us */}
        <section className="rounded-3xl border border-violet-100 bg-violet-50/40 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-violet-900">
            <Lightbulb className="h-6 w-6" />
            <h2 className="text-xl font-bold">What surprised us</h2>
          </div>
          <p className="mt-4 text-gray-800 leading-relaxed">
            The <strong>healthy halo</strong>: people who order salads may pay less attention to dressings, toppings, and
            portions — assuming the meal is inherently &ldquo;safe.&rdquo; That assumption shows up in the data as larger
            average spikes than many expect, especially next to a high-fat burger.
          </p>
        </section>

        {/* 7. How to make it healthy */}
        <section>
          <div className="mb-6 flex items-center gap-2">
            <Check className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-gray-900">How to make it actually healthy</h2>
          </div>
          <ul className="space-y-4">
            {[
              'Skip croutons or swap for seeds (fewer fast carbs).',
              'Dressing on the side; dip fork-first — sweet dressings are often the biggest hidden sugar load.',
              'Add avocado or extra-virgin olive oil instead of sugary dressings when you want richness.',
              'Eat grilled chicken and non-starchy vegetables first, then greens — protein-first eating blunts the curve for many people.',
            ].map((t) => (
              <li key={t} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-gray-800">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 8. FAQ */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-gray-900">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <FaqItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={faqOpen === i}
                onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
              />
            ))}
          </div>
        </section>

        {/* 9. Data transparency */}
        <section className="rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-gray-900">
            <Shield className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-bold">Data transparency</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>
              <strong>Sample:</strong> Grilled chicken salad n = {SALAD.n} logged meals across {SALAD.users} users; Big Mac
              n = {BIGMAC.n}.
            </li>
            <li>
              <strong>Metric:</strong> Average post-meal glucose spike (mg/dL) from Signos CGM traces for logged meals.
            </li>
            <li>
              <strong>Methodology:</strong> Aggregated, anonymized member data; individual results vary with medication,
              sleep, stress, and meal composition.
            </li>
            <li>
              <strong>RD reviewer:</strong> Sarah Chen, MS, RD, CDE
            </li>
          </ul>
        </section>

        {/* 10. CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-rose-600 to-red-700 p-8 text-center text-white shadow-xl">
          <h2 className="text-2xl font-bold">This is the average. What&apos;s YOUR response?</h2>
          <p className="mt-2 text-rose-100">Continuous glucose monitoring reveals how your body reacts — not a textbook.</p>
          <a
            href="https://www.signos.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-rose-700 shadow-md transition hover:bg-rose-50"
          >
            Explore Signos
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>

        {/* Context cues: sleep, activity, and meal timing still shape your curve */}
        <p className="flex flex-wrap items-center justify-center gap-4 py-2 text-center text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Moon className="h-4 w-4" aria-hidden />
            Sleep
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4" aria-hidden />
            Training
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Footprints className="h-4 w-4" aria-hidden />
            Steps
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coffee className="h-4 w-4" aria-hidden />
            Morning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sun className="h-4 w-4" aria-hidden />
            Midday
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sunset className="h-4 w-4" aria-hidden />
            Evening
          </span>
        </p>

        {/* 11. Internal links */}
        <section className="border-t border-gray-200 pt-10">
          <h2 className="text-lg font-bold text-gray-900">Related</h2>
          <nav className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {[
              { href: '/foods/smoothie-bowl', label: 'Smoothie bowl' },
              { href: '/foods/oatmeal', label: 'Oatmeal' },
              { href: '/foods/steak-sweet-potato', label: 'Steak + sweet potato' },
              { href: '/foods/apple-almond-butter', label: 'Apple + almond butter' },
              { href: '/glucose-guide', label: 'Glucose guide' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-rose-200 hover:bg-rose-50"
              >
                {l.label}
                <ChevronRight className="h-4 w-4 text-rose-400" />
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </div>
  );
}
