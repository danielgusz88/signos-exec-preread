'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Newspaper, Plus, Search, Users, Mail, Send, MessageSquare, ExternalLink,
  Trash2, Edit3, ChevronRight, ArrowLeft, Check, X, Loader2, BarChart3,
  Target, Globe, Twitter, Linkedin, Phone, MapPin, Tag, Clock, Filter,
  TrendingUp, Eye, Reply, AlertCircle, Archive, FileText, Copy,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reporter {
  id: string;
  name: string;
  email: string;
  outlet: string;
  beat: string;
  title: string;
  location: string;
  twitter: string;
  linkedin: string;
  phone: string;
  notes: string;
  relationship: string;
  tags: string[];
  last_contacted_at: number | null;
  created_at: number;
  updated_at: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  angle: string;
  target_date: string;
  pitch_subject: string;
  pitch_body: string;
  talking_points: string[];
  assets: { name: string; url: string }[];
  notes: string;
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface OutreachRow {
  id: string;
  campaign_id: string;
  reporter_id: string;
  status: string;
  sent_at: number | null;
  replied_at: number | null;
  follow_up_count: number;
  last_follow_up_at: number | null;
  personalized_note: string;
  response_summary: string;
  outcome: string;
  notes: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_outlet?: string;
  reporter_beat?: string;
  campaign_name?: string;
  created_at: number;
  updated_at: number;
}

interface Coverage {
  id: string;
  campaign_id: string;
  reporter_id: string;
  title: string;
  url: string;
  outlet: string;
  publish_date: string;
  sentiment: string;
  reach_estimate: number;
  notes: string;
  created_at: number;
}

interface DashboardStats {
  reporters: number;
  active_campaigns: number;
  emails_sent: number;
  replies: number;
  coverage: number;
}

// ─── API Helper ──────────────────────────────────────────────────────────────

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/pr/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)} onClick={onClick}>{children}</div>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        </div>
        <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', colors[color] || colors.gray)}>{children}</span>;
}

const RELATIONSHIP_COLORS: Record<string, string> = { cold: 'gray', warm: 'yellow', hot: 'red', advocate: 'green' };
const STATUS_COLORS: Record<string, string> = { draft: 'gray', active: 'blue', paused: 'yellow', completed: 'green', archived: 'gray' };
const OUTREACH_COLORS: Record<string, string> = { queued: 'gray', sent: 'blue', follow_up: 'yellow', replied: 'green', declined: 'red', no_response: 'gray', published: 'purple' };

