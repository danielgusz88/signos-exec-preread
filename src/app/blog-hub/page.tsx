'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FileText,
  Mail,
  Plus,
  Search,
  Loader2,
  Save,
  Trash2,
  Sparkles,
  CheckCircle2,
  CircleDashed,
  PencilRuler,
  ArrowRight,
  Copy,
} from 'lucide-react';

type BlogPost = {
  id: string;
  title: string;
  brief: string;
  status: string;
  category: string;
  seo_keywords: string;
  target_word_count: number;
  updated_at: number;
  created_at: number;
};

type EmailCampaign = {
  id: string;
  title: string;
  status: string;
  owner: string;
  template_name: string;
  base_template_html: string;
  overview: string;
  campaign_objective: string;
  subject_line: string;
  content_goals: string;
  ideation_notes: string;
  approved_copy: string;
  asset_urls: string[];
  final_html: string;
  iterable_template_name: string;
  qa_notes: string;
  next_step: string;
  updated_at: number;
  created_at: number;
};

type Tab = 'blog' | 'emails' | 'process';

async function api(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/blog-hub/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

function HubCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}>{children}</div>;
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'blue' | 'amber' | 'emerald' | 'purple' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', colors[color])}>{children}</span>;
}

const EMAIL_STAGES = ['ideation', 'content_refinement', 'assets_ready', 'html_generation', 'iterable_build', 'qa_revision', 'ready'] as const;
const BLOG_STATUS = ['unassigned', 'assigned', 'submitted', 'review', 'revision', 'approved', 'published'] as const;

const EMAIL_WORKFLOW_STEPS = [
  'Find an existing template in Iterable that matches the new email format.',
  'Copy the raw HTML from Iterable to use as the base template.',
  'Start a Claude session and paste the base HTML.',
  'Provide an email brief (overview, objective, subject line, content goals).',
  'Iterate on content until copy and tone are approved.',
  'Upload creative assets in Iterable and collect the CDN URLs.',
  'Ask Claude to generate final HTML using approved copy + asset URLs.',
  'Create a new Iterable template and paste the final HTML.',
  'Preview, revise with Claude, and finalize before send.',
];

