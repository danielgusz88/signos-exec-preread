'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const IMPACT_PRESETS = [
  'Retention',
  'CRO',
  'GLP-1',
  'CAC',
  'LTV',
  'Engagement',
  'Acquisition',
  'Brand',
] as const;

type Initiative = {
  id: string;
  title: string;
  summary: string;
  initiative_focus: string;
  status: 'not_started' | 'in_review' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  project_owner: string;
  team_owner: string;
  copy_owner: string;
  design_owner: string;
  planned_timing: string;
  planned_date: string;
  launch_date: string;
  total_touchpoints: number;
  links: string[];
  tags: string[];
  impact_areas: string[];
  sort_order: number;
  hypothesis: string;
  success_metric: string;
  current_result: string;
  impact_score: number;
  next_step: string;
  notes: string;
  created_at: number;
  updated_at: number;
};

type InitiativeUpdate = {
  id: string;
  initiative_id: string;
  author: string;
  update_type: string;
  content: string;
  created_at: number;
};

type DashboardStats = {
  total: number;
  in_review: number;
  in_progress: number;
  done: number;
  high_priority: number;
};

type SortKey =
  | 'order'
  | 'title'
  | 'initiative_focus'
  | 'impact'
  | 'owners'
  | 'status_pri'
  | 'dates';

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/growth-marketing/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}>{children}</div>;
}

function priorityRank(p: string) {
  if (p === 'high') return 3;
  if (p === 'medium') return 2;
  if (p === 'low') return 1;
  return 0;
}

