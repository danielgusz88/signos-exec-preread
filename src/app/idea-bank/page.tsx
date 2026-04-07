'use client';

import { cn } from '@/lib/utils';
import {
  Sparkles,
  Plus,
  Loader2,
  ThumbsUp,
  MoreHorizontal,
  X,
  Trash2,
  Pencil,
  ExternalLink,
  Filter,
  Link2,
  ChevronDown,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';

type IdeaStatus = 'new' | 'reviewing' | 'approved' | 'in_production' | 'archived';
type ChannelId = 'ad' | 'email' | 'blog' | 'social' | 'influencer' | 'pr';

interface Attachment {
  id: string;
  label: string;
  url: string;
  type: 'link' | 'image';
}

interface PullRecord {
  target: string;
  target_id: string;
  pulled_at: number;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  channels: ChannelId[];
  attachments: Attachment[];
  source_url: string;
  source_type: string;
  status: IdeaStatus;
  votes: string[];
  pulled_into: PullRecord[];
  created_by: string;
  created_at: number;
  updated_at: number;
}

const CHANNELS: { id: ChannelId; label: string; color: string }[] = [
  { id: 'ad', label: 'Ad', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'email', label: 'Email', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'blog', label: 'Blog', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'social', label: 'Social', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'influencer', label: 'Influencer', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'pr', label: 'PR', color: 'bg-teal-100 text-teal-800 border-teal-200' },
];

const STATUSES: { id: IdeaStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'reviewing', label: 'Reviewing' },
  { id: 'approved', label: 'Approved' },
  { id: 'in_production', label: 'In production' },
  { id: 'archived', label: 'Archived' },
];

const PULL_TARGETS: {
  id: 'content_calendar' | 'ad_concepts' | 'blog_hub' | 'email_hub' | 'email_campaign';
  label: string;
  href: string;
}[] = [
  { id: 'content_calendar', label: 'Content Calendar', href: '/content-calendar' },
  { id: 'ad_concepts', label: 'Ad Concepts', href: '/ad-concepts' },
  { id: 'blog_hub', label: 'Blog Hub (post)', href: '/blog-hub' },
  { id: 'email_campaign', label: 'Blog Hub (email campaign)', href: '/blog-hub' },
  { id: 'email_hub', label: 'Email Hub draft', href: '/email-hub' },
];

async function api(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/idea-bank/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return r.json();
}

