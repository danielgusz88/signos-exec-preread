'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus,
  CalendarDays,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Send,
  Mail,
  Instagram,
  Loader2,
  X,
  Check,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowRight,
  RefreshCw,
  Eye,
  Code,
  Upload,
  Palette,
  IterationCw,
  ExternalLink,
  Image as ImageIcon,
  LinkIcon,
  FileText,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type ContentType = 'email' | 'social_instagram' | 'social_facebook' | 'social_tiktok' | 'social_linkedin' | 'blog';
type ItemStatus = 'idea' | 'drafting' | 'in_review' | 'approved' | 'scheduled';

interface AiDraftEmail {
  subject: string;
  preheader: string;
  body: string;
  cta_text: string;
  cta_url_suggestion: string;
  send_time_suggestion: string;
  notes: string;
}

interface AiDraftSocial {
  caption: string;
  hook: string;
  hashtags: string[];
  visual_suggestion: string;
  best_time: string;
  notes: string;
}

interface AiDraftEmailHtml {
  subject: string;
  preheader: string;
  html: string;
  text_version: string;
  notes: string;
}

interface BrainstormConcept {
  title: string;
  angle: string;
  tone: string;
  hook: string;
}

interface CalendarItem {
  id: string;
  title: string;
  content_type: ContentType;
  scheduled_date: string | null;
  status: ItemStatus;
  prompt: string;
  ai_draft: AiDraftEmail | AiDraftSocial | null;
  email_html: AiDraftEmailHtml | null;
  final_copy: string;
  notes: string;
  assignee: string;
  campaign_id: string | null;
  created_at: number;
  updated_at: number;
}

type ViewMode = 'calendar' | 'pipeline';

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" />, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'social_instagram', label: 'Instagram', icon: <Instagram className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'social_facebook', label: 'Facebook', icon: <Send className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'social_tiktok', label: 'TikTok', icon: <Send className="h-3.5 w-3.5" />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'social_linkedin', label: 'LinkedIn', icon: <Send className="h-3.5 w-3.5" />, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'blog', label: 'Blog Post', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 border-green-200' },
];

