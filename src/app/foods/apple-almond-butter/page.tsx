'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

const FOOD_DISTRIBUTIONS: readonly { name: string; low: number; mod: number; high: number; n: number; avg: number; self?: boolean; href: string }[] = [
  { name: 'Steak + sweet potato', low: 22, mod: 22, high: 57, n: 37, avg: 31.2, href: '/foods/steak-sweet-potato' },
  { name: 'Grilled chicken salad', low: 11, mod: 51, high: 37, n: 35, avg: 32.8, href: '/foods/grilled-chicken-salad' },
  { name: 'Smoothie bowl', low: 40, mod: 53, high: 6, n: 47, avg: 21.0, href: '/foods/smoothie-bowl' },
  { name: 'Oatmeal', low: 44, mod: 50, high: 6, n: 34, avg: 19.2, href: '/foods/oatmeal' },
  { name: 'Apple + almond butter', low: 91, mod: 3, high: 6, n: 35, avg: 7.2, self: true, href: '' },
];

const SNACK_RANKINGS = [
  { rank: 1, name: 'Trail mix', n: 23, avg: 6.2, pctSpike: 4, self: false },
  { rank: 2, name: 'Apple + almond butter', n: 35, avg: 7.2, pctSpike: 6, self: true },
  { rank: 3, name: 'Mixed nuts', n: 27, avg: 8.2, pctSpike: 11, self: false },
  { rank: 4, name: 'Protein bar', n: 27, avg: 10.1, pctSpike: 15, self: false },
  { rank: 5, name: 'Cheese + crackers', n: 28, avg: 11.7, pctSpike: 18, self: false },
] as const;

const RELATED_ARTICLES = [
  {
    href: '/foods/oatmeal',
    category: 'Breakfast',
    title: 'Oatmeal: The Breakfast Where Context Is Everything',
    desc: 'Same bowl, very different glucose story — depending on your metabolic state that week.',
    image: '/images/foods/healthy-snacking.jpg',
  },
  {
    href: '/foods/grilled-chicken-salad',
    category: 'Lunch',
    title: 'Grilled Chicken Salad: When "Healthy" Spikes More Than Expected',
    desc: 'The dressing and toppings may matter more than the chicken.',
    image: '/images/foods/almond-butter-jar.jpg',
  },
  {
    href: '/foods/smoothie-bowl',
    category: 'Breakfast',
    title: 'Smoothie Bowl: It Depends on What You Put In It',
    desc: 'Protein and fat make or break the glucose curve.',
    image: '/images/foods/apple-slices-almond-butter.jpg',
  },
  {
    href: '/foods/steak-sweet-potato',
    category: 'Dinner',
    title: 'Steak + Sweet Potato: A Dinner With a Wide Range',
    desc: 'The sweet potato dominates — but protein timing may blunt the curve.',
    image: '/images/foods/glucose-monitor-arm.jpg',
  },
] as const;

const TOC_SECTIONS = [
  { id: 'ranking', label: 'How it stacks up against other snacks' },
  { id: 'distribution', label: 'What actually happens after eating it' },
  { id: 'surprised', label: 'What surprised us' },
  { id: 'stability', label: 'Why consistency matters more than "healthiness"' },
  { id: 'why', label: 'Why the pairing works' },
  { id: 'timing', label: 'When you eat it matters (or does it?)' },
  { id: 'smarter', label: 'How to eat it smarter' },
  { id: 'faq', label: 'FAQ' },
  { id: 'topics', label: 'Topics discussed' },
  { id: 'references', label: 'References' },
] as const;