function uid() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function IdeaBankPage() {
  const { user } = useAuth();
  const emailKey = user?.email?.toLowerCase().trim() || '';

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channels, setChannels] = useState<ChannelId[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachLabel, setAttachLabel] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [expandedCompose, setExpandedCompose] = useState(false);

  const [filterChannel, setFilterChannel] = useState<ChannelId | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | 'all'>('all');

  const [editing, setEditing] = useState<Idea | null>(null);
  const [pullMenuId, setPullMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api('list');
    if (res.ok) setIdeas(res.ideas || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return ideas.filter((i) => {
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      if (filterChannel === 'all') return true;
      return (i.channels || []).includes(filterChannel);
    });
  }, [ideas, filterChannel, filterStatus]);

  const toggleChannel = (c: ChannelId) => {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const addAttachment = () => {
    const u = attachUrl.trim();
    if (!u) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: uid(),
        label: attachLabel.trim() || 'Link',
        url: u,
        type: u.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i) ? 'image' : 'link',
      },
    ]);
    setAttachLabel('');
    setAttachUrl('');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setChannels([]);
    setSourceUrl('');
    setAttachments([]);
    setAttachLabel('');
    setAttachUrl('');
    setExpandedCompose(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const res = await api('create', {
      data: {
        title: title.trim(),
        description: description.trim(),
        channels,
        attachments,
        source_url: sourceUrl.trim(),
        source_type: sourceUrl ? 'link' : '',
        created_by: user?.email || user?.name || '',
      },
    });
    setSaving(false);
    if (res.ok) {
      resetForm();
      await load();
    }
  };

  const handleVote = async (id: string) => {
    if (!emailKey) return;
    const res = await api('vote', { id, email: emailKey });
    if (res.ok) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, votes: res.votes || [] } : i))
      );
    }
  };

  const handlePull = async (
    idea: Idea,
    target: (typeof PULL_TARGETS)[number]['id']
  ) => {
    setPullMenuId(null);
    setSaving(true);
    const res = await api('pull_to', { idea_id: idea.id, target });
    setSaving(false);
    if (res.ok) {
      await load();
      const t = PULL_TARGETS.find((p) => p.id === target);
      if (t && res.new_id) {
        window.open(t.href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    await api('update', {
      id: editing.id,
      data: {
        title: editing.title,
        description: editing.description,
        channels: editing.channels,
        attachments: editing.attachments,
        source_url: editing.source_url,
        status: editing.status,
      },
    });
    setSaving(false);
    setEditing(null);
    await load();
  };

  const deleteIdea = async (id: string) => {
    if (!confirm('Delete this idea?')) return;
    await api('delete', { id });
    await load();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:min-h-screen">
      <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-brand-500" />
          <div>
            <h1 className="text-base font-bold text-gray-900 lg:text-lg">Idea Bank</h1>
            <p className="text-[10px] text-gray-400">
              Capture campaign ideas — pull them into calendar, ads, blog, or email when you are ready
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value as ChannelId | 'all')}
              className="max-w-[120px] border-0 bg-transparent text-[11px] text-gray-700 focus:ring-0"
            >
              <option value="all">All channels</option>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as IdeaStatus | 'all')}
              className="max-w-[130px] border-0 bg-transparent text-[11px] text-gray-700 focus:ring-0"
            >
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Quick capture */}
      <div className="border-b border-gray-100 bg-brand-50/40 px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setExpandedCompose(true)}
            placeholder="Drop an idea — headline first"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {(expandedCompose || title.trim() || description.trim()) && (
            <>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes, angle, why it could work…"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Channels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChannel(c.id)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-medium transition',
                        channels.includes(c.id)
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : cn('border-gray-200 text-gray-600 hover:border-gray-300', c.color)
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Source URL (article, post, competitor…)"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-brand-400 focus:outline-none"
                />
                <div className="flex gap-1">
                  <input
                    value={attachLabel}
                    onChange={(e) => setAttachLabel(e.target.value)}
                    placeholder="Label"
                    className="w-24 shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-xs"
                  />
                  <input
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    placeholder="Attachment URL"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-2 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttachment())}
                  />
                  <button
                    type="button"
                    onClick={addAttachment}
                    className="shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
              </div>
              {attachments.length > 0 && (
                <ul className="space-y-1 text-xs text-gray-600">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <Link2 className="h-3 w-3 shrink-0 text-gray-400" />
                      <a href={a.url} target="_blank" rel="noreferrer" className="truncate text-brand-600 hover:underline">
                        {a.label}
                      </a>
                      <button
                        type="button"
                        className="ml-auto text-red-500 hover:underline"
                        onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={saving || !title.trim()}
                  onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Save idea
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-600">No ideas match these filters yet.</p>
            <p className="mt-1 text-xs text-gray-400">Add one above — like a running Slack channel for inspiration.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {filtered.map((idea) => (
              <article
                key={idea.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 border-r border-gray-100 pr-3">
                    <button
                      type="button"
                      onClick={() => handleVote(idea.id)}
                      disabled={!emailKey}
                      title={emailKey ? 'Toggle your vote' : 'Sign in to vote'}
                      className={cn(
                        'rounded-lg p-1.5 transition',
                        emailKey && (idea.votes || []).includes(emailKey)
                          ? 'bg-brand-100 text-brand-600'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                        !emailKey && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-bold text-gray-500">{(idea.votes || []).length}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-gray-900">{idea.title}</h2>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-medium',
                            STATUSES.find((s) => s.id === idea.status)
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {STATUSES.find((s) => s.id === idea.status)?.label || idea.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditing(idea)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIdea(idea.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setPullMenuId(pullMenuId === idea.id ? null : idea.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 hover:bg-brand-100"
                          >
                            Send to…
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {pullMenuId === idea.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setPullMenuId(null)} />
                              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                {PULL_TARGETS.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handlePull(idea, t.id)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {idea.description ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-600">
                        {idea.description}
                      </p>
                    ) : null}
                    {idea.source_url ? (
                      <a
                        href={idea.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline"
                      >
                        <Link2 className="h-3 w-3" /> Source
                      </a>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(idea.channels || []).map((ch) => {
                        const meta = CHANNELS.find((c) => c.id === ch);
                        return (
                          <span
                            key={ch}
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[9px] font-medium',
                              meta?.color || 'bg-gray-100 text-gray-600'
                            )}
                          >
                            {meta?.label || ch}
                          </span>
                        );
                      })}
                    </div>
                    {(idea.attachments || []).length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                        {(idea.attachments || []).map((a) => (
                          <li key={a.id}>
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-600 hover:underline"
                            >
                              {a.label || a.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {(idea.pulled_into || []).length > 0 && (
                      <p className="mt-2 text-[10px] text-gray-400">
                        Pulled into {(idea.pulled_into || []).length} workflow
                        {(idea.pulled_into || []).length !== 1 ? 's' : ''}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-gray-400">
                      {new Date(idea.updated_at).toLocaleString()}
                      {idea.created_by ? ` · ${idea.created_by}` : ''}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-bold text-gray-900">Edit idea</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Title</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Description</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-gray-500">Channels</p>
                <div className="flex flex-wrap gap-1">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const ch = editing.channels || [];
                        const next = ch.includes(c.id)
                          ? ch.filter((x) => x !== c.id)
                          : [...ch, c.id];
                        setEditing({ ...editing, channels: next });
                      }}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px]',
                        (editing.channels || []).includes(c.id)
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-200 text-gray-600'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Source URL</label>
                <input
                  value={editing.source_url}
                  onChange={(e) => setEditing({ ...editing, source_url: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as IdeaStatus })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
