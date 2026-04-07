'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus, X, Check, Loader2, Search, ChevronRight, Trash2, Pencil,
  ExternalLink, DollarSign, Calendar, Clock, CheckCircle2,
  AlertTriangle, Users, Send, Eye, Star, Instagram, Youtube,
  Globe, Megaphone, FileText, LinkIcon, MessageSquare,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type InfStatus = 'prospect' | 'negotiating' | 'contracted' | 'active' | 'completed' | 'paused';
type DelStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'published' | 'late';
type PayStatus = 'pending' | 'invoiced' | 'paid' | 'overdue';

interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
  follower_count: string;
  niche: string;
  email: string;
  phone: string;
  manager_name: string;
  manager_email: string;
  manager_phone: string;
  status: InfStatus;
  strategy: string;
  talking_points: string;
  campaign_goal: string;
  contract_type: string;
  contract_value: string;
  payment_terms: string;
  payment_status: string;
  contract_notes: string;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  tags: string[];
  created_at: number;
  updated_at: number;
}

interface Deliverable {
  id: string;
  influencer_id: string;
  type: string;
  description: string;
  platform: string;
  due_date: string | null;
  status: DelStatus;
  post_url: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

interface Payment {
  id: string;
  influencer_id: string;
  amount: string;
  description: string;
  due_date: string | null;
  paid_date: string | null;
  status: PayStatus;
  notes: string;
  created_at: number;
  updated_at: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<InfStatus, { label: string; color: string }> = {
  prospect: { label: 'Prospect', color: 'bg-gray-100 text-gray-600' },
  negotiating: { label: 'Negotiating', color: 'bg-amber-100 text-amber-700' },
  contracted: { label: 'Contracted', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  paused: { label: 'Paused', color: 'bg-orange-100 text-orange-700' },
};

const DEL_STATUS_CFG: Record<DelStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  published: { label: 'Published', color: 'bg-brand-100 text-brand-700' },
  late: { label: 'Late', color: 'bg-red-100 text-red-700' },
};

const PAY_STATUS_CFG: Record<PayStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  invoiced: { label: 'Invoiced', color: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
};

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X', 'Facebook', 'LinkedIn', 'Blog', 'Podcast', 'Other'];
const DEL_TYPES = ['Instagram Post', 'Instagram Story', 'Instagram Reel', 'TikTok Video', 'YouTube Video', 'YouTube Short', 'Tweet/X Post', 'Blog Post', 'Podcast Mention', 'Unboxing', 'Review', 'Other'];

const platformIcon = (p: string) => {
  const lp = p.toLowerCase();
  if (lp.includes('instagram')) return <Instagram className="h-3.5 w-3.5" />;
  if (lp.includes('youtube')) return <Youtube className="h-3.5 w-3.5" />;
  if (lp.includes('tiktok')) return <Megaphone className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
};

// ─── API ────────────────────────────────────────────────────────────────────

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/influencers/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InfStatus | 'all'>('all');

  // Detail
  const [selected, setSelected] = useState<Influencer | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'deliverables' | 'payments'>('overview');
  const [editing, setEditing] = useState(false);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [f, setF] = useState<Partial<Influencer>>({});

  // Inline add forms
  const [addDelOpen, setAddDelOpen] = useState(false);
  const [delForm, setDelForm] = useState<Partial<Deliverable>>({});
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [payForm, setPayForm] = useState<Partial<Payment>>({});