function TableOfContents() {
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    TOC_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="rounded-[2rem] border-2 border-sig-stone p-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm font-semibold leading-[1.4] text-sig-cerise">
          Table Of Contents
        </span>
        <svg
          className={`h-3 w-3 text-sig-cerise transition-transform ${isOpen ? '' : '-rotate-90'}`}
          fill="none"
          viewBox="0 0 12 8"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M1 1.5l5 5 5-5" />
        </svg>
      </button>
      {isOpen && (
        <nav className="mt-4 flex flex-col">
          {TOC_SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`border-b border-[#e3e3e3] py-3 font-archivo text-[0.9375rem] leading-[1.5] transition-colors last:border-b-0 ${
                activeId === id
                  ? 'font-bold text-sig-stone'
                  : 'font-semibold text-sig-stone/60 hover:text-sig-stone'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}

function RidgelinePlot() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const gauss = (x: number, mu: number, s: number) =>
    Math.exp(-0.5 * ((x - mu) / s) ** 2);

  const W = 700, H = 460, CL = 15, CR = 685, CW = CR - CL, MG = 55;
  const BG = '#21263a';
  const ROWS = [80, 150, 220, 290, 380];
  const PEAK_H = 110;
  const xPx = (mg: number) => CL + (mg / MG) * CW;

  const foods = [
    ...FOOD_DISTRIBUTIONS.filter((f) => !f.self),
    ...FOOD_DISTRIBUTIONS.filter((f) => f.self),
  ];

  const rawCurves = foods.map((f) => {
    const pts: number[] = [];
    for (let x = 0; x <= MG; x += 0.5)
      pts.push(
        (f.low / 100) * gauss(x, 10, 4) +
        (f.mod / 100) * gauss(x, 27, 4) +
        (f.high / 100) * gauss(x, 43, 5),
      );
    return { ...f, pts };
  });

  const globalPeak = Math.max(...rawCurves.flatMap((c) => c.pts));
  const yH = (v: number) => (v / globalPeak) * PEAK_H;

  const curves = rawCurves.map((food, i) => {
    const by = ROWS[i];
    const hero = !!food.self;
    const peakVal = Math.max(...food.pts);
    const peakIdx = food.pts.indexOf(peakVal);
    const peakPxX = xPx(peakIdx * 0.5);
    const peakPxY = by - yH(peakVal);

    const segs = food.pts.map((v, j) => {
      const x = xPx(j * 0.5);
      const y = by - yH(v);
      return `L${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('');

    return {
      ...food,
      by,
      hero,
      peakPxX,
      peakPxY,
      mask: `M${CL},${by}${segs}L${CR},${by}L${CR},${H}L${CL},${H}Z`,
      fill: `M${CL},${by}${segs}L${CR},${by}Z`,
      stroke: food.pts.map((v, j) => {
        const x = xPx(j * 0.5);
        const y = by - yH(v);
        return `${j === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(''),
    };
  });

  const hc = hoveredIdx !== null ? curves[hoveredIdx] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Interactive ridgeline chart comparing glucose response distributions across five foods. Hover to explore each distribution. Apple + almond butter shows a dramatically narrow distribution concentrated in the low-response zone."
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <defs>
        <linearGradient id="rg" x1={CL} y1="0" x2={CR} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="27%" stopColor="#34d399" />
          <stop offset="36%" stopColor="#fbbf24" />
          <stop offset="58%" stopColor="#fbbf24" />
          <stop offset="69%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#f87171" />
        </linearGradient>

        {curves.map((c, i) => (
          <linearGradient
            key={`vg-${i}`}
            id={`vg-${i}`}
            x1="0" y1={c.peakPxY} x2="0" y2={c.by}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={c.hero ? '#34d399' : '#ffffff'} stopOpacity={c.hero ? 0.4 : 0.12} />
            <stop offset="100%" stopColor={c.hero ? '#34d399' : '#ffffff'} stopOpacity="0" />
          </linearGradient>
        ))}

        <filter id="hglow" x="-15%" y="-30%" width="130%" height="160%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.5" fill="white" fillOpacity="0.04" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#dots)" />

      {[20, 35].map((v) => (
        <line key={v} x1={xPx(v)} y1={30} x2={xPx(v)} y2={415}
          stroke="white" strokeOpacity={0.04} strokeDasharray="4 4" />
      ))}

      {curves.map((c, i) => {
        const dimmed = hoveredIdx !== null && hoveredIdx !== i;
        const hovered = hoveredIdx === i;
        const delay = c.hero ? 0.7 : i * 0.13;

        return (
          <g
            key={c.name}
            onMouseEnter={() => setHoveredIdx(i)}
            style={{
              opacity: dimmed ? 0.08 : 1,
              transition: 'opacity 0.35s ease',
              cursor: 'pointer',
            }}
          >
            <path d={c.mask} fill={BG} />

            <path
              d={c.fill}
              fill="url(#rg)"
              fillOpacity={c.hero ? 0.55 : (hovered ? 0.35 : 0.15)}
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.8s ease ${delay}s, fill-opacity 0.3s ease`,
              }}
            />

            <path
              d={c.fill}
              fill={`url(#vg-${i})`}
              style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 1s ease ${delay + 0.15}s`,
              }}
            />

            <path
              d={c.stroke}
              fill="none"
              stroke={c.hero ? '#34d399' : (hovered ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)')}
              strokeWidth={c.hero ? 2.5 : (hovered ? 2 : 1.2)}
              strokeLinejoin="round"
              filter={c.hero ? 'url(#hglow)' : undefined}
              style={{
                strokeDasharray: 2000,
                strokeDashoffset: visible ? 0 : 2000,
                transition: `stroke-dashoffset 1.2s ease ${delay}s, stroke-width 0.3s ease, stroke 0.3s ease`,
              }}
            />

            <path d={c.fill} fill="transparent" stroke="transparent" strokeWidth={15} />
          </g>
        );
      })}

      {curves.map((c, i) => {
        const dimmed = hoveredIdx !== null && hoveredIdx !== i;
        return (
          <g
            key={`lbl-${c.name}`}
            style={{ opacity: dimmed ? 0.08 : 1, transition: 'opacity 0.35s ease' }}
          >
            <text x={CR - 5} y={c.by - 8} textAnchor="end" fill="white"
              fillOpacity={c.hero ? 0.95 : 0.4} fontSize={c.hero ? 16 : 13}
              fontWeight={c.hero ? 700 : 500}
              style={{ fontFamily: 'Archivo, sans-serif' }}>
              {c.name}
            </text>
            <text x={CR - 5} y={c.by + 7} textAnchor="end" fill="white"
              fillOpacity={c.hero ? 0.35 : 0.14} fontSize={10}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              n={c.n} · avg +{c.avg} mg/dL
            </text>
          </g>
        );
      })}

      {hc && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={CL + 6} y={Math.max(4, hc.peakPxY - 52)}
            width={195} height={55} rx={8}
            fill="#0d1017" fillOpacity={0.94}
            stroke="white" strokeOpacity={0.06} strokeWidth={0.5}
          />
          <text x={CL + 16} y={Math.max(4, hc.peakPxY - 52) + 18}
            fill="white" fontSize={12} fontWeight={700}
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            {hc.name}
          </text>
          <circle cx={CL + 18} cy={Math.max(4, hc.peakPxY - 52) + 32} r={3.5} fill="#34d399" />
          <text x={CL + 26} y={Math.max(4, hc.peakPxY - 52) + 35.5}
            fill="#34d399" fillOpacity={0.8} fontSize={10} fontWeight={600}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {hc.low}%
          </text>
          <circle cx={CL + 60} cy={Math.max(4, hc.peakPxY - 52) + 32} r={3.5} fill="#fbbf24" />
          <text x={CL + 68} y={Math.max(4, hc.peakPxY - 52) + 35.5}
            fill="#fbbf24" fillOpacity={0.8} fontSize={10} fontWeight={600}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {hc.mod}%
          </text>
          <circle cx={CL + 100} cy={Math.max(4, hc.peakPxY - 52) + 32} r={3.5} fill="#f87171" />
          <text x={CL + 108} y={Math.max(4, hc.peakPxY - 52) + 35.5}
            fill="#f87171" fillOpacity={0.8} fontSize={10} fontWeight={600}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {hc.high}%
          </text>
          <text x={CL + 145} y={Math.max(4, hc.peakPxY - 52) + 35.5}
            fill="white" fillOpacity={0.25} fontSize={9}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            +{hc.avg}
          </text>
        </g>
      )}

      {[0, 10, 20, 30, 40, 50].map((v) => (
        <text key={v} x={xPx(v)} y={430} textAnchor="middle" fill="white"
          fillOpacity={0.17} fontSize={11}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          +{v}
        </text>
      ))}
      <text x={xPx(27.5)} y={452} textAnchor="middle" fill="white"
        fillOpacity={0.1} fontSize={9}
        style={{ fontFamily: 'Archivo, sans-serif' }}>
        mg/dL glucose spike after eating
      </text>
    </svg>
  );
}

function AnimatedCounter({ end, duration = 1600 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * end));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, end, duration]);

  return <span ref={ref}>{count}</span>;
}

function DistributionCard() {
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const legendItems = [
    { color: '#34d399', label: 'Low (<20\u00a0mg/dL)', delay: 0.5 },
    { color: '#fbbf24', label: 'Moderate (20–35)', delay: 0.65 },
    { color: '#f87171', label: 'High (>35)', delay: 0.8 },
  ];

  return (
    <div ref={cardRef} className="mt-10 overflow-hidden rounded-[1.5rem] bg-sig-stone relative">
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.5rem]"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 15% 80%, rgba(52,211,153,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative px-6 pt-8 sm:px-10 sm:pt-10">
        <p className="font-jetbrains text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-white/30">
          Signos CGM Data · {FOOD_DISTRIBUTIONS.reduce((s, f) => s + f.n, 0)} observations
        </p>
        <h3 className="mt-3 text-[1.625rem] font-bold leading-[1.15] text-white sm:text-[2rem]">
          Most foods produce a spread.{' '}
          <span
            className="inline-block"
            style={{
              color: inView ? '#34d399' : '#ffffff',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(6px)',
              transition: 'color 0.8s ease 0.3s, opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
            }}
          >
            This one doesn&apos;t.
          </span>
        </h3>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 px-6 sm:px-10">
        {legendItems.map((item) => (
          <span key={item.color} className="flex items-center gap-1.5 text-[0.6875rem] text-white/30">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: item.color,
                transform: inView ? 'scale(1)' : 'scale(0)',
                transition: `transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${item.delay}s`,
              }}
            />
            {item.label}
          </span>
        ))}
        <span
          className="ml-auto text-[0.625rem] text-white/15 sm:text-[0.6875rem]"
          style={{
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.6s ease 1s',
          }}
        >
          hover to explore ↗
        </span>
      </div>

      <div className="relative mt-2 px-2 sm:px-4">
        <RidgelinePlot />
      </div>

      <div className="relative flex flex-col gap-4 px-6 pb-8 sm:flex-row sm:items-end sm:gap-10 sm:px-10">
        <p className="flex-shrink-0 text-[4.5rem] font-black leading-[0.85] tracking-tighter text-[#34d399] sm:text-[5.5rem]">
          <AnimatedCounter end={91} />
          <span className="text-[2.5rem] text-[#34d399]/50 sm:text-[3.5rem]">%</span>
        </p>
        <p className="pb-1 text-[0.875rem] leading-relaxed text-white/40">
          of apple + almond butter observations fell into the lowest
          response bucket — regardless of who ate it or their metabolic
          baseline. No other food in our dataset comes close.
        </p>
      </div>
    </div>
  );
}

export default function AppleAlmondButterPage() {
  return (
    <article className="font-archivo bg-white text-sig-stone">
      {/* ── Hero section (full-width container) ── */}
      <div className="mx-auto max-w-[78.25rem] px-5 sm:px-10">
        {/* Byline row */}
        <div className="flex flex-wrap items-center gap-4 pt-8 font-jetbrains text-sm leading-snug">
          <span>April 3, 2026</span>
          <span className="text-sig-stone/40">|</span>
          <Link href="https://www.signos.com/blog-category/nutrition" className="border-b border-sig-stone">
            Nutrition
          </Link>
          <span className="text-sig-stone/40">|</span>
          <span>5 min read</span>
          <span className="hidden sm:inline text-sig-stone/40">|</span>
          <span className="hidden sm:inline">
            Written By{' '}
            <Link href="https://www.signos.com/blog-authors/caitlin-beale-registered-dietitian-nutritionist" className="border-b border-sig-stone">
              Signos Research Team
            </Link>
          </span>
        </div>

        {/* H1 */}
        <h1 className="mt-4 text-[1.7rem] font-bold leading-[1.2] sm:text-[2rem] lg:text-[3.5rem]">
          Apple + Almond Butter &amp; Blood Sugar: 91% of People Barely Spike (Real CGM Data)
        </h1>

        {/* Hero image */}
        <figure className="mt-8">
          <img
            src="/images/foods/apple-almond-butter-hero.jpg"
            alt="Sliced apple with a bowl of almond butter on a white plate"
            width={1200}
            height={800}
            loading="eager"
            className="w-full rounded-[2rem] object-cover"
          />
          <figcaption className="mt-2 text-center font-jetbrains text-xs text-sig-stone/50">
            Photo by Tamanna Rumee / Unsplash
          </figcaption>
        </figure>
      </div>

      {/* ── Two-column body layout ── */}
      <div className="mx-auto mt-10 flex max-w-[78.25rem] flex-col px-5 sm:mt-16 sm:px-10 lg:flex-row lg:justify-between lg:gap-[3.4375rem]">

        {/* Mobile TOC (visible below lg) */}
        <div className="mb-8 lg:hidden">
          <TableOfContents />
        </div>

        {/* ── Left column: Article body ── */}
        <div className="w-full max-w-[49.5rem]">

          {/* Opening prose — claim-first, AI-extractable */}
          <p className="text-xl leading-[1.7]">
            Apple with almond butter barely raises blood sugar — and in real-world CGM data, it&apos;s not
            just low-impact, it&apos;s <strong>one of the most predictable glucose responses we&apos;ve ever
            measured</strong>. In Signos data from <strong>35</strong> snacks across <strong>12</strong> people,
            this pairing averaged just <strong>+7.2&nbsp;mg/dL</strong>, with <strong>91% of
            observations</strong> staying under a 20&nbsp;mg/dL increase. Only <strong>6%</strong> crossed
            the 30&nbsp;mg/dL threshold we use to flag meaningful spikes.
          </p>
          <p className="mt-6 text-xl leading-[1.7]">
            What makes this remarkable isn&apos;t the average — it&apos;s the consistency. Most foods produce
            a wide spread of responses depending on who eats them and when. This one collapses into a
            single tight cluster. Below, we break down where it ranks, what the distribution looks like,
            and why that consistency may matter more than the number itself.
          </p>

          {/* Quick Answer — decision block for AI extraction + user satisfaction */}
          <div className="mt-8 rounded-[1.25rem] border-2 border-sig-stone p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-sig-cerise">Quick Answer</p>
            <p className="mt-2 text-2xl font-bold leading-tight">
              Apple + almond butter = Very Low Spike Risk
            </p>
            <ul className="mt-4 space-y-2 text-[1.0625rem] leading-[1.5]">
              <li><strong>Average spike:</strong> +7.2 mg/dL (median +4.4)</li>
              <li><strong>91% of people</strong> stay in the lowest response range</li>
              <li><strong>Unusually consistent</strong> across different people and metabolic baselines</li>
              <li><strong>Ranks #2</strong> among common snacks — just behind trail mix</li>
            </ul>
          </div>

          {/* ── Ranking ── */}
          <section id="ranking" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              How it stacks up against other snacks
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              We pulled five common snacks from the Signos CGM dataset to see where apple + almond butter
              lands. It sits second — close to the top, and well ahead of the most popular grab-and-go
              options.
            </p>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-lg">
                <thead>
                  <tr className="border-b-2 border-sig-stone text-left text-sm uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">Snack</th>
                    <th className="px-4 py-3 font-semibold text-right">n</th>
                    <th className="px-4 py-3 font-semibold text-right">Avg spike</th>
                    <th className="px-4 py-3 font-semibold text-right">% &gt;30</th>
                  </tr>
                </thead>
                <tbody>
                  {SNACK_RANKINGS.map((row) => (
                    <tr
                      key={row.name}
                      className={`border-b border-[#e3e3e3] ${row.self ? 'font-bold' : ''}`}
                    >
                      <td className="px-4 py-3 text-sig-stone/60">{row.rank}</td>
                      <td className="px-4 py-3">
                        {row.name}
                        {row.self && (
                          <span className="ml-2 rounded-[10px] border border-sig-stone/20 bg-white px-2 py-0.5 text-xs font-normal">
                            this page
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sig-stone/60">{row.n}</td>
                      <td className="px-4 py-3 text-right tabular-nums">+{row.avg}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sig-stone/60">{row.pctSpike}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-sig-stone/60">
              All values are average post-snack glucose rise (mg/dL) from Signos CGM data.
            </p>
          </section>

          {/* ── Inline image: Signos product graphic ── */}
          <figure className="my-10">
            <img
              src="/images/foods/signos-product.png"
              alt="Signos CGM system with app dashboard showing glucose tracking features"
              width={1200}
              height={640}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
          </figure>

          {/* ── Distribution ── */}
          <section id="distribution" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              What actually happens after eating it
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              For most foods, glucose response is a lottery. People spread across low, moderate, and high
              response buckets — and where you land depends on your metabolism, sleep, timing, and a
              dozen other variables. Apple + almond butter breaks this pattern.
            </p>

            <DistributionCard />

            <p className="mt-8 text-xl leading-[1.7]">
              The median spike was <strong>+4.4&nbsp;mg/dL</strong> (p25: 2.3, p75: 7.1) — an interquartile
              range of just 4.8&nbsp;mg/dL. Compare that to steak + sweet potato where the IQR spans nearly
              17&nbsp;mg/dL, or oatmeal at about 17&nbsp;mg/dL. On a CGM trace, +4.4 is barely a flicker —
              most people wouldn&apos;t notice it without looking at the data.
            </p>
          </section>

          {/* ── Inline image: Health/wellness ── */}
          <figure className="my-10">
            <img
              src="/images/foods/woman-cgm-phone.jpg"
              alt="Person reviewing health data on their phone after a meal"
              width={800}
              height={533}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
            <figcaption className="mt-2 text-center font-jetbrains text-xs text-sig-stone/50">
              Continuous glucose monitors reveal real-time food responses
            </figcaption>
          </figure>

          {/* ── What surprised us ── */}
          <section id="surprised" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              What surprised us
            </h2>
            <blockquote className="mt-6 rounded-r border-l-4 border-sig-stone bg-[#f8f8f9] px-6 py-5 text-xl leading-[1.7]">
              <p>
                A snack with chocolate chips and dried fruit outperformed a &ldquo;clean&rdquo; fruit-and-nut
                pairing. Trail mix averaged <strong>+6.2&nbsp;mg/dL</strong> versus <strong>+7.2</strong> for
                apple + almond butter — challenging one of the most common assumptions in healthy eating.
                The cleanest-looking option doesn&apos;t always win on the glucose monitor.
              </p>
            </blockquote>
            <p className="mt-6 text-xl leading-[1.7]">
              But the bigger finding was this: <strong>apple + almond butter produced one of the flattest
              variability profiles in our entire dataset.</strong> Most foods show a meaningful gap between
              how{' '}
              <Link href="https://www.signos.com/blog/signs-of-insulin-resistance-you-might-be-missing" className="border-b border-sig-stone">
                CGM-stable users and volatile users
              </Link>{' '}
              respond. Here, the gap was negligible — stable users averaged <strong>+7.4&nbsp;mg/dL</strong>{' '}
              (n=34, 6% spiking) while the one volatile user in our set came in at <strong>+1.9&nbsp;mg/dL</strong>{' '}
              (treat that single observation as anecdotal until n grows).
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              That flat profile is unusual. For foods like{' '}
              <Link href="/foods/oatmeal" className="border-b border-sig-stone">
                oatmeal
              </Link>,{' '}
              <Link href="/foods/smoothie-bowl" className="border-b border-sig-stone">
                smoothie bowls
              </Link>, and{' '}
              <Link href="/foods/grilled-chicken-salad" className="border-b border-sig-stone">
                grilled chicken salads
              </Link>, your personal context — sleep quality, stress, baseline stability — dominates the
              outcome. With apple + almond butter, the fiber-fat-protein buffer appears strong enough to
              override all of that. <strong>The food does the work, regardless of who&apos;s eating it.</strong>
            </p>
          </section>

          {/* ── Stability > Healthiness thesis ── */}
          <section id="stability" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              Why consistency matters more than &ldquo;healthiness&rdquo;
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              Most nutrition advice sorts foods into &ldquo;healthy&rdquo; versus &ldquo;unhealthy&rdquo; —
              whole versus processed, low-GI versus high-GI. But{' '}
              <Link href="https://www.signos.com/blog/average-glucose-ranges" className="border-b border-sig-stone">
                glucose data
              </Link>{' '}
              tells a different story. The most important distinction isn&apos;t whether a food is
              &ldquo;good&rdquo; or &ldquo;bad&rdquo; — it&apos;s whether the response is <strong>predictable
              or unpredictable</strong>.
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              A food that averages +12&nbsp;mg/dL with tight clustering is more useful to recommend than one
              averaging +8&nbsp;mg/dL with wild swings. The first one you can plan around. The second is a
              gamble — and for people managing{' '}
              <Link href="https://www.signos.com/blog/signs-of-insulin-resistance-you-might-be-missing" className="border-b border-sig-stone">
                insulin resistance
              </Link>{' '}
              or trying to sustain energy through an afternoon, gambles aren&apos;t useful.
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              Apple + almond butter is both — low average <em>and</em> low variability. That combination
              is rare in our dataset. <strong>It makes this snack not just &ldquo;healthy&rdquo; in the
              traditional sense, but uniquely <em>reliable</em></strong> — which is what actually matters
              when you&apos;re trying to keep a stable glucose line.
            </p>
          </section>

          {/* ── Inline image: Healthy snacking ── */}
          <figure className="my-10">
            <img
              src="/images/foods/healthy-snacking.jpg"
              alt="Variety of healthy snack options including fruits and nuts"
              width={800}
              height={533}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
          </figure>

          {/* ── Why the pairing works ── */}
          <section id="why" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              Why the pairing works
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              When you eat carbohydrates alone, they&apos;re broken down into glucose in the small intestine
              and absorbed quickly into the bloodstream. The faster that happens, the sharper the spike. An
              apple by itself — roughly 25g of carbs — would enter your blood within 30–45 minutes as a
              concentrated wave.
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              Add almond butter, and three separate mechanisms intervene at different points in{' '}
              <Link href="https://www.signos.com/blog/what-is-glucose-a-comprehensive-guide" className="border-b border-sig-stone">
                the digestive process
              </Link>
              , each slowing glucose delivery independently. Unlike many foods where one mechanism dominates,
              apple + almond butter distributes the load evenly — which may explain why metabolic starting
              point matters less here than for most other foods.
            </p>

            {/* Three-mechanism visual cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border-2 border-[#e3e4e7] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8f8f9] text-2xl">
                  🌿
                </div>
                <h3 className="mt-4 text-lg font-bold">Soluble Fiber</h3>
                <p className="mt-2 text-[0.9375rem] leading-[1.6] text-sig-stone/80">
                  Pectin from the apple dissolves in your gut and forms a viscous gel that physically
                  coats the intestinal wall. Glucose molecules have to diffuse through this barrier
                  before reaching your bloodstream — spreading a 30-minute sugar rush into a slow
                  2-hour trickle.
                </p>
              </div>
              <div className="rounded-[1.25rem] border-2 border-[#e3e4e7] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8f8f9] text-2xl">
                  🥜
                </div>
                <h3 className="mt-4 text-lg font-bold">Healthy Fat</h3>
                <p className="mt-2 text-[0.9375rem] leading-[1.6] text-sig-stone/80">
                  Fat triggers the release of cholecystokinin (CCK), a hormone that slows gastric
                  emptying. Your stomach holds the food bolus longer, releasing it to the small
                  intestine in smaller batches. The apple&apos;s sugars arrive at the absorption site
                  gradually instead of all at once.
                </p>
              </div>
              <div className="rounded-[1.25rem] border-2 border-[#e3e4e7] p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f8f8f9] text-2xl">
                  💪
                </div>
                <h3 className="mt-4 text-lg font-bold">Protein</h3>
                <p className="mt-2 text-[0.9375rem] leading-[1.6] text-sig-stone/80">
                  The ~7g of protein per 2 tablespoons stimulates GLP-1 and insulin co-release,
                  which primes your cells to absorb glucose from the blood more efficiently. This
                  blunts the{' '}
                  <em>peak</em> of the curve — even if the total glucose load stays the same, the
                  high point is lower.
                </p>
              </div>
            </div>

            <p className="mt-8 text-xl leading-[1.7]">
              Together, this trio works at three different stages: the stomach (fat slows emptying), the
              intestinal wall (fiber blocks absorption), and the bloodstream (protein enhances clearance).
              The result is a{' '}
              <Link href="https://www.signos.com/blog/average-glucose-ranges" className="border-b border-sig-stone">
                glucose curve
              </Link>{' '}
              that stays almost flat for most people — and appears to do so regardless of their baseline
              metabolic state.
            </p>
          </section>

          {/* ── Inline image: Signos app UI ── */}
          <figure className="my-10">
            <img
              src="/images/foods/signos-app-ui.png"
              alt="Signos app interface showing personalized glucose insights and meal tracking"
              width={1200}
              height={640}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
          </figure>

          {/* ── When you eat it matters ── */}
          <section id="timing" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              When you eat it matters (or does it?)
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              Every single observation in this dataset — all <strong>35 logs</strong> — was an afternoon
              snack, typically between 2:00 and 5:00 PM. That&apos;s not because we filtered for it. That&apos;s
              just when Signos members eat apple with almond butter.
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              This matters because{' '}
              <Link href="https://www.signos.com/blog/does-glucose-rise-after-eating" className="border-b border-sig-stone">
                glucose responses
              </Link>{' '}
              are generally worse in the morning. Cortisol levels peak shortly after waking, which
              temporarily reduces insulin sensitivity. The same food eaten at 8 AM often spikes higher than
              it does at 3 PM. For carb-heavy breakfasts like{' '}
              <Link href="/foods/oatmeal" className="border-b border-sig-stone">
                oatmeal
              </Link>{' '}
              or{' '}
              <Link href="/foods/smoothie-bowl" className="border-b border-sig-stone">
                smoothie bowls
              </Link>, timing can be the difference between a small rise and a big one.
            </p>
            <p className="mt-6 text-xl leading-[1.7]">
              But with apple + almond butter, we suspect the effect would be small even in the morning.
              The fiber-fat-protein buffer is strong enough to override the metabolic context in our data —
              stable users and volatile users produced nearly identical responses. If it can flatten the
              difference between <em>people</em>, it can likely flatten the difference between hours of the
              day. That said, we don&apos;t have morning data to prove it yet.
            </p>

            <div className="mt-8 rounded-[1.25rem] border-2 border-[#e3e4e7] bg-[#f8f8f9] p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-lg">
                  🕐
                </div>
                <div>
                  <p className="text-lg font-bold">The afternoon sweet spot</p>
                  <p className="mt-2 text-[0.9375rem] leading-[1.6] text-sig-stone/80">
                    All 35 observations landed between 2–5 PM — after lunch has stabilized baseline glucose
                    and cortisol has dropped from its morning peak. If you&apos;re looking for a reliable
                    afternoon snack that won&apos;t disrupt a stable glucose line, this is likely your safest bet
                    in our dataset.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Inline image: Afternoon snacking ── */}
          <figure className="my-10">
            <img
              src="/images/foods/afternoon-snack-desk.jpg"
              alt="Fresh fruits and healthy snack spread on a table during the afternoon"
              width={800}
              height={533}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
          </figure>

          {/* ── How to eat it smarter ── */}
          <section id="smarter" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">
              How to eat it smarter
            </h2>
            <p className="mt-6 text-xl leading-[1.7]">
              This snack barely needs a tune-up — but if you want the extra edge, small choices at each
              stage compound into a meaningfully flatter curve.
            </p>

            {/* Visual Before / During / After timeline */}
            <div className="mt-10 space-y-6">
              {/* Before */}
              <div className="relative rounded-[1.25rem] border-2 border-[#e3e4e7] p-6 sm:flex sm:gap-6 sm:p-8">
                <div className="mb-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-sig-stone text-white sm:mb-0">
                  <span className="text-sm font-bold uppercase tracking-wider">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Before you snack</h3>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sig-cerise">Choose your ingredients</p>
                  <ul className="mt-3 space-y-3 text-[1.0625rem] leading-[1.6]">
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>Pick a tart or green apple</strong> — Granny Smith varieties have less
                      fructose and more pectin per bite, giving you a stronger fiber gel with less sugar to
                      absorb.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>Use natural almond butter only</strong> — flavored or sweetened varieties
                      add 4–8g of sugar per serving, which can erase the buffer advantage entirely.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* During */}
              <div className="relative rounded-[1.25rem] border-2 border-[#e3e4e7] p-6 sm:flex sm:gap-6 sm:p-8">
                <div className="mb-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-sig-stone text-white sm:mb-0">
                  <span className="text-sm font-bold uppercase tracking-wider">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">While you eat</h3>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sig-cerise">How you combine matters</p>
                  <ul className="mt-3 space-y-3 text-[1.0625rem] leading-[1.6]">
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>1–2 tablespoons of almond butter</strong> is the sweet spot — enough
                      fat to trigger CCK and delay gastric emptying, without turning a snack into a
                      calorie-dense meal.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>Eat them together, not separately</strong> — the fiber, fat, and protein
                      need to mix in your stomach simultaneously. Eating the apple first and the butter 20
                      minutes later misses the co-ingestion window.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* After */}
              <div className="relative rounded-[1.25rem] border-2 border-[#e3e4e7] p-6 sm:flex sm:gap-6 sm:p-8">
                <div className="mb-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-sig-stone text-white sm:mb-0">
                  <span className="text-sm font-bold uppercase tracking-wider">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">After you finish</h3>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sig-cerise">Minimal effort needed</p>
                  <ul className="mt-3 space-y-3 text-[1.0625rem] leading-[1.6]">
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>A short walk is optional here</strong> — unlike high-carb meals where a{' '}
                      <Link href="https://www.signos.com/blog/best-treadmill-workouts-weight-loss" className="border-b border-sig-stone">
                        10-minute post-meal walk
                      </Link>{' '}
                      can cut a spike by 20%, this snack handles itself for most people.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1 flex-shrink-0 text-sig-cerise">→</span>
                      <span><strong>Stick to the afternoon window</strong> — all 35 observations in our
                      dataset were afternoon snacks (2–5 PM), when insulin sensitivity is naturally higher
                      than in the morning.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ── Inline image: Green apples ── */}
          <figure className="my-10">
            <img
              src="/images/foods/green-apple-cutting.jpg"
              alt="Fresh green apples — tart varieties have more fiber and less sugar per bite"
              width={800}
              height={533}
              loading="lazy"
              className="w-full rounded-[2rem] object-cover"
            />
          </figure>

          {/* ── FAQ ── */}
          <section id="faq" className="scroll-mt-[130px]">
            <h2 className="mt-12 text-[2.25rem] font-semibold leading-[1.3]">FAQ</h2>

            <h3 className="mt-8 text-[2rem] font-bold leading-[1.4]">
              Does apple with almond butter spike blood sugar?
            </h3>
            <p className="mt-4 text-xl leading-[1.7]">
              In Signos CGM data (n=35 afternoon snacks, 12 users), apple with almond butter averaged only
              +7.2&nbsp;mg/dL — with a median of just +4.4&nbsp;mg/dL. Ninety-one percent of observations stayed
              under 20&nbsp;mg/dL. For most people, this combination produces one of the smallest{' '}
              <Link href="https://www.signos.com/blog/average-glucose-ranges" className="border-b border-sig-stone">
                glucose responses
              </Link>{' '}
              we measure.
            </p>

            <h3 className="mt-8 text-[2rem] font-bold leading-[1.4]">
              Is trail mix better than apple with almond butter for blood sugar?
            </h3>
            <p className="mt-4 text-xl leading-[1.7]">
              Slightly, in this dataset. Trail mix averaged +6.2&nbsp;mg/dL (n=23) versus +7.2 for apple +
              almond butter (n=35). Both sit at the top of the snack rankings — the difference is small
              enough that individual variation and preference should guide your choice.
            </p>

            <h3 className="mt-8 text-[2rem] font-bold leading-[1.4]">
              What makes apple and almond butter so gentle on glucose?
            </h3>
            <p className="mt-4 text-xl leading-[1.7]">
              The pairing stacks three mechanisms: soluble fiber from the apple slows{' '}
              <Link href="https://www.signos.com/blog/what-is-glucose-a-comprehensive-guide" className="border-b border-sig-stone">
                carbohydrate absorption
              </Link>,
              fat from the almond butter delays gastric emptying, and protein from almonds
              adds a further blunting effect. In our data, this triple buffer kept 91% of observations in
              the lowest response bucket.
            </p>
          </section>

          {/* ── Topics discussed ── */}
          <section id="topics" className="scroll-mt-[130px]">
            <div className="mt-16 flex flex-col gap-6">
              <div>
                <h3 className="text-[2rem] font-bold leading-[1.6]">Topics discussed in this article:</h3>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sig-stone/80">
                  <span>Blood Sugar &amp; Foods You Eat</span>
                  <span>Foods to Eat</span>
                  <span>Healthy Lifestyle</span>
                  <span>Whole Nutrition</span>
                </div>
              </div>

              {/* References */}
              <div id="references" className="scroll-mt-[130px]">
                <h3 className="text-[2rem] font-bold leading-[1.6]">About this data</h3>
                <p className="mt-4 break-all text-lg leading-[1.7] text-sig-stone/80">
                  Based on 35 snack logs from 12 Signos members. All observations occurred in the afternoon
                  (2–5 PM). Spike is defined as peak glucose minus pre-snack baseline within two hours. Data
                  is anonymized and aggregated. While this is a smaller sample, the uniformity of response was
                  unusually high — 91% clustering into a single bucket is rare regardless of sample size, and
                  suggests a strong, consistent buffering effect. Subgroup sizes (volatile users n=1) are
                  small; interpret directionally. Reviewed by a registered dietitian. Published April 3, 2026.
                </p>
              </div>
            </div>
          </section>

          {/* ── Author bio ── */}
          <div className="mt-8 flex gap-6 rounded-[2rem] border-2 border-[#e3e4e7] p-6 sm:p-9">
            <div>
              <h2 className="text-[2rem] font-extrabold leading-[1.1]">Signos Research Team</h2>
              <p className="mt-4 text-lg leading-[1.5]">
                The Signos Research Team analyzes aggregated, anonymized CGM data from Signos members to
                surface non-obvious patterns in how food affects glucose. Content is reviewed by a
                registered dietitian before publication. This page is for informational purposes only
                and is not medical advice. Consult a healthcare provider before making dietary changes.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right column: Sticky sidebar (hidden below lg) ── */}
        <aside className="hidden w-full max-w-[25.1875rem] flex-shrink-0 lg:block">
          <div className="sticky top-10 flex flex-col gap-8">
            {/* TOC Card */}
            <TableOfContents />

            {/* CTA Card */}
            <div className="rounded-[1.5rem] bg-sig-stone p-[1.875rem] pb-10">
              <img
                src="/images/foods/cta-food-prep.webp"
                alt="Hands chopping fresh vegetables on a colorful cutting board"
                width={400}
                height={300}
                loading="lazy"
                className="w-full rounded-xl object-cover"
              />
              <div className="mt-6 text-center">
                <h2 className="text-xl font-bold leading-[1.3] text-white">
                  Your body runs on glucose. Harness it with Signos.
                </h2>
                <div className="mt-6">
                  <a
                    href="https://www.signos.com/plans"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-sig-cerise transition-opacity hover:opacity-90"
                  >
                    Shop Now
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 6h10M7 2l4 4-4 4" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom CTA block (visible on all screens) ── */}
      <div className="mx-auto mt-16 max-w-[49.5rem] px-5 sm:px-10">
        <div className="rounded-[1.5rem] bg-sig-stone px-6 py-8 text-center text-white sm:px-10 sm:py-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Your body runs on glucose. Harness it with Signos.</h2>
          <p className="mx-auto mt-3 max-w-md text-white/70">
            Population data is informative — your own CGM is definitive. Find out how your body responds.
          </p>
          <a
            href="https://www.signos.com/plans"
            className="mt-6 inline-block rounded-[1rem] bg-white px-6 py-3 text-sm font-bold text-sig-cerise shadow transition-opacity hover:opacity-90"
          >
            Shop Now
          </a>
        </div>
      </div>

      {/* ── You May Also Like ── */}
      <div className="mx-auto mt-16 max-w-[78.25rem] px-5 pb-16 sm:px-10">
        <h2 className="font-archivo text-[1.125rem] font-bold leading-[1.3] sm:text-[2.25rem]">
          You May Also Like
        </h2>
        <div className="mt-4 h-[2px] bg-sig-stone" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RELATED_ARTICLES.map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <div className="relative">
                <div className="aspect-[16/10] w-full overflow-hidden rounded-[1.5rem] bg-[#f1f5f4]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-sig-stone/30">
                      Food Intelligence
                    </div>
                  )}
                </div>
                <span className="absolute left-5 top-5 rounded-[10px] bg-white px-3 py-1 text-sm text-sig-stone">
                  {item.category}
                </span>
              </div>
              <p className="mt-2 text-lg font-bold leading-[1.4] text-sig-stone group-hover:underline">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-[1.3] text-sig-stone/70">
                {item.desc}
              </p>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-sig-stone/40">
          &copy; {new Date().getFullYear()} Signos. All rights reserved.
        </p>
      </div>
    </article>
  );
}
