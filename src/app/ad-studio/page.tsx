'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles, Send, Loader2, Copy, Check, Download, X, Plus,
  Search, BarChart3, Eye, Star, AlertTriangle, CheckCircle2,
  Layers, ChevronDown, ArrowRight, RefreshCw, FileText, Zap,
  Target, MessageSquare, ImagePlus, GripVertical,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Mode = 'visual' | 'google';
type LeftTab = 'brief' | 'signals';
type RightTab = 'chat' | 'review' | 'export';
type ChatMsg = { role: 'user' | 'system'; text: string };

interface Angle { angle: string; hook: string; emotion: string; insight: string; archetypes: string[] }
interface BatchVariation { name: string; archetype: string; headline: string; subhead: string; angle_description: string; html?: string; generating?: boolean }
interface ReviewScores {
  hook_strength: { score: number; feedback: string };
  single_core_idea: { score: number; feedback: string };
  problem_relevance: { score: number; feedback: string };
  reframe_quality: { score: number; feedback: string };
  benefit_first: { score: number; feedback: string };
  visual_message: { score: number; feedback: string };
  readability: { score: number; feedback: string };
  specificity: { score: number; feedback: string };
  total: number;
  max_total: number;
  verdict: string;
  fast_fail: boolean;
  fast_fail_reasons: string[];
  design_violations: string[];
  top_improvements: string[];
  headline_rewrite: string;
}
interface RSAResult {
  headlines: string[];
  descriptions: string[];
  scores: { keyword_coverage: number; diversity: number; combination_safety: number; overall_strength: string };
  improvements: string[];
  keyword_groups: { keyword: string; matched_headlines: number[] }[];
}

const SIZE_OPTIONS = [
  { id: 'square', label: 'Square 1:1', w: 1200, h: 1200 },
  { id: 'landscape', label: 'Landscape 1.91:1', w: 1200, h: 628 },
  { id: 'portrait', label: 'Portrait 4:5', w: 1080, h: 1350 },
  { id: 'story', label: 'Story 9:16', w: 1080, h: 1920 },
];

const ARCHETYPES: { id: string; label: string; desc: string; mini: React.ReactNode }[] = [
  { id: 'signos_split', label: 'Photo + Panel', desc: 'Photo top, navy panel bottom (signature)', mini: <MiniSplitV /> },
  { id: 'hero_overlay', label: 'Full-Bleed Hero', desc: 'Lifestyle photo + headline overlay', mini: <MiniHero /> },
  { id: 'editorial_light', label: 'Editorial Light', desc: 'Cream headline zone + image strip', mini: <MiniEditorial /> },
  { id: 'data_poster', label: 'Data Poster', desc: 'Bold stat or typography, dark bg', mini: <MiniData /> },
];

// ─── Mini archetype thumbnails ──────────────────────────────────────────────

function MiniBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('w-10 h-10 rounded border border-gray-300 bg-gray-50 relative overflow-hidden', className)}>{children}</div>;
}
function MiniHero() { return <MiniBox><div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-400" /><div className="absolute top-1.5 left-1 right-3 h-1.5 rounded-sm bg-white/90" /><div className="absolute top-4 left-1 right-2 h-1 rounded-sm bg-pink-400/60" /></MiniBox>; }
function MiniSplitV() { return <MiniBox><div className="absolute top-0 left-0 right-0 h-[55%] bg-gray-300" /><div className="absolute bottom-0 left-0 right-0 h-[45%] bg-[#1f2746]" /><div className="absolute bottom-1 right-1 w-3 h-0.5 bg-white/50 rounded" /><div className="absolute bottom-2.5 right-1 w-4 h-0.5 bg-white/40 rounded" /></MiniBox>; }
function MiniEditorial() { return <MiniBox className="bg-[#f3f0e8]"><div className="absolute top-1.5 left-1 right-2 h-1 rounded-sm bg-gray-800" /><div className="absolute top-3 left-1 w-3 h-0.5 rounded-sm bg-pink-400" /><div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gray-400" /></MiniBox>; }
function MiniData() { return <MiniBox className="bg-[#1f2746]"><div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-pink-400">73%</div><div className="absolute bottom-1.5 left-1 right-1 h-0.5 bg-white/30 rounded" /></MiniBox>; }

// ─── API helpers ────────────────────────────────────────────────────────────

const API = '/api/ad-studio';

async function apiStream(payload: Record<string, unknown>, onChunk: (html: string) => void): Promise<string> {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { const t = await res.text(); try { throw new Error(JSON.parse(t).error); } catch (e) { if (e instanceof Error && e.message) throw e; throw new Error('Request failed'); } }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) { const j = await res.json(); if (j.error) throw new Error(j.error); return j.html || ''; }
  const reader = res.body?.getReader(); const decoder = new TextDecoder(); let result = '';
  if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); onChunk(result); } }
  return result;
}

