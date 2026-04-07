'use client';

import { cn } from '@/lib/utils';
import {
  ClipboardCheck, Plus, Loader2, ExternalLink, CheckCircle2,
  Eye, Send, MessageSquare, Shield, Sparkles, ChevronRight,
  Star, Flag, ThumbsUp, ThumbsDown, X, ArrowLeft, RefreshCw, Trash2,
  Image as ImageIcon, AlertTriangle,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

interface CreativeLink { url: string; label: string }
interface AiItemReview {
  item_index: number; overall_score: number;
  scores: Record<string, number>;
  regulatory_flags: { severity: string; issue: string; fix: string }[];
  strengths: string[];
  issues: { severity: string; issue: string; fix: string }[];
  recommendations: string[];
}
interface Batch {
  id: string; title: string; description: string; designer_name: string;
  designer_email: string; agency: string; creative_links: CreativeLink[];
  platform_targets: string[]; ad_type: string; campaign: string; status: string;
  ai_review: Record<string, unknown> | null; submitted_at: number;
  created_at: number; updated_at: number;
}
interface Item {
  id: string; batch_id: string; name: string; description: string;
  image_url: string; figma_node_url: string; concept: string; dimensions: string;
  platform: string; ad_copy: string; cta: string; status: string;
  ai_review: AiItemReview | null; advisor_verdict: string; advisor_notes: string;
  advisor_reviewed_at: number | null; team_verdict: string; team_notes: string;
  team_reviewed_at: number | null;
}
interface Comment {
  id: string; item_id: string; batch_id: string; author: string;
  role: string; content: string; created_at: number;
}

async function api(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/ad-review/store', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return r.json();
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  ai_reviewing: { label: 'AI Reviewing', color: 'bg-violet-100 text-violet-700' },
  ai_reviewed: { label: 'AI Reviewed', color: 'bg-purple-100 text-purple-700' },
  advisor_review: { label: 'Advisor Review', color: 'bg-amber-100 text-amber-700' },
  advisor_reviewed: { label: 'Advisor Done', color: 'bg-orange-100 text-orange-700' },
  team_review: { label: 'Team Review', color: 'bg-cyan-100 text-cyan-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700' },
};
const PLATFORMS = ['Meta', 'Google', 'TikTok', 'YouTube', 'Display', 'Email', 'Programmatic', 'Other'];
const AD_TYPES = ['static', 'video', 'ugc', 'carousel', 'html5'];
const VERDICT_OPTS = [
  { value: 'approved', label: 'Approve', icon: ThumbsUp, color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  { value: 'changes_requested', label: 'Changes', icon: RefreshCw, color: 'text-amber-600 border-amber-200 bg-amber-50' },
  { value: 'rejected', label: 'Reject', icon: ThumbsDown, color: 'text-red-600 border-red-200 bg-red-50' },
];

function ScoreBadge({ score }: { score: number }) {
  const c = score >= 8 ? 'text-emerald-600 bg-emerald-50' : score >= 6 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', c)}><Star className="h-3 w-3" />{score}/10</span>;
}

export default function AdReviewPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [filter, setFilter] = useState('all');
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cDesigner, setCDesigner] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cAgency, setCAgency] = useState('');
  const [cAdType, setCAdType] = useState('static');
  const [cCampaign, setCCampaign] = useState('');
  const [cPlatforms, setCPlatforms] = useState<string[]>([]);
  const [cLinks, setCLinks] = useState<CreativeLink[]>([{ url: '', label: '' }]);
  const [creating, setCreating] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [iName, setIName] = useState('');
  const [iDesc, setIDesc] = useState('');
  const [iCopy, setICopy] = useState('');
  const [iCta, setICta] = useState('');
  const [iDims, setIDims] = useState('');
  const [iPlatform, setIPlatform] = useState('');
  const [iConcept, setIConcept] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [advisorVerdicts, setAdvisorVerdicts] = useState<Record<string, { verdict: string; notes: string }>>({});
  const [teamVerdicts, setTeamVerdicts] = useState<Record<string, { verdict: string; notes: string }>>({});
  const [submittingReview, setSubmittingReview] = useState(false);
  const [commentText, setCommentText] = useState('');

  const loadBatches = useCallback(async () => { setLoading(true); const res = await api('list_batches'); if (res.ok) setBatches(res.batches || []); setLoading(false); }, []);
  useEffect(() => { loadBatches(); }, [loadBatches]);

  const openBatch = useCallback(async (batch: Batch) => {
    setSelectedBatch(batch); setSelectedItem(null);
    const res = await api('get_batch', { id: batch.id });
    if (res.ok) {
      setSelectedBatch(res.batch); setItems(res.items || []); setComments(res.comments || []);
      const av: Record<string, { verdict: string; notes: string }> = {};
      const tv: Record<string, { verdict: string; notes: string }> = {};
      for (const it of (res.items || []) as Item[]) {
        if (it.advisor_verdict) av[it.id] = { verdict: it.advisor_verdict, notes: it.advisor_notes || '' };
        if (it.team_verdict) tv[it.id] = { verdict: it.team_verdict, notes: it.team_notes || '' };
      }
      setAdvisorVerdicts(av); setTeamVerdicts(tv);
    }
  }, []);

  const handleCreateBatch = useCallback(async () => {
    if (!cTitle.trim() || !cDesigner.trim()) return; setCreating(true);
    const res = await api('create_batch', { data: { title: cTitle, description: cDesc, designer_name: cDesigner, designer_email: cEmail, agency: cAgency, ad_type: cAdType, campaign: cCampaign, platform_targets: cPlatforms, creative_links: cLinks.filter(l => l.url.trim()) } });
    if (res.ok) { setShowCreate(false); setCTitle(''); setCDesc(''); setCDesigner(''); setCEmail(''); setCAgency(''); setCAdType('static'); setCCampaign(''); setCPlatforms([]); setCLinks([{ url: '', label: '' }]); await loadBatches(); openBatch({ id: res.id } as Batch); }
    setCreating(false);
  }, [cTitle, cDesc, cDesigner, cEmail, cAgency, cAdType, cCampaign, cPlatforms, cLinks, loadBatches, openBatch]);

  const handleAddItem = useCallback(async () => {
    if (!selectedBatch || !iName.trim()) return; setAddingItem(true);
    const res = await api('add_item', { batchId: selectedBatch.id, data: { name: iName, description: iDesc, ad_copy: iCopy, cta: iCta, dimensions: iDims, platform: iPlatform, concept: iConcept } });
    if (res.ok) { setShowAddItem(false); setIName(''); setIDesc(''); setICopy(''); setICta(''); setIDims(''); setIPlatform(''); setIConcept(''); openBatch(selectedBatch); }
    setAddingItem(false);
  }, [selectedBatch, iName, iDesc, iCopy, iCta, iDims, iPlatform, iConcept, openBatch]);

  const runAiReview = useCallback(async () => {
    if (!selectedBatch) return; setAiRunning(true);
    await fetch('/api/ad-review/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId: selectedBatch.id }) });
    await openBatch(selectedBatch); setAiRunning(false);
  }, [selectedBatch, openBatch]);

  const submitAdvisorReview = useCallback(async () => {
    if (!selectedBatch) return; setSubmittingReview(true);
    await api('bulk_advisor_review', { batchId: selectedBatch.id, verdicts: Object.entries(advisorVerdicts).map(([itemId, v]) => ({ itemId, ...v })) });
    await openBatch(selectedBatch); setSubmittingReview(false);
  }, [selectedBatch, advisorVerdicts, openBatch]);

  const submitTeamReview = useCallback(async () => {
    if (!selectedBatch) return; setSubmittingReview(true);
    await api('bulk_team_review', { batchId: selectedBatch.id, verdicts: Object.entries(teamVerdicts).map(([itemId, v]) => ({ itemId, ...v })) });
    await openBatch(selectedBatch); await loadBatches(); setSubmittingReview(false);
  }, [selectedBatch, teamVerdicts, openBatch, loadBatches]);

  const addComment = useCallback(async () => {
    if (!selectedBatch || !commentText.trim()) return;
    await api('add_comment', { batchId: selectedBatch.id, itemId: selectedItem?.id || '', author: 'Team', role: 'team', content: commentText });
    setCommentText(''); openBatch(selectedBatch);
  }, [selectedBatch, selectedItem, commentText, openBatch]);

  const deleteBatch = useCallback(async (id: string) => {
    if (!confirm('Delete this review batch?')) return;
    await api('delete_batch', { id }); setSelectedBatch(null); loadBatches();
  }, [loadBatches]);

  const filteredBatches = filter === 'all' ? batches : batches.filter(b => b.status === filter);

  // ─── Batch list view ──────────────────────────────────────────────────────
  if (!selectedBatch) {
    return (
      <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-brand-500" /><div><h1 className="text-base font-bold text-gray-900 lg:text-lg">Ad Review</h1><p className="text-[10px] text-gray-400">Submit, review, and approve ad creatives</p></div></div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"><Plus className="h-3.5 w-3.5" /> Submit Creatives</button>
        </header>
        <div className="flex items-center gap-2 overflow-x-auto border-b border-gray-100 bg-white px-4 py-2 lg:px-6">
          {[{ value: 'all', label: 'All' }, { value: 'submitted', label: 'Submitted' }, { value: 'ai_reviewed', label: 'AI Reviewed' }, { value: 'advisor_reviewed', label: 'Advisor Done' }, { value: 'approved', label: 'Approved' }].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={cn('whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition', filter === f.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{f.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /></div> : filteredBatches.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-gray-300 mb-3" /><p className="text-sm text-gray-500">No review batches yet</p><p className="mt-1 text-xs text-gray-400">Click &ldquo;Submit Creatives&rdquo; to start.</p></div>
          ) : (
            <div className="space-y-3">{filteredBatches.map(b => {
              const bst = STATUS_MAP[b.status] || STATUS_MAP.submitted;
              const aiScore = b.ai_review ? (b.ai_review as Record<string, unknown>).overall_score as number : null;
              return (
                <button key={b.id} onClick={() => openBatch(b)} className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md hover:border-brand-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', bst.color)}>{bst.label}</span>
                        {aiScore != null && <ScoreBadge score={aiScore} />}
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{b.ad_type}</span>
                        {(b.platform_targets || []).slice(0, 3).map(p => <span key={p} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{p}</span>)}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{b.title}</h3>
                      <p className="mt-0.5 text-xs text-gray-500">{b.designer_name}{b.agency ? ` \u2014 ${b.agency}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4"><span className="text-[10px] text-gray-400">{new Date(b.submitted_at).toLocaleDateString()}</span><ChevronRight className="h-4 w-4 text-gray-300" /></div>
                  </div>
                </button>);
            })}</div>
          )}
        </div>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><h2 className="text-sm font-bold text-gray-900">Submit Creatives for Review</h2><button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="mb-1 block text-xs font-medium text-gray-700">Batch Title *</label><input value={cTitle} onChange={e => setCTitle(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="GLP-1 Graduation Static Ads" /></div>
                <div><label className="mb-1 block text-xs font-medium text-gray-700">Description</label><textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Batch of static ads for the GLP-1 graduation campaign..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Designer *</label><input value={cDesigner} onChange={e => setCDesigner(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Ashlee" /></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Agency / Firm</label><input value={cAgency} onChange={e => setCAgency(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Zero to 1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Designer Email</label><input value={cEmail} onChange={e => setCEmail(e.target.value)} type="email" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" /></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Campaign</label><input value={cCampaign} onChange={e => setCCampaign(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Q1 GLP-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Ad Type</label><select value={cAdType} onChange={e => setCAdType(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">{AD_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
                  <div><label className="mb-1 block text-xs font-medium text-gray-700">Platforms</label><div className="flex flex-wrap gap-1">{PLATFORMS.map(p => <button key={p} onClick={() => setCPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border transition', cPlatforms.includes(p) ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>{p}</button>)}</div></div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Creative Links (Figma, Frame.io, etc.)</label>
                  {cLinks.map((link, i) => <div key={i} className="flex gap-2 mb-2"><input value={link.label} onChange={e => { const l = [...cLinks]; l[i] = { ...l[i], label: e.target.value }; setCLinks(l); }} className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none" placeholder="Label" /><input value={link.url} onChange={e => { const l = [...cLinks]; l[i] = { ...l[i], url: e.target.value }; setCLinks(l); }} className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none" placeholder="https://..." />{cLinks.length > 1 && <button onClick={() => setCLinks(cLinks.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>}</div>)}
                  <button onClick={() => setCLinks([...cLinks, { url: '', label: '' }])} className="text-[11px] text-brand-500 hover:text-brand-600 font-medium">+ Add link</button>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4"><button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={handleCreateBatch} disabled={creating || !cTitle.trim() || !cDesigner.trim()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Batch detail view ─────────────────────────────────────────────────────
  const st = STATUS_MAP[selectedBatch.status] || STATUS_MAP.submitted;
  const aiSummary = selectedBatch.ai_review as Record<string, unknown> | null;
  const isAdvisorPhase = ['ai_reviewed', 'advisor_review'].includes(selectedBatch.status);
  const isTeamPhase = ['advisor_reviewed', 'team_review'].includes(selectedBatch.status);
  const advisorDecided = items.length > 0 && items.every(it => advisorVerdicts[it.id]?.verdict);
  const teamDecided = items.length > 0 && items.every(it => teamVerdicts[it.id]?.verdict);

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => { setSelectedBatch(null); loadBatches(); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-sm font-bold text-gray-900 lg:text-base truncate">{selectedBatch.title}</h1><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', st.color)}>{st.label}</span></div>
            <p className="text-[10px] text-gray-400">{selectedBatch.designer_name}{selectedBatch.agency ? ` \u2014 ${selectedBatch.agency}` : ''} &middot; {items.length} creatives</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedBatch.status === 'submitted' && items.length > 0 && <button onClick={runAiReview} disabled={aiRunning} className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-60">{aiRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Run AI Review</button>}
          {isAdvisorPhase && advisorDecided && <button onClick={submitAdvisorReview} disabled={submittingReview} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">{submittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Submit Advisor Review</button>}
          {isTeamPhase && teamDecided && <button onClick={submitTeamReview} disabled={submittingReview} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{submittingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Submit Team Review</button>}
          <button onClick={() => deleteBatch(selectedBatch.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {/* Batch info + AI summary */}
        <div className="border-b border-gray-100 bg-white p-4 lg:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div><span className="text-[10px] font-medium uppercase text-gray-400">Creative Links</span><div className="mt-1 space-y-1">{(selectedBatch.creative_links || []).map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"><ExternalLink className="h-3 w-3" />{l.label || l.url.slice(0, 40)}</a>)}{!(selectedBatch.creative_links || []).length && <span className="text-xs text-gray-400">None</span>}</div></div>
            <div><span className="text-[10px] font-medium uppercase text-gray-400">Details</span><div className="mt-1 flex flex-wrap gap-1.5"><span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{selectedBatch.ad_type}</span>{(selectedBatch.platform_targets || []).map(p => <span key={p} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">{p}</span>)}{selectedBatch.campaign && <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">{selectedBatch.campaign}</span>}</div>{selectedBatch.description && <p className="mt-1 text-xs text-gray-500">{selectedBatch.description}</p>}</div>
            {aiSummary && <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3"><div className="flex items-center gap-1.5 mb-1"><Sparkles className="h-3.5 w-3.5 text-violet-500" /><span className="text-[10px] font-bold text-violet-700 uppercase">AI Summary</span></div>{aiSummary.overall_score != null && <div className="mb-1"><ScoreBadge score={aiSummary.overall_score as number} /></div>}{Number(aiSummary.regulatory_flags_count || 0) > 0 && <div className="flex items-center gap-1 text-[10px] text-red-600 mb-1"><Flag className="h-3 w-3" /> {String(aiSummary.regulatory_flags_count)} regulatory flag(s)</div>}{!!aiSummary.recommended_action && <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mb-1', (aiSummary.recommended_action as string) === 'approve_all' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{String(aiSummary.recommended_action || '').replace(/_/g, ' ')}</span>}{!!aiSummary.summary && <p className="text-[11px] text-gray-600">{String(aiSummary.summary || '')}</p>}</div>}
          </div>
        </div>
        {/* Items list */}
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Creatives ({items.length})</h2><button onClick={() => setShowAddItem(true)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"><Plus className="h-3 w-3" /> Add Creative</button></div>
          {items.length === 0 ? <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center"><ImageIcon className="mx-auto h-6 w-6 text-gray-300 mb-2" /><p className="text-xs text-gray-500">No creatives added yet.</p></div> : (
            <div className="space-y-3">{items.map(item => {
              const air = item.ai_review;
              const reviewVerdicts = isTeamPhase ? teamVerdicts : advisorVerdicts;
              const setVerdicts = isTeamPhase ? setTeamVerdicts : setAdvisorVerdicts;
              return (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                          {air && <ScoreBadge score={air.overall_score} />}
                          {item.advisor_verdict && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', item.advisor_verdict === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.advisor_verdict === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>Advisor: {item.advisor_verdict}</span>}
                          {item.team_verdict && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', item.team_verdict === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.team_verdict === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>Team: {item.team_verdict}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">{item.concept && <span>Concept: {item.concept}</span>}{item.platform && <span>{item.platform}</span>}{item.dimensions && <span>{item.dimensions}</span>}</div>
                        {item.ad_copy && <p className="mt-1 text-xs text-gray-600">&ldquo;{item.ad_copy}&rdquo;</p>}
                        {item.cta && <span className="mt-1 inline-block rounded bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">CTA: {item.cta}</span>}
                      </div>
                      <button onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} className="ml-3 rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /></button>
                    </div>
                    {/* AI Review expanded */}
                    {selectedItem?.id === item.id && air && (
                      <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/30 p-3 space-y-2">
                        <div className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-violet-500" /><span className="text-[10px] font-bold text-violet-700 uppercase">AI Review</span></div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">{air.scores && Object.entries(air.scores).map(([k, v]) => <div key={k} className="flex items-center gap-2"><span className="text-[10px] text-gray-500 w-28 truncate">{k.replace(/_/g, ' ')}</span><div className="flex-1 h-1.5 rounded-full bg-gray-200"><div className="h-1.5 rounded-full" style={{ width: `${(v as number) * 10}%`, backgroundColor: (v as number) >= 8 ? '#059669' : (v as number) >= 6 ? '#d97706' : '#dc2626' }} /></div><span className="text-[10px] font-bold text-gray-700 w-4">{v as number}</span></div>)}</div>
                        {air.regulatory_flags?.length > 0 && <div><div className="flex items-center gap-1 mb-1"><Shield className="h-3 w-3 text-red-500" /><span className="text-[10px] font-bold text-red-600 uppercase">Regulatory Flags</span></div>{air.regulatory_flags.map((f, i) => <div key={i} className={cn('rounded-md p-2 mb-1 text-[11px]', f.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200')}><p className="font-medium">{f.issue}</p><p className="text-gray-500 mt-0.5">Fix: {f.fix}</p></div>)}</div>}
                        {air.strengths?.length > 0 && <div><span className="text-[10px] font-bold text-emerald-600 uppercase">Strengths</span><ul className="mt-0.5 space-y-0.5">{air.strengths.map((s, i) => <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1"><CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-400 flex-shrink-0" />{s}</li>)}</ul></div>}
                        {air.issues?.length > 0 && <div><span className="text-[10px] font-bold text-red-600 uppercase">Issues</span><ul className="mt-0.5 space-y-1">{air.issues.map((iss, i) => <li key={i} className="text-[11px]"><span className={cn('inline-block rounded px-1 py-0 text-[9px] font-bold mr-1', iss.severity === 'critical' ? 'bg-red-100 text-red-700' : iss.severity === 'major' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>{iss.severity}</span><span className="text-gray-700">{iss.issue}</span>{iss.fix && <span className="block text-gray-400 ml-5">Fix: {iss.fix}</span>}</li>)}</ul></div>}
                        {air.recommendations?.length > 0 && <div><span className="text-[10px] font-bold text-blue-600 uppercase">Recommendations</span><ul className="mt-0.5 space-y-0.5">{air.recommendations.map((r, i) => <li key={i} className="text-[11px] text-gray-600">{'\u2022'} {r}</li>)}</ul></div>}
                      </div>
                    )}
                    {selectedItem?.id === item.id && item.advisor_notes && <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 p-2"><span className="text-[10px] font-bold text-amber-700 uppercase">Advisor Notes</span><p className="text-[11px] text-gray-600">{item.advisor_notes}</p></div>}
                    {/* Verdict buttons */}
                    {(isAdvisorPhase || isTeamPhase) && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">{isTeamPhase ? 'Team Verdict' : 'Advisor Verdict'}</span>
                        <div className="flex items-center gap-2 flex-wrap">{VERDICT_OPTS.map(v => { const active = reviewVerdicts[item.id]?.verdict === v.value; return <button key={v.value} onClick={() => setVerdicts(prev => ({ ...prev, [item.id]: { verdict: v.value, notes: prev[item.id]?.notes || '' } }))} className={cn('flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition', active ? v.color + ' border-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}><v.icon className="h-3 w-3" />{v.label}</button>; })}</div>
                        {reviewVerdicts[item.id] && <textarea value={reviewVerdicts[item.id]?.notes || ''} onChange={e => setVerdicts(prev => ({ ...prev, [item.id]: { ...prev[item.id], notes: e.target.value } }))} rows={2} placeholder="Notes (optional)..." className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none" />}
                      </div>
                    )}
                  </div>
                </div>);
            })}</div>
          )}
          {/* Comments */}
          <div className="mt-6"><h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})</h2>{comments.length > 0 && <div className="space-y-2 mb-3">{comments.map(c => <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3"><div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-semibold text-gray-700">{c.author}</span><span className="rounded bg-gray-200 px-1 py-0 text-[9px] text-gray-500">{c.role}</span><span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span></div><p className="text-xs text-gray-600">{c.content}</p></div>)}</div>}<div className="flex gap-2"><input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment..." className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none" /><button onClick={addComment} disabled={!commentText.trim()} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button></div></div>
        </div>
      </div>
      {/* Add item modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><h2 className="text-sm font-bold text-gray-900">Add Creative</h2><button onClick={() => setShowAddItem(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
            <div className="p-6 space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Name *</label><input value={iName} onChange={e => setIName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Concept A - 1080x1350" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Concept</label><input value={iConcept} onChange={e => setIConcept(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Bold testimonial" /></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Ad Copy</label><textarea value={iCopy} onChange={e => setICopy(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="She kept off 30 pounds..." /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs font-medium text-gray-700">CTA</label><input value={iCta} onChange={e => setICta(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Start Your Journey" /></div><div><label className="mb-1 block text-xs font-medium text-gray-700">Dimensions</label><input value={iDims} onChange={e => setIDims(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="1080x1350" /></div></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Platform</label><select value={iPlatform} onChange={e => setIPlatform(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"><option value="">Select...</option>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-700">Notes</label><textarea value={iDesc} onChange={e => setIDesc(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4"><button onClick={() => setShowAddItem(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={handleAddItem} disabled={addingItem || !iName.trim()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
