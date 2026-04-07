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
  ExternalLink,
  Flame,
  Footprints,
  Heart,
  Lightbulb,
  Moon,
  Shield,
  Sunset,
  UtensilsCrossed,
} from 'lucide-react';

const TIME_OF_DAY = [
  { label: 'Morning', avg: 21.6, spikePct: 22, Icon: Clock },
  { label: 'Midday', avg: 28.5, spikePct: 47, Icon: Activity },
  { label: 'Afternoon', avg: 14.8, spikePct: 17, Icon: Flame },
  { label: 'Evening', avg: 29.4, spikePct: 53, Icon: Sunset },
] as const;

const DINNER_RANKINGS = [
  { name: 'Salmon + rice + veggies', n: 39, avg: 27.3, spike: 49 },
  { name: 'Burrito bowl', n: 42, avg: 27.9, spike: 55 },
  { name: 'Grilled fish tacos', n: 43, avg: 29.0, spike: 58 },
  { name: 'Chicken stir-fry + noodles', n: 39, avg: 30.1, spike: 51 },
  { name: 'Pasta + marinara', n: 28, avg: 30.4, spike: 61 },
  { name: 'Steak + sweet potato', n: 37, avg: 31.2, spike: 62 },
] as const;

const MORNING_AVG = 21.6;
const EVENING_AVG = 29.4;
const PCT_MORE = Math.round(((EVENING_AVG - MORNING_AVG) / MORNING_AVG) * 100);