  // ─── Load ──────────────────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await api('list');
    if (res.ok) setInfluencers(res.influencers || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = useCallback(async (inf: Influencer) => {
    const res = await api('get', { id: inf.id });
    if (res.ok) {
      setSelected(res.influencer);
      setDeliverables(res.deliverables || []);
      setPayments(res.payments || []);
    } else {
      setSelected(inf);
    }
    setDetailTab('overview');
    setEditing(false);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelected(null);
    setEditing(false);
  }, []);

  // ─── Create / Edit ────────────────────────────────────────────────────

  const openForm = useCallback((inf?: Influencer) => {
    setF(inf ? { ...inf } : { status: 'prospect' as InfStatus, platform: 'Instagram' });
    setFormError('');
    setFormOpen(true);
  }, []);

  const saveForm = useCallback(async () => {
    if (!f.name?.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    setFormError('');
    if (f.id) {
      const res = await api('update', { id: f.id, data: f });
      if (res.error) { setFormError(res.error); setSaving(false); return; }
    } else {
      const res = await api('create', { data: f });
      if (res.error) { setFormError(res.error); setSaving(false); return; }
    }
    setFormOpen(false);
    await loadList();
    setSaving(false);
  }, [f, loadList]);

  const deleteInfluencer = useCallback(async (id: string) => {
    await api('delete', { id });
    closeDetail();
    await loadList();
  }, [closeDetail, loadList]);

  // ─── Inline updates ───────────────────────────────────────────────────

  const updateField = useCallback(async (field: string, value: string) => {
    if (!selected) return;
    await api('update', { id: selected.id, data: { [field]: value } });
    setSelected({ ...selected, [field]: value } as Influencer);
    loadList();
  }, [selected, loadList]);

  const addDeliverable = useCallback(async () => {
    if (!selected || !delForm.type) return;
    setSaving(true);
    await api('add_deliverable', { influencerId: selected.id, data: delForm });
    const res = await api('get', { id: selected.id });
    if (res.ok) { setDeliverables(res.deliverables || []); }
    setAddDelOpen(false);
    setDelForm({});
    setSaving(false);
  }, [selected, delForm]);

  const updateDeliverable = useCallback(async (id: string, data: Partial<Deliverable>) => {
    await api('update_deliverable', { id, data });
    if (selected) {
      const res = await api('get', { id: selected.id });
      if (res.ok) setDeliverables(res.deliverables || []);
    }
  }, [selected]);

  const deleteDeliverable = useCallback(async (id: string) => {
    await api('delete_deliverable', { id });
    setDeliverables(prev => prev.filter(d => d.id !== id));
  }, []);

  const addPayment = useCallback(async () => {
    if (!selected || !payForm.amount) return;
    setSaving(true);
    await api('add_payment', { influencerId: selected.id, data: payForm });
    const res = await api('get', { id: selected.id });
    if (res.ok) { setPayments(res.payments || []); }
    setAddPayOpen(false);
    setPayForm({});
    setSaving(false);
  }, [selected, payForm]);

  const updatePayment = useCallback(async (id: string, data: Partial<Payment>) => {
    await api('update_payment', { id, data });
    if (selected) {
      const res = await api('get', { id: selected.id });
      if (res.ok) setPayments(res.payments || []);
    }
  }, [selected]);

  const deletePayment = useCallback(async (id: string) => {
    await api('delete_payment', { id });
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── Filter ────────────────────────────────────────────────────────────

  const filtered = influencers.filter(inf => {
    if (statusFilter !== 'all' && inf.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return inf.name.toLowerCase().includes(q) || inf.handle.toLowerCase().includes(q) || inf.platform.toLowerCase().includes(q) || inf.niche.toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = {
    total: influencers.length,
    active: influencers.filter(i => i.status === 'active').length,
    contracted: influencers.filter(i => i.status === 'contracted' || i.status === 'active').length,
    prospects: influencers.filter(i => i.status === 'prospect' || i.status === 'negotiating').length,
  };

  // ─── Helpers ──────────────────────────────────────────────────────────

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-medium text-gray-700";

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] lg:h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Influencers</h1>
          <p className="text-xs text-gray-500">Manage partnerships, contracts, deliverables &amp; payments</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
          <Plus className="h-3.5 w-3.5" /> Add Influencer
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2.5 sm:gap-4 sm:px-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Active', value: stats.active, color: stats.active > 0 ? 'text-emerald-600' : 'text-gray-500' },
          { label: 'Under Contract', value: stats.contracted, color: 'text-blue-600' },
          { label: 'Pipeline', value: stats.prospects, color: stats.prospects > 0 ? 'text-amber-600' : 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{s.label}</span>
            <span className={cn('text-sm font-bold', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search influencers..." className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none" />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button onClick={() => setStatusFilter('all')} className={cn('rounded-md px-2.5 py-1 text-[10px] font-medium transition whitespace-nowrap', statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                {(Object.keys(STATUS_CFG) as InfStatus[]).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={cn('rounded-md px-2.5 py-1 text-[10px] font-medium transition whitespace-nowrap', statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">{influencers.length === 0 ? 'No influencers yet' : 'No matches'}</p>
                {influencers.length === 0 && (
                  <button onClick={() => openForm()} className="mt-2 text-xs text-brand-600 hover:underline">Add your first influencer</button>
                )}
              </div>
            )}

            <div className="space-y-2">
              {filtered.map(inf => {
                const sc = STATUS_CFG[inf.status] || STATUS_CFG.prospect;
                return (
                  <button key={inf.id} onClick={() => openDetail(inf)} className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', sc.color)}>
                            {sc.label}
                          </span>
                          {inf.platform && (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                              {platformIcon(inf.platform)} {inf.platform}
                            </span>
                          )}
                          {inf.contract_value && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              {inf.contract_value}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{inf.name}</h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          {inf.handle && <span className="text-xs text-gray-500">{inf.handle}</span>}
                          {inf.follower_count && <span className="text-[10px] text-gray-400">{inf.follower_count} followers</span>}
                          {inf.niche && <span className="text-[10px] text-gray-400">{inf.niche}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-4 flex-shrink-0">
                        {inf.end_date && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Calendar className="h-2.5 w-2.5" /> Ends {inf.end_date}
                          </span>
                        )}
                        {inf.manager_name && (
                          <span className="text-[10px] text-gray-400">Mgr: {inf.manager_name}</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-300 mt-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Form Modal ────────────────────────────────── */}
      {formOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setFormOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-900">{f.id ? 'Edit Influencer' : 'Add Influencer'}</h2>
              <button onClick={() => setFormOpen(false)} className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {formError}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Info</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Name *</label><input value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} className={inp} placeholder="Jane Doe" /></div>
                    <div><label className={labelCls}>Handle</label><input value={f.handle || ''} onChange={e => setF({ ...f, handle: e.target.value })} className={inp} placeholder="@janedoe" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Platform</label>
                      <select value={f.platform || ''} onChange={e => setF({ ...f, platform: e.target.value })} className={inp}>
                        <option value="">Select</option>
                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div><label className={labelCls}>Followers</label><input value={f.follower_count || ''} onChange={e => setF({ ...f, follower_count: e.target.value })} className={inp} placeholder="150K" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Niche</label><input value={f.niche || ''} onChange={e => setF({ ...f, niche: e.target.value })} className={inp} placeholder="Health & Wellness" /></div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={f.status || 'prospect'} onChange={e => setF({ ...f, status: e.target.value as InfStatus })} className={inp}>
                        {(Object.keys(STATUS_CFG) as InfStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Email</label><input value={f.email || ''} onChange={e => setF({ ...f, email: e.target.value })} className={inp} placeholder="jane@email.com" /></div>
                    <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} className={inp} placeholder="+1 555-0100" /></div>
                  </div>
                </div>
              </div>

              {/* Manager */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Manager / Agency</h3>
                <div className="space-y-3">
                  <div><label className={labelCls}>Manager Name</label><input value={f.manager_name || ''} onChange={e => setF({ ...f, manager_name: e.target.value })} className={inp} placeholder="Manager name" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Manager Email</label><input value={f.manager_email || ''} onChange={e => setF({ ...f, manager_email: e.target.value })} className={inp} placeholder="manager@agency.com" /></div>
                    <div><label className={labelCls}>Manager Phone</label><input value={f.manager_phone || ''} onChange={e => setF({ ...f, manager_phone: e.target.value })} className={inp} placeholder="+1 555-0200" /></div>
                  </div>
                </div>
              </div>

              {/* Contract */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contract</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Contract Type</label><input value={f.contract_type || ''} onChange={e => setF({ ...f, contract_type: e.target.value })} className={inp} placeholder="Flat fee, Per-post, Revenue share..." /></div>
                    <div><label className={labelCls}>Contract Value</label><input value={f.contract_value || ''} onChange={e => setF({ ...f, contract_value: e.target.value })} className={inp} placeholder="$5,000" /></div>
                  </div>
                  <div><label className={labelCls}>Payment Terms</label><input value={f.payment_terms || ''} onChange={e => setF({ ...f, payment_terms: e.target.value })} className={inp} placeholder="50% upfront, 50% on completion" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Start Date</label><input type="date" value={f.start_date || ''} onChange={e => setF({ ...f, start_date: e.target.value })} className={inp} /></div>
                    <div><label className={labelCls}>End Date</label><input type="date" value={f.end_date || ''} onChange={e => setF({ ...f, end_date: e.target.value })} className={inp} /></div>
                  </div>
                  <div><label className={labelCls}>Contract Notes</label><textarea value={f.contract_notes || ''} onChange={e => setF({ ...f, contract_notes: e.target.value })} rows={3} className={inp} placeholder="Key terms, exclusivity, usage rights..." /></div>
                </div>
              </div>

              {/* Strategy */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Strategy</h3>
                <div className="space-y-3">
                  <div><label className={labelCls}>Campaign Goal</label><input value={f.campaign_goal || ''} onChange={e => setF({ ...f, campaign_goal: e.target.value })} className={inp} placeholder="Drive sign-ups, brand awareness, CGM education..." /></div>
                  <div><label className={labelCls}>Strategy</label><textarea value={f.strategy || ''} onChange={e => setF({ ...f, strategy: e.target.value })} rows={3} className={inp} placeholder="Overall content strategy and approach..." /></div>
                  <div><label className={labelCls}>Talking Points</label><textarea value={f.talking_points || ''} onChange={e => setF({ ...f, talking_points: e.target.value })} rows={3} className={inp} placeholder="Key messages, product benefits, things to highlight..." /></div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={f.notes || ''} onChange={e => setF({ ...f, notes: e.target.value })} rows={3} className={inp} placeholder="General notes..." />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
              <button onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {f.id ? 'Save Changes' : 'Add Influencer'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Detail Panel ────────────────────────────────────────────── */}
      {detailOpen && selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDetail} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[640px] bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_CFG[selected.status]?.color || 'bg-gray-100 text-gray-600')}>
                    {STATUS_CFG[selected.status]?.label || selected.status}
                  </span>
                  {selected.platform && (
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {platformIcon(selected.platform)} {selected.platform}
                    </span>
                  )}
                  {selected.contract_value && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">{selected.contract_value}</span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-gray-900 truncate">{selected.name}</h2>
                {selected.handle && <p className="text-xs text-gray-500">{selected.handle}</p>}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button onClick={() => { openForm(selected); setDetailOpen(false); }} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={closeDetail} className="rounded-full p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-5">
              {[
                { id: 'overview' as const, label: 'Overview', icon: <Eye className="h-3 w-3" /> },
                { id: 'deliverables' as const, label: `Deliverables (${deliverables.length})`, icon: <FileText className="h-3 w-3" /> },
                { id: 'payments' as const, label: `Payments (${payments.length})`, icon: <DollarSign className="h-3 w-3" /> },
              ].map(t => (
                <button key={t.id} onClick={() => setDetailTab(t.id)} className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition',
                  detailTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-700'
                )}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* ── Overview Tab ── */}
              {detailTab === 'overview' && (
                <>
                  {/* Quick info */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Followers', value: selected.follower_count || '—' },
                      { label: 'Niche', value: selected.niche || '—' },
                      { label: 'Status', value: STATUS_CFG[selected.status]?.label || selected.status },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg bg-gray-50 p-2.5">
                        <span className="text-[10px] font-medium uppercase text-gray-400">{m.label}</span>
                        <p className="text-xs font-medium text-gray-900">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Status selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Update Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(STATUS_CFG) as InfStatus[]).map(s => (
                        <button key={s} onClick={() => updateField('status', s)} className={cn(
                          'rounded-md px-2.5 py-1 text-[10px] font-medium transition border',
                          selected.status === s ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        )}>
                          {STATUS_CFG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</h3>
                    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {[
                        { label: 'Email', value: selected.email },
                        { label: 'Phone', value: selected.phone },
                        { label: 'Manager', value: selected.manager_name },
                        { label: 'Manager Email', value: selected.manager_email },
                        { label: 'Manager Phone', value: selected.manager_phone },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="flex items-center justify-between px-3 py-2">
                          <span className="text-[10px] font-medium text-gray-400 uppercase">{r.label}</span>
                          <span className="text-xs text-gray-900">{r.value}</span>
                        </div>
                      ))}
                      {!selected.email && !selected.manager_name && (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">No contact info yet</div>
                      )}
                    </div>
                  </div>

                  {/* Contract */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contract</h3>
                    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                      {[
                        { label: 'Type', value: selected.contract_type },
                        { label: 'Value', value: selected.contract_value },
                        { label: 'Payment Terms', value: selected.payment_terms },
                        { label: 'Start Date', value: selected.start_date },
                        { label: 'End Date', value: selected.end_date },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="flex items-center justify-between px-3 py-2">
                          <span className="text-[10px] font-medium text-gray-400 uppercase">{r.label}</span>
                          <span className="text-xs text-gray-900">{r.value}</span>
                        </div>
                      ))}
                      {!selected.contract_type && !selected.contract_value && (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">No contract details yet</div>
                      )}
                    </div>
                    {selected.contract_notes && (
                      <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">{selected.contract_notes}</div>
                    )}
                  </div>

                  {/* Strategy */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strategy</h3>
                    {selected.campaign_goal && (
                      <div className="mb-2 rounded-lg bg-brand-50 border border-brand-200 p-3">
                        <span className="text-[10px] font-semibold uppercase text-brand-600">Campaign Goal</span>
                        <p className="text-xs text-gray-800 mt-0.5">{selected.campaign_goal}</p>
                      </div>
                    )}
                    {selected.strategy && (
                      <div className="mb-2">
                        <label className="mb-1 block text-[10px] font-medium text-gray-500">Strategy</label>
                        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">{selected.strategy}</div>
                      </div>
                    )}
                    {selected.talking_points && (
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-gray-500">Talking Points</label>
                        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">{selected.talking_points}</div>
                      </div>
                    )}
                    {!selected.campaign_goal && !selected.strategy && !selected.talking_points && (
                      <div className="rounded-lg border border-gray-200 px-3 py-4 text-xs text-gray-400 text-center">No strategy details yet — edit to add</div>
                    )}
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h3>
                      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">{selected.notes}</div>
                    </div>
                  )}

                  {/* Timeline summary */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">At a Glance</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{deliverables.length}</p>
                        <p className="text-[10px] text-gray-500">Deliverables</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-emerald-600">{deliverables.filter(d => d.status === 'published' || d.status === 'approved').length}</p>
                        <p className="text-[10px] text-gray-500">Completed</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{payments.length}</p>
                        <p className="text-[10px] text-gray-500">Payments</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── Deliverables Tab ── */}
              {detailTab === 'deliverables' && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-700">Deliverables</h3>
                    <button onClick={() => { setAddDelOpen(true); setDelForm({ type: 'Instagram Post', platform: selected.platform, status: 'pending' as DelStatus }); }} className="flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-brand-600">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {/* Add form */}
                  {addDelOpen && (
                    <Card className="!p-4 space-y-3 border-brand-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Type *</label>
                          <select value={delForm.type || ''} onChange={e => setDelForm({ ...delForm, type: e.target.value })} className={inp}>
                            {DEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Due Date</label>
                          <input type="date" value={delForm.due_date || ''} onChange={e => setDelForm({ ...delForm, due_date: e.target.value })} className={inp} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Description</label>
                        <input value={delForm.description || ''} onChange={e => setDelForm({ ...delForm, description: e.target.value })} className={inp} placeholder="What should this deliverable include..." />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAddDelOpen(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={addDeliverable} disabled={saving} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                        </button>
                      </div>
                    </Card>
                  )}

                  {deliverables.length === 0 && !addDelOpen && (
                    <div className="py-8 text-center text-xs text-gray-400">No deliverables yet</div>
                  )}

                  <div className="space-y-2">
                    {deliverables.map(del => {
                      const dsc = DEL_STATUS_CFG[del.status] || DEL_STATUS_CFG.pending;
                      return (
                        <Card key={del.id} className="!p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-xs font-medium text-gray-900">{del.type}</span>
                                <select
                                  value={del.status}
                                  onChange={e => updateDeliverable(del.id, { status: e.target.value as DelStatus })}
                                  className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer', dsc.color)}
                                >
                                  {(Object.keys(DEL_STATUS_CFG) as DelStatus[]).map(s => (
                                    <option key={s} value={s}>{DEL_STATUS_CFG[s].label}</option>
                                  ))}
                                </select>
                              </div>
                              {del.description && <p className="text-[11px] text-gray-500">{del.description}</p>}
                              <div className="flex items-center gap-3 mt-1">
                                {del.due_date && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Clock className="h-2.5 w-2.5" /> Due: {del.due_date}
                                  </span>
                                )}
                                {del.post_url && (
                                  <a href={del.post_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-brand-600 hover:underline">
                                    <ExternalLink className="h-2.5 w-2.5" /> View Post
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {!del.post_url && (del.status === 'published' || del.status === 'submitted') && (
                                <button
                                  onClick={() => {
                                    const url = prompt('Enter the post URL:');
                                    if (url) updateDeliverable(del.id, { post_url: url });
                                  }}
                                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  title="Add post URL"
                                >
                                  <LinkIcon className="h-3 w-3" />
                                </button>
                              )}
                              <button onClick={() => deleteDeliverable(del.id)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Payments Tab ── */}
              {detailTab === 'payments' && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-700">Payments</h3>
                    <button onClick={() => { setAddPayOpen(true); setPayForm({ status: 'pending' as PayStatus }); }} className="flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-brand-600">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>

                  {/* Add form */}
                  {addPayOpen && (
                    <Card className="!p-4 space-y-3 border-brand-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelCls}>Amount *</label><input value={payForm.amount || ''} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className={inp} placeholder="$2,500" /></div>
                        <div>
                          <label className={labelCls}>Due Date</label>
                          <input type="date" value={payForm.due_date || ''} onChange={e => setPayForm({ ...payForm, due_date: e.target.value })} className={inp} />
                        </div>
                      </div>
                      <div><label className={labelCls}>Description</label><input value={payForm.description || ''} onChange={e => setPayForm({ ...payForm, description: e.target.value })} className={inp} placeholder="Upfront payment, milestone 1..." /></div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setAddPayOpen(false)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button onClick={addPayment} disabled={saving} className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                        </button>
                      </div>
                    </Card>
                  )}

                  {/* Summary */}
                  {payments.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-[10px] font-medium text-gray-400 uppercase">Total Owed</p>
                        <p className="text-sm font-bold text-gray-900">
                          {payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + parseFloat(p.amount.replace(/[^0-9.]/g, '') || '0'), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 text-center">
                        <p className="text-[10px] font-medium text-emerald-600 uppercase">Total Paid</p>
                        <p className="text-sm font-bold text-emerald-700">
                          {payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount.replace(/[^0-9.]/g, '') || '0'), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                    </div>
                  )}

                  {payments.length === 0 && !addPayOpen && (
                    <div className="py-8 text-center text-xs text-gray-400">No payments tracked yet</div>
                  )}

                  <div className="space-y-2">
                    {payments.map(pay => {
                      const psc = PAY_STATUS_CFG[pay.status] || PAY_STATUS_CFG.pending;
                      return (
                        <Card key={pay.id} className="!p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-xs font-bold text-gray-900">{pay.amount}</span>
                                <select
                                  value={pay.status}
                                  onChange={e => {
                                    const newStatus = e.target.value as PayStatus;
                                    const updates: Partial<Payment> = { status: newStatus };
                                    if (newStatus === 'paid' && !pay.paid_date) {
                                      updates.paid_date = new Date().toISOString().slice(0, 10);
                                    }
                                    updatePayment(pay.id, updates);
                                  }}
                                  className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium border-0 cursor-pointer', psc.color)}
                                >
                                  {(Object.keys(PAY_STATUS_CFG) as PayStatus[]).map(s => (
                                    <option key={s} value={s}>{PAY_STATUS_CFG[s].label}</option>
                                  ))}
                                </select>
                              </div>
                              {pay.description && <p className="text-[11px] text-gray-500">{pay.description}</p>}
                              <div className="flex items-center gap-3 mt-1">
                                {pay.due_date && (
                                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Clock className="h-2.5 w-2.5" /> Due: {pay.due_date}
                                  </span>
                                )}
                                {pay.paid_date && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Paid: {pay.paid_date}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button onClick={() => deletePayment(pay.id)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 ml-2"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
              <button onClick={closeDetail} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => deleteInfluencer(selected.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
