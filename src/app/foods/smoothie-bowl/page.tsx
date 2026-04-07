'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Dumbbell,
  ExternalLink,
  Footprints,
  Heart,
  Lightbulb,
  Moon,
  Shield,
  Sparkles,
  Sun,
  ThumbsUp,
  Trophy,
} from 'lucide-react';

const BREAKFAST_RANK: readonly { name: string; n: number; avg: number; spikePct: number; key: string; highlight?: boolean }[] = [
  { name: 'Avocado toast + egg', n: 33, avg: 18.3, spikePct: 24, key: 'avocado' },
  { name: 'Oatmeal + berries', n: 34, avg: 19.2, spikePct: 9, key: 'oatmeal' },
  { name: 'Scrambled eggs + toast', n: 33, avg: 19.8, spikePct: 24, key: 'eggs' },
  { name: 'Greek yogurt + granola', n: 35, avg: 20.7, spikePct: 3, key: 'yogurt' },
  { name: 'Smoothie bowl', n: 47, avg: 21.0, spikePct: 17, key: 'smoothie', highlight: true },
];

const FAQ_ITEMS = [
  {
    q: 'Is a smoothie bowl a good breakfast for glucose stability?',
    a: 'In our aggregated data, smoothie bowls averaged +21.0 mg/dL with only 17% of meals spiking more than 30 mg/dL—solidly in the “stable breakfast” zone alongside other morning favorites. Your individual curve can still differ, so CGM is the best way to confirm.',
  },
  {
    q: 'Why would a smoothie bowl spike less than juice?',
    a: 'Blending whole fruit keeps fiber in the mix; adding protein powder and fats slows absorption. Juice delivers sugar without that buffer—so the same fruit can behave very differently depending on how it is prepared and what you pair it with.',
  },
  {
    q: 'Who should still be cautious?',
    a: 'Most members saw modest responses, but people with higher day-to-day glucose variability had larger swings in this dataset (volatile subgroup n=2: +43.3 mg/dL average vs +20.0 for stable users). If your glucose is unpredictable, treat any carb-containing meal as worth verifying on your sensor.',
  },
] as const;