const STATUS_CONFIG: { id: ItemStatus; label: string; color: string }[] = [
  { id: 'idea', label: 'Idea', color: 'bg-gray-100 text-gray-600' },
  { id: 'drafting', label: 'Drafting', color: 'bg-amber-100 text-amber-700' },
  { id: 'in_review', label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  { id: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── API Helpers ────────────────────────────────────────────────────────────

async function calendarStore(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/content-calendar/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

async function calendarDraft(mode: string, payload: Record<string, unknown> = {}): Promise<string> {
  const res = await fetch('/api/content-calendar/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Draft request failed');
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response stream');
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

interface LinkedCampaign {
  id: string;
  status: string;
  brief: { product: string; goal: string; audience: string; platforms: string[]; notes: string };
  conceptPreviewUrl: string | null;
  figmaUrl: string | null;
  variants: { name: string; exportUrl: string; caption: string }[];
}

async function campaignStoreAction(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/campaign/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

async function blogHubStore(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/blog-hub/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

async function iterablePush(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/content-calendar/iterable-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

// ─── Calendar Helpers ───────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseAiJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as T;
}

const WEEKLY_GOALS = { email: 1, social: 3 };

interface WeekRange {
  label: string;
  startDate: string;
  endDate: string;
  emails: { approved: number; total: number };
  social: { approved: number; total: number };
}

function getWeeksForMonth(year: number, month: number, items: CalendarItem[]): WeekRange[] {
  const weeks: WeekRange[] = [];
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Start from the Sunday on or before the 1st
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  while (start <= lastOfMonth) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const startStr = fmt(start);
    const endStr = fmt(end);

    const weekItems = items.filter(
      (i) => i.scheduled_date && i.scheduled_date >= startStr && i.scheduled_date <= endStr
    );

    const isApproved = (i: CalendarItem) => i.status === 'approved' || i.status === 'scheduled';
    const isEmail = (i: CalendarItem) => i.content_type === 'email';
    const isSocial = (i: CalendarItem) => i.content_type.startsWith('social_');

    const startLabel = `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
    const endLabel = `${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}`;

    weeks.push({
      label: `${startLabel} – ${endLabel}`,
      startDate: startStr,
      endDate: endStr,
      emails: {
        approved: weekItems.filter((i) => isApproved(i) && isEmail(i)).length,
        total: weekItems.filter(isEmail).length,
      },
      social: {
        approved: weekItems.filter((i) => isApproved(i) && isSocial(i)).length,
        total: weekItems.filter(isSocial).length,
      },
    });

    start.setDate(start.getDate() + 7);
  }

  return weeks;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContentCalendarPage() {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Panel form state
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<ContentType>('email');
  const [editDate, setEditDate] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editFinalCopy, setEditFinalCopy] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignee, setEditAssignee] = useState('');

  // AI state
  const [brainstorming, setBrainstorming] = useState(false);
  const [brainstormResults, setBrainstormResults] = useState<BrainstormConcept[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveFeedback, setImproveFeedback] = useState('');

  // Email design state
  const [emailHtml, setEmailHtml] = useState<AiDraftEmailHtml | null>(null);
  const [designingEmail, setDesigningEmail] = useState(false);
  const [improvingDesign, setImprovingDesign] = useState(false);
  const [designFeedback, setDesignFeedback] = useState('');
  const [emailViewMode, setEmailViewMode] = useState<'preview' | 'code'>('preview');
  const [pushingToIterable, setPushingToIterable] = useState(false);
  const [iterableResult, setIterableResult] = useState<{ success: boolean; message: string; templateId?: number } | null>(null);
  const emailPreviewRef = useRef<HTMLIFrameElement>(null);

  // Campaign link state
  const [linkedCampaign, setLinkedCampaign] = useState<LinkedCampaign | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(false);

  // Blog Hub link state
  const [creatingBlogPost, setCreatingBlogPost] = useState(false);
  const [blogPostCreated, setBlogPostCreated] = useState<string | null>(null);

  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // ─── Data Loading ───────────────────────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calendarStore('list', { month: monthKey });
      if (res.ok) {
        const parsed = (res.items || []).map((item: CalendarItem) => ({
          ...item,
          ai_draft: typeof item.ai_draft === 'string' ? JSON.parse(item.ai_draft) : item.ai_draft,
          email_html: typeof item.email_html === 'string' ? JSON.parse(item.email_html) : (item.email_html || null),
        }));
        setItems(parsed);
      }
    } catch (_e) { /* ignore */ }
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ─── Panel Helpers ──────────────────────────────────────────────────────

  const fetchLinkedCampaign = useCallback(async (campaignId: string) => {
    setLoadingCampaign(true);
    try {
      const res = await campaignStoreAction('get', { campaignId });
      if (res.success && res.campaign) {
        setLinkedCampaign(res.campaign as LinkedCampaign);
      }
    } catch (_e) { /* ignore */ }
    setLoadingCampaign(false);
  }, []);

  const openPanel = useCallback((item: CalendarItem | null, date?: string) => {
    if (item) {
      setSelectedItem(item);
      setEditTitle(item.title);
      setEditType(item.content_type);
      setEditDate(item.scheduled_date || '');
      setEditPrompt(item.prompt);
      setEditFinalCopy(item.final_copy);
      setEditNotes(item.notes);
      setEditAssignee(item.assignee);
      setEmailHtml(item.email_html || null);
      if (item.campaign_id) {
        fetchLinkedCampaign(item.campaign_id);
      } else {
        setLinkedCampaign(null);
      }
    } else {
      setSelectedItem(null);
      setEditTitle('');
      setEditType('email');
      setEditDate(date || '');
      setEditPrompt('');
      setEditFinalCopy('');
      setEditNotes('');
      setEditAssignee('');
      setEmailHtml(null);
      setLinkedCampaign(null);
    }
    setBrainstormResults([]);
    setImproveFeedback('');
    setDesignFeedback('');
    setIterableResult(null);
    setBlogPostCreated(null);
    setPanelOpen(true);
  }, [fetchLinkedCampaign]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedItem(null);
    setBrainstormResults([]);
    setEmailHtml(null);
    setIterableResult(null);
    setLinkedCampaign(null);
  }, []);

  const saveItem = useCallback(async () => {
    setSaving(true);
    try {
      const data = {
        title: editTitle || 'Untitled',
        content_type: editType,
        scheduled_date: editDate || null,
        prompt: editPrompt,
        final_copy: editFinalCopy,
        notes: editNotes,
        assignee: editAssignee,
      };

      if (selectedItem) {
        await calendarStore('update', { itemId: selectedItem.id, data });
      } else {
        const res = await calendarStore('create', { data });
        if (res.ok && res.id) {
          setSelectedItem({ ...data, id: res.id, status: 'idea', ai_draft: null, email_html: null, campaign_id: null, created_at: Date.now(), updated_at: Date.now() } as CalendarItem);
        }
      }
      await loadItems();
    } catch (_e) { /* ignore */ }
    setSaving(false);
  }, [selectedItem, editTitle, editType, editDate, editPrompt, editFinalCopy, editNotes, editAssignee, loadItems]);

  const updateStatus = useCallback(async (newStatus: ItemStatus) => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      if (newStatus === 'approved') {
        const slackRaw = typeof window !== 'undefined' ? localStorage.getItem('slack_user') : null;
        const slackUser = slackRaw ? JSON.parse(slackRaw) : null;
        await calendarStore('approve', { itemId: selectedItem.id, slackUserId: slackUser?.id });
      } else {
        await calendarStore('update', { itemId: selectedItem.id, data: { status: newStatus } });
      }
      setSelectedItem({ ...selectedItem, status: newStatus });
      await loadItems();
    } catch (_e) { /* ignore */ }
    setSaving(false);
  }, [selectedItem, loadItems]);

  const deleteItem = useCallback(async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await calendarStore('delete', { itemId: selectedItem.id });
      closePanel();
      await loadItems();
    } catch (_e) { /* ignore */ }
    setSaving(false);
  }, [selectedItem, closePanel, loadItems]);

  const quickApprove = useCallback(async (item: CalendarItem) => {
    try {
      const slackRaw = typeof window !== 'undefined' ? localStorage.getItem('slack_user') : null;
      const slackUser = slackRaw ? JSON.parse(slackRaw) : null;
      await calendarStore('approve', { itemId: item.id, slackUserId: slackUser?.id });
      await loadItems();
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...selectedItem, status: 'approved' });
      }
    } catch (_e) { /* ignore */ }
  }, [loadItems, selectedItem]);

  // ─── AI Actions ─────────────────────────────────────────────────────────

  const handleBrainstorm = useCallback(async () => {
    setBrainstorming(true);
    setBrainstormResults([]);
    try {
      const raw = await calendarDraft('brainstorm', { prompt: editPrompt, content_type: editType });
      const concepts = parseAiJson<BrainstormConcept[]>(raw);
      setBrainstormResults(concepts);
    } catch (_e) { /* ignore */ }
    setBrainstorming(false);
  }, [editPrompt, editType]);

  const selectConcept = useCallback((concept: BrainstormConcept) => {
    setEditTitle(concept.title);
    setEditPrompt(prev => prev + (prev ? '\n\n' : '') + `Angle: ${concept.angle}\nTone: ${concept.tone}\nHook: ${concept.hook}`);
    setBrainstormResults([]);
  }, []);

  const handleDraft = useCallback(async () => {
    setDrafting(true);
    try {
      const mode = editType === 'email' ? 'draft_email' : 'draft_social';
      const raw = await calendarDraft(mode, {
        concept: { title: editTitle, hook: '', tone: '' },
        prompt: editPrompt,
        platform: editType,
      });
      const draft = parseAiJson<AiDraftEmail | AiDraftSocial>(raw);

      if (selectedItem) {
        await calendarStore('update', {
          itemId: selectedItem.id,
          data: { ai_draft: draft, status: 'drafting' },
        });
        setSelectedItem({ ...selectedItem, ai_draft: draft, status: 'drafting' });
      }
      await loadItems();
    } catch (_e) { /* ignore */ }
    setDrafting(false);
  }, [editType, editTitle, editPrompt, selectedItem, loadItems]);

  const handleImprove = useCallback(async () => {
    if (!selectedItem?.ai_draft || !improveFeedback.trim()) return;
    setImproving(true);
    try {
      const raw = await calendarDraft('improve', {
        draft: selectedItem.ai_draft,
        feedback: improveFeedback,
        content_type: editType,
      });
      const improved = parseAiJson<AiDraftEmail | AiDraftSocial>(raw);
      await calendarStore('update', { itemId: selectedItem.id, data: { ai_draft: improved } });
      setSelectedItem({ ...selectedItem, ai_draft: improved });
      setImproveFeedback('');
      await loadItems();
    } catch (_e) { /* ignore */ }
    setImproving(false);
  }, [selectedItem, improveFeedback, editType, loadItems]);

  // ─── Ad Factory Link Actions ────────────────────────────────────────────

  const handleCreateAd = useCallback(async () => {
    if (!selectedItem) return;
    setCreatingCampaign(true);
    try {
      const res = await campaignStoreAction('create_from_calendar', {
        calendarItemId: selectedItem.id,
      });
      if (res.success && res.campaign) {
        const c = res.campaign as LinkedCampaign;
        setLinkedCampaign(c);
        setSelectedItem({ ...selectedItem, campaign_id: c.id });
        await loadItems();
        window.open(`/content-engine?campaign=${c.id}`, '_blank');
      }
    } catch (_e) { /* ignore */ }
    setCreatingCampaign(false);
  }, [selectedItem, loadItems]);

  const handleSendToBlogHub = useCallback(async () => {
    if (!selectedItem) return;
    setCreatingBlogPost(true);
    try {
      const draft = selectedItem.ai_draft as { subject?: string; body?: string; caption?: string; hook?: string } | null;
      let brief = selectedItem.prompt || '';
      if (draft) {
        if (draft.body) brief += `\n\nDraft content direction:\n${draft.body}`;
        if (draft.caption) brief += `\n\nCaption: ${draft.caption}`;
        if (draft.hook) brief += `\nHook: ${draft.hook}`;
      }

      const res = await blogHubStore('create_from_calendar', {
        calendarItemId: selectedItem.id,
        title: selectedItem.title,
        brief: brief.trim(),
        deadline: selectedItem.scheduled_date,
        category: 'Health & Wellness',
      });
      if (res.ok && res.id) {
        setBlogPostCreated(res.id);
        await loadItems();
      }
    } catch (_e) { /* ignore */ }
    setCreatingBlogPost(false);
  }, [selectedItem, loadItems]);

  // ─── Email Design Actions ───────────────────────────────────────────────

  const handleDesignEmail = useCallback(async () => {
    setDesigningEmail(true);
    setIterableResult(null);
    try {
      const draft = selectedItem?.ai_draft as AiDraftEmail | undefined;
      const raw = await calendarDraft('draft_email_html', {
        draft: draft || null,
        prompt: editPrompt,
      });
      const result = parseAiJson<AiDraftEmailHtml>(raw);
      setEmailHtml(result);

      if (selectedItem) {
        await calendarStore('update', {
          itemId: selectedItem.id,
          data: { email_html: result },
        });
        setSelectedItem({ ...selectedItem, email_html: result });
      }
      await loadItems();
    } catch (_e) { /* ignore */ }
    setDesigningEmail(false);
  }, [selectedItem, editPrompt, loadItems]);

  const handleImproveDesign = useCallback(async () => {
    if (!emailHtml || !designFeedback.trim()) return;
    setImprovingDesign(true);
    try {
      const raw = await calendarDraft('improve_email_html', {
        html: emailHtml.html,
        subject: emailHtml.subject,
        preheader: emailHtml.preheader,
        feedback: designFeedback,
      });
      const improved = parseAiJson<AiDraftEmailHtml>(raw);
      setEmailHtml(improved);

      if (selectedItem) {
        await calendarStore('update', {
          itemId: selectedItem.id,
          data: { email_html: improved },
        });
        setSelectedItem({ ...selectedItem, email_html: improved });
      }
      setDesignFeedback('');
      await loadItems();
    } catch (_e) { /* ignore */ }
    setImprovingDesign(false);
  }, [emailHtml, designFeedback, selectedItem, loadItems]);

  const handlePushToIterable = useCallback(async () => {
    if (!emailHtml) return;
    setPushingToIterable(true);
    setIterableResult(null);
    try {
      const name = `${editTitle || 'Untitled'} — ${new Date().toLocaleDateString()}`;
      const result = await iterablePush('create_template', {
        name,
        subject: emailHtml.subject,
        preheader: emailHtml.preheader,
        html: emailHtml.html,
        text: emailHtml.text_version,
      });
      setIterableResult(result);
    } catch (err) {
      setIterableResult({ success: false, message: err instanceof Error ? err.message : 'Push failed' });
    }
    setPushingToIterable(false);
  }, [emailHtml, editTitle]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // ─── Calendar Grid ──────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const itemsByDate: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    if (item.scheduled_date) {
      if (!itemsByDate[item.scheduled_date]) itemsByDate[item.scheduled_date] = [];
      itemsByDate[item.scheduled_date].push(item);
    }
  }

  const unscheduledItems = items.filter(i => !i.scheduled_date);

  const getTypeConfig = (type: ContentType) => CONTENT_TYPES.find(t => t.id === type) || CONTENT_TYPES[0];
  const getStatusConfig = (status: ItemStatus) => STATUS_CONFIG.find(s => s.id === status) || STATUS_CONFIG[0];

  const statusOrder: ItemStatus[] = ['idea', 'drafting', 'in_review', 'approved', 'scheduled'];
  const nextStatusFn = (current: ItemStatus): ItemStatus | null => {
    const idx = statusOrder.indexOf(current);
    return idx < statusOrder.length - 1 ? statusOrder[idx + 1] : null;
  };

  const weeks = getWeeksForMonth(currentYear, currentMonth, items);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Content Calendar</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Plan, draft, and schedule email and social content</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'calendar' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'pipeline' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <LayoutList className="h-3.5 w-3.5" /> Pipeline
            </button>
          </div>
          <button
            onClick={() => openPanel(null)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> New Content
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : viewMode === 'calendar' ? (
        /* ═══ CALENDAR VIEW ═══ */
        <div>
          {/* Month nav */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
              <button onClick={goToToday} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Today
              </button>
            </div>
            <p className="text-xs text-gray-400">{items.length} items this month</p>
          </div>

          {/* Weekly goals strip */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {weeks.map((week) => {
              const emailPct = Math.min(100, (week.emails.approved / WEEKLY_GOALS.email) * 100);
              const socialPct = Math.min(100, (week.social.approved / WEEKLY_GOALS.social) * 100);
              const allMet = week.emails.approved >= WEEKLY_GOALS.email && week.social.approved >= WEEKLY_GOALS.social;

              return (
                <div
                  key={week.startDate}
                  className={cn(
                    'rounded-xl border bg-white p-3',
                    allMet ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-gray-700">{week.label}</p>
                    {allMet && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>

                  {/* Emails */}
                  <div className="mb-1.5">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                        <Mail className="h-3 w-3 text-pink-500" /> Emails
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold',
                        week.emails.approved >= WEEKLY_GOALS.email ? 'text-emerald-600' : 'text-gray-600'
                      )}>
                        {week.emails.approved}/{WEEKLY_GOALS.email}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          week.emails.approved >= WEEKLY_GOALS.email ? 'bg-emerald-400' : emailPct > 0 ? 'bg-pink-400' : 'bg-gray-200'
                        )}
                        style={{ width: `${emailPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Social */}
                  <div>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                        <Instagram className="h-3 w-3 text-purple-500" /> Social
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold',
                        week.social.approved >= WEEKLY_GOALS.social ? 'text-emerald-600' : 'text-gray-600'
                      )}>
                        {week.social.approved}/{WEEKLY_GOALS.social}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          week.social.approved >= WEEKLY_GOALS.social ? 'bg-emerald-400' : socialPct > 0 ? 'bg-purple-400' : 'bg-gray-200'
                        )}
                        style={{ width: `${socialPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Needs indicator */}
                  {!allMet && (
                    <p className="mt-1.5 text-[10px] text-gray-400">
                      Need{' '}
                      {week.emails.approved < WEEKLY_GOALS.email && `${WEEKLY_GOALS.email - week.emails.approved} more email${WEEKLY_GOALS.email - week.emails.approved > 1 ? 's' : ''}`}
                      {week.emails.approved < WEEKLY_GOALS.email && week.social.approved < WEEKLY_GOALS.social && ' + '}
                      {week.social.approved < WEEKLY_GOALS.social && `${WEEKLY_GOALS.social - week.social.approved} more social`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px rounded-t-xl border border-gray-200 bg-gray-200">
            {DAY_NAMES.map(d => (
              <div key={d} className="bg-gray-50 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-3 sm:py-2 sm:text-xs">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px rounded-b-xl border border-t-0 border-gray-200 bg-gray-200">
            {/* Empty leading cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] bg-gray-50/50 sm:min-h-[100px]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = formatDateKey(currentYear, currentMonth, day);
              const isToday = dateKey === todayKey;
              const dayItems = itemsByDate[dateKey] || [];

              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[60px] bg-white p-1 transition-colors hover:bg-brand-50/30 cursor-pointer sm:min-h-[100px] sm:p-1.5',
                    isToday && 'bg-brand-50/40'
                  )}
                  onClick={() => openPanel(null, dateKey)}
                >
                  <div className={cn(
                    'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday ? 'bg-brand-500 text-white' : 'text-gray-700'
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => {
                      const tc = getTypeConfig(item.content_type);
                      const canApprove = item.status === 'in_review' || item.status === 'drafting';
                      const isApproved = item.status === 'approved' || item.status === 'scheduled';
                      return (
                        <div key={item.id} className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPanel(item); }}
                            className={cn(
                              'flex min-w-0 flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] font-medium border transition-colors hover:opacity-80',
                              tc.color
                            )}
                          >
                            {isApproved ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" /> : tc.icon}
                            <span className="truncate">{item.title}</span>
                          </button>
                          {canApprove && (
                            <button
                              onClick={(e) => { e.stopPropagation(); quickApprove(item); }}
                              className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                              title="Approve"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <p className="px-1 text-[10px] text-gray-400">+{dayItems.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Trailing empty cells */}
            {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
              <div key={`trail-${i}`} className="min-h-[100px] bg-gray-50/50" />
            ))}
          </div>

          {/* Unscheduled items */}
          {unscheduledItems.length > 0 && (
            <Card className="mt-4">
              <CardHeader title="Unscheduled" subtitle={`${unscheduledItems.length} items without a date`} />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {unscheduledItems.map(item => {
                  const tc = getTypeConfig(item.content_type);
                  const sc = getStatusConfig(item.status);
                  return (
                    <button
                      key={item.id}
                      onClick={() => openPanel(item)}
                      className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                    >
                      <div className={cn('mt-0.5 rounded p-1', tc.color)}>{tc.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-900">{item.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', sc.color)}>{sc.label}</span>
                          {item.assignee && <span className="text-[10px] text-gray-400">{item.assignee}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* ═══ PIPELINE VIEW ═══ */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_CONFIG.map(statusCfg => {
            const colItems = items.filter(i => i.status === statusCfg.id);
            return (
              <div key={statusCfg.id} className="min-w-[260px] flex-1">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', statusCfg.color)}>{statusCfg.label}</span>
                    <span className="text-xs text-gray-400">{colItems.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {colItems.map(item => {
                    const tc = getTypeConfig(item.content_type);
                    const canApprove = item.status === 'in_review' || item.status === 'drafting';
                    return (
                      <Card
                        key={item.id}
                        hover
                        className="!p-3"
                        onClick={() => openPanel(item)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn('mt-0.5 rounded p-1 border', tc.color)}>{tc.icon}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-900 truncate">{item.title}</p>
                            {item.scheduled_date && (
                              <p className="mt-0.5 text-[10px] text-gray-400">{item.scheduled_date}</p>
                            )}
                            {item.assignee && (
                              <p className="mt-1 text-[10px] text-gray-500">{item.assignee}</p>
                            )}
                          </div>
                          {canApprove && (
                            <button
                              onClick={(e) => { e.stopPropagation(); quickApprove(item); }}
                              className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                              title="Approve"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                  {colItems.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ SLIDE-OVER PANEL ═══ */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closePanel} />

          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedItem ? 'Edit Content' : 'New Content'}
              </h3>
              <div className="flex items-center gap-2">
                {selectedItem && (
                  <button
                    onClick={deleteItem}
                    disabled={saving}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={closePanel} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Status bar */}
              {selectedItem && (
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', getStatusConfig(selectedItem.status).color)}>
                    {getStatusConfig(selectedItem.status).label}
                  </span>
                  {nextStatusFn(selectedItem.status) && selectedItem.status !== 'in_review' && (
                    <button
                      onClick={() => updateStatus(nextStatusFn(selectedItem.status)!)}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-600 hover:bg-brand-100"
                    >
                      Move to {getStatusConfig(nextStatusFn(selectedItem.status)!).label}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {(selectedItem.status === 'in_review' || selectedItem.status === 'drafting') && (
                    <button
                      onClick={() => updateStatus('approved')}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </button>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Content title..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Type + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as ContentType)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {CONTENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Scheduled Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Assignee</label>
                <input
                  type="text"
                  value={editAssignee}
                  onChange={e => setEditAssignee(e.target.value)}
                  placeholder="Designer or copywriter name..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Idea / Prompt */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Idea / Prompt</label>
                <textarea
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  placeholder="Describe your content idea or topic..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleBrainstorm}
                    disabled={brainstorming || !editPrompt.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {brainstorming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Brainstorm Ideas
                  </button>
                  {selectedItem && (
                    <button
                      onClick={handleDraft}
                      disabled={drafting || !editPrompt.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                    >
                      {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                      Generate Draft
                    </button>
                  )}
                  {selectedItem && editType === 'email' && !selectedItem.ai_draft && (
                    <button
                      onClick={handleDesignEmail}
                      disabled={designingEmail || !editPrompt.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    >
                      {designingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Palette className="h-3.5 w-3.5" />}
                      Design Email Directly
                    </button>
                  )}
                </div>
              </div>

              {/* Brainstorm results */}
              {brainstormResults.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-700">Pick a concept</label>
                  <div className="space-y-2">
                    {brainstormResults.map((concept, i) => (
                      <button
                        key={i}
                        onClick={() => selectConcept(concept)}
                        className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                      >
                        <p className="text-xs font-semibold text-gray-900">{concept.title}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500">{concept.angle}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{concept.tone}</span>
                          <span className="text-[10px] text-gray-400 italic truncate">&ldquo;{concept.hook}&rdquo;</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Draft preview */}
              {selectedItem?.ai_draft && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-700">AI Copy Draft</label>
                  <Card className="!p-4 bg-gray-50/50">
                    {editType === 'email' && (() => {
                      const d = selectedItem.ai_draft as AiDraftEmail;
                      return (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Subject</span>
                            <p className="text-sm font-medium text-gray-900">{d.subject}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Preheader</span>
                            <p className="text-xs text-gray-600">{d.preheader}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Body</span>
                            <div className="mt-1 whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">{d.body}</div>
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{d.cta_text}</span>
                            {d.send_time_suggestion && (
                              <span className="text-[10px] text-gray-400">Best send: {d.send_time_suggestion}</span>
                            )}
                          </div>
                          {d.notes && <p className="text-[10px] text-gray-400 italic mt-1">{d.notes}</p>}
                        </div>
                      );
                    })()}
                    {editType !== 'email' && (() => {
                      const d = selectedItem.ai_draft as AiDraftSocial;
                      return (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Hook</span>
                            <p className="text-sm font-medium text-gray-900">{d.hook}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Caption</span>
                            <div className="mt-1 whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">{d.caption}</div>
                          </div>
                          {d.hashtags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {d.hashtags.map((h, i) => (
                                <span key={i} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">#{h}</span>
                              ))}
                            </div>
                          )}
                          {d.visual_suggestion && (
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Visual suggestion</span>
                              <p className="text-[11px] text-gray-500">{d.visual_suggestion}</p>
                            </div>
                          )}
                          {d.best_time && <p className="text-[10px] text-gray-400">Best time: {d.best_time}</p>}
                          {d.notes && <p className="text-[10px] text-gray-400 italic">{d.notes}</p>}
                        </div>
                      );
                    })()}
                  </Card>

                  {/* Improve copy */}
                  <div className="mt-2 flex gap-2">
                    <input
                      value={improveFeedback}
                      onChange={e => setImproveFeedback(e.target.value)}
                      placeholder="Feedback to improve the copy..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleImprove}
                      disabled={improving || !improveFeedback.trim()}
                      className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {improving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Improve Copy
                    </button>
                  </div>

                  {/* Design Email button — only for email type */}
                  {editType === 'email' && (
                    <div className="mt-3">
                      <button
                        onClick={handleDesignEmail}
                        disabled={designingEmail}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-brand-600 hover:to-brand-700 disabled:opacity-60"
                      >
                        {designingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Designing email…
                          </>
                        ) : (
                          <>
                            <Palette className="h-4 w-4" />
                            Design Email (Signos Template)
                          </>
                        )}
                      </button>
                      <p className="mt-1 text-center text-[10px] text-gray-400">
                        Creates a production-ready HTML email using Signos design system
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Email HTML Design Preview */}
              {editType === 'email' && emailHtml && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Designed Email</label>
                    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                      <button
                        onClick={() => setEmailViewMode('preview')}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                          emailViewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                      <button
                        onClick={() => setEmailViewMode('code')}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                          emailViewMode === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        <Code className="h-3 w-3" /> HTML
                      </button>
                    </div>
                  </div>

                  {/* Subject / Preheader bar */}
                  <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Subject</span>
                      <span className="text-xs font-medium text-gray-900">{emailHtml.subject}</span>
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Preview</span>
                      <span className="text-[11px] text-gray-500">{emailHtml.preheader}</span>
                    </div>
                  </div>

                  {emailViewMode === 'preview' ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-inner">
                      <iframe
                        ref={emailPreviewRef}
                        srcDoc={emailHtml.html}
                        title="Email Preview"
                        className="h-[500px] w-full border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-3">
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-green-400 font-mono">
                        {emailHtml.html}
                      </pre>
                    </div>
                  )}

                  {emailHtml.notes && (
                    <p className="mt-2 text-[10px] text-gray-400 italic">{emailHtml.notes}</p>
                  )}

                  {/* Iterate on design */}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={designFeedback}
                      onChange={e => setDesignFeedback(e.target.value)}
                      placeholder="Iterate on the design — e.g. &quot;make CTA bigger&quot;, &quot;add hero image&quot;..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleImproveDesign}
                      disabled={improvingDesign || !designFeedback.trim()}
                      className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {improvingDesign ? <Loader2 className="h-3 w-3 animate-spin" /> : <IterationCw className="h-3 w-3" />}
                      Iterate
                    </button>
                  </div>

                  {/* Regenerate entire design */}
                  <div className="mt-2">
                    <button
                      onClick={handleDesignEmail}
                      disabled={designingEmail}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {designingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Regenerate Design
                    </button>
                  </div>

                  {/* Push to Iterable */}
                  <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/30 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-brand-600" />
                      <span className="text-xs font-semibold text-brand-700">Push to Iterable</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mb-2">
                      Create this as a draft template in Iterable, ready for final review and sending.
                    </p>
                    <button
                      onClick={handlePushToIterable}
                      disabled={pushingToIterable}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                    >
                      {pushingToIterable ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Pushing to Iterable…
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Create Draft in Iterable
                        </>
                      )}
                    </button>
                    {iterableResult && (
                      <div className={cn(
                        'mt-2 rounded-md px-3 py-2 text-xs',
                        iterableResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      )}>
                        {iterableResult.success ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{iterableResult.message}</span>
                            {iterableResult.templateId && (
                              <span className="ml-auto text-[10px] text-emerald-500">ID: {iterableResult.templateId}</span>
                            )}
                          </div>
                        ) : (
                          <span>{iterableResult.message}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Ad Factory Link ─────────────────────────────────────── */}
              {selectedItem && (
                <div>
                  {linkedCampaign ? (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700">Linked Ad Campaign</span>
                        </div>
                        <a
                          href={`/content-engine?campaign=${linkedCampaign.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-200"
                        >
                          Open in Ad Factory <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Campaign status */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Status</span>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          linkedCampaign.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          linkedCampaign.status === 'review' || linkedCampaign.status === 'designing' ? 'bg-blue-100 text-blue-700' :
                          linkedCampaign.status === 'concept_ready' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {linkedCampaign.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Preview image */}
                      {linkedCampaign.conceptPreviewUrl && (
                        <div className="mb-2">
                          <img
                            src={linkedCampaign.conceptPreviewUrl}
                            alt="Concept preview"
                            className="w-full rounded-md border border-purple-100 object-cover"
                            style={{ maxHeight: 160 }}
                          />
                        </div>
                      )}

                      {/* Figma link */}
                      {linkedCampaign.figmaUrl && (
                        <a
                          href={linkedCampaign.figmaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-2 flex items-center gap-1.5 text-[11px] text-purple-600 hover:underline"
                        >
                          <Palette className="h-3 w-3" /> View Figma Design <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}

                      {/* Variant thumbnails */}
                      {linkedCampaign.variants.length > 0 && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Variants ({linkedCampaign.variants.length})
                          </span>
                          <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                            {linkedCampaign.variants.map((v, i) => (
                              <div key={i} className="flex-shrink-0">
                                <img
                                  src={v.exportUrl}
                                  alt={v.name}
                                  className="h-16 w-16 rounded border border-purple-100 object-cover"
                                />
                                <p className="mt-0.5 text-center text-[9px] text-gray-500 truncate w-16">{v.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {loadingCampaign && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading campaign data…
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-purple-300 bg-purple-50/20 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ImageIcon className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-700">Ad Factory</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mb-2">
                        Create a visual ad campaign from this content. The Ad Factory will use your
                        title, prompt, and draft as the campaign brief.
                      </p>
                      <button
                        onClick={handleCreateAd}
                        disabled={creatingCampaign || !selectedItem.id}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-600 disabled:opacity-60"
                      >
                        {creatingCampaign ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Creating campaign…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Create Ad in Ad Factory
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Blog Hub Link ──────────────────────────────────────── */}
              {selectedItem && editType === 'blog' && (
                <div className="rounded-lg border border-dashed border-green-300 bg-green-50/20 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">Blog Hub</span>
                  </div>
                  {blogPostCreated ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-emerald-700">Post created in Blog Hub</p>
                        <p className="text-[10px] text-emerald-600">Assign a writer and manage the editorial pipeline there.</p>
                      </div>
                      <a
                        href="/blog-hub"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Open Blog Hub <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-gray-500 mb-2">
                        Send this to the Blog Hub to assign a freelance writer, manage the editorial pipeline,
                        and get AI + human reviews before publishing.
                      </p>
                      <button
                        onClick={handleSendToBlogHub}
                        disabled={creatingBlogPost || !selectedItem.id}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {creatingBlogPost ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating post…</>
                        ) : (
                          <><Send className="h-3.5 w-3.5" /> Send to Blog Hub</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Final copy */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Final Copy (for handoff)</label>
                <textarea
                  value={editFinalCopy}
                  onChange={e => setEditFinalCopy(e.target.value)}
                  placeholder="Paste or write the final polished copy here..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal notes, context, or instructions for the team..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
              <button
                onClick={closePanel}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {selectedItem ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
