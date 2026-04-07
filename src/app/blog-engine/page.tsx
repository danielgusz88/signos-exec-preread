'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Plus, ArrowLeft, Save, Loader2, Sparkles, Send, FileText, Download, Trash2,
  ChevronDown, ChevronUp, X, Upload, User, BarChart3, Copy, Check, Eye,
  MessageSquare, PencilLine, Star, AlertTriangle, CheckCircle2,
  GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type SectionBlock =
  | { type: 'prose'; content: string }
  | { type: 'heading'; level: number; text: string; id: string }
  | { type: 'quick_answer'; verdict: string; bullets: string[] }
  | { type: 'ranking_table'; rows: RankingRow[] }
  | { type: 'distribution_viz'; foods: DistFood[]; headline: string; green_text: string; stat: number; stat_label: string }
  | { type: 'image'; url: string; alt: string; caption?: string }
  | { type: 'blockquote'; text: string }
  | { type: 'how_to_cards'; items: HowToStep[] }
  | { type: 'faq'; items: { q: string; a: string }[] }
  | { type: 'topic_tags'; tags: string[] }
  | { type: 'references'; content: string }
  | { type: 'related_articles'; articles: RelatedArticle[] }
  | { type: 'author_bio'; name: string; bio: string };

type RankingRow = { rank: number; name: string; n: number; avg: number; pctSpike: number; self?: boolean };
type DistFood = { name: string; low: number; mod: number; high: number; n: number; avg: number; self?: boolean };
type RelatedArticle = { href: string; category: string; title: string; desc: string; image?: string };
type HowToStep = { step: number; title: string; subtitle: string; bullets: string[] };

type BlogMetadata = {
  date: string; category: string; category_url: string; read_time: string;
  h1: string; hero_image: string; hero_alt: string;
};

type ReviewerInfo = { name: string; credentials: string; title: string; role: string };

type ScoreData = {
  info_gain: { score: number; reasoning: string };
  extractable: { score: number; reasoning: string };
  insight: { score: number; reasoning: string };
  actionability: { score: number; reasoning: string };
  trust: { score: number; reasoning: string };
  total: number;
  kill_test: { chatgpt: boolean; huh: boolean; three_second: boolean };
  improvements: string[];
};

type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp: number };

type BlogDocument = {
  id: string; title: string; slug: string; status: string; category: string;
  metadata: BlogMetadata; sections: SectionBlock[]; reviewer: ReviewerInfo | null;
  scores: ScoreData | null; data_uploads: { filename: string; parsed_summary: string; insights: string[] }[];
  chat_history: ChatMessage[]; created_at: number; updated_at: number;
};

type View = 'list' | 'create' | 'editor';

// ─── API Helpers ────────────────────────────────────────────────────────────

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/blog-engine/store', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