export default function BlogHubPage() {
  const [tab, setTab] = useState<Tab>('blog');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [emails, setEmails] = useState<EmailCampaign[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailCampaign | null>(null);

  const [newPost, setNewPost] = useState({
    title: '',
    brief: '',
    category: '',
    seo_keywords: '',
    target_word_count: 1200,
  });
  const [newEmail, setNewEmail] = useState({
    title: '',
    owner: '',
    template_name: '',
    overview: '',
    campaign_objective: '',
    subject_line: '',
    content_goals: '',
  });

  const loadData = useCallback(async () => {
    const [postRes, emailRes] = await Promise.all([api('list_posts'), api('list_email_campaigns')]);
    if (postRes.ok) setPosts(postRes.posts || []);
    if (emailRes.ok) {
      setEmails(
        (emailRes.campaigns || []).map((e: EmailCampaign) => ({
          ...e,
          asset_urls: Array.isArray(e.asset_urls) ? e.asset_urls : [],
        })),
      );
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    run();
  }, [loadData]);

  useEffect(() => {
    if (!selectedEmailId) {
      setSelectedEmail(null);
      return;
    }
    const found = emails.find((e) => e.id === selectedEmailId) || null;
    setSelectedEmail(found ? { ...found } : null);
  }, [emails, selectedEmailId]);

  const filteredPosts = useMemo(() => {
    if (!q.trim()) return posts;
    const term = q.toLowerCase();
    return posts.filter((p) => `${p.title} ${p.brief} ${p.category}`.toLowerCase().includes(term));
  }, [posts, q]);

  const filteredEmails = useMemo(() => {
    if (!q.trim()) return emails;
    const term = q.toLowerCase();
    return emails.filter((e) => `${e.title} ${e.subject_line} ${e.owner} ${e.status}`.toLowerCase().includes(term));
  }, [emails, q]);

  async function createPost() {
    if (!newPost.title.trim()) return;
    setSaving(true);
    const res = await api('create_post', { data: newPost });
    if (res.ok) {
      setNewPost({ title: '', brief: '', category: '', seo_keywords: '', target_word_count: 1200 });
      await loadData();
    }
    setSaving(false);
  }

  async function updatePostStatus(postId: string, status: string) {
    await api('update_post', { postId, data: { status } });
    await loadData();
  }

  async function createEmailCampaign() {
    if (!newEmail.title.trim()) return;
    setSaving(true);
    const res = await api('create_email_campaign', {
      data: {
        ...newEmail,
        status: 'ideation',
        base_template_html: '',
        ideation_notes: '',
        approved_copy: '',
        asset_urls: [],
        final_html: '',
        qa_notes: '',
        next_step: 'Find matching template in Iterable',
      },
    });
    if (res.ok) {
      setNewEmail({
        title: '',
        owner: '',
        template_name: '',
        overview: '',
        campaign_objective: '',
        subject_line: '',
        content_goals: '',
      });
      await loadData();
      setSelectedEmailId(res.id);
      setTab('emails');
    }
    setSaving(false);
  }

  async function saveEmailCampaign() {
    if (!selectedEmail) return;
    setSaving(true);
    await api('update_email_campaign', {
      id: selectedEmail.id,
      data: {
        title: selectedEmail.title,
        status: selectedEmail.status,
        owner: selectedEmail.owner,
        template_name: selectedEmail.template_name,
        base_template_html: selectedEmail.base_template_html,
        overview: selectedEmail.overview,
        campaign_objective: selectedEmail.campaign_objective,
        subject_line: selectedEmail.subject_line,
        content_goals: selectedEmail.content_goals,
        ideation_notes: selectedEmail.ideation_notes,
        approved_copy: selectedEmail.approved_copy,
        asset_urls: selectedEmail.asset_urls,
        final_html: selectedEmail.final_html,
        iterable_template_name: selectedEmail.iterable_template_name,
        qa_notes: selectedEmail.qa_notes,
        next_step: selectedEmail.next_step,
      },
    });
    await loadData();
    setSaving(false);
  }

  async function deleteEmailCampaign(id: string) {
    await api('delete_email_campaign', { id });
    if (selectedEmailId === id) setSelectedEmailId(null);
    await loadData();
  }

  function buildClaudePrompt(email: EmailCampaign) {
    return `OVERVIEW
${email.overview || '[Describe what this email is and context around sending it]'}

CAMPAIGN OBJECTIVE
${email.campaign_objective || '[What should recipients do?]'}

SUBJECT LINE
${email.subject_line || '[Proposed subject line or request 3 options]'}

CONTENT GOALS
${email.content_goals || '[Key messages, tone, required callouts, disclaimers]'}

BASE TEMPLATE HTML
${email.base_template_html || '[Paste HTML copied from Iterable here]'}

ASSET URLS
${(email.asset_urls || []).join('\n') || '[Paste Iterable asset CDN URLs, one per line]'}

TASK
1) Provide 3 copy directions.
2) Recommend strongest option and refine tone.
3) Return final production-ready HTML with provided assets integrated.
4) Keep all links and tracking placeholders intact.`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HubCard className="p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Blog + Email Hub</h1>
            <p className="text-sm text-gray-500">Manage blog production and run an ideation-to-development workflow for Iterable emails.</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts or email campaigns..."
              className="h-9 rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-brand-400"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setTab('blog')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === 'blog' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700')}>
            <FileText className="mr-1 inline h-4 w-4" /> Blog
          </button>
          <button onClick={() => setTab('emails')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === 'emails' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700')}>
            <Mail className="mr-1 inline h-4 w-4" /> Emails
          </button>
          <button onClick={() => setTab('process')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', tab === 'process' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700')}>
            <Sparkles className="mr-1 inline h-4 w-4" /> Email Process
          </button>
        </div>
      </HubCard>

      {tab === 'blog' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <HubCard className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Create Blog Post</h2>
            <input value={newPost.title} onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <textarea value={newPost.brief} onChange={(e) => setNewPost((p) => ({ ...p, brief: e.target.value }))} placeholder="Brief" rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input value={newPost.category} onChange={(e) => setNewPost((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input value={newPost.seo_keywords} onChange={(e) => setNewPost((p) => ({ ...p, seo_keywords: e.target.value }))} placeholder="SEO keywords" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button onClick={createPost} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Create Post
            </button>
          </HubCard>

          <HubCard className="lg:col-span-2 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Posts</h2>
            <div className="space-y-2">
              {filteredPosts.map((post) => (
                <div key={post.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-500">{post.category || 'Uncategorized'} · Updated {new Date(post.updated_at).toLocaleDateString()}</p>
                    </div>
                    <select
                      value={post.status}
                      onChange={(e) => updatePostStatus(post.id, e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      {BLOG_STATUS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && <p className="text-sm text-gray-500">No posts found.</p>}
            </div>
          </HubCard>
        </div>
      )}

      {tab === 'emails' && (
        <div className="grid gap-4 xl:grid-cols-3">
          <HubCard className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Create Email Campaign</h2>
            <input value={newEmail.title} onChange={(e) => setNewEmail((p) => ({ ...p, title: e.target.value }))} placeholder="Campaign name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input value={newEmail.owner} onChange={(e) => setNewEmail((p) => ({ ...p, owner: e.target.value }))} placeholder="Owner" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input value={newEmail.template_name} onChange={(e) => setNewEmail((p) => ({ ...p, template_name: e.target.value }))} placeholder="Iterable source template" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <textarea value={newEmail.overview} onChange={(e) => setNewEmail((p) => ({ ...p, overview: e.target.value }))} placeholder="Overview" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <textarea value={newEmail.campaign_objective} onChange={(e) => setNewEmail((p) => ({ ...p, campaign_objective: e.target.value }))} placeholder="Campaign objective" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input value={newEmail.subject_line} onChange={(e) => setNewEmail((p) => ({ ...p, subject_line: e.target.value }))} placeholder="Subject line" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <textarea value={newEmail.content_goals} onChange={(e) => setNewEmail((p) => ({ ...p, content_goals: e.target.value }))} placeholder="Content goals" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button onClick={createEmailCampaign} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Create Campaign
            </button>
          </HubCard>

          <HubCard className="xl:col-span-2 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Email Campaigns</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition',
                    selectedEmailId === email.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{email.title}</p>
                    <Badge color={email.status === 'ready' ? 'emerald' : 'blue'}>{email.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{email.subject_line || 'No subject line yet'}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{email.owner || 'Unassigned owner'}</p>
                </button>
              ))}
            </div>
            {filteredEmails.length === 0 && <p className="mt-2 text-sm text-gray-500">No email campaigns yet.</p>}
          </HubCard>

          {selectedEmail && (
            <HubCard className="space-y-3 p-4 xl:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Develop Email: {selectedEmail.title}</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedEmail.status}
                    onChange={(e) => setSelectedEmail((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                  >
                    {EMAIL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={saveEmailCampaign} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  <button onClick={() => deleteEmailCampaign(selectedEmail.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <textarea value={selectedEmail.overview} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, overview: e.target.value } : p))} placeholder="Overview" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <textarea value={selectedEmail.campaign_objective} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, campaign_objective: e.target.value } : p))} placeholder="Campaign objective" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={selectedEmail.subject_line} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, subject_line: e.target.value } : p))} placeholder="Subject line" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={selectedEmail.template_name} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, template_name: e.target.value } : p))} placeholder="Iterable source template" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>

              <textarea value={selectedEmail.content_goals} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, content_goals: e.target.value } : p))} placeholder="Content goals (tone, key messages, disclaimers)" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <textarea value={selectedEmail.base_template_html} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, base_template_html: e.target.value } : p))} placeholder="Base template HTML from Iterable" rows={7} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono" />
              <textarea value={selectedEmail.ideation_notes} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, ideation_notes: e.target.value } : p))} placeholder="Ideation notes and chosen direction" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <textarea value={selectedEmail.approved_copy} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, approved_copy: e.target.value } : p))} placeholder="Approved copy (headline, body, CTA)" rows={4} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <textarea
                value={(selectedEmail.asset_urls || []).join('\n')}
                onChange={(e) => setSelectedEmail((p) => (p ? { ...p, asset_urls: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } : p))}
                placeholder="Iterable asset URLs (one per line)"
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono"
              />
              <textarea value={selectedEmail.final_html} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, final_html: e.target.value } : p))} placeholder="Final HTML generated by Claude" rows={7} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={selectedEmail.iterable_template_name} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, iterable_template_name: e.target.value } : p))} placeholder="New Iterable template name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input value={selectedEmail.next_step} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, next_step: e.target.value } : p))} placeholder="Next step" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <textarea value={selectedEmail.qa_notes} onChange={(e) => setSelectedEmail((p) => (p ? { ...p, qa_notes: e.target.value } : p))} placeholder="QA notes / revision notes" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-800">Claude Prompt Builder</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(buildClaudePrompt(selectedEmail))}
                    className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
                  >
                    <Copy className="h-3 w-3" /> Copy Prompt
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-violet-900">{buildClaudePrompt(selectedEmail)}</pre>
              </div>
            </HubCard>
          )}
        </div>
      )}

      {tab === 'process' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <HubCard className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Email Ideation + Development Process</h2>
            <p className="mb-3 text-sm text-gray-500">Workflow adapted from your Claude + Iterable document, now embedded directly in Blog Hub.</p>
            <div className="space-y-2">
              {EMAIL_WORKFLOW_STEPS.map((step, i) => (
                <div key={step} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5">
                  <Badge color="purple">{i + 1}</Badge>
                  <p className="text-xs text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </HubCard>

          <HubCard className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Execution Stages</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                <CircleDashed className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">Ideation</p>
                  <p className="text-xs text-blue-800">Define overview, objective, subject line, content goals, and generate 2-3 concept directions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                <PencilRuler className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-900">Development</p>
                  <p className="text-xs text-amber-800">Approve copy, add Iterable asset URLs, generate production HTML, and run QA revisions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Ready</p>
                  <p className="text-xs text-emerald-800">Create final Iterable template, preview, and mark campaign ready for launch.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-800">Suggested handoff path</p>
              <p className="mt-1 text-xs text-gray-600">
                Ideation <ArrowRight className="mx-1 inline h-3 w-3" /> Content refinement <ArrowRight className="mx-1 inline h-3 w-3" /> Assets ready <ArrowRight className="mx-1 inline h-3 w-3" /> HTML generation <ArrowRight className="mx-1 inline h-3 w-3" /> Iterable build <ArrowRight className="mx-1 inline h-3 w-3" /> QA revision <ArrowRight className="mx-1 inline h-3 w-3" /> Ready
              </p>
            </div>
          </HubCard>
        </div>
      )}
    </div>
  );
}