function formatDate(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'reporters' | 'campaigns' | 'coverage';

export default function PRPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data
  const [stats, setStats] = useState<DashboardStats>({ reporters: 0, active_campaigns: 0, emails_sent: 0, replies: 0, coverage: 0 });
  const [recentOutreach, setRecentOutreach] = useState<OutreachRow[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coverageList, setCoverageList] = useState<Coverage[]>([]);

  // UI state
  const [searchQ, setSearchQ] = useState('');
  const [showReporterForm, setShowReporterForm] = useState(false);
  const [editingReporter, setEditingReporter] = useState<Reporter | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignOutreach, setCampaignOutreach] = useState<OutreachRow[]>([]);
  const [showAddReporters, setShowAddReporters] = useState(false);
  const [showCoverageForm, setShowCoverageForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reporter form
  const [repForm, setRepForm] = useState({ name: '', email: '', outlet: '', beat: '', title: '', location: '', twitter: '', linkedin: '', phone: '', notes: '', relationship: 'cold', tags: '' });

  // Campaign form
  const [campForm, setCampForm] = useState({ name: '', angle: '', target_date: '', pitch_subject: '', pitch_body: '', talking_points: '', notes: '', status: 'draft' });

  // Coverage form
  const [covForm, setCovForm] = useState({ title: '', url: '', outlet: '', publish_date: '', sentiment: 'neutral', reach_estimate: '', notes: '', campaign_id: '', reporter_id: '' });

  // ── Loaders ──

  const loadDashboard = useCallback(async () => {
    const data = await api('dashboard');
    if (data.ok) {
      setStats(data.stats);
      setRecentOutreach(data.recent_outreach || []);
    }
  }, []);

  const loadReporters = useCallback(async () => {
    const data = await api('list_reporters');
    if (data.ok) setReporters(data.reporters);
  }, []);

  const loadCampaigns = useCallback(async () => {
    const data = await api('list_campaigns');
    if (data.ok) setCampaigns(data.campaigns);
  }, []);

  const loadCoverage = useCallback(async () => {
    const data = await api('list_coverage');
    if (data.ok) setCoverageList(data.coverage);
  }, []);

  const loadCampaignDetail = useCallback(async (id: string) => {
    const data = await api('get_campaign', { id });
    if (data.ok) {
      setSelectedCampaign(data.campaign);
      setCampaignOutreach(data.outreach || []);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadReporters(), loadCampaigns(), loadCoverage()]);
      setLoading(false);
    };
    load();
  }, [loadDashboard, loadReporters, loadCampaigns, loadCoverage]);

  // ── Actions ──

  const saveReporter = async () => {
    setSaving(true);
    const data = { ...repForm, tags: repForm.tags ? repForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
    if (editingReporter) {
      await api('update_reporter', { id: editingReporter.id, data });
    } else {
      await api('create_reporter', { data });
    }
    setShowReporterForm(false);
    setEditingReporter(null);
    setRepForm({ name: '', email: '', outlet: '', beat: '', title: '', location: '', twitter: '', linkedin: '', phone: '', notes: '', relationship: 'cold', tags: '' });
    await loadReporters();
    await loadDashboard();
    setSaving(false);
  };

  const deleteReporter = async (id: string) => {
    if (!confirm('Delete this reporter and all their outreach records?')) return;
    await api('delete_reporter', { id });
    await loadReporters();
    await loadDashboard();
  };

  const saveCampaign = async () => {
    setSaving(true);
    const data = { ...campForm, talking_points: campForm.talking_points ? campForm.talking_points.split('\n').filter(Boolean) : [] };
    if (editingCampaign) {
      await api('update_campaign', { id: editingCampaign.id, data });
    } else {
      await api('create_campaign', { data });
    }
    setShowCampaignForm(false);
    setEditingCampaign(null);
    setCampForm({ name: '', angle: '', target_date: '', pitch_subject: '', pitch_body: '', talking_points: '', notes: '', status: 'draft' });
    await loadCampaigns();
    await loadDashboard();
    setSaving(false);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign and all its outreach?')) return;
    await api('delete_campaign', { id });
    setSelectedCampaign(null);
    await loadCampaigns();
    await loadDashboard();
  };

  const addReportersToCampaign = async (reporterIds: string[]) => {
    if (!selectedCampaign) return;
    await api('add_outreach', { campaign_id: selectedCampaign.id, reporter_ids: reporterIds });
    await loadCampaignDetail(selectedCampaign.id);
    setShowAddReporters(false);
  };

  const updateOutreachStatus = async (id: string, status: string, extra: Record<string, string> = {}) => {
    await api('update_outreach', { id, data: { status, ...extra } });
    if (selectedCampaign) await loadCampaignDetail(selectedCampaign.id);
    await loadDashboard();
  };

  const saveCoverage = async () => {
    setSaving(true);
    await api('create_coverage', { data: { ...covForm, reach_estimate: parseInt(covForm.reach_estimate) || 0 } });
    setShowCoverageForm(false);
    setCovForm({ title: '', url: '', outlet: '', publish_date: '', sentiment: 'neutral', reach_estimate: '', notes: '', campaign_id: '', reporter_id: '' });
    await loadCoverage();
    await loadDashboard();
    setSaving(false);
  };

  const deleteCoverage = async (id: string) => {
    await api('delete_coverage', { id });
    await loadCoverage();
    await loadDashboard();
  };

  // ── Filtered data ──

  const filteredReporters = reporters.filter(r =>
    !searchQ || [r.name, r.email, r.outlet, r.beat, r.title].some(f => f?.toLowerCase().includes(searchQ.toLowerCase()))
  );

  // ── Render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'reporters', label: 'Media List', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'coverage', label: 'Coverage', icon: Newspaper },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Press &amp; PR</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage media relationships, pitch campaigns, and track coverage</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedCampaign(null); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════ DASHBOARD ══════════════════════ */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <StatCard label="Reporters" value={stats.reporters} icon={Users} color="bg-blue-500" />
              <StatCard label="Active Campaigns" value={stats.active_campaigns} icon={Target} color="bg-purple-500" />
              <StatCard label="Emails Sent" value={stats.emails_sent} icon={Send} color="bg-teal-500" />
              <StatCard label="Replies" value={stats.replies} icon={Reply} color="bg-emerald-500" />
              <StatCard label="Coverage" value={stats.coverage} icon={Newspaper} color="bg-amber-500" />
            </div>

            <Card>
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Recent Outreach Activity</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {recentOutreach.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No outreach activity yet. Create a campaign and start pitching!
                  </div>
                ) : recentOutreach.map(o => (
                  <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex-shrink-0">
                        {(o.reporter_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{o.reporter_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{o.reporter_outlet} · {o.campaign_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={OUTREACH_COLORS[o.status]}>{o.status.replace('_', ' ')}</Badge>
                      <span className="text-[10px] text-gray-400">{formatDate(o.updated_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══════════════════════ MEDIA LIST ══════════════════════ */}
        {tab === 'reporters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reporters..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <button
                onClick={() => { setShowReporterForm(true); setEditingReporter(null); setRepForm({ name: '', email: '', outlet: '', beat: '', title: '', location: '', twitter: '', linkedin: '', phone: '', notes: '', relationship: 'cold', tags: '' }); }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
              >
                <Plus className="h-4 w-4" /> Add Reporter
              </button>
            </div>

            {/* Reporter form modal */}
            {showReporterForm && (
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">{editingReporter ? 'Edit Reporter' : 'Add New Reporter'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Full Name *" value={repForm.name} onChange={e => setRepForm(p => ({ ...p, name: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Email" value={repForm.email} onChange={e => setRepForm(p => ({ ...p, email: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Outlet (e.g. TechCrunch)" value={repForm.outlet} onChange={e => setRepForm(p => ({ ...p, outlet: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Beat (e.g. Health Tech)" value={repForm.beat} onChange={e => setRepForm(p => ({ ...p, beat: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Title (e.g. Senior Reporter)" value={repForm.title} onChange={e => setRepForm(p => ({ ...p, title: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Location" value={repForm.location} onChange={e => setRepForm(p => ({ ...p, location: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Twitter handle" value={repForm.twitter} onChange={e => setRepForm(p => ({ ...p, twitter: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="LinkedIn URL" value={repForm.linkedin} onChange={e => setRepForm(p => ({ ...p, linkedin: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Phone" value={repForm.phone} onChange={e => setRepForm(p => ({ ...p, phone: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <select value={repForm.relationship} onChange={e => setRepForm(p => ({ ...p, relationship: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                    <option value="advocate">Advocate</option>
                  </select>
                </div>
                <input placeholder="Tags (comma-separated)" value={repForm.tags} onChange={e => setRepForm(p => ({ ...p, tags: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <textarea placeholder="Notes" value={repForm.notes} onChange={e => setRepForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowReporterForm(false); setEditingReporter(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancel</button>
                  <button onClick={saveReporter} disabled={!repForm.name || saving} className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingReporter ? 'Save Changes' : 'Add Reporter'}
                  </button>
                </div>
              </Card>
            )}

            {/* Reporter list */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Outlet</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Beat</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Relationship</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Contact</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredReporters.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No reporters yet. Add your first media contact above.</td></tr>
                    ) : filteredReporters.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{r.name}</p>
                            {r.email && <p className="text-xs text-gray-500">{r.email}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{r.outlet || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{r.beat || '—'}</td>
                        <td className="px-4 py-3"><Badge color={RELATIONSHIP_COLORS[r.relationship]}>{r.relationship}</Badge></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.last_contacted_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.twitter && <a href={`https://twitter.com/${r.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-500 transition"><Twitter className="h-3.5 w-3.5" /></a>}
                            {r.linkedin && <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-700 transition"><Linkedin className="h-3.5 w-3.5" /></a>}
                            <button onClick={() => { setEditingReporter(r); setRepForm({ name: r.name, email: r.email, outlet: r.outlet, beat: r.beat, title: r.title, location: r.location, twitter: r.twitter, linkedin: r.linkedin, phone: r.phone, notes: r.notes, relationship: r.relationship, tags: (r.tags || []).join(', ') }); setShowReporterForm(true); }} className="p-1 text-gray-400 hover:text-gray-700 transition"><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteReporter(r.id)} className="p-1 text-gray-400 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══════════════════════ CAMPAIGNS ══════════════════════ */}
        {tab === 'campaigns' && !selectedCampaign && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); setCampForm({ name: '', angle: '', target_date: '', pitch_subject: '', pitch_body: '', talking_points: '', notes: '', status: 'draft' }); }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
              >
                <Plus className="h-4 w-4" /> New Campaign
              </button>
            </div>

            {showCampaignForm && (
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">{editingCampaign ? 'Edit Campaign' : 'Create PR Campaign'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Campaign Name *" value={campForm.name} onChange={e => setCampForm(p => ({ ...p, name: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input type="date" placeholder="Target Date" value={campForm.target_date} onChange={e => setCampForm(p => ({ ...p, target_date: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <select value={campForm.status} onChange={e => setCampForm(p => ({ ...p, status: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <textarea placeholder="News Angle / Story Hook — What's the compelling story?" value={campForm.angle} onChange={e => setCampForm(p => ({ ...p, angle: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <input placeholder="Pitch Subject Line" value={campForm.pitch_subject} onChange={e => setCampForm(p => ({ ...p, pitch_subject: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <textarea placeholder="Pitch Email Body" value={campForm.pitch_body} onChange={e => setCampForm(p => ({ ...p, pitch_body: e.target.value }))} rows={6} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <textarea placeholder="Talking Points (one per line)" value={campForm.talking_points} onChange={e => setCampForm(p => ({ ...p, talking_points: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <textarea placeholder="Internal Notes" value={campForm.notes} onChange={e => setCampForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancel</button>
                  <button onClick={saveCampaign} disabled={!campForm.name || saving} className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCampaign ? 'Save Changes' : 'Create Campaign'}
                  </button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.length === 0 ? (
                <Card className="col-span-full p-8 text-center">
                  <Target className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No campaigns yet. Create your first PR campaign to start pitching reporters.</p>
                </Card>
              ) : campaigns.map(c => (
                <Card key={c.id} className="p-4 hover:shadow-md transition cursor-pointer group" onClick={() => { setSelectedCampaign(c); loadCampaignDetail(c.id); }}>
                  <div className="flex items-start justify-between mb-2">
                    <Badge color={STATUS_COLORS[c.status]}>{c.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.name}</h3>
                  {c.angle && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{c.angle}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    {c.target_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.target_date}</span>}
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.pitch_subject ? 'Pitch ready' : 'No pitch yet'}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════ CAMPAIGN DETAIL ══════════════════════ */}
        {tab === 'campaigns' && selectedCampaign && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedCampaign(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <ArrowLeft className="h-4 w-4 text-gray-500" />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedCampaign.name}</h2>
                  <Badge color={STATUS_COLORS[selectedCampaign.status]}>{selectedCampaign.status}</Badge>
                </div>
                {selectedCampaign.angle && <p className="text-sm text-gray-500 mt-0.5">{selectedCampaign.angle}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingCampaign(selectedCampaign); setCampForm({ name: selectedCampaign.name, angle: selectedCampaign.angle, target_date: selectedCampaign.target_date, pitch_subject: selectedCampaign.pitch_subject, pitch_body: selectedCampaign.pitch_body, talking_points: (selectedCampaign.talking_points || []).join('\n'), notes: selectedCampaign.notes, status: selectedCampaign.status }); setShowCampaignForm(true); setSelectedCampaign(null); }} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"><Edit3 className="h-4 w-4" /></button>
                <button onClick={() => deleteCampaign(selectedCampaign.id)} className="p-2 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pitch details */}
              <Card className="lg:col-span-2 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Pitch</h3>
                {selectedCampaign.pitch_subject ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Subject Line</p>
                      <p className="text-sm text-gray-900 font-medium">{selectedCampaign.pitch_subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Body</p>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">{selectedCampaign.pitch_body || 'No body yet'}</div>
                    </div>
                    <button
                      onClick={() => {
                        const text = `Subject: ${selectedCampaign.pitch_subject}\n\n${selectedCampaign.pitch_body}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium transition"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy Pitch
                    </button>
                  </>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 inline mr-1.5" />
                    No pitch written yet. Edit this campaign to add a subject line and email body.
                  </div>
                )}
                {selectedCampaign.talking_points?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Talking Points</p>
                    <ul className="space-y-1">
                      {selectedCampaign.talking_points.map((tp, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 mt-0.5 text-teal-500 flex-shrink-0" />
                          {tp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Campaign info sidebar */}
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Details</h3>
                {selectedCampaign.target_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Target: {selectedCampaign.target_date}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Send className="h-4 w-4 text-gray-400" />
                  {campaignOutreach.length} reporter{campaignOutreach.length !== 1 ? 's' : ''} targeted
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Reply className="h-4 w-4 text-gray-400" />
                  {campaignOutreach.filter(o => o.status === 'replied').length} replies
                </div>
                {selectedCampaign.notes && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
                    <p className="text-xs text-gray-600">{selectedCampaign.notes}</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Outreach list */}
            <Card>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Outreach ({campaignOutreach.length})</h3>
                <button onClick={() => setShowAddReporters(true)} className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition">
                  <Plus className="h-3.5 w-3.5" /> Add Reporters
                </button>
              </div>

              {/* Add reporters panel */}
              {showAddReporters && (
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
                  <p className="text-xs text-gray-500 font-medium">Select reporters to add to this campaign:</p>
                  <div className="flex flex-wrap gap-2">
                    {reporters
                      .filter(r => !campaignOutreach.some(o => o.reporter_id === r.id))
                      .map(r => (
                        <button
                          key={r.id}
                          onClick={() => addReportersToCampaign([r.id])}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-teal-50 hover:border-teal-300 transition"
                        >
                          <Plus className="h-3 w-3" /> {r.name} <span className="text-gray-400">({r.outlet})</span>
                        </button>
                      ))}
                    {reporters.filter(r => !campaignOutreach.some(o => o.reporter_id === r.id)).length === 0 && (
                      <p className="text-xs text-gray-400">All reporters already added or no reporters in your media list.</p>
                    )}
                  </div>
                  <button onClick={() => setShowAddReporters(false)} className="text-xs text-gray-500 hover:text-gray-700 transition">Close</button>
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {campaignOutreach.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No reporters added yet. Click &quot;Add Reporters&quot; to start building your outreach list.
                  </div>
                ) : campaignOutreach.map(o => (
                  <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{o.reporter_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{o.reporter_outlet} · {o.reporter_beat || 'No beat'} · {o.reporter_email}</p>
                      {o.personalized_note && <p className="text-xs text-gray-400 mt-0.5 italic">&quot;{o.personalized_note}&quot;</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge color={OUTREACH_COLORS[o.status]}>{o.status.replace('_', ' ')}</Badge>
                      <select
                        value={o.status}
                        onChange={e => updateOutreachStatus(o.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
                      >
                        <option value="queued">Queued</option>
                        <option value="sent">Sent</option>
                        <option value="follow_up">Follow Up</option>
                        <option value="replied">Replied</option>
                        <option value="declined">Declined</option>
                        <option value="no_response">No Response</option>
                        <option value="published">Published!</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══════════════════════ COVERAGE ══════════════════════ */}
        {tab === 'coverage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{coverageList.length} article{coverageList.length !== 1 ? 's' : ''} tracked</p>
              <button
                onClick={() => setShowCoverageForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition"
              >
                <Plus className="h-4 w-4" /> Log Coverage
              </button>
            </div>

            {showCoverageForm && (
              <Card className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Log New Coverage</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="Article Title *" value={covForm.title} onChange={e => setCovForm(p => ({ ...p, title: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="URL" value={covForm.url} onChange={e => setCovForm(p => ({ ...p, url: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input placeholder="Outlet" value={covForm.outlet} onChange={e => setCovForm(p => ({ ...p, outlet: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <input type="date" value={covForm.publish_date} onChange={e => setCovForm(p => ({ ...p, publish_date: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                  <select value={covForm.sentiment} onChange={e => setCovForm(p => ({ ...p, sentiment: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                  <input type="number" placeholder="Estimated Reach" value={covForm.reach_estimate} onChange={e => setCovForm(p => ({ ...p, reach_estimate: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
                <textarea placeholder="Notes" value={covForm.notes} onChange={e => setCovForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCoverageForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancel</button>
                  <button onClick={saveCoverage} disabled={!covForm.title || saving} className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Coverage'}
                  </button>
                </div>
              </Card>
            )}

            {coverageList.length === 0 ? (
              <Card className="p-8 text-center">
                <Newspaper className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No coverage tracked yet. Log your first press hit!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coverageList.map(c => (
                  <Card key={c.id} className="p-4 group">
                    <div className="flex items-start justify-between mb-2">
                      <Badge color={c.sentiment === 'positive' ? 'green' : c.sentiment === 'negative' ? 'red' : 'gray'}>{c.sentiment}</Badge>
                      <button onClick={() => deleteCoverage(c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {c.outlet && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {c.outlet}</span>}
                      {c.publish_date && <span>{c.publish_date}</span>}
                      {c.reach_estimate > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {c.reach_estimate.toLocaleString()} reach</span>}
                    </div>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Read Article
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