async function aiGenerate(body: Record<string, unknown>) {
  const res = await fetch('/api/blog-engine/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function aiIterate(body: Record<string, unknown>) {
  const res = await fetch('/api/blog-engine/iterate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function aiScore(body: Record<string, unknown>) {
  const res = await fetch('/api/blog-engine/score', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function aiData(body: Record<string, unknown>) {
  const res = await fetch('/api/blog-engine/data', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function aiExport(body: Record<string, unknown>) {
  const res = await fetch('/api/blog-engine/export', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Utility Components ─────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700', purple: 'bg-purple-100 text-purple-700',
  };
  return <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', colors[color] || colors.gray)}>{children}</span>;
}

function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)} onClick={onClick}>{children}</div>;
}

function ScoreGauge({ label, score, max = 2 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-mono font-bold">{score}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Blog Preview Renderer ──────────────────────────────────────────────────

const INSERT_TYPES: { key: string; label: string; icon?: string }[] = [
  { key: 'prose', label: 'Paragraph' },
  { key: 'heading', label: 'Heading' },
  { key: 'image', label: 'Image' },
  { key: 'blockquote', label: 'Quote' },
  { key: 'how_to_cards', label: 'Step Cards' },
  { key: 'faq', label: 'FAQ' },
  { key: 'quick_answer', label: 'Quick Answer' },
];

function InsertDropdown({ onInsert, className }: { onInsert: (type: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="group flex items-center gap-1 rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-0.5 text-[10px] font-medium text-gray-400 shadow-sm transition-all hover:border-blue-400 hover:text-blue-500 hover:shadow"
      >
        <Plus className="h-3 w-3" />
        <span>Insert</span>
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            {INSERT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={(e) => { e.stopPropagation(); onInsert(t.key); setOpen(false); }}
                className="rounded-lg px-3 py-1.5 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BlogRenderer({ sections, metadata, reviewer, selectedIdx, onSelect, onReorder, onInsert }: {
  sections: SectionBlock[]; metadata: BlogMetadata; reviewer: ReviewerInfo | null;
  selectedIdx: number | null; onSelect: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  onInsert: (type: string, atIdx: number) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      onReorder(dragIdx, dropIdx);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  };

  return (
    <article className="font-archivo bg-white text-[#21263a]">
      {/* Hero */}
      <div className="mx-auto max-w-3xl px-5">
        <div className="flex flex-wrap items-center gap-3 pt-6 font-mono text-xs text-gray-500">
          <span>{metadata.date}</span>
          <span>·</span>
          <span>{metadata.category}</span>
          <span>·</span>
          <span>{metadata.read_time}</span>
          {reviewer && (
            <>
              <span>·</span>
              <span className="text-emerald-700">
                {reviewer.role === 'reviewer' ? 'Reviewed' : reviewer.role === 'editor' ? 'Edited' : 'Written'} by {reviewer.name}{reviewer.credentials ? `, ${reviewer.credentials}` : ''}
              </span>
            </>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">{metadata.h1}</h1>
        {metadata.hero_image && (
          <div className="mt-6 aspect-[2/1] overflow-hidden rounded-2xl bg-gray-100">
            <img src={metadata.hero_image} alt={metadata.hero_alt} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-3xl px-5 pb-12">
        {/* Insert at top */}
        <div className="flex justify-center py-1">
          <InsertDropdown onInsert={(type) => onInsert(type, 0)} />
        </div>

        {sections.map((section, i) => {
          const isDropTarget = dragIdx !== null && dropIdx === i && dragIdx !== i;
          return (
            <div key={i}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, i)}
                className={cn(
                  'group relative cursor-pointer rounded-lg transition-all',
                  selectedIdx === i ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-1 hover:ring-blue-200 hover:ring-offset-1',
                  isDropTarget && dragIdx !== null && i < dragIdx && 'border-t-2 border-blue-400',
                  isDropTarget && dragIdx !== null && i > dragIdx && 'border-b-2 border-blue-400',
                )}
                onClick={() => onSelect(i)}
              >
                {/* Drag handle */}
                <div className="absolute -left-7 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-8 w-6 cursor-grab items-center justify-center rounded-md bg-gray-100 text-gray-400 shadow-sm hover:bg-gray-200 hover:text-gray-600 active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                </div>
                <RenderSection section={section} />
              </div>
              {/* Insert between sections */}
              <div className="flex justify-center py-0.5 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
                <InsertDropdown onInsert={(type) => onInsert(type, i + 1)} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DistributionVizCard({ section }: { section: Extract<SectionBlock, { type: 'distribution_viz' }> }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [inView, setInView] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const gauss = (x: number, mu: number, s: number) =>
    Math.exp(-0.5 * ((x - mu) / s) ** 2);

  const W = 700, H = 460, CL = 15, CR = 685, CW = CR - CL, MG = 55;
  const BG = '#21263a';
  const PEAK_H = 110;
  const xPx = (mg: number) => CL + (mg / MG) * CW;

  const orderedFoods = [
    ...section.foods.filter((f) => !f.self),
    ...section.foods.filter((f) => f.self),
  ];

  const ROWS = orderedFoods.map((_, i) => 80 + i * 70 + (i === orderedFoods.length - 1 ? 20 : 0));

  const rawCurves = orderedFoods.map((f) => {
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

  const legendItems = [
    { color: '#34d399', label: 'Low (<20\u00a0mg/dL)', delay: 0.5 },
    { color: '#fbbf24', label: 'Moderate (20\u201335)', delay: 0.65 },
    { color: '#f87171', label: 'High (>35)', delay: 0.8 },
  ];

  const totalObs = section.foods.reduce((s, f) => s + f.n, 0);

  return (
    <div ref={cardRef} className="mt-6 overflow-hidden rounded-[1.5rem] bg-[#21263a] relative">
      <div
        className="pointer-events-none absolute inset-0 rounded-[1.5rem]"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 15% 80%, rgba(52,211,153,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative px-5 pt-7 sm:px-8 sm:pt-9">
        <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.2em] text-white/30">
          Signos CGM Data &middot; {totalObs} observations
        </p>
        <h3 className="mt-2.5 text-xl font-bold leading-[1.15] text-white sm:text-2xl">
          {section.headline}{' '}
          <span
            className="inline-block"
            style={{
              color: inView ? '#34d399' : '#ffffff',
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(6px)',
              transition: 'color 0.8s ease 0.3s, opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
            }}
          >
            {section.green_text}
          </span>
        </h3>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 px-5 sm:px-8">
        {legendItems.map((item) => (
          <span key={item.color} className="flex items-center gap-1.5 text-[0.625rem] text-white/30">
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
          className="ml-auto text-[0.5625rem] text-white/15"
          style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.6s ease 1s' }}
        >
          hover to explore &nearr;
        </span>
      </div>

      <div className="relative mt-2 px-2 sm:px-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="be-rg" x1={CL} y1="0" x2={CR} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="27%" stopColor="#34d399" />
              <stop offset="36%" stopColor="#fbbf24" />
              <stop offset="58%" stopColor="#fbbf24" />
              <stop offset="69%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {curves.map((c, i) => (
              <linearGradient
                key={`be-vg-${i}`}
                id={`be-vg-${i}`}
                x1="0" y1={c.peakPxY} x2="0" y2={c.by}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={c.hero ? '#34d399' : '#ffffff'} stopOpacity={c.hero ? 0.4 : 0.12} />
                <stop offset="100%" stopColor={c.hero ? '#34d399' : '#ffffff'} stopOpacity="0" />
              </linearGradient>
            ))}

            <filter id="be-hglow" x="-15%" y="-30%" width="130%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            <pattern id="be-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.5" fill="white" fillOpacity="0.04" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#be-dots)" />

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
                  fill="url(#be-rg)"
                  fillOpacity={c.hero ? 0.55 : (hovered ? 0.35 : 0.15)}
                  style={{
                    opacity: visible ? 1 : 0,
                    transition: `opacity 0.8s ease ${delay}s, fill-opacity 0.3s ease`,
                  }}
                />
                <path
                  d={c.fill}
                  fill={`url(#be-vg-${i})`}
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
                  filter={c.hero ? 'url(#be-hglow)' : undefined}
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
                  style={{ fontFamily: 'monospace' }}>
                  n={c.n} &middot; avg +{c.avg} mg/dL
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
                style={{ fontFamily: 'monospace' }}>
                {hc.low}%
              </text>
              <circle cx={CL + 60} cy={Math.max(4, hc.peakPxY - 52) + 32} r={3.5} fill="#fbbf24" />
              <text x={CL + 68} y={Math.max(4, hc.peakPxY - 52) + 35.5}
                fill="#fbbf24" fillOpacity={0.8} fontSize={10} fontWeight={600}
                style={{ fontFamily: 'monospace' }}>
                {hc.mod}%
              </text>
              <circle cx={CL + 100} cy={Math.max(4, hc.peakPxY - 52) + 32} r={3.5} fill="#f87171" />
              <text x={CL + 108} y={Math.max(4, hc.peakPxY - 52) + 35.5}
                fill="#f87171" fillOpacity={0.8} fontSize={10} fontWeight={600}
                style={{ fontFamily: 'monospace' }}>
                {hc.high}%
              </text>
              <text x={CL + 145} y={Math.max(4, hc.peakPxY - 52) + 35.5}
                fill="white" fillOpacity={0.25} fontSize={9}
                style={{ fontFamily: 'monospace' }}>
                +{hc.avg}
              </text>
            </g>
          )}

          {[0, 10, 20, 30, 40, 50].map((v) => (
            <text key={v} x={xPx(v)} y={430} textAnchor="middle" fill="white"
              fillOpacity={0.17} fontSize={11}
              style={{ fontFamily: 'monospace' }}>
              +{v}
            </text>
          ))}
          <text x={xPx(27.5)} y={452} textAnchor="middle" fill="white"
            fillOpacity={0.1} fontSize={9}
            style={{ fontFamily: 'Archivo, sans-serif' }}>
            mg/dL glucose spike after eating
          </text>
        </svg>
      </div>

      <div className="relative flex flex-col gap-3 px-5 pb-7 sm:flex-row sm:items-end sm:gap-8 sm:px-8">
        <p className="flex-shrink-0 text-[3.5rem] font-black leading-[0.85] tracking-tighter text-[#34d399] sm:text-[4.5rem]">
          {section.stat}<span className="text-[2rem] text-[#34d399]/50 sm:text-[2.5rem]">%</span>
        </p>
        <p className="pb-1 text-xs leading-relaxed text-white/40 sm:text-sm">
          {section.stat_label}
        </p>
      </div>
    </div>
  );
}

function RenderSection({ section }: { section: SectionBlock }) {
  switch (section.type) {
    case 'heading':
      return section.level === 3
        ? <h3 className="mt-6 text-xl font-bold leading-tight">{section.text}</h3>
        : <h2 id={section.id} className="mt-10 text-2xl font-semibold leading-snug scroll-mt-20">{section.text}</h2>;

    case 'prose':
      return <div className="mt-4 text-base leading-relaxed [&_strong]:font-bold [&_a]:underline [&_a]:underline-offset-2" dangerouslySetInnerHTML={{ __html: section.content }} />;

    case 'quick_answer':
      return (
        <div className="mt-6 rounded-2xl border-2 border-[#21263a] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#fd3576]">Quick Answer</p>
          <p className="mt-1.5 text-xl font-bold">{section.verdict}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {section.bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: `• ${b}` }} />)}
          </ul>
        </div>
      );

    case 'ranking_table':
      return (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#21263a] text-left text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Rank</th>
                <th className="px-3 py-2 font-semibold">Snack</th>
                <th className="px-3 py-2 text-right font-semibold">n</th>
                <th className="px-3 py-2 text-right font-semibold">Avg spike</th>
                <th className="px-3 py-2 text-right font-semibold">% &gt;30</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((r) => (
                <tr key={r.rank} className={cn('border-b border-gray-200', r.self && 'font-bold bg-blue-50/50')}>
                  <td className="px-3 py-2 text-gray-500">{r.rank}</td>
                  <td className="px-3 py-2">{r.name}{r.self && <Badge color="blue">this page</Badge>}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">+{r.avg}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{r.pctSpike}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'distribution_viz':
      return <DistributionVizCard section={section} />;

    case 'image':
      return (
        <figure className="my-6">
          <div className="aspect-[2/1] overflow-hidden rounded-2xl bg-gray-100">
            <img src={section.url} alt={section.alt} className="h-full w-full object-cover" loading="lazy" />
          </div>
          {section.caption && <figcaption className="mt-1.5 text-center text-xs text-gray-400">{section.caption}</figcaption>}
        </figure>
      );

    case 'blockquote':
      return (
        <blockquote className="mt-4 rounded-r border-l-4 border-[#21263a] bg-gray-50 px-5 py-4 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: section.text }} />
      );

    case 'how_to_cards':
      return (
        <div className="mt-6 space-y-3">
          {section.items.map((item) => (
            <div key={item.step} className="rounded-xl border-2 border-gray-200 p-4 sm:flex sm:gap-4">
              <div className="mb-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#21263a] text-sm font-bold text-white sm:mb-0">
                {item.step}
              </div>
              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#fd3576]">{item.subtitle}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {item.bullets.map((b, i) => <li key={i} className="flex gap-2"><span className="text-[#fd3576]">→</span><span dangerouslySetInnerHTML={{ __html: b }} /></li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      );

    case 'faq':
      return (
        <div className="mt-4 space-y-4">
          {section.items.map((item, i) => (
            <div key={i}>
              <h3 className="text-lg font-bold">{item.q}</h3>
              <div className="mt-2 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: item.a }} />
            </div>
          ))}
        </div>
      );

    case 'topic_tags':
      return (
        <div className="mt-8">
          <h3 className="text-lg font-bold">Topics discussed:</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {section.tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{t}</span>)}
          </div>
        </div>
      );

    case 'references':
      return (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-bold">About this data</h3>
          <div className="mt-2 text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: section.content }} />
        </div>
      );

    case 'related_articles':
      return (
        <div className="mt-10">
          <h2 className="text-xl font-bold">You May Also Like</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {section.articles.map((a) => (
              <div key={a.href} className="rounded-xl border border-gray-200 p-3">
                <Badge>{a.category}</Badge>
                <p className="mt-1.5 text-sm font-bold leading-snug">{a.title}</p>
                <p className="mt-1 text-xs text-gray-500">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'author_bio':
      return (
        <div className="mt-8 rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="text-xl font-extrabold">{section.name}</h3>
          <div className="mt-2 text-sm leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: section.bio }} />
        </div>
      );

    default:
      return <div className="mt-4 text-sm text-gray-400">[Unknown section type]</div>;
  }
}

// ─── Section Editor Panel ───────────────────────────────────────────────────

function SectionEditor({ section, sectionIdx, totalSections, onChange, onDelete, onMove }: {
  section: SectionBlock; sectionIdx: number; totalSections: number;
  onChange: (s: SectionBlock) => void; onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const s = section;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge color="blue">{s.type}</Badge>
          <span className="text-[10px] text-gray-400">#{sectionIdx + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove('up')}
            disabled={sectionIdx === 0}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-25"
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={sectionIdx >= totalSections - 1}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-25"
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Delete section">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {s.type === 'heading' && (
        <>
          <label className="text-xs font-medium text-gray-500">Text</label>
          <input value={s.text} onChange={(e) => onChange({ ...s, text: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-gray-500">ID (for TOC)</label>
          <input value={s.id} onChange={(e) => onChange({ ...s, id: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-gray-500">Level</label>
          <select value={s.level} onChange={(e) => onChange({ ...s, level: Number(e.target.value) })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
        </>
      )}

      {s.type === 'prose' && (
        <>
          <label className="text-xs font-medium text-gray-500">Content (HTML)</label>
          <textarea value={s.content} onChange={(e) => onChange({ ...s, content: e.target.value })} rows={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs" />
        </>
      )}

      {s.type === 'quick_answer' && (
        <>
          <label className="text-xs font-medium text-gray-500">Verdict</label>
          <input value={s.verdict} onChange={(e) => onChange({ ...s, verdict: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-gray-500">Bullets (one per line)</label>
          <textarea value={s.bullets.join('\n')} onChange={(e) => onChange({ ...s, bullets: e.target.value.split('\n') })} rows={5} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </>
      )}

      {s.type === 'blockquote' && (
        <>
          <label className="text-xs font-medium text-gray-500">Quote (HTML)</label>
          <textarea value={s.text} onChange={(e) => onChange({ ...s, text: e.target.value })} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </>
      )}

      {s.type === 'image' && (
        <>
          <label className="text-xs font-medium text-gray-500">Image URL</label>
          <input value={s.url} onChange={(e) => onChange({ ...s, url: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-gray-500">Alt text</label>
          <input value={s.alt} onChange={(e) => onChange({ ...s, alt: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-gray-500">Caption</label>
          <input value={s.caption || ''} onChange={(e) => onChange({ ...s, caption: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </>
      )}

      {s.type === 'references' && (
        <>
          <label className="text-xs font-medium text-gray-500">References (HTML)</label>
          <textarea value={s.content} onChange={(e) => onChange({ ...s, content: e.target.value })} rows={6} className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs" />
        </>
      )}

      {s.type === 'faq' && (
        <div className="space-y-3">
          {s.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
              <input value={item.q} onChange={(e) => { const items = [...s.items]; items[i] = { ...items[i], q: e.target.value }; onChange({ ...s, items }); }} placeholder="Question" className="w-full rounded border border-gray-200 px-2 py-1 text-sm" />
              <textarea value={item.a} onChange={(e) => { const items = [...s.items]; items[i] = { ...items[i], a: e.target.value }; onChange({ ...s, items }); }} placeholder="Answer (HTML)" rows={3} className="w-full rounded border border-gray-200 px-2 py-1 text-xs" />
            </div>
          ))}
          <button onClick={() => onChange({ ...s, items: [...s.items, { q: '', a: '' }] })} className="text-xs text-blue-600 hover:underline">+ Add FAQ item</button>
        </div>
      )}

      {s.type === 'topic_tags' && (
        <>
          <label className="text-xs font-medium text-gray-500">Tags (one per line)</label>
          <textarea value={s.tags.join('\n')} onChange={(e) => onChange({ ...s, tags: e.target.value.split('\n').filter(Boolean) })} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </>
      )}

      {(s.type === 'ranking_table' || s.type === 'distribution_viz' || s.type === 'how_to_cards' || s.type === 'related_articles' || s.type === 'author_bio') && (
        <>
          <label className="text-xs font-medium text-gray-500">Raw JSON (advanced)</label>
          <textarea
            value={JSON.stringify(s, null, 2)}
            onChange={(e) => { try { const parsed = JSON.parse(e.target.value); onChange(parsed); } catch {} }}
            rows={12}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs"
          />
        </>
      )}
    </div>
  );
}

// ─── Score Panel ────────────────────────────────────────────────────────────

function ScorePanel({ scores, onRescore, loading }: { scores: ScoreData | null; onRescore: () => void; loading: boolean }) {
  if (!scores) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <BarChart3 className="h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">Not scored yet</p>
        <button onClick={onRescore} disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Score Now'}
        </button>
      </div>
    );
  }

  const totalColor = scores.total >= 8.5 ? 'text-emerald-600' : scores.total >= 7 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className={cn('text-3xl font-black', totalColor)}>{scores.total}</span>
          <span className="text-sm text-gray-400">/10</span>
        </div>
        <button onClick={onRescore} disabled={loading} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-score'}
        </button>
      </div>

      <ScoreGauge label="Information Gain" score={scores.info_gain.score} />
      <ScoreGauge label="Extractable Answer" score={scores.extractable.score} />
      <ScoreGauge label="Insight & Interpretation" score={scores.insight.score} />
      <ScoreGauge label="Actionability" score={scores.actionability.score} />
      <ScoreGauge label="Trust / E-E-A-T" score={scores.trust.score} />

      <div className="mt-3 space-y-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase">Kill Tests</p>
        {[
          { label: 'ChatGPT can\'t replicate', pass: scores.kill_test.chatgpt },
          { label: '"Huh, interesting" moment', pass: scores.kill_test.huh },
          { label: '3-second decision', pass: scores.kill_test.three_second },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-2 text-xs">
            {t.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
            <span className={t.pass ? 'text-gray-600' : 'text-rose-600'}>{t.label}</span>
          </div>
        ))}
      </div>

      {scores.improvements.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Improvements</p>
          <ul className="mt-1.5 space-y-1">
            {scores.improvements.map((imp, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-600">
                <Star className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Export Modal ────────────────────────────────────────────────────────────

function ExportModal({ blog, onClose }: { blog: BlogDocument; onClose: () => void }) {
  const [format, setFormat] = useState<'tsx' | 'html' | 'markdown'>('tsx');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const doExport = useCallback(async () => {
    setLoading(true);
    const res = await aiExport({ sections: blog.sections, metadata: blog.metadata, reviewer: blog.reviewer, format });
    if (res.ok) setCode(res.code);
    setLoading(false);
  }, [blog, format]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const ext = format === 'tsx' ? 'tsx' : format === 'html' ? 'html' : 'md';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blog.slug || 'blog'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold">Export Blog</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-2 px-6 pt-4">
          {(['tsx', 'html', 'markdown'] as const).map((f) => (
            <button key={f} onClick={() => { setFormat(f); setCode(''); }} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', format === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700')}>
              {f.toUpperCase()}
            </button>
          ))}
          <button onClick={doExport} disabled={loading} className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Generate'}
          </button>
        </div>
        <div className="p-6">
          {code ? (
            <>
              <div className="flex gap-2 mb-3">
                <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={downloadCode} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  <Download className="h-3 w-3" /> Download
                </button>
                <span className="ml-auto text-xs text-gray-400">
                  {format === 'tsx' && `src/app/foods/${blog.slug}/page.tsx`}
                </span>
              </div>
              <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-300">
                <code>{code}</code>
              </pre>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
              Click &quot;Generate&quot; to export your blog as {format.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function BlogEnginePage() {
  const [view, setView] = useState<View>('list');
  const [blogs, setBlogs] = useState<BlogDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBlog, setActiveBlog] = useState<BlogDocument | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [selectedSectionIdx, setSelectedSectionIdx] = useState<number | null>(null);
  const [rightPanel, setRightPanel] = useState<'editor' | 'score' | 'reviewer' | 'data'>('editor');
  const [showExport, setShowExport] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Score state
  const [scoreLoading, setScoreLoading] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({ topic: '', category: 'Nutrition', angle: '', notes: '' });
  const [generateLoading, setGenerateLoading] = useState(false);

  // Data upload state
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadBlogs = useCallback(async () => {
    const res = await api('list');
    if (res.ok) setBlogs(res.documents || []);
  }, []);

  useEffect(() => {
    loadBlogs().then(() => setLoading(false));
  }, [loadBlogs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeBlog?.chat_history]);

  // ── CRUD ──

  const openBlog = useCallback(async (id: string) => {
    setLoading(true);
    const res = await api('get', { id });
    if (res.ok) {
      const doc = res.document;
      doc.sections = typeof doc.sections === 'string' ? JSON.parse(doc.sections) : (doc.sections || []);
      doc.metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
      doc.reviewer = typeof doc.reviewer === 'string' ? JSON.parse(doc.reviewer) : doc.reviewer;
      doc.scores = typeof doc.scores === 'string' ? JSON.parse(doc.scores) : doc.scores;
      doc.data_uploads = typeof doc.data_uploads === 'string' ? JSON.parse(doc.data_uploads) : (doc.data_uploads || []);
      doc.chat_history = typeof doc.chat_history === 'string' ? JSON.parse(doc.chat_history) : (doc.chat_history || []);
      setActiveBlog(doc);
      setView('editor');
      setSelectedSectionIdx(null);
    }
    setLoading(false);
  }, []);

  const saveBlog = useCallback(async () => {
    if (!activeBlog) return;
    setSaving(true);
    await api('update', {
      id: activeBlog.id,
      data: {
        title: activeBlog.title,
        slug: activeBlog.slug,
        status: activeBlog.status,
        category: activeBlog.category,
        metadata: activeBlog.metadata,
        sections: activeBlog.sections,
        reviewer: activeBlog.reviewer,
        scores: activeBlog.scores,
        data_uploads: activeBlog.data_uploads,
        chat_history: activeBlog.chat_history,
      },
    });
    await loadBlogs();
    setSaving(false);
  }, [activeBlog, loadBlogs]);

  const deleteBlog = useCallback(async (id: string) => {
    await api('delete', { id });
    await loadBlogs();
    if (activeBlog?.id === id) { setActiveBlog(null); setView('list'); }
  }, [activeBlog, loadBlogs]);

  // ── Generate ──

  const handleGenerate = useCallback(async () => {
    setGenerateLoading(true);
    const dataFindings = activeBlog?.data_uploads?.length
      ? activeBlog.data_uploads.map((d) => `${d.filename}: ${d.parsed_summary}\nInsights: ${d.insights.join('; ')}`).join('\n\n')
      : undefined;

    const res = await aiGenerate({ ...createForm, data_findings: dataFindings });
    if (res.ok && res.blog) {
      const createRes = await api('create', {
        data: {
          title: res.blog.metadata?.h1 || res.blog.title || createForm.topic,
          slug: res.blog.slug || createForm.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category: res.blog.category || createForm.category,
          metadata: res.blog.metadata || {},
          sections: res.blog.sections || [],
        },
      });
      if (createRes.ok) {
        await loadBlogs();
        await openBlog(createRes.id);
      }
    }
    setGenerateLoading(false);
  }, [createForm, activeBlog, loadBlogs, openBlog]);

  // ── Chat / Iterate ──

  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || !activeBlog) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    const updatedHistory = [...(activeBlog.chat_history || []), userMsg];
    setActiveBlog((b) => b ? { ...b, chat_history: updatedHistory } : b);
    setChatInput('');
    setChatLoading(true);

    const res = await aiIterate({
      sections: activeBlog.sections,
      metadata: activeBlog.metadata,
      feedback: chatInput,
      chat_history: updatedHistory.slice(-10),
      target_section_idx: selectedSectionIdx,
    });

    if (res.ok && res.sections) {
      const assistantMsg: ChatMessage = { role: 'assistant', content: res.changes_summary || 'Sections updated.', timestamp: Date.now() };
      setActiveBlog((b) => b ? { ...b, sections: res.sections, chat_history: [...updatedHistory, assistantMsg] } : b);
    } else {
      const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${res.error || 'Failed to iterate'}`, timestamp: Date.now() };
      setActiveBlog((b) => b ? { ...b, chat_history: [...updatedHistory, errorMsg] } : b);
    }
    setChatLoading(false);
  }, [chatInput, activeBlog, selectedSectionIdx]);

  // ── Score ──

  const handleScore = useCallback(async () => {
    if (!activeBlog) return;
    setScoreLoading(true);
    const res = await aiScore({ sections: activeBlog.sections, metadata: activeBlog.metadata });
    if (res.ok && res.scores) {
      setActiveBlog((b) => b ? { ...b, scores: res.scores } : b);
      setRightPanel('score');
    }
    setScoreLoading(false);
  }, [activeBlog]);

  // ── Data Upload ──

  const handleDataUpload = useCallback(async () => {
    if (!dataFile || !activeBlog) return;
    setDataLoading(true);
    const text = await dataFile.text();
    const res = await aiData({ filename: dataFile.name, raw_data: text, data_type: dataFile.name.endsWith('.json') ? 'JSON' : 'CSV' });
    if (res.ok && res.findings) {
      const upload = { filename: dataFile.name, parsed_summary: res.findings.summary || '', insights: res.findings.insights || [] };
      setActiveBlog((b) => b ? { ...b, data_uploads: [...(b.data_uploads || []), upload] } : b);
      setDataFile(null);
    }
    setDataLoading(false);
  }, [dataFile, activeBlog]);

  // ── Section CRUD ──

  const updateSection = useCallback((idx: number, section: SectionBlock) => {
    setActiveBlog((b) => {
      if (!b) return b;
      const sections = [...b.sections];
      sections[idx] = section;
      return { ...b, sections };
    });
  }, []);

  const deleteSection = useCallback((idx: number) => {
    setActiveBlog((b) => {
      if (!b) return b;
      const sections = b.sections.filter((_, i) => i !== idx);
      return { ...b, sections };
    });
    setSelectedSectionIdx(null);
  }, []);

  const addSection = useCallback((type: string, atIdx?: number) => {
    const defaults: Record<string, SectionBlock> = {
      prose: { type: 'prose', content: 'New paragraph...' },
      heading: { type: 'heading', level: 2, text: 'New Section', id: `section-${Date.now()}` },
      image: { type: 'image', url: '', alt: '', caption: '' },
      blockquote: { type: 'blockquote', text: 'Quote text...' },
      faq: { type: 'faq', items: [{ q: 'Question?', a: 'Answer.' }] },
      quick_answer: { type: 'quick_answer', verdict: 'Summary verdict here', bullets: ['Point 1', 'Point 2'] },
      how_to_cards: { type: 'how_to_cards', items: [{ step: 1, title: 'Step 1', subtitle: 'Description', bullets: ['Detail'] }] },
    };
    const block = defaults[type] || defaults.prose;
    setActiveBlog((b) => {
      if (!b) return b;
      if (atIdx !== undefined && atIdx >= 0 && atIdx <= b.sections.length) {
        const sections = [...b.sections];
        sections.splice(atIdx, 0, block);
        return { ...b, sections };
      }
      return { ...b, sections: [...b.sections, block] };
    });
    if (atIdx !== undefined) {
      setSelectedSectionIdx(atIdx);
      setRightPanel('editor');
    }
  }, []);

  const moveSection = useCallback((from: number, direction: 'up' | 'down') => {
    setActiveBlog((b) => {
      if (!b) return b;
      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= b.sections.length) return b;
      const sections = [...b.sections];
      [sections[from], sections[to]] = [sections[to], sections[from]];
      return { ...b, sections };
    });
    setSelectedSectionIdx((prev) => {
      if (prev === null) return prev;
      return direction === 'up' ? prev - 1 : prev + 1;
    });
  }, []);

  const reorderSection = useCallback((from: number, to: number) => {
    setActiveBlog((b) => {
      if (!b) return b;
      const sections = [...b.sections];
      const [moved] = sections.splice(from, 1);
      sections.splice(to > from ? to - 1 : to, 0, moved);
      return { ...b, sections };
    });
    setSelectedSectionIdx(to > from ? to - 1 : to);
  }, []);

  // ── Render ──

  if (loading && !activeBlog) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  // ── LIST VIEW ──

  if (view === 'list' || view === 'create') {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Blog Engine</h1>
              <p className="text-sm text-gray-500">Generate, edit, score, and export Signos food intelligence blogs</p>
            </div>
            <button onClick={() => setView(view === 'create' ? 'list' : 'create')} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
              {view === 'create' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {view === 'create' ? 'Cancel' : 'New Blog'}
            </button>
          </div>
        </Card>

        {view === 'create' && (
          <Card className="p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Generate a New Blog</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Food / Topic *</label>
                <input value={createForm.topic} onChange={(e) => setCreateForm((f) => ({ ...f, topic: e.target.value }))} placeholder="e.g. Apple + Almond Butter" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Category</label>
                <select value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  {['Nutrition', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Angle / claim (optional)</label>
              <input value={createForm.angle} onChange={(e) => setCreateForm((f) => ({ ...f, angle: e.target.value }))} placeholder="e.g. 91% of people barely spike" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Notes (optional)</label>
              <textarea value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Any extra context, data notes, key insights..." className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <button onClick={handleGenerate} disabled={!createForm.topic.trim() || generateLoading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {generateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generateLoading ? 'Generating...' : 'Generate Blog'}
            </button>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Card key={blog.id} className="cursor-pointer p-4 transition-shadow hover:shadow-md" onClick={() => openBlog(blog.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-bold text-gray-900">{blog.title || 'Untitled'}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{blog.slug || 'no-slug'}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge color={blog.status === 'published' ? 'emerald' : blog.status === 'scored' ? 'blue' : 'gray'}>
                    {blog.status}
                  </Badge>
                  {(blog.scores as ScoreData | null)?.total !== undefined && (
                    <span className="text-xs font-bold tabular-nums">{(blog.scores as ScoreData).total}/10</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{blog.category}</span>
                {blog.reviewer && <span>· {(blog.reviewer as ReviewerInfo).name}</span>}
                <span className="ml-auto">{new Date(blog.updated_at as number).toLocaleDateString()}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteBlog(blog.id); }}
                className="mt-2 text-xs text-rose-400 hover:text-rose-600"
              >
                Delete
              </button>
            </Card>
          ))}
          {blogs.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-3 py-16 text-gray-400">
              <FileText className="h-10 w-10" />
              <p className="text-sm">No blogs yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── EDITOR VIEW ──

  if (!activeBlog) return null;

  const selectedSection = selectedSectionIdx !== null ? activeBlog.sections[selectedSectionIdx] : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
        <button onClick={() => { setView('list'); setActiveBlog(null); }} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={activeBlog.title}
            onChange={(e) => setActiveBlog((b) => b ? { ...b, title: e.target.value, metadata: { ...b.metadata, h1: e.target.value } } : b)}
            className="w-full bg-transparent text-sm font-bold outline-none"
          />
        </div>
        <select value={activeBlog.status} onChange={(e) => setActiveBlog((b) => b ? { ...b, status: e.target.value } : b)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
          {['draft', 'review', 'scored', 'published', 'exported'].map((s) => <option key={s}>{s}</option>)}
        </select>
        {activeBlog.scores && (
          <span className={cn('text-sm font-bold tabular-nums', activeBlog.scores.total >= 8 ? 'text-emerald-600' : 'text-amber-600')}>
            {activeBlog.scores.total}/10
          </span>
        )}
        <button onClick={handleScore} disabled={scoreLoading} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50" title="Score blog">
          {scoreLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setShowExport(true)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50" title="Export">
          <Download className="h-3.5 w-3.5" />
        </button>
        <button onClick={saveBlog} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat panel */}
        <div className="flex w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 px-3 py-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <MessageSquare className="h-3.5 w-3.5" /> AI Chat
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(activeBlog.chat_history || []).map((msg, i) => (
              <div key={i} className={cn('rounded-lg px-3 py-2 text-xs', msg.role === 'user' ? 'bg-blue-100 text-blue-900 ml-4' : 'bg-white text-gray-700 mr-4 border border-gray-100')}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mr-4">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-gray-200 p-2">
            <div className="flex gap-1.5">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                placeholder={selectedSectionIdx !== null ? `Edit section ${selectedSectionIdx + 1}...` : 'Iterate on the blog...'}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-blue-300"
              />
              <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} className="rounded-lg bg-gray-900 p-1.5 text-white disabled:opacity-30">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            {selectedSectionIdx !== null && (
              <p className="mt-1 text-[10px] text-blue-500">Targeting section {selectedSectionIdx + 1} ({activeBlog.sections[selectedSectionIdx]?.type})</p>
            )}
          </div>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 overflow-y-auto bg-white">
          <BlogRenderer
            sections={activeBlog.sections}
            metadata={activeBlog.metadata}
            reviewer={activeBlog.reviewer}
            selectedIdx={selectedSectionIdx}
            onSelect={(i) => { setSelectedSectionIdx(i); setRightPanel('editor'); }}
            onReorder={reorderSection}
            onInsert={addSection}
          />
        </div>

        {/* Right: Context panel */}
        <div className="flex w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'editor', icon: PencilLine, label: 'Edit' },
              { key: 'score', icon: BarChart3, label: 'Score' },
              { key: 'reviewer', icon: User, label: 'Reviewer' },
              { key: 'data', icon: Upload, label: 'Data' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setRightPanel(key as typeof rightPanel)}
                className={cn('flex-1 py-2 text-center text-[10px] font-medium border-b-2 transition-colors', rightPanel === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600')}
              >
                <Icon className="mx-auto h-3.5 w-3.5 mb-0.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Section Editor */}
            {rightPanel === 'editor' && (
              selectedSection ? (
                <SectionEditor
                  section={selectedSection}
                  sectionIdx={selectedSectionIdx!}
                  totalSections={activeBlog.sections.length}
                  onChange={(s) => updateSection(selectedSectionIdx!, s)}
                  onDelete={() => deleteSection(selectedSectionIdx!)}
                  onMove={(dir) => moveSection(selectedSectionIdx!, dir)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                  <Eye className="h-6 w-6" />
                  <p className="text-xs">Click a section in the preview to edit it</p>
                </div>
              )
            )}

            {/* Score Panel */}
            {rightPanel === 'score' && (
              <ScorePanel scores={activeBlog.scores} onRescore={handleScore} loading={scoreLoading} />
            )}

            {/* Reviewer Panel */}
            {rightPanel === 'reviewer' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Reviewer / Editor</h3>
                <div>
                  <label className="text-xs font-medium text-gray-500">Name</label>
                  <input
                    value={activeBlog.reviewer?.name || ''}
                    onChange={(e) => setActiveBlog((b) => b ? { ...b, reviewer: { ...(b.reviewer || { credentials: '', title: '', role: 'reviewer' }), name: e.target.value } } : b)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Dr. Sarah Chen"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Credentials</label>
                  <input
                    value={activeBlog.reviewer?.credentials || ''}
                    onChange={(e) => setActiveBlog((b) => b ? { ...b, reviewer: { ...(b.reviewer || { name: '', title: '', role: 'reviewer' }), credentials: e.target.value } } : b)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="RD, CDE"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Title</label>
                  <input
                    value={activeBlog.reviewer?.title || ''}
                    onChange={(e) => setActiveBlog((b) => b ? { ...b, reviewer: { ...(b.reviewer || { name: '', credentials: '', role: 'reviewer' }), title: e.target.value } } : b)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Registered Dietitian"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Role</label>
                  <select
                    value={activeBlog.reviewer?.role || 'reviewer'}
                    onChange={(e) => setActiveBlog((b) => b ? { ...b, reviewer: { ...(b.reviewer || { name: '', credentials: '', title: '' }), role: e.target.value } } : b)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="author">Author</option>
                    <option value="editor">Editor</option>
                    <option value="reviewer">Medical Reviewer</option>
                  </select>
                </div>
                {activeBlog.reviewer?.name && (
                  <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-800">
                      <strong>{activeBlog.reviewer.name}</strong>{activeBlog.reviewer.credentials ? `, ${activeBlog.reviewer.credentials}` : ''} will appear in the byline and data transparency section.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Data Upload Panel */}
            {rightPanel === 'data' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase">Data Uploads</h3>
                <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
                  <Upload className="mx-auto h-6 w-6 text-gray-300" />
                  <p className="mt-1 text-xs text-gray-400">CSV, JSON, or TXT</p>
                  <input
                    type="file"
                    accept=".csv,.json,.txt,.tsv"
                    onChange={(e) => setDataFile(e.target.files?.[0] || null)}
                    className="mt-2 text-xs"
                  />
                  {dataFile && (
                    <button onClick={handleDataUpload} disabled={dataLoading} className="mt-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                      {dataLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Analyze Data'}
                    </button>
                  )}
                </div>
                {(activeBlog.data_uploads || []).map((d, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 space-y-1">
                    <p className="text-xs font-bold">{d.filename}</p>
                    <p className="text-[10px] text-gray-500">{d.parsed_summary}</p>
                    {d.insights.map((ins, j) => (
                      <p key={j} className="text-[10px] text-emerald-700">• {ins}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export modal */}
      {showExport && <ExportModal blog={activeBlog} onClose={() => setShowExport(false)} />}
    </div>
  );
}