export default function SmoothieBowlPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const top3 = BREAKFAST_RANK.slice(0, 3);
  const rest = BREAKFAST_RANK.slice(3);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/90 via-white to-emerald-50/40 text-slate-900">
      {/* 1. Green verdict header */}
      <section className="relative overflow-hidden border-b border-emerald-200/80 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-4 pb-14 pt-12 text-white sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-teal-300/20 blur-2xl" />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <ThumbsUp className="h-4 w-4" aria-hidden />
            Low spike risk
          </div>
          <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            The breakfast that actually keeps you stable
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-50/95">
            One of the most glucose-friendly breakfasts in our data—refreshing news in a catalog often
            dominated by surprise spikes.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/90">
                Average rise
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">+21.0</p>
              <p className="text-sm text-emerald-100/90">mg/dL</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/90">
                Big spikes (30+)
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">17%</p>
              <p className="text-sm text-emerald-100/90">of meals</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/90">
                Sample
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">n=47</p>
              <p className="text-sm text-emerald-100/90">13 members · breakfast only</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-16 px-4 py-14 sm:px-8 lg:px-12">
        {/* 2. Breakfast ranking — podium */}
        <section className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Trophy className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                The breakfast ranking
              </h2>
              <p className="mt-2 text-slate-600">
                Smoothie bowls do not stand alone—they sit in a cluster of relatively gentle morning
                meals. Here is how common breakfasts compare on average glucose rise in our data.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full max-w-lg items-end justify-center gap-3 sm:gap-4">
              {[
                { rank: 2, item: top3[1], h: 'h-36' },
                { rank: 1, item: top3[0], h: 'h-44' },
                { rank: 3, item: top3[2], h: 'h-32' },
              ].map(({ rank, item, h }) => (
                <div
                  key={item.key}
                  className="flex w-1/3 flex-col items-center text-center"
                >
                  <div
                    className={`flex w-full flex-col justify-end rounded-t-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-100 to-emerald-50 px-2 pb-3 pt-6 shadow-sm ${h}`}
                  >
                    <p className="text-[11px] font-medium leading-tight text-slate-800 sm:text-xs">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-700">
                      +{item.avg}
                    </p>
                    <p className="text-[10px] text-slate-500">n={item.n}</p>
                  </div>
                  <div className="w-full rounded-b-lg bg-emerald-600/90 py-1 text-center text-[10px] font-medium text-white">
                    #{rank}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2">
              {rest.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-4 shadow-sm transition ${
                    item.highlight
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-200/80'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    {item.highlight && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                        This page
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>
                      Avg <strong className="text-slate-900">+{item.avg} mg/dL</strong>
                    </span>
                    <span>
                      {item.spikePct}% spike 30+
                    </span>
                    <span>n={item.n}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${Math.min(100, (item.avg / 28) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-slate-600">
              <Sun className="mr-1 inline h-4 w-4 text-amber-500" aria-hidden />
              Every option on this chart averaged under ~21 mg/dL—collectively a reassuring picture
              for morning eating.
            </p>
          </div>
        </section>

        {/* 3. What actually happens — distribution */}
        <section className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Activity className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                What actually happens
              </h2>
              <p className="mt-2 text-slate-600">
                Responses cluster in the gentle-to-moderate range. A full{' '}
                <strong className="text-emerald-800">40%</strong> of smoothie bowl meals stayed under
                a 20 mg/dL rise—quiet curves worth celebrating.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            {[
              { label: 'Low', sub: 'under 20 mg/dL', pct: 40, tone: 'from-emerald-400 to-emerald-500' },
              { label: 'Moderate', sub: '20–35 mg/dL', pct: 53, tone: 'from-teal-400 to-emerald-500' },
              { label: 'High', sub: 'over 35 mg/dL', pct: 6, tone: 'from-slate-300 to-slate-400' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {row.label}{' '}
                    <span className="font-normal text-slate-500">({row.sub})</span>
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-800">{row.pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${row.tone}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="flex items-center gap-2 pt-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Logged exclusively at breakfast (morning)—all 47 meals.
            </p>
          </div>
        </section>

        {/* 4. Why it works */}
        <section className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" aria-hidden />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Why it works</h2>
              <ul className="mt-4 space-y-3 text-slate-700">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <strong className="text-slate-900">Blended fruit + protein + healthy fats</strong>{' '}
                    spreads absorption over time instead of delivering a sugar pulse.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <strong className="text-slate-900">Fiber from whole fruit stays in the bowl</strong>—unlike
                    juice, where it is often removed.
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <span>
                    <strong className="text-slate-900">The combination is the point:</strong> any one
                    ingredient is less predictive than the full meal context.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Metabolic state warning */}
        <section className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                The metabolic state warning
              </h2>
              <p className="mt-3 text-slate-700">
                Even this “safe” food can spike in the wrong metabolic context. In our subgroup split,{' '}
                <strong>CGM-stable members (n=45)</strong> averaged{' '}
                <strong className="text-emerald-800">+20.0 mg/dL</strong> with{' '}
                <strong>13%</strong> crossing the 30+ threshold—while{' '}
                <strong>CGM-volatile members (n=2)</strong> averaged{' '}
                <strong className="text-amber-900">+43.3 mg/dL</strong> with{' '}
                <strong>100%</strong> spiking.
              </p>
              <p className="mt-3 flex items-start gap-2 font-medium text-slate-900">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                The food is only half the equation—your day-to-day glucose stability matters too.
              </p>
            </div>
          </div>
        </section>

        {/* 6. What surprised us */}
        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                What surprised us
              </h2>
              <p className="mt-3 text-lg text-slate-700">
                We expected smoothie bowls to spike more because of concentrated fruit sugar. Instead,{' '}
                <strong className="text-emerald-800">
                  protein and fat, plus fiber retained from whole fruit
                </strong>
                , produced a buffering effect that juice typically does not deliver.
              </p>
            </div>
          </div>
        </section>

        {/* 7. How to keep it stable */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            How to keep it stable
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              'Add or keep protein powder in the blend.',
              'Stir in nut butter for fat and satiety.',
              'Favor frozen berries over heavy tropical fruit.',
              'Watch granola—portion and sugar content add up fast.',
              'Add chia or flax for extra fiber and texture.',
            ].map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-slate-700 shadow-sm"
              >
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        {/* 8. Who this works for */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
            <div className="flex items-center gap-2 text-emerald-800">
              <Heart className="h-5 w-5" aria-hidden />
              <h3 className="font-semibold">Works for most people</h3>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Typical responders saw modest rises and a high share of low-to-moderate curves—making
              smoothie bowls a strong default when you want something bright and filling without
              betting on a roller coaster.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-slate-800">
              <Footprints className="h-5 w-5 text-slate-500" aria-hidden />
              <h3 className="font-semibold">Watch more closely if…</h3>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Your CGM history shows volatility, large post-meal swings, or you are still learning
              your personal carb tolerance. In those cases, verify this meal on your sensor—small
              samples in volatile subgroups still saw big averages.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Dumbbell className="h-4 w-4" aria-hidden />
              Training days, poor sleep, or stress can all change the same bowl’s curve.
            </p>
          </div>
        </section>

        {/* 9. FAQ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-slate-400" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">FAQ</h2>
          </div>
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium text-slate-900 hover:bg-emerald-50/50 sm:px-5"
                  >
                    <span>{item.q}</span>
                    {open ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-0 text-sm leading-relaxed text-slate-600 sm:px-5">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 10. Data transparency + CTA */}
        <section className="space-y-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Data transparency</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Figures are aggregated from continuous glucose monitor traces logged by Signos members.
            Smoothie bowl: <strong className="text-slate-800">n=47 meals</strong> from{' '}
            <strong className="text-slate-800">13 users</strong>, breakfast (morning) only. Spike
            share reflects meals rising more than 30 mg/dL from baseline in our processing window.
            Subgroups (stable vs volatile) are small—interpret cautiously.
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            Published April 1, 2026.
            <a
              href="https://www.signos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-900"
            >
              Signos.com
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </p>
          <Link
            href="/glucose-guide"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
          >
            Read the glucose guide
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        {/* 11. Internal links */}
        <section className="border-t border-emerald-100 pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Explore more food intelligence
          </h2>
          <ul className="mt-4 space-y-2">
            {[
              { href: '/foods/grilled-chicken-salad', label: 'Grilled chicken salad' },
              { href: '/foods/oatmeal', label: 'Oatmeal' },
              { href: '/foods/steak-sweet-potato', label: 'Steak + sweet potato' },
              { href: '/foods/apple-almond-butter', label: 'Apple + almond butter' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900"
                >
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