async function apiJson(payload: Record<string, unknown>) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.json();
}

// ─── Score gauge ────────────────────────────────────────────────────────────

function ScoreGauge({ label, score, feedback, max = 5 }: { label: string; score: number; feedback: string; max?: number }) {
  if (!score && score !== 0) return null;
  const pct = score / max;
  const color = pct >= 0.8 ? 'text-emerald-600 bg-emerald-50' : pct >= 0.6 ? 'text-blue-600 bg-blue-50' : pct >= 0.4 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
  return (
    <div className="rounded-lg border border-gray-100 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-bold', color)}>{score}/{max}</span>
      </div>
      {feedback && <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">{feedback}</p>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdStudioPage() {
  // Mode
  const [mode, setMode] = useState<Mode>('visual');
  const [leftTab, setLeftTab] = useState<LeftTab>('brief');
  const [rightTab, setRightTab] = useState<RightTab>('chat');

  // Brief
  const [topic, setTopic] = useState('');
  const [headline, setHeadline] = useState('');
  const [subhead, setSubhead] = useState('');
  const [cta, setCta] = useState('');
  const [details, setDetails] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState('square');
  const [imageUrl, setImageUrl] = useState('');

  // Generation
  const [html, setHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Chat iteration
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [editing, setEditing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Review
  const [scores, setScores] = useState<ReviewScores | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Figma export
  const [figmaJson, setFigmaJson] = useState('');
  const [exporting, setExporting] = useState(false);
  const [figmaCopied, setFigmaCopied] = useState(false);

  // Signals
  const [signalKeywords, setSignalKeywords] = useState('');
  const [angles, setAngles] = useState<Angle[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);

  // Batch
  const [batchResults, setBatchResults] = useState<BatchVariation[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  // Google RSA
  const [rsaKeywords, setRsaKeywords] = useState('');
  const [rsaTopic, setRsaTopic] = useState('');
  const [rsaResult, setRsaResult] = useState<RSAResult | null>(null);
  const [rsaLoading, setRsaLoading] = useState(false);

  // Misc
  const [copied, setCopied] = useState(false);

  const size = SIZE_OPTIONS.find(s => s.id === sizeId) || SIZE_OPTIONS[0];
  const maxPreviewH = 560;
  const scale = Math.min(1, maxPreviewH / size.h, 560 / size.w);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!topic.trim() && !headline.trim()) return;
    setGenerating(true); setError(''); setChatHistory([]); setScores(null); setFigmaJson('');
    try {
      let result = await apiStream({
        action: 'generate', topic, headline, subhead, cta, details,
        archetype: selectedArchetype, imageUrl,
        width: size.w, height: size.h, sizeLabel: size.label,
      }, setHtml);
      if (result.startsWith('```')) result = result.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(result);
      setChatHistory([{ role: 'system', text: `Ad created${selectedArchetype ? ` (${ARCHETYPES.find(a => a.id === selectedArchetype)?.label})` : ''}. Use the chat to iterate.` }]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    setGenerating(false);
  }, [topic, headline, subhead, cta, details, selectedArchetype, imageUrl, size]);

  const handleIterate = useCallback(async () => {
    if (!chatInput.trim() || !html) return;
    const instruction = chatInput.trim();
    setChatInput(''); setEditing(true);
    setChatHistory(h => [...h, { role: 'user', text: instruction }]);
    try {
      let result = await apiStream({ action: 'iterate', currentHtml: html, instructions: instruction }, setHtml);
      if (result.startsWith('```')) result = result.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(result);
      setChatHistory(h => [...h, { role: 'system', text: 'Updated.' }]);
    } catch (e) { setChatHistory(h => [...h, { role: 'system', text: `Error: ${e instanceof Error ? e.message : 'failed'}` }]); }
    setEditing(false);
  }, [chatInput, html]);

  const handleReview = useCallback(async () => {
    if (!html) return;
    setReviewing(true);
    try {
      const r = await apiJson({ action: 'review', html, platform: 'meta', prev_archetypes: batchResults.map(b => b.archetype) });
      if (r.error) throw new Error(r.error);
      setScores(r); setRightTab('review');
    } catch (e) { setError(e instanceof Error ? e.message : 'Review failed'); }
    setReviewing(false);
  }, [html, batchResults]);

  const handleExportFigma = useCallback(async () => {
    if (!html) return;
    setExporting(true);
    try {
      const r = await apiJson({ action: 'export_figma', html, width: size.w, height: size.h });
      if (r.error) throw new Error(r.error);
      setFigmaJson(JSON.stringify(r.blueprint, null, 2)); setRightTab('export');
    } catch (e) { setError(e instanceof Error ? e.message : 'Export failed'); }
    setExporting(false);
  }, [html, size]);

  const handleSignals = useCallback(async () => {
    if (!signalKeywords.trim()) return;
    setSignalsLoading(true);
    try {
      const r = await apiJson({ action: 'signals', keywords: signalKeywords, topic });
      if (r.error) throw new Error(r.error);
      setAngles(r.angles || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Signals failed'); }
    setSignalsLoading(false);
  }, [signalKeywords, topic]);

  const handleBatch = useCallback(async () => {
    if (!topic.trim()) return;
    setBatchLoading(true); setBatchResults([]); setShowBatch(true);
    try {
      const r = await apiJson({ action: 'batch', topic, angle: headline, details, width: size.w, height: size.h });
      if (r.error) throw new Error(r.error);
      setBatchResults((r.variations || []).map((v: BatchVariation) => ({ ...v, html: '', generating: false })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Batch failed'); }
    setBatchLoading(false);
  }, [topic, headline, details, size]);

  const handleRenderVariation = useCallback(async (idx: number) => {
    const v = batchResults[idx]; if (!v) return;
    setBatchResults(prev => prev.map((vv, i) => i === idx ? { ...vv, generating: true } : vv));
    try {
      let result = await apiStream({
        action: 'generate', topic: v.headline, headline: v.headline, subhead: v.subhead, details: v.angle_description,
        archetype: v.archetype, width: size.w, height: size.h, sizeLabel: size.label,
      }, setHtml);
      if (result.startsWith('```')) result = result.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(result);
      setBatchResults(prev => prev.map((vv, i) => i === idx ? { ...vv, html: result, generating: false } : vv));
      setChatHistory([{ role: 'system', text: `Rendered "${v.name}" (${v.archetype}). Iterate below.` }]);
      setScores(null); setFigmaJson('');
    } catch { setBatchResults(prev => prev.map((vv, i) => i === idx ? { ...vv, generating: false } : vv)); }
  }, [batchResults, size]);

  const handleGoogleRSA = useCallback(async () => {
    if (!rsaKeywords.trim()) return;
    setRsaLoading(true); setRsaResult(null);
    try {
      const r = await apiJson({ action: 'google_rsa', keywords: rsaKeywords, topic: rsaTopic });
      if (r.error) throw new Error(r.error);
      setRsaResult(r);
    } catch (e) { setError(e instanceof Error ? e.message : 'RSA failed'); }
    setRsaLoading(false);
  }, [rsaKeywords, rsaTopic]);

  const copyHtml = () => { navigator.clipboard.writeText(html); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadHtml = () => { const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ad-studio-${sizeId}.html`; a.click(); URL.revokeObjectURL(url); };
  const copyFigma = () => { navigator.clipboard.writeText(figmaJson); setFigmaCopied(true); setTimeout(() => setFigmaCopied(false), 2000); };

  const applyAngle = (a: Angle) => {
    setHeadline(a.hook);
    setTopic(a.angle);
    if (a.archetypes[0]) setSelectedArchetype(a.archetypes[0]);
    setLeftTab('brief');
  };

  // ── GOOGLE SEARCH MODE ────────────────────────────────────────────────

  if (mode === 'google') {
    return (
      <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
        <Header mode={mode} setMode={setMode} html="" onCopy={() => {}} onDownload={() => {}} copied={false} />
        <div className="flex flex-1 overflow-hidden">
          {/* Left: RSA Input */}
          <div className="flex w-[360px] flex-col border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Google Search Ad Generator</h2>
              <p className="mt-1 text-xs text-gray-500">Generate RSA headline + description sets with constraint scoring</p>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Keywords / Themes *</label>
              <textarea value={rsaKeywords} onChange={e => setRsaKeywords(e.target.value)} rows={4}
                placeholder="e.g. GLP-1 weight loss, CGM glucose monitor, metabolic health app, insulin resistance"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Campaign Topic (optional)</label>
              <input value={rsaTopic} onChange={e => setRsaTopic(e.target.value)}
                placeholder="e.g. GLP-1 graduation campaign"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <button onClick={handleGoogleRSA} disabled={rsaLoading || !rsaKeywords.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {rsaLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Search className="h-4 w-4" /> Generate RSA Set</>}
            </button>
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>

          {/* Right: RSA Results */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
            {!rsaResult && !rsaLoading && (
              <div className="flex flex-col items-center gap-3 py-24 text-gray-400">
                <Search className="h-10 w-10" />
                <p className="text-sm">Enter keywords to generate RSA ad copy</p>
              </div>
            )}
            {rsaResult && (
              <div className="mx-auto max-w-3xl space-y-6">
                {/* Score bar */}
                <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                  <div className={cn('rounded-lg px-3 py-1.5 text-sm font-bold',
                    rsaResult.scores.overall_strength === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                    rsaResult.scores.overall_strength === 'Good' ? 'bg-blue-100 text-blue-700' :
                    rsaResult.scores.overall_strength === 'Average' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  )}>
                    {rsaResult.scores.overall_strength}
                  </div>
                  <div className="flex gap-6 text-xs">
                    <span>Keywords: <strong>{rsaResult.scores.keyword_coverage}/10</strong></span>
                    <span>Diversity: <strong>{rsaResult.scores.diversity}/10</strong></span>
                    <span>Combinations: <strong>{rsaResult.scores.combination_safety}/10</strong></span>
                  </div>
                </div>

                {/* Headlines */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Headlines ({rsaResult.headlines.length}/15)</h3>
                  <div className="space-y-1.5">
                    {rsaResult.headlines.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-right text-[10px] text-gray-400">{i + 1}</span>
                        <div className={cn('flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium',
                          h.length > 30 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-800'
                        )}>
                          {h}
                        </div>
                        <span className={cn('text-[10px] tabular-nums', h.length > 30 ? 'text-rose-500 font-bold' : 'text-gray-400')}>
                          {h.length}/30
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Descriptions */}
                <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Descriptions ({rsaResult.descriptions.length}/4)</h3>
                  <div className="space-y-1.5">
                    {rsaResult.descriptions.map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-5 text-right text-[10px] text-gray-400">{i + 1}</span>
                        <div className={cn('flex-1 rounded-lg border px-3 py-2 text-sm',
                          d.length > 90 ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-700'
                        )}>
                          {d}
                        </div>
                        <span className={cn('mt-1.5 text-[10px] tabular-nums', d.length > 90 ? 'text-rose-500 font-bold' : 'text-gray-400')}>
                          {d.length}/90
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvements */}
                {rsaResult.improvements.length > 0 && (
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Suggested Improvements</h3>
                    <ul className="space-y-1.5">
                      {rsaResult.improvements.map((imp, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-600">
                          <Star className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" /> {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VISUAL AD MODE (main view) ────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
      <Header mode={mode} setMode={setMode} html={html} onCopy={copyHtml} onDownload={downloadHtml} copied={copied}
        onReview={handleReview} reviewing={reviewing} onExportFigma={handleExportFigma} exporting={exporting} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <div className="flex w-[340px] min-w-[340px] flex-col border-r border-gray-200 bg-white">
          <div className="flex border-b border-gray-200">
            {(['brief', 'signals'] as const).map(t => (
              <button key={t} onClick={() => setLeftTab(t)}
                className={cn('flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors',
                  leftTab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                )}>
                {t === 'brief' ? 'Brief' : 'Signals → Angles'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {leftTab === 'brief' ? (
              <>
                {/* Size picker */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Ad Size</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SIZE_OPTIONS.map(s => (
                      <button key={s.id} onClick={() => setSizeId(s.id)}
                        className={cn('flex flex-col items-center rounded-lg border p-1.5 text-center transition-all',
                          sizeId === s.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
                        )}>
                        <div className={cn('mb-0.5 rounded border', s.id === 'square' ? 'h-5 w-5' : s.id === 'landscape' ? 'h-3 w-6' : s.id === 'portrait' ? 'h-6 w-4' : 'h-7 w-3',
                          sizeId === s.id ? 'border-brand-500 bg-brand-100' : 'border-gray-300 bg-gray-50'
                        )} />
                        <span className="text-[9px] font-medium text-gray-600">{s.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Archetype grid */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Layout Archetype</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ARCHETYPES.map(a => (
                      <button key={a.id} onClick={() => setSelectedArchetype(selectedArchetype === a.id ? null : a.id)}
                        className={cn('flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all',
                          selectedArchetype === a.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'
                        )}>
                        {a.mini}
                        <span className="text-[8px] font-medium text-gray-600 leading-tight text-center">{a.label}</span>
                      </button>
                    ))}
                  </div>
                  {selectedArchetype && (
                    <p className="mt-1 text-[10px] text-brand-600">{ARCHETYPES.find(a => a.id === selectedArchetype)?.desc}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Topic / Angle *</label>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. GLP-1 graduation, blood sugar control"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Headline (optional)</label>
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="AI will generate one if empty"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Subhead</label>
                    <input value={subhead} onChange={e => setSubhead(e.target.value)} placeholder="Supporting text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">CTA</label>
                    <input value={cta} onChange={e => setCta(e.target.value)} placeholder="Learn More"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Extra Details</label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} placeholder="Style notes, specific imagery..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Background Image URL (optional)</label>
                  <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleGenerate} disabled={generating || (!topic.trim() && !headline.trim())}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                    {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Ad</>}
                  </button>
                  <button onClick={handleBatch} disabled={batchLoading || !topic.trim()} title="Generate 6 diverse variations"
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  </button>
                </div>
                {error && <p className="text-xs text-rose-500">{error}</p>}

                {/* Batch results */}
                {showBatch && batchResults.length > 0 && (
                  <div className="space-y-1.5 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Variations</p>
                      <button onClick={() => setShowBatch(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>
                    {batchResults.map((v, i) => (
                      <button key={i} onClick={() => handleRenderVariation(i)} disabled={v.generating}
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-left transition-all hover:border-brand-300 hover:shadow-sm disabled:opacity-50">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-mono text-gray-500">{v.archetype}</span>
                          <span className="text-xs font-bold text-gray-900 truncate">{v.name}</span>
                          {v.generating && <Loader2 className="h-3 w-3 animate-spin text-brand-500 ml-auto" />}
                          {v.html && <Check className="h-3 w-3 text-emerald-500 ml-auto" />}
                        </div>
                        <p className="mt-1 text-[10px] text-gray-600 truncate">{v.headline}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Signals tab */
              <>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Signal → Angle Engine</h3>
                  <p className="mt-1 text-xs text-gray-500">Enter keywords, trends, or search queries. AI generates messaging angles with recommended archetypes.</p>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Keywords / Trends *</label>
                  <textarea value={signalKeywords} onChange={e => setSignalKeywords(e.target.value)} rows={4}
                    placeholder="e.g. GLP-1 side effects, weight regain after ozempic, blood sugar crash, afternoon energy"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <button onClick={handleSignals} disabled={signalsLoading || !signalKeywords.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                  {signalsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Target className="h-4 w-4" /> Generate Angles</>}
                </button>
                {angles.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {angles.map((a, i) => (
                      <button key={i} onClick={() => applyAngle(a)}
                        className="w-full rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-brand-300 hover:shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                            a.emotion === 'fear' ? 'bg-rose-100 text-rose-700' :
                            a.emotion === 'hope' ? 'bg-emerald-100 text-emerald-700' :
                            a.emotion === 'curiosity' ? 'bg-blue-100 text-blue-700' :
                            a.emotion === 'urgency' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                          )}>{a.emotion}</span>
                          <span className="text-xs font-bold text-gray-900">{a.angle}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-gray-700 font-medium">&ldquo;{a.hook}&rdquo;</p>
                        <p className="mt-1 text-[10px] text-gray-500">{a.insight}</p>
                        <div className="mt-1.5 flex gap-1">
                          {a.archetypes.map(ar => <span key={ar} className="rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-mono text-gray-500">{ar}</span>)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: PREVIEW ────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-100 p-6">
          {html ? (
            <div style={{ width: size.w * scale, height: size.h * scale }} className="overflow-hidden rounded-lg shadow-xl ring-1 ring-gray-200">
              <iframe srcDoc={html} style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                className="border-0" sandbox="allow-same-origin" title="Ad Preview" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-gray-400">
              <div className="grid grid-cols-4 gap-3">
                {ARCHETYPES.slice(0, 8).map(a => (
                  <button key={a.id} onClick={() => { setSelectedArchetype(a.id); setLeftTab('brief'); }}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-3 transition-all hover:border-brand-300 hover:bg-white hover:shadow-sm">
                    {a.mini}
                    <span className="text-[9px] font-medium text-gray-500">{a.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm">Select an archetype and fill in the brief to generate</p>
            </div>
          )}
          {generating && (
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating ad...
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div className="flex w-[320px] min-w-[320px] flex-col border-l border-gray-200 bg-white">
          <div className="flex border-b border-gray-200">
            {([
              { key: 'chat', icon: MessageSquare, label: 'Iterate' },
              { key: 'review', icon: BarChart3, label: 'Review' },
              { key: 'export', icon: FileText, label: 'Export' },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setRightTab(key)}
                className={cn('flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors',
                  rightTab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                )}>
                <Icon className="mx-auto h-3.5 w-3.5 mb-0.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Chat */}
            {rightTab === 'chat' && (
              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                      <MessageSquare className="h-6 w-6" />
                      <p className="text-xs text-center">Generate an ad first, then iterate here</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn('rounded-lg px-3 py-2 text-xs', msg.role === 'user' ? 'ml-6 bg-gray-900 text-white' : 'mr-6 bg-gray-100 text-gray-700')}>
                      {msg.text}
                    </div>
                  ))}
                  {editing && <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="h-3 w-3 animate-spin" /> Updating...</div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="border-t border-gray-200 p-2">
                  <div className="flex gap-1.5">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleIterate()}
                      placeholder="Make the headline bigger, change CTA color..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-brand-300" />
                    <button onClick={handleIterate} disabled={editing || !chatInput.trim() || !html}
                      className="rounded-lg bg-gray-900 p-1.5 text-white disabled:opacity-30">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Review */}
            {rightTab === 'review' && (
              <div className="p-4 space-y-3">
                {!scores && !reviewing && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <BarChart3 className="h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">Not reviewed yet</p>
                    <button onClick={handleReview} disabled={!html || reviewing}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                      {reviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Review Now'}
                    </button>
                  </div>
                )}
                {reviewing && (
                  <div className="flex items-center justify-center gap-2 py-12 text-xs text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Reviewing...
                  </div>
                )}
                {scores && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-3xl font-black',
                          scores.total >= 34 ? 'text-emerald-600' : scores.total >= 28 ? 'text-blue-600' : scores.total >= 20 ? 'text-amber-600' : 'text-rose-600'
                        )}>{scores.total}</span>
                        <span className="text-sm text-gray-400">/{scores.max_total || 40}</span>
                        <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                          scores.verdict === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                          scores.verdict === 'Good' ? 'bg-blue-100 text-blue-700' :
                          scores.verdict === 'Mediocre' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        )}>{scores.verdict}</span>
                      </div>
                      <button onClick={handleReview} disabled={reviewing} className="rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-medium hover:bg-gray-50">
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    </div>
                    {scores.fast_fail && (
                      <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                        <div>
                          <p className="text-[10px] font-bold text-rose-700">Fast Fail</p>
                          {scores.fast_fail_reasons.map((r, i) => <p key={i} className="text-[10px] text-rose-600">{r}</p>)}
                        </div>
                      </div>
                    )}
                    <ScoreGauge label="Hook Strength" score={scores.hook_strength?.score} feedback={scores.hook_strength?.feedback} max={5} />
                    <ScoreGauge label="Single Core Idea" score={scores.single_core_idea?.score} feedback={scores.single_core_idea?.feedback} max={5} />
                    <ScoreGauge label="Problem Relevance" score={scores.problem_relevance?.score} feedback={scores.problem_relevance?.feedback} max={5} />
                    <ScoreGauge label="Reframe / Insight" score={scores.reframe_quality?.score} feedback={scores.reframe_quality?.feedback} max={5} />
                    <ScoreGauge label="Benefit-First" score={scores.benefit_first?.score} feedback={scores.benefit_first?.feedback} max={5} />
                    <ScoreGauge label="Visual-Message Fit" score={scores.visual_message?.score} feedback={scores.visual_message?.feedback} max={5} />
                    <ScoreGauge label="Readability" score={scores.readability?.score} feedback={scores.readability?.feedback} max={5} />
                    <ScoreGauge label="Specificity" score={scores.specificity?.score} feedback={scores.specificity?.feedback} max={5} />
                    {scores.design_violations?.length > 0 && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1">
                        <p className="text-[10px] font-bold text-amber-700">Design Violations</p>
                        {scores.design_violations.map((v, i) => <p key={i} className="text-[10px] text-amber-600">{v}</p>)}
                      </div>
                    )}
                    {scores.headline_rewrite && (
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5">
                        <p className="text-[10px] font-bold text-blue-700">Suggested Headline Rewrite</p>
                        <p className="mt-1 text-xs font-medium text-blue-900">&ldquo;{scores.headline_rewrite}&rdquo;</p>
                      </div>
                    )}
                    {scores.top_improvements?.length > 0 && (
                      <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase text-gray-500">Top Improvements</p>
                        {scores.top_improvements.map((imp, i) => (
                          <p key={i} className="flex gap-2 text-[10px] text-gray-600">
                            <Star className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" /> {imp}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Export */}
            {rightTab === 'export' && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Export Options</h3>
                  <p className="mt-1 text-xs text-gray-500">Download HTML or export structured JSON for Figma</p>
                </div>

                {html && (
                  <div className="space-y-2">
                    <button onClick={downloadHtml} className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Download className="h-4 w-4" /> Download HTML
                    </button>
                    <button onClick={copyHtml} className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      {copied ? <><Check className="h-4 w-4 text-emerald-500" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy HTML</>}
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-900">Figma Export</h4>
                  <p className="mt-1 text-[10px] text-gray-500">Convert to AdBlueprint JSON compatible with the Signos Figma plugin</p>
                  <button onClick={handleExportFigma} disabled={!html || exporting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                    {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Extracting...</> : <><Zap className="h-4 w-4" /> Generate Figma JSON</>}
                  </button>
                </div>

                {figmaJson && (
                  <div className="space-y-2">
                    <button onClick={copyFigma}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100">
                      {figmaCopied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy for Figma Plugin</>}
                    </button>
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-violet-500 hover:text-violet-700">Preview JSON</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-[9px] text-gray-300">{figmaJson}</pre>
                    </details>
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">How to use in Figma</summary>
                      <ol className="mt-2 space-y-1 text-gray-500 list-decimal pl-4">
                        <li>Open Figma Desktop → Plugins → Development → Import plugin from manifest</li>
                        <li>Select <code className="bg-gray-100 rounded px-1">figma-plugin/manifest.json</code></li>
                        <li>Run the plugin, paste the JSON, click &quot;Create in Figma&quot;</li>
                        <li>All text, buttons, overlays become editable native Figma layers</li>
                      </ol>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ mode, setMode, html, onCopy, onDownload, copied, onReview, reviewing, onExportFigma, exporting }: {
  mode: Mode; setMode: (m: Mode) => void; html: string;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  onReview?: () => void; reviewing?: boolean;
  onExportFigma?: () => void; exporting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-2.5">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">Ad Studio</h1>
          <p className="text-[10px] text-gray-500">Concept → Iterate → Review → Figma</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button onClick={() => setMode('visual')}
            className={cn('rounded-md px-3 py-1 text-xs font-medium transition-all',
              mode === 'visual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <Eye className="mr-1.5 inline h-3 w-3" /> Visual Ads
          </button>
          <button onClick={() => setMode('google')}
            className={cn('rounded-md px-3 py-1 text-xs font-medium transition-all',
              mode === 'google' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <Search className="mr-1.5 inline h-3 w-3" /> Google Search
          </button>
        </div>
      </div>
      {mode === 'visual' && html && (
        <div className="flex items-center gap-2">
          {onReview && (
            <button onClick={onReview} disabled={reviewing} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />} Review
            </button>
          )}
          {onExportFigma && (
            <button onClick={onExportFigma} disabled={exporting} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Figma
            </button>
          )}
          <button onClick={onDownload} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button onClick={onCopy} className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> HTML</>}
          </button>
        </div>
      )}
    </div>
  );
}