export default function SteakSweetPotatoPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const maxTimeBar = Math.max(...TIME_OF_DAY.map((t) => t.avg));

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-orange-50/40 to-red-50/30">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%239a3412' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <article className="relative mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        {/* 1. Verdict */}
        <header className="mb-12 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-600 via-orange-600 to-amber-600 p-6 text-white shadow-lg shadow-orange-900/20 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/90">
            <Flame className="h-4 w-4" aria-hidden />
            Food Intelligence
            <span className="text-white/60">·</span>
            <Clock className="h-4 w-4" aria-hidden />
            Timing analysis
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-4xl">
            The Dinner Trap: Why Evening Meals Hit Harder Than You Think
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/95">
            Steak with sweet potato isn’t “junk food”—but in our data it carried the{' '}
            <strong>highest average glucose spike</strong> of any dinner we measured.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              High spike risk
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm backdrop-blur-sm">
              <Activity className="h-4 w-4" aria-hidden />
              Avg +31.2 mg/dL
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm backdrop-blur-sm">
              62% spike &gt;30
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-4 py-2 text-sm backdrop-blur-sm">
              n=37 · 9 users
            </span>
          </div>
        </header>

        {/* 2. The dinner problem */}
        <section className="mb-16" aria-labelledby="dinner-problem-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
              <Moon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="dinner-problem-heading" className="font-serif text-2xl font-bold text-stone-900">
                The dinner problem
              </h2>
              <p className="mt-2 text-stone-700">
                It’s tempting to blame the plate. But when we zoom out to{' '}
                <strong>all foods combined</strong>, evening still stands out: metabolism,
                hormones, and meal patterns stack against a flat glucose curve.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-800">
              Time of day — all foods (aggregated)
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Average post-meal rise and share of meals spiking above 30 mg/dL.
            </p>

            <div className="mt-6 space-y-4">
              {TIME_OF_DAY.map((row) => {
                const widthPct = (row.avg / maxTimeBar) * 100;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-stone-800">
                        <row.Icon className="h-4 w-4 text-orange-600" aria-hidden />
                        {row.label}
                      </span>
                      <span className="text-stone-600">
                        +{row.avg} mg/dL · {row.spikePct}% spiking
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.label === 'Evening'
                            ? 'bg-gradient-to-r from-orange-500 to-red-500'
                            : 'bg-gradient-to-r from-amber-400 to-orange-400'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3 rounded-xl border border-orange-100 bg-orange-50/80 p-4 text-sm text-orange-950">
              <Sunset className="h-5 w-5 shrink-0 text-orange-700" aria-hidden />
              <p>
                <strong>Evening vs morning (all foods):</strong> average spike is{' '}
                <strong>~{PCT_MORE}% higher</strong> at night (+{EVENING_AVG} vs +{MORNING_AVG} mg/dL).
                So this isn’t only about steak—it’s <em>dinner itself</em> working against you.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Sweet potato factor */}
        <section className="mb-16" aria-labelledby="sweet-potato-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="sweet-potato-heading" className="font-serif text-2xl font-bold text-stone-900">
                The sweet potato factor
              </h2>
              <p className="mt-2 text-stone-700">
                Sweet potatoes aren’t “white bread,” but glycemic index varies wildly—
                <strong> roughly 63–96</strong> depending on prep and portion. Bake or mash a big
                serving and you’re looking at a meaningful carb load—especially{' '}
                <strong>at night</strong>, when insulin sensitivity is typically lower.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex gap-3 text-sm text-stone-700">
              <Shield className="h-5 w-5 shrink-0 text-stone-500" aria-hidden />
              <p>
                <strong>Steak brings protein</strong>—which often blunts glucose excursions. So why
                didn’t it save the curve? The combo of{' '}
                <span className="text-orange-800 font-medium">high glycemic load from the potato</span>{' '}
                + <span className="text-orange-800 font-medium">evening insulin resistance</span>{' '}
                appears to overpower the buffering you’d hope for from protein alone.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Dinner rankings */}
        <section className="mb-16" aria-labelledby="rankings-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-800">
              <Activity className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="rankings-heading" className="font-serif text-2xl font-bold text-stone-900">
                Dinner rankings
              </h2>
              <p className="mt-2 text-stone-700">
                Among evening meals in our comparison set, <strong>steak + sweet potato</strong>{' '}
                sits at the <strong>top</strong>—meaning the worst average spike.{' '}
                <strong>Salmon with rice and veggies</strong> was the gentlest on average.
              </p>
            </div>
          </div>

          <ol className="space-y-3">
            {DINNER_RANKINGS.map((meal, i) => {
              const rank = i + 1;
              const isWorst = meal.name === 'Steak + sweet potato';
              return (
                <li
                  key={meal.name}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                    isWorst
                      ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50 ring-1 ring-red-200/60'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isWorst ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {rank}
                    </span>
                    <span className={`font-medium ${isWorst ? 'text-red-950' : 'text-stone-800'}`}>
                      {meal.name}
                      {isWorst && (
                        <span className="ml-2 text-xs font-normal text-red-700">(this page)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-stone-600">
                    <span>n={meal.n}</span>
                    <span>
                      avg <strong className="text-stone-900">+{meal.avg}</strong>
                    </span>
                    <span>{meal.spike}% &gt;30</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 5. What actually happens */}
        <section className="mb-16" aria-labelledby="distribution-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
              <Heart className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="distribution-heading" className="font-serif text-2xl font-bold text-stone-900">
                What actually happens
              </h2>
              <p className="mt-2 text-stone-700">
                Averages hide the spread. For steak + sweet potato, the distribution is{' '}
                <strong>skewed high</strong>—most people don’t land in the “moderate” middle.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Response buckets
              </p>
              <div className="mt-4 flex h-10 overflow-hidden rounded-lg">
                <div
                  className="flex items-center justify-center bg-emerald-200 text-xs font-medium text-emerald-900"
                  style={{ width: '22%' }}
                  title="Low &lt;20"
                >
                  22%
                </div>
                <div
                  className="flex items-center justify-center bg-amber-200 text-xs font-medium text-amber-900"
                  style={{ width: '22%' }}
                >
                  22%
                </div>
                <div
                  className="flex items-center justify-center bg-red-500 text-xs font-bold text-white"
                  style={{ width: '57%' }}
                >
                  57%
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  Low (&lt;20 mg/dL): <strong>22%</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-600" aria-hidden />
                  Moderate (20–35): <strong>22%</strong>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />
                  High (&gt;35): <strong>57%</strong>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Median &amp; quartiles (mg/dL)
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-stone-100 pb-2">
                  <dt className="text-stone-600">Median</dt>
                  <dd className="font-semibold text-stone-900">36.4</dd>
                </div>
                <div className="flex justify-between border-b border-stone-100 pb-2">
                  <dt className="text-stone-600">25th percentile</dt>
                  <dd className="font-semibold text-stone-900">23.0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-600">75th percentile</dt>
                  <dd className="font-semibold text-stone-900">39.9</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-stone-500">
                Median above the mean signals a right tail—consistent with that heavy “high spike”
                bucket.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Metabolic amplifier */}
        <section className="mb-16" aria-labelledby="metabolic-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-800">
              <Dumbbell className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="metabolic-heading" className="font-serif text-2xl font-bold text-stone-900">
                The metabolic state amplifier
              </h2>
              <p className="mt-2 text-stone-700">
                Same meal, different bodies. Members with more volatile day-to-day CGM patterns
                saw a far harsher response—<strong>dinner + fragile metabolic state = double whammy</strong>.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                CGM stable (n=34)
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">+29.3</p>
              <p className="mt-1 text-sm text-emerald-800">avg mg/dL · 59% spiking &gt;30</p>
            </div>
            <div className="rounded-2xl border border-red-300 bg-red-50/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-900">
                CGM volatile (n=3)
              </p>
              <p className="mt-2 text-3xl font-bold text-red-950">+52.5</p>
              <p className="mt-1 text-sm text-red-800">avg mg/dL · 100% spiking &gt;30</p>
            </div>
          </div>
        </section>

        {/* 7. What surprised us */}
        <section className="mb-16" aria-labelledby="surprise-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Lightbulb className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="surprise-heading" className="font-serif text-2xl font-bold text-stone-900">
                What surprised us
              </h2>
            </div>
          </div>

          <blockquote className="rounded-2xl border-l-4 border-amber-500 bg-white/90 py-4 pl-6 pr-4 text-stone-800 shadow-sm">
            <p className="text-lg leading-relaxed">
              We expected the <strong>high protein from steak</strong> to buffer the sweet potato’s
              glucose impact. <strong>It didn’t.</strong> The potato’s glycemic load, amplified by
              evening timing, overpowered the protein effect.{' '}
              <strong>Salmon with rice</strong>—which actually has <em>less</em> protein—performed
              better on average, possibly because{' '}
              <strong>omega-3–rich fat may support insulin sensitivity</strong> alongside a different
              starch profile than a big sweet potato.
            </p>
          </blockquote>
        </section>

        {/* 8. How to make dinner work */}
        <section className="mb-16" aria-labelledby="strategies-heading">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
              <Footprints className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 id="strategies-heading" className="font-serif text-2xl font-bold text-stone-900">
                How to make dinner work
              </h2>
              <p className="mt-2 text-stone-700">
                Small sequencing and timing shifts often beat “finding the perfect food.”
              </p>
            </div>
          </div>

          <ul className="space-y-4">
            {[
              {
                title: 'Walk after dinner',
                body: 'Post-meal movement is one of the most reliable levers to blunt a rise—often more impactful than micro-tweaks to the same plate.',
                icon: Footprints,
              },
              {
                title: 'Eat steak first, potato second',
                body: 'Front-loading protein and fiber can slow absorption; save the bulk of starch for after the savory anchor.',
                icon: UtensilsCrossed,
              },
              {
                title: 'Shrink the sweet potato',
                body: 'Portion drives glycemic load. Half a potato—or swapping part for non-starchy veg—changes the math fast.',
                icon: Flame,
              },
              {
                title: 'Add greens',
                body: 'A salad or sautéed vegetables adds volume and fiber with modest glucose cost.',
                icon: Heart,
              },
              {
                title: 'Eat dinner earlier',
                body: 'Shifting calories earlier in the day aligns better with typical circadian insulin sensitivity for many people.',
                icon: Clock,
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex gap-4 rounded-xl border border-orange-100 bg-white/90 p-4 shadow-sm"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden />
                <div>
                  <p className="font-semibold text-stone-900">{item.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 9. FAQ */}
        <section className="mb-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-serif text-2xl font-bold text-stone-900">
            FAQ
          </h2>
          <div className="mt-6 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {[
              {
                q: 'Why does dinner affect blood sugar more than breakfast?',
                a: 'Across our aggregated data for all foods, evening meals showed a higher average rise and a higher rate of large spikes than morning. Circadian insulin sensitivity and typical meal composition both play a role—your CGM can show whether that pattern holds for you.',
              },
              {
                q: 'Does eating dinner earlier improve glucose response?',
                a: 'Many members see smaller post-meal excursions when they avoid very late, carb-heavy meals. Earlier dinner is one lever; pairing it with a short walk is another.',
              },
              {
                q: 'If I eat the same food at lunch instead of dinner, will my spike be lower?',
                a: 'Not guaranteed—but in population aggregates, midday and afternoon windows looked milder than evening. The best test is your own repeated comparisons with CGM.',
              },
            ].map((faq, idx) => {
              const open = openFaq === idx;
              return (
                <div key={faq.q} className="px-4 py-1">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-stone-900 sm:text-base"
                    aria-expanded={open}
                  >
                    {faq.q}
                    {open ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-stone-500" aria-hidden />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-stone-500" aria-hidden />
                    )}
                  </button>
                  {open && <p className="pb-4 text-sm leading-relaxed text-stone-600">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 10. Data transparency + CTA */}
        <section
          className="mb-16 rounded-2xl border border-stone-200 bg-stone-900 p-6 text-stone-100 sm:p-8"
          aria-labelledby="data-heading"
        >
          <h2 id="data-heading" className="font-serif text-xl font-bold text-white">
            Data transparency
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-300">
            Figures are aggregated from Signos member CGM logs; exact meals vary in preparation and
            portion. Steak + sweet potato observations were{' '}
            <strong className="text-white">evening-only (37/37)</strong>. Comparators are dinner
            meals from the same analysis window. Subgroup sizes (e.g., volatile users, n=3) are
            small—treat them as directional, not definitive.
          </p>
          <Link
            href="https://www.signos.com"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Explore Signos
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        {/* 11. Internal links */}
        <section aria-labelledby="more-heading">
          <h2 id="more-heading" className="font-serif text-xl font-bold text-stone-900">
            More food intelligence
          </h2>
          <ul className="mt-4 space-y-2">
            <li>
              <Link
                href="/foods/smoothie-bowl"
                className="group inline-flex items-center gap-2 text-orange-800 hover:text-orange-600"
              >
                Smoothie bowl — breakfast stability breakdown
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                href="/foods/grilled-chicken-salad"
                className="group inline-flex items-center gap-2 text-orange-800 hover:text-orange-600"
              >
                Grilled chicken salad vs Big Mac — hidden carbs
                <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          </ul>
          <p className="mt-8 flex items-center gap-2 text-xs text-stone-500">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Published April 1, 2026
            <ArrowRight className="h-3 w-3 opacity-50" aria-hidden />
            Signos Food Intelligence
          </p>
        </section>
      </article>
    </div>
  );
}
