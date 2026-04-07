'use client';

import { cn } from '@/lib/utils';
import {
  Lightbulb, Plus, Loader2, Sparkles, ChevronRight, X, Send, Star,
  Target, Users, Megaphone, TrendingUp, Shield, AlertTriangle,
  CheckCircle2, ArrowLeft, Trash2, Eye, BarChart3, MessageSquare,
  Zap, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

interface Concept {
  id: string;
  title: string;
  idea: string;
  target_audience: string;
  objective: string;
  platforms: string[];
  budget_range: string;
  tone: string;
  additional_context: string;
  ai_analysis: AiAnalysis | null;
  status: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface CreativeDirection {
  name: string;
  description: string;
  hook: string;
  body: string;
  cta: string;
  format: string;
  platform: string;
}

interface AiAnalysis {
  overall_score: number;
  verdict: string;
  executive_summary: string;
  scores: Record<string, number>;
  strengths: string[];
  risks: { severity: string; risk: string; mitigation: string }[];
  regulatory_notes: string[];
  target_audience_analysis: {
    primary_persona: string;
    psychographics: string;
    pain_points: string[];
    buying_triggers: string[];
    objections: string[];
  };
  creative_directions: CreativeDirection[];
  messaging_framework: {
    primary_headline: string;
    secondary_headlines: string[];
    value_propositions: string[];
    proof_points: string[];
  };
  media_strategy: {
    recommended_platforms: { platform: string; rationale: string; format: string }[];
    estimated_cpm_range: string;
    funnel_position: string;
    retargeting_angle: string;
  };
  improvement_suggestions: string[];
  test_hypotheses: string[];
  analyzed_at?: number;
}

async function api(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/ad-concepts/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return r.json();
}

const PLATFORMS = ['Meta', 'Google', 'TikTok', 'YouTube', 'Display', 'Email', 'Programmatic', 'Pinterest', 'LinkedIn'];
const OBJECTIVES = ['Brand Awareness', 'Lead Generation', 'Conversions / Sales', 'Retargeting', 'App Installs', 'Engagement'];
const TONES = ['Empowering', 'Humorous', 'Scientific', 'Emotional', 'Bold / Provocative', 'Aspirational', 'Relatable', 'Urgent'];

const VERDICT_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  green_light: { label: 'Green Light', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  promising_needs_work: { label: 'Promising — Needs Work', color: 'bg-amber-100 text-amber-700', icon: Zap },
  pivot_recommended: { label: 'Pivot Recommended', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  pass: { label: 'Pass', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 8 ? 'text-emerald-600 bg-emerald-50' : score >= 6 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', c)}><Star className="h-3 w-3" />{score}/10</span>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? '#059669' : value >= 6 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-32 truncate capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full transition-all" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-bold text-gray-700 w-5 text-right">{value}</span>
    </div>
  );
}

export default function AdConceptsPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Concept | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true, strengths: true, risks: true, audience: false,
    creative: true, messaging: false, media: false, improvements: true, tests: false,
  });

  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [audience, setAudience] = useState('');
  const [objective, setObjective] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [tone, setTone] = useState('');
  const [context, setContext] = useState('');
  const [creating, setCreating] = useState(false);

  const toggle = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const loadConcepts = useCallback(async () => {
    setLoading(true);
    const res = await api('list');
    if (res.ok) setConcepts(res.concepts || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadConcepts(); }, [loadConcepts]);

  const openConcept = useCallback(async (c: Concept) => {
    setSelected(c);
    const res = await api('get', { id: c.id });
    if (res.ok) setSelected(res.concept);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !idea.trim()) return;
    setCreating(true);
    const res = await api('create', {
      data: { title, idea, target_audience: audience, objective, platforms, budget_range: budget, tone, additional_context: context },
    });
    if (res.ok) {
      setShowCreate(false);
      setTitle(''); setIdea(''); setAudience(''); setObjective('');
      setPlatforms([]); setBudget(''); setTone(''); setContext('');
      await loadConcepts();
      openConcept({ id: res.id } as Concept);
    }
    setCreating(false);
  }, [title, idea, audience, objective, platforms, budget, tone, context, loadConcepts, openConcept]);

  const runAnalysis = useCallback(async () => {
    if (!selected) return;
    setAnalyzing(true);
    await fetch('/api/ad-concepts/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId: selected.id }),
    });
    const res = await api('get', { id: selected.id });
    if (res.ok) setSelected(res.concept);
    await loadConcepts();
    setAnalyzing(false);
  }, [selected, loadConcepts]);

  const deleteConcept = useCallback(async (id: string) => {
    if (!confirm('Delete this concept?')) return;
    await api('delete', { id });
    setSelected(null);
    loadConcepts();
  }, [loadConcepts]);

  // ─── List view ──────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-brand-500" />
            <div>
              <h1 className="text-base font-bold text-gray-900 lg:text-lg">Ad Concepts</h1>
              <p className="text-[10px] text-gray-400">Pitch ad ideas and get Marv analysis on efficacy and strategy</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600">
            <Plus className="h-3.5 w-3.5" /> New Concept
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /></div>
          ) : concepts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <Lightbulb className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No concepts yet</p>
              <p className="mt-1 text-xs text-gray-400">Click &ldquo;New Concept&rdquo; to pitch your first ad idea.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {concepts.map(c => {
                const a = c.ai_analysis;
                const v = a?.verdict ? VERDICT_MAP[a.verdict] : null;
                return (
                  <button key={c.id} onClick={() => openConcept(c)} className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md hover:border-brand-200">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {a && <ScoreBadge score={a.overall_score} />}
                      {v && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', v.color)}>{v.label}</span>}
                      {!a && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500">{c.status === 'analyzing' ? 'Analyzing...' : 'Draft'}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{c.idea}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {c.target_audience && <span className="text-[9px] rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">{c.target_audience.slice(0, 30)}</span>}
                      {(c.platforms || []).slice(0, 2).map(p => <span key={p} className="text-[9px] rounded bg-purple-50 px-1.5 py-0.5 text-purple-600">{p}</span>)}
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div><h2 className="text-sm font-bold text-gray-900">New Ad Concept</h2><p className="text-[10px] text-gray-400">Describe your idea and Marv will analyze it</p></div>
                <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Concept Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="e.g. 'DadBod Fix — Wife-to-Husband Angle'" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Core Idea *</label>
                  <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Describe the ad concept in detail — the angle, the story, what makes it compelling..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Target Audience</label>
                  <input value={audience} onChange={e => setAudience(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="e.g. Wives of men 30-50 who want their husbands to get healthier" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Objective</label>
                    <select value={objective} onChange={e => setObjective(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="">Select...</option>
                      {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                      <option value="">Select...</option>
                      {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Platforms</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <button key={p} onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={cn('rounded-full px-2.5 py-1 text-[10px] font-medium border transition', platforms.includes(p) ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Budget Range</label>
                    <input value={budget} onChange={e => setBudget(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="e.g. $5k-15k/month" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Additional Context</label>
                  <textarea value={context} onChange={e => setContext(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Any other details — past results, competitor insights, seasonal timing..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !title.trim() || !idea.trim()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />} Create Concept
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Detail view ──────────────────────────────────────────────────────
  const a = selected.ai_analysis;
  const v = a?.verdict ? VERDICT_MAP[a.verdict] : null;

  function Section({ id, title, icon: Icon, children, defaultOpen }: { id: string; title: string; icon: typeof Star; children: React.ReactNode; defaultOpen?: boolean }) {
    const open = expandedSections[id] ?? defaultOpen ?? false;
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
          <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-500" /><span className="text-xs font-bold text-gray-900">{title}</span></div>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
        </button>
        {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => { setSelected(null); loadConcepts(); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold text-gray-900 lg:text-base truncate">{selected.title}</h1>
              {a && <ScoreBadge score={a.overall_score} />}
              {v && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', v.color)}>{v.label}</span>}
            </div>
            <p className="text-[10px] text-gray-400">{new Date(selected.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(!a || selected.status === 'draft') && (
            <button onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-60">
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} {a ? 'Re-analyze' : 'Analyze with Marv'}
            </button>
          )}
          {a && (
            <button onClick={runAnalysis} disabled={analyzing} className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-60">
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-analyze
            </button>
          )}
          <button onClick={() => deleteConcept(selected.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {/* Original idea */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Original Idea</h3>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{selected.idea}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {selected.target_audience && <span className="text-[10px] rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700 font-medium"><Users className="inline h-3 w-3 mr-0.5" />{selected.target_audience}</span>}
            {selected.objective && <span className="text-[10px] rounded-full bg-green-50 px-2.5 py-0.5 text-green-700 font-medium"><Target className="inline h-3 w-3 mr-0.5" />{selected.objective}</span>}
            {selected.tone && <span className="text-[10px] rounded-full bg-purple-50 px-2.5 py-0.5 text-purple-700 font-medium">{selected.tone}</span>}
            {(selected.platforms || []).map(p => <span key={p} className="text-[10px] rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{p}</span>)}
            {selected.budget_range && <span className="text-[10px] rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700 font-medium">{selected.budget_range}</span>}
          </div>
        </div>

        {analyzing && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-violet-700">Marv is analyzing your concept...</p>
            <p className="text-xs text-violet-500 mt-1">This usually takes 15-30 seconds</p>
          </div>
        )}

        {a && (
          <>
            {/* Executive summary */}
            <div className={cn('rounded-xl border p-4', v?.color === 'bg-emerald-100 text-emerald-700' ? 'border-emerald-200 bg-emerald-50/50' : v?.color === 'bg-red-100 text-red-700' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50')}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-bold text-gray-900">Marv Analysis</span>
                <ScoreBadge score={a.overall_score} />
                {v && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', v.color)}>{v.label}</span>}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{a.executive_summary}</p>
            </div>

            {/* Scores */}
            <Section id="scores" title="Detailed Scores" icon={BarChart3}>
              <div className="space-y-2">
                {a.scores && Object.entries(a.scores).map(([k, v]) => <ScoreBar key={k} label={k} value={v} />)}
              </div>
            </Section>

            {/* Strengths */}
            <Section id="strengths" title={`Strengths (${a.strengths?.length || 0})`} icon={CheckCircle2}>
              <ul className="space-y-1.5">{a.strengths?.map((s, i) => <li key={i} className="flex items-start gap-2 text-xs text-gray-700"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />{s}</li>)}</ul>
            </Section>

            {/* Risks */}
            <Section id="risks" title={`Risks (${a.risks?.length || 0})`} icon={AlertTriangle}>
              <div className="space-y-2">{a.risks?.map((r, i) => (
                <div key={i} className={cn('rounded-lg p-3 text-xs', r.severity === 'high' ? 'bg-red-50 border border-red-200' : r.severity === 'medium' ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200')}>
                  <div className="flex items-center gap-1.5 mb-1"><span className={cn('rounded px-1 py-0 text-[9px] font-bold uppercase', r.severity === 'high' ? 'bg-red-100 text-red-700' : r.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600')}>{r.severity}</span><span className="font-medium text-gray-800">{r.risk}</span></div>
                  <p className="text-gray-500 ml-1">Mitigation: {r.mitigation}</p>
                </div>
              ))}</div>
              {a.regulatory_notes && a.regulatory_notes.length > 0 && (
                <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5"><Shield className="h-3.5 w-3.5 text-violet-500" /><span className="text-[10px] font-bold text-violet-700 uppercase">Regulatory Notes</span></div>
                  <ul className="space-y-1">{a.regulatory_notes.map((n, i) => <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">&#8226;</span>{n}</li>)}</ul>
                </div>
              )}
            </Section>

            {/* Target Audience Analysis */}
            <Section id="audience" title="Target Audience Deep Dive" icon={Users}>
              {a.target_audience_analysis && (
                <div className="space-y-3">
                  <div><span className="text-[10px] font-bold text-gray-500 uppercase">Primary Persona</span><p className="text-xs text-gray-700 mt-0.5">{a.target_audience_analysis.primary_persona}</p></div>
                  <div><span className="text-[10px] font-bold text-gray-500 uppercase">Psychographics</span><p className="text-xs text-gray-700 mt-0.5">{a.target_audience_analysis.psychographics}</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-red-50 p-2.5"><span className="text-[10px] font-bold text-red-600 uppercase">Pain Points</span><ul className="mt-1 space-y-0.5">{a.target_audience_analysis.pain_points?.map((p, i) => <li key={i} className="text-[11px] text-gray-600">&#8226; {p}</li>)}</ul></div>
                    <div className="rounded-lg bg-green-50 p-2.5"><span className="text-[10px] font-bold text-green-600 uppercase">Buying Triggers</span><ul className="mt-1 space-y-0.5">{a.target_audience_analysis.buying_triggers?.map((t, i) => <li key={i} className="text-[11px] text-gray-600">&#8226; {t}</li>)}</ul></div>
                    <div className="rounded-lg bg-amber-50 p-2.5"><span className="text-[10px] font-bold text-amber-600 uppercase">Objections</span><ul className="mt-1 space-y-0.5">{a.target_audience_analysis.objections?.map((o, i) => <li key={i} className="text-[11px] text-gray-600">&#8226; {o}</li>)}</ul></div>
                  </div>
                </div>
              )}
            </Section>

            {/* Creative Directions */}
            <Section id="creative" title={`Creative Directions (${a.creative_directions?.length || 0})`} icon={Megaphone}>
              <div className="space-y-3">{a.creative_directions?.map((d, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-1.5"><span className="text-xs font-bold text-gray-900">{d.name}</span><span className="text-[9px] rounded bg-purple-50 px-1.5 py-0.5 text-purple-600">{d.format}</span>{d.platform && <span className="text-[9px] rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">{d.platform}</span>}</div>
                  <p className="text-[11px] text-gray-600 mb-2">{d.description}</p>
                  <div className="space-y-1.5 bg-gray-50 rounded-lg p-2.5">
                    <div><span className="text-[9px] font-bold text-gray-500 uppercase">Hook:</span><p className="text-[11px] text-gray-800 font-medium">&ldquo;{d.hook}&rdquo;</p></div>
                    <div><span className="text-[9px] font-bold text-gray-500 uppercase">Body:</span><p className="text-[11px] text-gray-700">{d.body}</p></div>
                    <div><span className="text-[9px] font-bold text-gray-500 uppercase">CTA:</span><p className="text-[11px] text-brand-600 font-semibold">{d.cta}</p></div>
                  </div>
                </div>
              ))}</div>
            </Section>

            {/* Messaging Framework */}
            <Section id="messaging" title="Messaging Framework" icon={MessageSquare}>
              {a.messaging_framework && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-brand-50 border border-brand-200 p-3 text-center"><span className="text-[10px] font-bold text-brand-500 uppercase">Primary Headline</span><p className="text-sm font-bold text-gray-900 mt-1">{a.messaging_framework.primary_headline}</p></div>
                  <div><span className="text-[10px] font-bold text-gray-500 uppercase">Alternative Headlines</span><div className="mt-1 space-y-1">{a.messaging_framework.secondary_headlines?.map((h, i) => <p key={i} className="text-xs text-gray-700 bg-gray-50 rounded px-2.5 py-1.5">{h}</p>)}</div></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-[10px] font-bold text-gray-500 uppercase">Value Props</span><ul className="mt-1 space-y-0.5">{a.messaging_framework.value_propositions?.map((v, i) => <li key={i} className="text-[11px] text-gray-600">&#8226; {v}</li>)}</ul></div>
                    <div><span className="text-[10px] font-bold text-gray-500 uppercase">Proof Points</span><ul className="mt-1 space-y-0.5">{a.messaging_framework.proof_points?.map((p, i) => <li key={i} className="text-[11px] text-gray-600">&#8226; {p}</li>)}</ul></div>
                  </div>
                </div>
              )}
            </Section>

            {/* Media Strategy */}
            <Section id="media" title="Media Strategy" icon={TrendingUp}>
              {a.media_strategy && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {a.media_strategy.funnel_position && <span className="text-[10px] rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700 font-medium">Funnel: {a.media_strategy.funnel_position}</span>}
                    {a.media_strategy.estimated_cpm_range && <span className="text-[10px] rounded-full bg-green-50 px-2.5 py-0.5 text-green-700 font-medium">CPM: {a.media_strategy.estimated_cpm_range}</span>}
                  </div>
                  {a.media_strategy.recommended_platforms?.map((p, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 p-2.5">
                      <span className="text-xs font-semibold text-gray-900">{p.platform}</span><span className="text-[9px] text-gray-400 ml-2">{p.format}</span>
                      <p className="text-[11px] text-gray-600 mt-0.5">{p.rationale}</p>
                    </div>
                  ))}
                  {a.media_strategy.retargeting_angle && <div className="rounded-lg bg-amber-50 p-2.5"><span className="text-[10px] font-bold text-amber-600 uppercase">Retargeting Angle</span><p className="text-[11px] text-gray-700 mt-0.5">{a.media_strategy.retargeting_angle}</p></div>}
                </div>
              )}
            </Section>

            {/* Improvements */}
            <Section id="improvements" title={`How to Make It Better (${a.improvement_suggestions?.length || 0})`} icon={Zap}>
              <ul className="space-y-1.5">{a.improvement_suggestions?.map((s, i) => <li key={i} className="flex items-start gap-2 text-xs text-gray-700"><Zap className="h-3.5 w-3.5 mt-0.5 text-amber-400 flex-shrink-0" />{s}</li>)}</ul>
            </Section>

            {/* A/B Test Ideas */}
            <Section id="tests" title={`A/B Test Ideas (${a.test_hypotheses?.length || 0})`} icon={Eye}>
              <ul className="space-y-1.5">{a.test_hypotheses?.map((t, i) => <li key={i} className="flex items-start gap-2 text-xs text-gray-700"><Eye className="h-3.5 w-3.5 mt-0.5 text-blue-400 flex-shrink-0" />{t}</li>)}</ul>
            </Section>
          </>
        )}

        {!a && !analyzing && (
          <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-violet-300 mb-3" />
            <p className="text-sm font-medium text-gray-700">Ready for analysis</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Click &ldquo;Analyze with Marv&rdquo; to get a comprehensive review of this concept</p>
            <button onClick={runAnalysis} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600">
              <Sparkles className="h-3.5 w-3.5" /> Analyze Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
