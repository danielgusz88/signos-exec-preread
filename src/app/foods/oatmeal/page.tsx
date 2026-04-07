'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Dumbbell,
  Footprints,
  Heart,
  Lightbulb,
  Moon,
  Shield,
  Wheat,
  Zap,
} from 'lucide-react';

const BREAKFASTS = [
  { name: 'Avocado toast + egg', n: 33, avg: 18.3, self: false },
  { name: 'Oatmeal + berries + honey', n: 34, avg: 19.2, self: true },
  { name: 'Scrambled eggs + toast', n: 33, avg: 19.8, self: false },
  { name: 'Greek yogurt + granola', n: 35, avg: 20.7, self: false },
  { name: 'Smoothie bowl', n: 47, avg: 21.0, self: false },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Why does the same oatmeal breakfast produce such different glucose curves?',
    a: 'Our data points to baseline metabolic state — how stable your glucose was in the days before the meal — as a stronger differentiator than toppings or prep style. The meal was categorized the same; the body’s readiness to handle it was not.',
  },
  {
    q: 'Is oatmeal “bad” for blood sugar if GI is moderate?',
    a: 'Moderate GI is a population average. Here, nearly half of logged meals had a small rise (under 20 mg/dL), while a minority pushed into high-response territory. Your CGM history is more informative than a single index number.',
  },
  {
    q: 'What’s the fastest lever to blunt an oatmeal spike?',
    a: 'Pairing protein and fat (nuts, Greek yogurt), choosing less processed oats when possible, trimming honey, and moving after the meal — walking in particular — are the most repeatable levers members combine.',
  },
] as const;

const INTERNAL_LINKS = [
  { href: '/foods/grilled-chicken-salad', label: 'Grilled chicken salad' },
  { href: '/foods/smoothie-bowl', label: 'Smoothie bowl' },
  { href: '/foods/steak-sweet-potato', label: 'Steak & sweet potato' },
  { href: '/foods/apple-almond-butter', label: 'Apple & almond butter' },
  { href: '/glucose-guide', label: 'Glucose guide' },
] as const;