/** Parse YYYY-MM-DD for sorting; non-ISO strings return 0 */
function parseIsoForSort(s: string) {
  const t = (s || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return 0;
  return new Date(`${t}T12:00:00`).getTime();
}

function formatDisplayDate(s: string) {
  const t = (s || '').trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return t;
}

function normalizeInitiative(raw: Record<string, unknown>): Initiative {
  const links = Array.isArray(raw.links) ? (raw.links as string[]) : [];
  const tags = Array.isArray(raw.tags) ? (raw.tags as string[]) : [];
  const impact_areas = Array.isArray(raw.impact_areas) ? (raw.impact_areas as string[]) : [];
  return {
    ...(raw as unknown as Initiative),
    links,
    tags,
    impact_areas,
    planned_date: typeof raw.planned_date === 'string' ? raw.planned_date : '',
    sort_order: typeof raw.sort_order === 'number' ? raw.sort_order : Number(raw.sort_order) || 0,
  };
}

export default function GrowthMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Initiative[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, in_review: 0, in_progress: 0, done: 0, high_priority: 0 });
  const [recentUpdates, setRecentUpdates] = useState<(InitiativeUpdate & { initiative_title?: string })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUpdates, setSelectedUpdates] = useState<InitiativeUpdate[]>([]);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    initiative_focus: '',
    status: 'not_started',
    priority: 'medium',
    project_owner: '',
    team_owner: '',
    copy_owner: '',
    design_owner: '',
    planned_timing: '',
    planned_date: '',
    launch_date: '',
    total_touchpoints: 0,
    links_text: '',
    tags_text: '',
    impact_areas: [] as string[],
    impact_custom: '',
    hypothesis: '',
    success_metric: '',
    current_result: '',
    impact_score: 0,
    next_step: '',
    notes: '',
  });
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [updateForm, setUpdateForm] = useState({ author: '', update_type: 'note', content: '' });

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  const loadDashboard = useCallback(async () => {
    const data = await api('dashboard');
    if (data.ok) {
      setStats(data.stats);
      setRecentUpdates(data.recent_updates || []);
    }
  }, []);

  const loadItems = useCallback(async () => {
    const data = await api('list');
    if (data.ok) setItems((data.initiatives || []).map((r: Record<string, unknown>) => normalizeInitiative(r)));
  }, []);

  const loadOne = useCallback(async (id: string) => {
    const data = await api('get', { id });
    if (data.ok) {
      setSelectedUpdates(data.updates || []);
      setSelectedId(id);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await Promise.all([loadDashboard(), loadItems()]);
      setLoading(false);
    };
    run();
  }, [loadDashboard, loadItems]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${i.title} ${i.summary} ${i.initiative_focus} ${i.project_owner} ${i.team_owner} ${(i.impact_areas || []).join(' ')}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, statusFilter]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      const orderIndex = new Map(items.map((it, idx) => [it.id, idx]));
      return [...filtered].sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));
    }
    const mul = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'order':
          return (
            mul * ((a.sort_order ?? 0) - (b.sort_order ?? 0)) ||
            mul * Math.sign((b.updated_at ?? 0) - (a.updated_at ?? 0))
          );
        case 'title':
          return mul * a.title.localeCompare(b.title);
        case 'initiative_focus':
          return mul * (a.initiative_focus || '').localeCompare(b.initiative_focus || '');
        case 'impact':
          return mul * (a.impact_areas || []).join(',').localeCompare((b.impact_areas || []).join(','));
        case 'owners':
          return mul * `${a.project_owner} ${a.team_owner}`.localeCompare(`${b.project_owner} ${b.team_owner}`);
        case 'status_pri': {
          const sc = a.status.localeCompare(b.status);
          if (sc !== 0) return mul * sc;
          return mul * (priorityRank(a.priority) - priorityRank(b.priority));
        }
        case 'dates': {
          const ta = parseIsoForSort(a.planned_date) || parseIsoForSort(a.planned_timing);
          const tb = parseIsoForSort(b.planned_date) || parseIsoForSort(b.planned_timing);
          if (ta !== tb) return mul * (ta - tb);
          const la = parseIsoForSort(a.launch_date);
          const lb = parseIsoForSort(b.launch_date);
          if (la !== lb) return mul * (la - lb);
          return mul * (a.planned_timing || '').localeCompare(b.planned_timing || '');
        }
        default:
          return 0;
      }
    });
  }, [filtered, items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortHead({ col, label, className }: { col: SortKey; label: string; className?: string }) {
    const active = sortKey === col;
    return (
      <th className={cn('px-1.5 py-1.5 align-bottom', className)}>
        <button
          type="button"
          onClick={() => toggleSort(col)}
          className="inline-flex max-w-full items-center gap-0.5 text-left text-[10px] font-medium uppercase leading-tight tracking-wide text-gray-500 hover:text-gray-800"
        >
          <span className="min-w-0 break-words">{label}</span>
          {active ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3 w-3 shrink-0" />
            ) : (
              <ArrowDown className="h-3 w-3 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
          )}
        </button>
      </th>
    );
  }

  async function submitForm() {
    if (!form.title.trim()) return;
    setSaving(true);
    const customParts = form.impact_custom
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const impactSet = new Set([...form.impact_areas, ...customParts]);
    const data = {
      ...form,
      total_touchpoints: Number(form.total_touchpoints || 0),
      impact_score: Number(form.impact_score || 0),
      links: form.links_text.split('\n').map((v) => v.trim()).filter(Boolean),
      tags: form.tags_text.split(',').map((v) => v.trim()).filter(Boolean),
      impact_areas: Array.from(impactSet),
    };
    if (editing) {
      await api('update', { id: editing.id, data });
    } else {
      await api('create', { data });
    }
    setShowForm(false);
    setEditing(null);
    setForm({
      title: '',
      summary: '',
      initiative_focus: '',
      status: 'not_started',
      priority: 'medium',
      project_owner: '',
      team_owner: '',
      copy_owner: '',
      design_owner: '',
      planned_timing: '',
      planned_date: '',
      launch_date: '',
      total_touchpoints: 0,
      links_text: '',
      tags_text: '',
      impact_areas: [],
      impact_custom: '',
      hypothesis: '',
      success_metric: '',
      current_result: '',
      impact_score: 0,
      next_step: '',
      notes: '',
    });
    await Promise.all([loadItems(), loadDashboard()]);
    setSaving(false);
  }

  async function deleteOne(id: string) {
    if (!confirm('Delete this initiative?')) return;
    await api('delete', { id });
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedUpdates([]);
    }
    await Promise.all([loadItems(), loadDashboard()]);
  }

  const itemsByServerOrder = useMemo(() => {
    return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (b.updated_at ?? 0) - (a.updated_at ?? 0));
  }, [items]);

  async function moveInitiative(id: string, dir: 'up' | 'down') {
    const ordered = itemsByServerOrder.map((x) => x.id);
    const idx = ordered.indexOf(id);
    if (idx < 0) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    setSaving(true);
    await api('reorder', { ordered_ids: ordered });
    await loadItems();
    setSaving(false);
  }

  async function addUpdate() {
    if (!selectedId || !updateForm.content.trim()) return;
    setSaving(true);
    await api('add_update', { initiative_id: selectedId, data: updateForm });
    setUpdateForm({ author: '', update_type: 'note', content: '' });
    setShowUpdateForm(false);
    await Promise.all([loadDashboard(), loadItems(), loadOne(selectedId)]);
    setSaving(false);
  }

  function toggleImpactPreset(p: string) {
    setForm((prev) => ({
      ...prev,
      impact_areas: prev.impact_areas.includes(p) ? prev.impact_areas.filter((x) => x !== p) : [...prev.impact_areas, p],
    }));
  }

  function openEdit(i: Initiative) {
    const presets = new Set(IMPACT_PRESETS as unknown as string[]);
    const fromRow = i.impact_areas || [];
    const presetHit = fromRow.filter((x) => presets.has(x));
    const customOnly = fromRow.filter((x) => !presets.has(x));
    setEditing(i);
    setForm({
      title: i.title,
      summary: i.summary,
      initiative_focus: i.initiative_focus,
      status: i.status,
      priority: i.priority,
      project_owner: i.project_owner,
      team_owner: i.team_owner,
      copy_owner: i.copy_owner,
      design_owner: i.design_owner,
      planned_timing: i.planned_timing,
      planned_date: i.planned_date || (i.planned_timing && /^\d{4}-\d{2}-\d{2}$/.test(i.planned_timing) ? i.planned_timing : ''),
      launch_date: i.launch_date && /^\d{4}-\d{2}-\d{2}$/.test(i.launch_date.trim()) ? i.launch_date.trim() : '',
      total_touchpoints: i.total_touchpoints,
      links_text: (i.links || []).join('\n'),
      tags_text: (i.tags || []).join(', '),
      impact_areas: presetHit.length ? presetHit : [],
      impact_custom: customOnly.join(', '),
      hypothesis: i.hypothesis,
      success_metric: i.success_metric,
      current_result: i.current_result,
      impact_score: i.impact_score || 0,
      next_step: i.next_step,
      notes: i.notes,
    });
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[min(100%,90rem)] space-y-5 px-3 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Growth Marketing</h1>
        <p className="text-sm text-gray-500">
          Track priorities, experiments, ownership, and cross-functional progress across Marketing + Product.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">In Review</p>
          <p className="text-2xl font-bold">{stats.in_review}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-2xl font-bold">{stats.in_progress}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">Done</p>
          <p className="text-2xl font-bold">{stats.done}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-gray-500">High Priority</p>
          <p className="text-2xl font-bold">{stats.high_priority}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-2 sm:p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search initiatives..."
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_review">In Review</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
            {sortKey !== null && (
              <button
                type="button"
                onClick={() => setSortKey(null)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                Reset column sort
              </button>
            )}
            <button
              onClick={() => {
                setEditing(null);
                setForm({
                  title: '',
                  summary: '',
                  initiative_focus: '',
                  status: 'not_started',
                  priority: 'medium',
                  project_owner: '',
                  team_owner: '',
                  copy_owner: '',
                  design_owner: '',
                  planned_timing: '',
                  planned_date: '',
                  launch_date: '',
                  total_touchpoints: 0,
                  links_text: '',
                  tags_text: '',
                  impact_areas: [],
                  impact_custom: '',
                  hypothesis: '',
                  success_metric: '',
                  current_result: '',
                  impact_score: 0,
                  next_step: '',
                  notes: '',
                });
                setShowForm(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> Add Initiative
            </button>
          </div>

          <div className="w-full min-w-0 overflow-x-auto sm:overflow-x-visible">
            <table className="w-full min-w-0 table-fixed border-collapse text-[11px] leading-snug">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <SortHead col="order" label="#" className="w-[2.5rem]" />
                  <SortHead col="title" label="Initiative" className="w-[22%]" />
                  <SortHead col="initiative_focus" label="Focus" className="w-[10%]" />
                  <SortHead col="impact" label="Impact" className="w-[12%]" />
                  <SortHead col="owners" label="Owners" className="w-[12%]" />
                  <SortHead col="status_pri" label="Status" className="w-[11%]" />
                  <SortHead col="dates" label="Dates" className="w-[12%]" />
                  <th className="sticky right-0 z-20 w-[5.5rem] border-l border-gray-100 bg-gray-50/95 px-1.5 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 backdrop-blur-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((i) => (
                  <tr
                    key={i.id}
                    className={cn(
                      'group border-b border-gray-50 hover:bg-gray-50',
                      selectedId === i.id && 'bg-teal-50/40 hover:bg-teal-50/50',
                    )}
                  >
                    <td className="px-1.5 py-1 align-middle">
                      <div className="flex items-center justify-center gap-0">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => moveInitiative(i.id, 'up')}
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 disabled:opacity-40"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => moveInitiative(i.id, 'down')}
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 disabled:opacity-40"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="min-w-0 break-words px-1.5 py-1 align-middle">
                      <button type="button" className="min-w-0 max-w-full text-left" onClick={() => loadOne(i.id)}>
                        <p className="line-clamp-2 font-medium text-gray-900">{i.title}</p>
                        <p className="line-clamp-1 text-[10px] text-gray-500">{i.summary}</p>
                      </button>
                    </td>
                    <td className="min-w-0 break-words px-1.5 py-1 align-middle text-[10px] text-gray-600">{i.initiative_focus || '—'}</td>
                    <td className="min-w-0 px-1.5 py-1 align-middle">
                      <div className="line-clamp-2 break-words">
                        {(i.impact_areas || []).length ? (
                          (i.impact_areas || []).map((a) => (
                            <span key={a} className="mr-0.5 inline-block rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-700">
                              {a}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="min-w-0 px-1.5 py-1 align-middle text-[10px] text-gray-600">
                      <div className="line-clamp-2 break-words" title={`${i.project_owner} / ${i.team_owner}`}>
                        {i.project_owner || '—'}
                        <span className="text-gray-400"> / </span>
                        {i.team_owner || '—'}
                      </div>
                    </td>
                    <td className="min-w-0 px-1.5 py-1 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate rounded bg-gray-100 px-1 py-0.5 text-[9px] capitalize text-gray-800">
                          {i.status.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={cn(
                            'w-fit truncate rounded px-1 py-0.5 text-[9px]',
                            i.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : i.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700',
                          )}
                        >
                          {i.priority}
                        </span>
                      </div>
                    </td>
                    <td className="min-w-0 px-1.5 py-1 align-middle text-[10px] text-gray-600">
                      <div className="flex flex-col gap-0.5 leading-tight">
                        <span className="truncate" title={formatDisplayDate(i.planned_date) || i.planned_timing || ''}>
                          P: {formatDisplayDate(i.planned_date) || i.planned_timing || '—'}
                        </span>
                        <span className="truncate" title={formatDisplayDate(i.launch_date)}>
                          L: {formatDisplayDate(i.launch_date) || '—'}
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        'sticky right-0 z-10 w-[5.5rem] border-l border-gray-100 px-1 py-1 align-middle shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.12)]',
                        'bg-white group-hover:bg-gray-50',
                        selectedId === i.id && 'bg-teal-50/90 group-hover:bg-teal-50',
                      )}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => openEdit(i)} className="shrink-0 text-[10px] font-medium text-teal-700 hover:underline">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteOne(i.id)}
                          className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!sortedRows.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-gray-400">
                      No initiatives found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-3 lg:max-w-xl">
          <p className="mb-2 text-sm font-semibold text-gray-900">Recent Updates</p>
          <div className="space-y-2">
            {recentUpdates.length ? (
              recentUpdates.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-100 p-2">
                  <p className="text-xs font-medium text-gray-900">{u.initiative_title || 'Initiative'}</p>
                  <p className="line-clamp-2 text-xs text-gray-600">{u.content}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{new Date(u.created_at).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">No updates yet.</p>
            )}
          </div>
        </Card>
      </div>

      {selected && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selected.title}</p>
              <p className="text-xs text-gray-500">{selected.hypothesis || 'No hypothesis yet'}</p>
            </div>
            <button onClick={() => setShowUpdateForm((v) => !v)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs">
              Add Update
            </button>
          </div>

          {showUpdateForm && (
            <div className="mb-3 rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  value={updateForm.author}
                  onChange={(e) => setUpdateForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Author"
                  className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                />
                <select
                  value={updateForm.update_type}
                  onChange={(e) => setUpdateForm((p) => ({ ...p, update_type: e.target.value }))}
                  className="rounded border border-gray-200 px-2 py-1.5 text-sm"
                >
                  <option value="note">Note</option>
                  <option value="decision">Decision</option>
                  <option value="blocker">Blocker</option>
                  <option value="result">Result</option>
                </select>
                <button
                  disabled={saving}
                  onClick={addUpdate}
                  className="rounded bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Update'}
                </button>
              </div>
              <textarea
                value={updateForm.content}
                onChange={(e) => setUpdateForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="What changed? What did we learn?"
                className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            {selectedUpdates.length ? (
              selectedUpdates.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-100 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px]">{u.update_type}</span>
                    <span className="text-[10px] text-gray-400">{new Date(u.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-700">{u.content}</p>
                  <p className="mt-1 text-[10px] text-gray-500">{u.author || 'Unknown'}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">No updates for this initiative.</p>
            )}
          </div>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{editing ? 'Edit Initiative' : 'New Initiative'}</p>
              <button type="button" onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title*"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                value={form.initiative_focus}
                onChange={(e) => setForm((p) => ({ ...p, initiative_focus: e.target.value }))}
                placeholder="Initiative focus (e.g. Retention, Lifecycle, Product)"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="not_started">Not Started</option>
                <option value="in_review">In Review</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <p className="mb-2 text-xs font-medium text-gray-700">Impacts (metric / program)</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {IMPACT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleImpactPreset(p)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        form.impact_areas.includes(p)
                          ? 'border-teal-600 bg-teal-50 text-teal-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  value={form.impact_custom}
                  onChange={(e) => setForm((prev) => ({ ...prev, impact_custom: e.target.value }))}
                  placeholder="Other areas (comma-separated)"
                  className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-sm"
                />
              </div>
              <input
                value={form.project_owner}
                onChange={(e) => setForm((p) => ({ ...p, project_owner: e.target.value }))}
                placeholder="Project owner"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                value={form.team_owner}
                onChange={(e) => setForm((p) => ({ ...p, team_owner: e.target.value }))}
                placeholder="Team owner (Marketing/Product)"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                value={form.copy_owner}
                onChange={(e) => setForm((p) => ({ ...p, copy_owner: e.target.value }))}
                placeholder="Copy owner"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                value={form.design_owner}
                onChange={(e) => setForm((p) => ({ ...p, design_owner: e.target.value }))}
                placeholder="Design owner"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <label className="flex flex-col gap-1 rounded border border-gray-200 px-2 py-2 text-sm">
                <span className="text-xs text-gray-500">Planned date</span>
                <input
                  type="date"
                  value={form.planned_date}
                  onChange={(e) => setForm((p) => ({ ...p, planned_date: e.target.value }))}
                  className="rounded border-0 bg-transparent p-0 text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 rounded border border-gray-200 px-2 py-2 text-sm">
                <span className="text-xs text-gray-500">Launch date</span>
                <input
                  type="date"
                  value={form.launch_date}
                  onChange={(e) => setForm((p) => ({ ...p, launch_date: e.target.value }))}
                  className="rounded border-0 bg-transparent p-0 text-sm outline-none"
                />
              </label>
              <input
                value={form.planned_timing}
                onChange={(e) => setForm((p) => ({ ...p, planned_timing: e.target.value }))}
                placeholder="Optional timing label (e.g. Q1, February)"
                className="sm:col-span-2 rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                type="number"
                value={form.total_touchpoints}
                onChange={(e) => setForm((p) => ({ ...p, total_touchpoints: Number(e.target.value || 0) }))}
                placeholder="Total touchpoints"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
              <input
                type="number"
                value={form.impact_score}
                onChange={(e) => setForm((p) => ({ ...p, impact_score: Number(e.target.value || 0) }))}
                placeholder="Impact score (0-10)"
                className="rounded border border-gray-200 px-2 py-2 text-sm"
              />
            </div>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Summary / Scope"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.hypothesis}
              onChange={(e) => setForm((p) => ({ ...p, hypothesis: e.target.value }))}
              placeholder="Experiment hypothesis"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.success_metric}
              onChange={(e) => setForm((p) => ({ ...p, success_metric: e.target.value }))}
              placeholder="Success metric (what defines a win?)"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.current_result}
              onChange={(e) => setForm((p) => ({ ...p, current_result: e.target.value }))}
              placeholder="Current result / latest data"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.next_step}
              onChange={(e) => setForm((p) => ({ ...p, next_step: e.target.value }))}
              placeholder="Next step"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.links_text}
              onChange={(e) => setForm((p) => ({ ...p, links_text: e.target.value }))}
              placeholder="Links (one per line)"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.tags_text}
              onChange={(e) => setForm((p) => ({ ...p, tags_text: e.target.value }))}
              placeholder="Tags (comma-separated)"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="mt-2 w-full rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !form.title.trim()}
                onClick={submitForm}
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create initiative'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