export default function OatmealFoodPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const maxAvg = Math.max(...BREAKFASTS.map((b) => b.avg));

  return (
    <article className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:max-w-4xl">
        {/* 1. Amber verdict */}
        <header className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900/70">
                <Wheat className="h-4 w-4 text-amber-700" aria-hidden />
                Food intelligence · Breakfast
              </p>
              <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                The breakfast where context is everything
              </h1>
              <p className="max-w-xl text-lg text-stone-700">
                Oatmeal with berries and honey is one of the most context-dependent foods we&apos;ve
                measured — the bowl stays the same; the glucose story doesn&apos;t.
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-amber-300/60 bg-white/90 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80">
                Verdict
              </p>
              <p className="mt-1 text-lg font-bold text-amber-900">Low-to-moderate spike risk</p>
            </div>
          </div>
          <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2">
              <dt className="text-xs text-stone-500">Avg spike</dt>
              <dd className="text-lg font-semibold tabular-nums text-stone-900">+19.2 mg/dL</dd>
            </div>
            <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2">
              <dt className="text-xs text-stone-500">Big spikes (&gt;30)</dt>
              <dd className="text-lg font-semibold tabular-nums text-stone-900">9%</dd>
            </div>
            <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2">
              <dt className="text-xs text-stone-500">Meals logged</dt>
              <dd className="text-lg font-semibold tabular-nums text-stone-900">n = 34</dd>
            </div>
            <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2">
              <dt className="text-xs text-stone-500">Members</dt>
              <dd className="text-lg font-semibold tabular-nums text-stone-900">10</dd>
            </div>
          </dl>
        </header>

        {/* 2. Variability hero */}
        <section className="mt-12" aria-labelledby="variability-heading">
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-6 w-6 text-amber-600" aria-hidden />
            <h2 id="variability-heading" className="font-serif text-2xl font-semibold text-stone-900">
              The variability engine
            </h2>
          </div>
          <p className="mb-8 max-w-2xl text-stone-600">
            Same meal category. Same time of day. Very different outcomes — driven by how stable
            glucose had been in the days before breakfast.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-6 shadow-md">
              <div className="mb-4 flex items-center gap-2 text-emerald-900">
                <Shield className="h-5 w-5" aria-hidden />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  CGM-stable users
                </span>
              </div>
              <p className="text-xs text-emerald-800/80">n = 29 meals</p>
              <p className="mt-3 font-serif text-3xl font-bold tabular-nums text-emerald-950 sm:text-4xl">
                +17.0 <span className="text-lg font-semibold text-emerald-800">mg/dL</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-900">
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                Only <span className="font-semibold">3%</span> of meals spiked above 30 mg/dL
              </p>
              <p className="mt-4 text-sm leading-relaxed text-emerald-900/90">
                When baseline glucose was steady, the curve stayed polite — small average rise, rare
                excursions.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 p-6 shadow-lg ring-2 ring-amber-200/50">
              <div className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <Zap className="h-5 w-5 text-amber-700" aria-hidden />
              </div>
              <div className="mb-4 flex items-center gap-2 text-amber-950">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  Moderate variability users
                </span>
              </div>
              <p className="text-xs text-amber-900/80">n = 5 meals</p>
              <p className="mt-3 font-serif text-3xl font-bold tabular-nums text-amber-950 sm:text-4xl">
                +31.6 <span className="text-lg font-semibold text-amber-900">mg/dL</span>
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-amber-950">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="font-semibold">40%</span> of meals spiked above 30 mg/dL
              </p>
              <p className="mt-4 text-sm leading-relaxed text-amber-950/95">
                Nearly <span className="font-semibold">double</span> the average rise — not because
                the oatmeal changed, but because metabolic context did.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Label vs reality */}
        <section className="mt-14 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <Heart className="mt-0.5 h-6 w-6 shrink-0 text-rose-400" aria-hidden />
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">The label vs. reality</h2>
              <p className="mt-3 text-stone-600">
                Rolled oats carry a <span className="font-medium text-stone-800">moderate GI (~55)</span>
                — textbook &quot;medium&quot; carb. Our real-world traces tell a wider story:{' '}
                <span className="font-semibold text-amber-800">44% of meals</span> barely moved the
                needle (under 20 mg/dL), while the rest spread across moderate and a thin tail of
                high responders.
              </p>
              <p className="mt-3 text-stone-600">
                A single glycemic index doesn&apos;t encode{' '}
                <span className="font-medium text-stone-800">person-to-person variability</span> — or
                the week you&apos;re having metabolically. That&apos;s what this page is for.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Distribution */}
        <section className="mt-12" aria-labelledby="distribution-heading">
          <h2 id="distribution-heading" className="font-serif text-2xl font-semibold text-stone-900">
            What actually happens
          </h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            Post-meal peak rise vs. baseline, all 34 oatmeal observations — three clear buckets.
          </p>
          <div className="mt-6 space-y-4">
            {[
              { label: 'Low', sub: 'under 20 mg/dL', pct: 44, tone: 'bg-emerald-500' },
              { label: 'Moderate', sub: '20–35 mg/dL', pct: 50, tone: 'bg-amber-500' },
              { label: 'High', sub: 'over 35 mg/dL', pct: 6, tone: 'bg-orange-600' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-stone-800">
                    {row.label}{' '}
                    <span className="font-normal text-stone-500">({row.sub})</span>
                  </span>
                  <span className="tabular-nums text-stone-700">{row.pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                  <div
                    className={`h-full rounded-full ${row.tone} transition-all`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-stone-500">
            Median spike{' '}
            <span className="font-medium text-stone-700">22.5 mg/dL</span> · p25{' '}
            <span className="tabular-nums">10.1</span> · p75{' '}
            <span className="tabular-nums">26.9</span>
          </p>
        </section>

        {/* 5. Breakfast showdown */}
        <section className="mt-14" aria-labelledby="showdown-heading">
          <h2 id="showdown-heading" className="font-serif text-2xl font-semibold text-stone-900">
            Breakfast showdown
          </h2>
          <p className="mt-2 max-w-2xl text-stone-600">
            Oatmeal sits in the middle of common breakfasts — close to the gentlest options, not far
            from the top. For many people it&apos;s a stable choice; variability is the asterisk.
          </p>
          <ul className="mt-6 space-y-3">
            {[...BREAKFASTS].sort((a, b) => a.avg - b.avg).map((b) => (
              <li
                key={b.name}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  b.self
                    ? 'border-amber-300 bg-amber-50/90 ring-1 ring-amber-200'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="min-w-0 flex-1 font-medium text-stone-800">{b.name}</span>
                <span className="shrink-0 text-xs text-stone-500">n={b.n}</span>
                <span className="w-28 shrink-0 sm:w-40">
                  <span className="block h-2.5 overflow-hidden rounded-full bg-stone-200">
                    <span
                      className={`block h-full rounded-full ${b.self ? 'bg-amber-500' : 'bg-stone-400'}`}
                      style={{ width: `${(b.avg / maxAvg) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-900">
                  +{b.avg.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 6. Surprised */}
        <section className="mt-14 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 sm:p-8">
          <div className="flex gap-3">
            <Lightbulb className="h-7 w-7 shrink-0 text-amber-600" aria-hidden />
            <div>
              <h2 className="font-serif text-xl font-semibold text-stone-900">What surprised us</h2>
              <p className="mt-3 text-stone-700 leading-relaxed">
                The biggest predictor of oatmeal&apos;s glucose impact wasn&apos;t the toppings or
                preparation method — it was the person&apos;s baseline metabolic state. People with
                stable glucose over the prior few days barely spiked at all (+17 mg/dL average), while
                those with more volatile glucose spiked nearly twice as much (+31.6). The oatmeal
                didn&apos;t change — the body&apos;s readiness to handle it did.
              </p>
            </div>
          </div>
        </section>

        {/* 7. How to eat smarter */}
        <section className="mt-14" aria-labelledby="smarter-heading">
          <h2 id="smarter-heading" className="font-serif text-2xl font-semibold text-stone-900">
            How to eat it smarter
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-amber-800">
                <Moon className="h-4 w-4" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide">Before</span>
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  Prefer steel-cut or thicker oats when you can — slower starch release.
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  Plan protein up front: Greek yogurt on the side, or nuts in the bowl.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-amber-800">
                <Wheat className="h-4 w-4" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide">During</span>
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  Treat honey as condiment, not a pour — sweetness adds fast glucose.
                </li>
                <li className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  Berries for volume and fiber; keep portions of dried fruit out.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-amber-800">
                <Footprints className="h-4 w-4" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide">After</span>
              </div>
              <ul className="space-y-2 text-sm text-stone-600">
                <li className="flex gap-2">
                  <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  Ten to fifteen minutes of walking clears glucose fast for many people.
                </li>
                <li className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  In our set, every log was breakfast — keep that rhythm if it works for you.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section className="mt-14" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-stone-900">
            FAQ
          </h2>
          <div className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-4 py-4 text-left text-sm font-medium text-stone-900 hover:bg-stone-50 sm:text-base"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    {open ? (
                      <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                    ) : (
                      <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-hidden />
                    )}
                    <span>{item.q}</span>
                  </button>
                  {open && (
                    <div className="border-t border-stone-100 bg-stone-50/80 px-4 pb-4 pl-12 pr-4 pt-0 text-sm leading-relaxed text-stone-600 sm:pl-14">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 9. Data transparency + CTA */}
        <section className="mt-14 rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8">
          <div className="flex flex-wrap items-start gap-3">
            <Shield className="h-6 w-6 shrink-0 text-stone-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Data transparency</h2>
              <p className="mt-2 text-sm text-stone-600">
                Aggregated Signos CGM traces; meal labels member-reported. Oatmeal with berries and
                honey: <span className="font-medium">n = 34</span> meals,{' '}
                <span className="font-medium">10</span> users,{' '}
                <span className="font-medium">100% breakfast</span> timing. Published{' '}
                <time dateTime="2026-04-01">April 1, 2026</time>. Subgroup splits reflect prior-window
                glucose variability tiers in our pipeline — not a diagnosis.
              </p>
              <Link
                href="/glucose-guide"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-700"
              >
                Read the glucose guide
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* 10. Internal links */}
        <nav className="mt-12 border-t border-stone-200 pt-8" aria-label="Related pages">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Explore more
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {INTERNAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                >
                  {l.label}
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </article>
  );
}
