'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Plus, Check, Send, RefreshCw,
  Sparkles, Brain, MessageSquare, Calendar, Clock,
  User, Target, CheckCircle2, Circle,
  Bot, Zap, BookOpen, ListTodo, ExternalLink,
  MessageCircle, Pencil, Trash2, Save, X,
  TrendingUp, DollarSign, BarChart3,
  FileText, Upload, Link2, Globe,
  Paperclip, ImageIcon, Activity, GitBranch, Repeat,
  Database,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  extractPdfText,
  extractDocxText,
  truncateForUpload,
  isPdf,
  isDocx,
  isPptx,
  MAX_UPLOAD_CONTENT_CHARS,
} from '@/lib/marketing-doc-extract';

const TEAM = ['Roger', 'Sharam', 'Kate', 'Dan', 'Caroline'] as const;
type TeamMember = (typeof TEAM)[number];

const AREAS = [
  { id: 'paid_media', label: 'Paid Media (Spekk)', short: 'Spekk' },
  { id: 'influencer', label: 'Influencer', short: 'Influencer' },
  { id: 'lifecycle', label: 'Lifecycle', short: 'Lifecycle' },
  { id: 'social', label: 'Organic Social', short: 'Social' },
  { id: 'creative', label: 'Creative', short: 'Creative' },
  { id: 'copywriting', label: 'Copywriting', short: 'Copy' },
  { id: 'website_cro', label: 'Website + CRO', short: 'Website/CRO' },
  { id: 'pr', label: 'PR', short: 'PR' },
  { id: 'blog_seo', label: 'Blog / SEO', short: 'Blog/SEO' },
  { id: 'brand', label: 'Brand', short: 'Brand' },
  { id: 'new_launches', label: 'New Launches (PCOS)', short: 'Launches' },
  { id: 'glp1', label: 'GLP-1', short: 'GLP-1' },
  { id: 'team', label: 'Team / Hiring', short: 'Team' },
  { id: 'pricing', label: 'Pricing', short: 'Pricing' },
] as const;

function normalizeAreaId(area: string): string {
  if (area === 'website' || area === 'cro') return 'website_cro';
  return area;
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-500 border-gray-200',
};

const MEMBER_COLORS: Record<string, string> = {
  Roger: 'from-blue-500 to-indigo-500',
  Sharam: 'from-emerald-500 to-teal-500',
  Kate: 'from-violet-500 to-purple-500',
  Dan: 'from-amber-500 to-orange-500',
  Caroline: 'from-rose-500 to-pink-500',
};

interface TodoUpdate {
  id: string;
  content: string;
  author: string;
  timestamp: number;
}

interface GridAttachment {
  id: string;
  fileName: string;
  fileType: string;
  processedText: string;
  uploadedAt: number;
  kind: 'image' | 'document';
}

interface GridEntry {
  id: string;
  date: string;
  person: string;
  area: string;
  notes: string;
  updatedAt: number;
  attachments?: GridAttachment[];
}

type RecurrenceRule = 'daily' | 'weekly' | 'monthly' | null;

interface Todo {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeEmail: string;
  area: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  updates?: TodoUpdate[];
  parentId?: string | null;
  dependsOnIds?: string[];
  recurrence?: RecurrenceRule;
}

interface Decision {
  id: string;
  title: string;
  description: string;
  decision: string;
  rationale: string;
  area: string;
  madeBy: string;
  date: string;
  status: 'final' | 'draft' | 'revisited';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

type Tab = 'grid' | 'activity' | 'todos' | 'marv' | 'd2c';

interface HubActivityItem {
  id: string;
  kind: 'grid' | 'todo' | 'decision' | 'document';
  at: number;
  title: string;
  summary: string;
  meta: Record<string, string>;
}

interface SubSalesDay {
  date: string;
  saleCount: number;
  totalRevenue: number;
  recurlyCount: number;
  shopifyCount: number;
  recurlyRevenue: number;
  shopifyRevenue: number;
}
interface SubSalesSummary {
  sales: number;
  revenue: number;
  avgDailySales: number;
  days?: SubSalesDay[];
  recurlySales?: number;
  shopifySales?: number;
  recurlyRevenue?: number;
  shopifyRevenue?: number;
}
interface SubSalesData {
  connected: boolean;
  error?: string;
  yesterday: SubSalesDay | null;
  last7Days: SubSalesSummary;
  last30Days: SubSalesSummary;
  daily: SubSalesDay[];
  lastUpdated?: string;
}

interface DailyPerformance {
  date: string;
  dayOfWeek: string;
  notes: string;
  spend: number;
  semPaidSocialSpend: number;
  totalSales: number;
  totalCostPerSale: number;
  semMetaCostPerSale: number;
}

interface PerfTotals {
  spend: number;
  semPaidSocialSpend: number;
  totalSales: number;
  avgCostPerSale: number;
  avgSemMetaCostPerSale: number;
  daysWithData: number;
}

interface AcquisitionGoals {
  targetCAC: number;
  monthlyTargets: { month: string; targetSales: number }[];
}

// ─── API Helpers ────────────────────────────────────────────────────────────

async function gridSave(date: string, person: string, area: string, notes: string) {
  const res = await fetch('/api/marketing/grid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', date, person, area, notes, updatedBy: person }),
  });
  return res.json();
}

interface AttachmentPayload {
  fileName: string;
  fileType: string;
  data: string;
  kind: 'image' | 'document';
}

async function gridSaveWithAttachments(date: string, person: string, area: string, notes: string, attachments: AttachmentPayload[]) {
  const res = await fetch('/api/marketing/grid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save_with_attachments', date, person, area, notes, updatedBy: person, attachments }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function gridGetDay(date: string) {
  const res = await fetch('/api/marketing/grid', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_day', date }),
  });
  return res.json();
}

async function todoCreate(todo: Partial<Todo>) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', todo }),
  });
  return res.json();
}

async function todoList(filters?: { assignee?: string; area?: string; status?: string }) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', filters }),
  });
  return res.json();
}

async function todoUpdate(todoId: string, todo: Partial<Todo>) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', todoId, todo }),
  });
  return res.json();
}

async function todoAddUpdate(todoId: string, content: string, author: string) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add_update', todoId, updateContent: content, updateAuthor: author }),
  });
  return res.json();
}

async function decisionCreate(decision: Partial<Decision>) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'decision_create', decision }),
  });
  return res.json();
}

async function decisionList() {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'decision_list' }),
  });
  return res.json();
}

async function decisionDelete(decisionId: string) {
  const res = await fetch('/api/marketing/todos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'decision_delete', decisionId }),
  });
  return res.json();
}

async function aiSummarize(startDate: string, endDate: string): Promise<string> {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'summarize', startDate, endDate }),
  });
  if (!res.ok) throw new Error(`Summary failed: ${res.status}`);
  return res.text();
}

async function marketingAiAsk(question: string, gridContext?: GridEntry[]): Promise<string> {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marketing_ask', question, gridContext }),
  });
  if (!res.ok) throw new Error(`Marv failed: ${res.status}`);
  return res.text();
}

interface MarvMessage { role: 'user' | 'assistant'; content: string; }
interface DataSourceStatus { name: string; lastDate: string | null; status: string; }

async function marvChat(messages: MarvMessage[], conversationId?: string): Promise<{ text: string; conversationId: string }> {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marv_chat', messages, conversationId }),
  });
  if (!res.ok) throw new Error(`Marv chat failed: ${res.status}`);
  const convId = res.headers.get('X-Conversation-Id') || conversationId || '';
  const text = await res.text();
  return { text, conversationId: convId };
}

async function marvDataStatus(): Promise<{ sources: DataSourceStatus[]; blindSpots: string[] }> {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marv_data_status' }),
  });
  if (!res.ok) return { sources: [], blindSpots: [] };
  return res.json();
}

async function marvBlogDraft(opts: { title: string; brief: string; seoKeywords?: string; targetWordCount?: number; category?: string }): Promise<string> {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marv_blog_draft', ...opts }),
  });
  if (!res.ok) throw new Error(`Blog draft failed: ${res.status}`);
  return res.text();
}

async function marketingAiTrain(type: string, content: string, context?: string) {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marketing_train', training: { type, content, context } }),
  });
  return res.json();
}

async function marketingAiSynthesize() {
  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'marketing_synthesize' }),
  });
  return res.json();
}

interface MarketingDocMeta {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  sourceUrl: string;
  summary: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  createdAt: number;
}

async function marketingDocUpload(data: {
  title: string;
  description: string;
  sourceType: string;
  sourceUrl: string;
  content: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
}): Promise<{ success: boolean; document?: unknown; error?: string }> {
  try {
    const res = await fetch('/api/marketing/marketing-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload', ...data }),
    });
    const dataJson = (await res.json()) as { success?: boolean; document?: unknown; error?: string };
    if (!res.ok) {
      return { success: false, error: dataJson.error || res.statusText || `HTTP ${res.status}` };
    }
    if (!dataJson.success) {
      return { success: false, error: dataJson.error || 'Upload failed' };
    }
    return { success: true, document: dataJson.document };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

async function marketingDocList(): Promise<{ success: boolean; documents: MarketingDocMeta[] }> {
  const res = await fetch('/api/marketing/marketing-documents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });
  return res.json();
}

async function marketingDocDelete(docId: string) {
  const res = await fetch('/api/marketing/marketing-documents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', docId }),
  });
  return res.json();
}

async function fetchSubSales(): Promise<SubSalesData> {
  const res = await fetch('/api/data/subscription-sales');
  return res.json();
}

async function perfGetMonth(month: string): Promise<{ data: { entries: DailyPerformance[] }; totals: PerfTotals }> {
  const res = await fetch('/api/marketing/performance', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_month', month }),
  });
  return res.json();
}

async function perfGetGoals(): Promise<{ goals: AcquisitionGoals }> {
  const res = await fetch('/api/marketing/performance', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_goals' }),
  });
  return res.json();
}

async function fetchMarketingActivity(limit = 100): Promise<{ success: boolean; activities?: HubActivityItem[] }> {
  const res = await fetch('/api/marketing/activity', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', limit }),
  });
  return res.json();
}

async function aiRegenerateNextSteps(todos: Todo[]): Promise<string> {
  const todosContext = todos.map(t => {
    let text = `[${t.priority.toUpperCase()}] ${t.title} → ${t.assignee} (${t.area}, due: ${t.dueDate}, status: ${t.status})`;
    if (t.description) text += `\n  Description: ${t.description}`;
    if (t.updates && t.updates.length > 0) {
      text += `\n  Updates:`;
      for (const u of t.updates) {
        text += `\n    - ${u.author} (${new Date(u.timestamp).toLocaleDateString()}): ${u.content}`;
      }
    }
    return text;
  }).join('\n\n');

  const res = await fetch('/api/marketing/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'marketing_ask',
      question: `Review all current tasks and their updates below. As Marv, provide:\n1. Which tasks should be reprioritized and why\n2. Which tasks are blocked or overdue and need attention\n3. New tasks or next steps that should be created based on the updates\n4. What's missing — gaps the team should address\n\nCurrent Tasks:\n${todosContext}`,
    }),
  });
  if (!res.ok) throw new Error(`Regeneration failed: ${res.status}`);
  return res.text();
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(d: string): string {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftDate(d: string, days: number): string {
  const date = new Date(d + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function isTodoBlocked(todo: Todo, all: Todo[]): boolean {
  const deps = todo.dependsOnIds || [];
  if (deps.length === 0) return false;
  return deps.some(id => {
    const t = all.find(x => x.id === id);
    return !t || t.status !== 'done';
  });
}

function subtasksFor(todos: Todo[], parentId: string): Todo[] {
  return todos.filter(t => t.parentId === parentId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

type TodoStatusView = 'outstanding' | 'all' | Todo['status'];

function todosMatchingStatusView(todos: Todo[], statusView: TodoStatusView): Todo[] {
  if (statusView === 'all') return todos;
  if (statusView === 'outstanding') return todos.filter(t => t.status !== 'done');
  return todos.filter(t => t.status === statusView);
}

/** Overdue first (most overdue at top), then soonest due; no due date last. Tie-break: newer created first. */
function compareTodosByDue(a: Todo, b: Todo): number {
  const t = todayStr();
  const bucket = (due: string | undefined) => {
    if (!due) return 2;
    if (due < t) return 0;
    return 1;
  };
  const ba = bucket(a.dueDate);
  const bb = bucket(b.dueDate);
  if (ba !== bb) return ba - bb;
  if (ba === 2 && bb === 2) return b.createdAt - a.createdAt;
  return (a.dueDate || '').localeCompare(b.dueDate || '');
}

/** Roots ordered by due urgency, then each parent’s subtasks the same way; then orphan subtasks. */
function flattenTodosForNextSteps(todos: Todo[]): Todo[] {
  const byParent = new Map<string, Todo[]>();
  for (const t of todos) {
    const k = t.parentId || '';
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(t);
  }
  const roots = byParent.get('') || [];
  roots.sort(compareTodosByDue);
  const out: Todo[] = [];
  const seen = new Set<string>();
  for (const r of roots) {
    out.push(r);
    seen.add(r.id);
    const kids = byParent.get(r.id) || [];
    kids.sort(compareTodosByDue);
    for (const k of kids) {
      out.push(k);
      seen.add(k.id);
    }
  }
  const orphans: Todo[] = [];
  for (const t of todos) {
    if (!seen.has(t.id)) orphans.push(t);
  }
  orphans.sort(compareTodosByDue);
  return [...out, ...orphans];
}

// ─── Calendar Component ─────────────────────────────────────────────────────

function MonthCalendar({ selectedDate, onDateSelect }: { selectedDate: string; onDateSelect: (date: string) => void }) {
  const sel = new Date(selectedDate + 'T12:00:00');
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const today = todayStr();

  const days: { date: string; day: number }[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d });
  }

  const prev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-[280px] bg-white rounded-xl shadow-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{monthLabel}</span>
        <button onClick={next} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="h-8 w-8" />
        ))}
        {days.map(({ date, day }) => {
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={cn(
                'h-8 w-8 rounded-full text-xs flex items-center justify-center transition font-medium',
                isSelected && 'bg-brand-500 text-white',
                isToday && !isSelected && 'bg-brand-100 text-brand-700',
                !isSelected && !isToday && 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-center">
        <button onClick={() => onDateSelect(today)} className="text-xs text-brand-600 hover:text-brand-500 font-medium">
          Go to Today
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('grid');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [entries, setEntries] = useState<GridEntry[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [cellModal, setCellModal] = useState<{ person: string; areaId: string; areaLabel: string } | null>(null);
  const [cellModalDraft, setCellModalDraft] = useState('');
  const [cellModalTodo, setCellModalTodo] = useState(false);
  const [cellModalTodoForm, setCellModalTodoForm] = useState({
    title: '', description: '', assignee: '', priority: 'medium' as Todo['priority'], dueDate: '',
    dependsOnIds: [] as string[],
  });
  const [cellModalTodoSaving, setCellModalTodoSaving] = useState(false);
  const [cellModalFiles, setCellModalFiles] = useState<{ file: File; preview?: string; kind: 'image' | 'document' }[]>([]);
  const [cellModalExistingAtts, setCellModalExistingAtts] = useState<GridAttachment[]>([]);
  const [cellModalSaving, setCellModalSaving] = useState(false);
  const [cellModalProcessingStatus, setCellModalProcessingStatus] = useState('');
  const cellModalFileRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const calRef = useRef<HTMLDivElement>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [todoForm, setTodoForm] = useState({
    title: '', description: '', assignee: 'Kate', area: 'paid_media', dueDate: todayStr(), priority: 'medium' as Todo['priority'], createdBy: 'Dan',
    parentId: '' as string,
    dependsOnIds: [] as string[],
    recurrence: '' as '' | 'daily' | 'weekly' | 'monthly',
  });
  const [todoFilter, setTodoFilter] = useState<{ assignee?: string; statusView?: TodoStatusView }>({ statusView: 'outstanding' });
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Todo>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateAuthor, setUpdateAuthor] = useState<string>('Dan');
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedSteps, setRegeneratedSteps] = useState('');

  // Decisions state
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState(true);
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ title: '', decision: '', rationale: '', description: '', area: 'paid_media', madeBy: 'Dan', date: todayStr(), status: 'final' as Decision['status'] });
  const [todosSubTab, setTodosSubTab] = useState<'tasks' | 'timeline' | 'decisions'>('tasks');

  const [summaryText, setSummaryText] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryRange, setSummaryRange] = useState({ start: shiftDate(todayStr(), -7), end: todayStr() });

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiAsking, setAiAsking] = useState(false);
  const [aiTrainText, setAiTrainText] = useState('');
  const [aiTrainType, setAiTrainType] = useState<'guidance' | 'correction' | 'example' | 'preference'>('guidance');
  const [aiSaving, setAiSaving] = useState(false);

  // Marv multi-turn chat state
  const [marvMessages, setMarvMessages] = useState<MarvMessage[]>([]);
  const [marvInput, setMarvInput] = useState('');
  const [marvChatLoading, setMarvChatLoading] = useState(false);
  const [marvConvId, setMarvConvId] = useState<string | undefined>();
  const [marvDataSources, setMarvDataSources] = useState<DataSourceStatus[]>([]);
  const [marvBlindSpots, setMarvBlindSpots] = useState<string[]>([]);
  const [marvDataLoaded, setMarvDataLoaded] = useState(false);
  // Marv blog draft state
  const [marvBlogForm, setMarvBlogForm] = useState({ title: '', brief: '', seoKeywords: '', category: '' });
  const [marvBlogDraftOutput, setMarvBlogDraftText] = useState('');
  const [marvBlogLoading, setMarvBlogLoading] = useState(false);
  // Marv sub-tab
  const [marvSubTab, setMarvSubTab] = useState<'chat' | 'data' | 'train' | 'docs' | 'blog'>('chat');
  // Inline correction from chat
  const [marvCorrecting, setMarvCorrecting] = useState<number | null>(null);
  const [aiGuide, setAiGuide] = useState('');
  const [aiSynthesizing, setAiSynthesizing] = useState(false);

  // Marv Documents
  const [aiDocs, setAiDocs] = useState<MarketingDocMeta[]>([]);
  const [aiDocUploading, setAiDocUploading] = useState(false);
  const [aiDocExtracting, setAiDocExtracting] = useState(false);
  const [aiDocFileError, setAiDocFileError] = useState('');
  const [aiDocSubmitError, setAiDocSubmitError] = useState('');
  const [aiDocForm, setAiDocForm] = useState({
    title: '',
    description: '',
    sourceType: 'upload' as string,
    sourceUrl: '',
    content: '',
    uploadFileName: '',
    uploadMime: '',
  });
  const [aiDocTab, setAiDocTab] = useState<'upload' | 'link'>('upload');
  const aiDocFileRef = useRef<HTMLInputElement>(null);

  // D2C Performance
  const [perfMonth, setPerfMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [perfEntries, setPerfEntries] = useState<DailyPerformance[]>([]);
  const [perfTotals, setPerfTotals] = useState<PerfTotals | null>(null);
  const [perfGoals, setPerfGoals] = useState<AcquisitionGoals | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(false);

  // Subscription Sales (from Mode)
  const [subSales, setSubSales] = useState<SubSalesData | null>(null);
  const [loadingSubSales, setLoadingSubSales] = useState(false);

  // Spekk Report
  const [spekkTab, setSpekkTab] = useState<'report' | 'data' | 'upload'>('report');
  const [spekkSummary, setSpekkSummary] = useState<{ totalMetrics: number; totalSnapshots: number; latestSnapshot: { snapshot_date: string; page_name: string; ingested_at: number } | null; pages: string[]; dateRange: { min_date: string | null; max_date: string | null } } | null>(null);
  const [spekkSnapshots, setSpekkSnapshots] = useState<{ id: string; snapshot_date: string; page_name: string; time_period: string; summary: string; ingested_at: number }[]>([]);
  const [spekkData, setSpekkData] = useState<Record<string, unknown>[]>([]);
  const [spekkLoading, setSpekkLoading] = useState(false);
  const [spekkPasteText, setSpekkPasteText] = useState('');
  const [spekkPageName, setSpekkPageName] = useState('');
  const [spekkTimePeriod, setSpekkTimePeriod] = useState('weekly');
  const [spekkIngesting, setSpekkIngesting] = useState(false);
  const [spekkIngestResult, setSpekkIngestResult] = useState<string | null>(null);
  const [spekkSelectedPage, setSpekkSelectedPage] = useState('');
  const spekkFileRef = useRef<HTMLInputElement>(null);

  const [activities, setActivities] = useState<HubActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Close calendar on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCalendar(false);
    }
    if (showCalendar) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCalendar]);

  useEffect(() => {
    setLoadingGrid(true);
    gridGetDay(selectedDate).then(res => {
      if (res.success) {
        const normalizedEntries = (res.entries || []).map((e: GridEntry) => ({ ...e, area: normalizeAreaId(e.area) }));
        const merged = new Map<string, GridEntry>();
        for (const e of normalizedEntries) {
          const k = `${e.person}__${e.area}`;
          const prev = merged.get(k);
          if (!prev) {
            merged.set(k, e);
          } else {
            merged.set(k, {
              ...prev,
              notes: [prev.notes, e.notes].filter(Boolean).join('\n\n'),
              attachments: [...(prev.attachments || []), ...(e.attachments || [])],
              updatedAt: Math.max(prev.updatedAt, e.updatedAt),
            });
          }
        }
        const mergedEntries = Array.from(merged.values());
        setEntries(mergedEntries);
        const drafts: Record<string, string> = {};
        for (const e of mergedEntries) {
          drafts[`${e.person}__${e.area}`] = e.notes;
        }
        setCellDrafts(drafts);
      }
      setLoadingGrid(false);
    }).catch(() => setLoadingGrid(false));
  }, [selectedDate]);

  useEffect(() => {
    setLoadingTodos(true);
    todoList({ assignee: todoFilter.assignee }).then(res => {
      if (res.success) setTodos(res.todos || []);
      setLoadingTodos(false);
    }).catch(() => setLoadingTodos(false));
  }, [todoFilter.assignee]);

  const todosForNextStepsList = useMemo(() => {
    const view = todoFilter.statusView ?? 'outstanding';
    const filtered = todosMatchingStatusView(todos, view);
    return flattenTodosForNextSteps(filtered);
  }, [todos, todoFilter.statusView]);

  useEffect(() => {
    setLoadingDecisions(true);
    decisionList().then(res => {
      if (res.success) setDecisions(res.decisions || []);
      setLoadingDecisions(false);
    }).catch(() => setLoadingDecisions(false));
  }, []);

  useEffect(() => {
    if (tab !== 'activity') return;
    setLoadingActivity(true);
    fetchMarketingActivity(100).then(res => {
      if (res.success && res.activities) setActivities(res.activities);
      setLoadingActivity(false);
    }).catch(() => setLoadingActivity(false));
  }, [tab]);

  const loadPerfData = useCallback(async () => {
    setLoadingPerf(true);
    try {
      const [monthRes, goalsRes] = await Promise.all([
        perfGetMonth(perfMonth),
        perfGetGoals(),
      ]);
      setPerfEntries(monthRes.data?.entries || []);
      setPerfTotals(monthRes.totals || null);
      setPerfGoals(goalsRes.goals || null);
    } catch { /* ignore */ }
    setLoadingPerf(false);
  }, [perfMonth]);

  const loadSubSales = useCallback(async () => {
    setLoadingSubSales(true);
    try {
      const data = await fetchSubSales();
      setSubSales(data);
    } catch { /* ignore */ }
    setLoadingSubSales(false);
  }, []);

  const loadSpekkSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/spekk-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_summary' }) });
      const data = await res.json();
      if (data.success) setSpekkSummary(data.summary);
    } catch { /* ignore */ }
  }, []);

  const loadSpekkSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/spekk-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_snapshots', limit: 20 }) });
      const data = await res.json();
      if (data.success) setSpekkSnapshots(data.snapshots);
    } catch { /* ignore */ }
  }, []);

  const loadSpekkData = useCallback(async (pageName?: string) => {
    setSpekkLoading(true);
    try {
      const res = await fetch('/api/spekk-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'get_data', pageName: pageName || spekkSelectedPage || undefined, limit: 500 }) });
      const data = await res.json();
      if (data.success) setSpekkData(data.rows);
    } catch { /* ignore */ }
    setSpekkLoading(false);
  }, [spekkSelectedPage]);

  const handleSpekkPaste = useCallback(async () => {
    if (!spekkPasteText.trim()) return;
    setSpekkIngesting(true);
    setSpekkIngestResult(null);
    try {
      const res = await fetch('/api/spekk-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ingest_paste', text: spekkPasteText, pageName: spekkPageName, timePeriod: spekkTimePeriod }) });
      const data = await res.json();
      if (data.success) {
        setSpekkIngestResult(`Imported ${data.rowCount} rows (${data.headers?.join(', ')})`);
        setSpekkPasteText('');
        loadSpekkSummary();
        loadSpekkSnapshots();
        loadSpekkData();
      } else {
        setSpekkIngestResult(`Error: ${data.error}`);
      }
    } catch (e) {
      setSpekkIngestResult(`Error: ${e}`);
    }
    setSpekkIngesting(false);
  }, [spekkPasteText, spekkPageName, spekkTimePeriod, loadSpekkSummary, loadSpekkSnapshots, loadSpekkData]);

  const handleSpekkCsvUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpekkIngesting(true);
    setSpekkIngestResult(null);
    const text = await file.text();
    try {
      const res = await fetch('/api/spekk-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ingest_paste', text, pageName: spekkPageName || file.name.replace(/\.[^.]+$/, ''), timePeriod: spekkTimePeriod }) });
      const data = await res.json();
      if (data.success) {
        setSpekkIngestResult(`Uploaded ${file.name}: ${data.rowCount} rows`);
        loadSpekkSummary();
        loadSpekkSnapshots();
        loadSpekkData();
      } else {
        setSpekkIngestResult(`Error: ${data.error}`);
      }
    } catch (er) {
      setSpekkIngestResult(`Error: ${er}`);
    }
    setSpekkIngesting(false);
    if (spekkFileRef.current) spekkFileRef.current.value = '';
  }, [spekkPageName, spekkTimePeriod, loadSpekkSummary, loadSpekkSnapshots, loadSpekkData]);

  useEffect(() => {
    if (tab === 'd2c') {
      loadPerfData();
      if (!subSales && !loadingSubSales) loadSubSales();
      if (!spekkSummary) loadSpekkSummary();
    }
  }, [tab, perfMonth, loadPerfData, subSales, loadingSubSales, loadSubSales, spekkSummary, loadSpekkSummary]);

  const handleCellChange = useCallback((person: string, area: string, value: string) => {
    const key = `${person}__${area}`;
    setCellDrafts(prev => ({ ...prev, [key]: value }));
    if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key]);
    saveTimerRef.current[key] = setTimeout(async () => {
      setSavingCell(key);
      await gridSave(selectedDate, person, area, value);
      setSavingCell(null);
    }, 1500);
  }, [selectedDate]);

  const handleCellBlur = useCallback((person: string, area: string) => {
    const key = `${person}__${area}`;
    if (saveTimerRef.current[key]) {
      clearTimeout(saveTimerRef.current[key]);
      delete saveTimerRef.current[key];
    }
    const value = cellDrafts[key] || '';
    setSavingCell(key);
    gridSave(selectedDate, person, area, value).then(() => setSavingCell(null));
  }, [selectedDate, cellDrafts]);

  const openCellModal = useCallback((person: string, areaId: string, areaLabel: string) => {
    const key = `${person}__${areaId}`;
    setCellModalDraft(cellDrafts[key] || '');
    setCellModal({ person, areaId, areaLabel });
    setCellModalTodo(false);
    setCellModalTodoForm({ title: '', description: '', assignee: person, priority: 'medium', dueDate: todayStr(), dependsOnIds: [] });
    setCellModalFiles([]);
    setCellModalSaving(false);
    setCellModalProcessingStatus('');
    setCellModalTodoSuccess('');
    const entry = entries.find(e => e.person === person && e.area === areaId);
    setCellModalExistingAtts(entry?.attachments || []);
  }, [cellDrafts, entries]);

  const handleCellModalFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: { file: File; preview?: string; kind: 'image' | 'document' }[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isImage = f.type.startsWith('image/');
      const entry: { file: File; preview?: string; kind: 'image' | 'document' } = {
        file: f,
        kind: isImage ? 'image' : 'document',
      };
      if (isImage) {
        entry.preview = URL.createObjectURL(f);
      }
      newFiles.push(entry);
    }
    setCellModalFiles(prev => [...prev, ...newFiles]);
    if (cellModalFileRef.current) cellModalFileRef.current.value = '';
  }, []);

  const removeCellModalFile = useCallback((idx: number) => {
    setCellModalFiles(prev => {
      const next = [...prev];
      if (next[idx]?.preview) URL.revokeObjectURL(next[idx].preview!);
      next.splice(idx, 1);
      return next;
    });
  }, []);

  const resizeImageForUpload = useCallback((file: File, maxDim = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        URL.revokeObjectURL(img.src);
        resolve(base64);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.readAsDataURL(file);
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const fileToPayload = useCallback(async (f: File, kind: 'image' | 'document'): Promise<AttachmentPayload> => {
    if (kind === 'image') {
      const base64 = await resizeImageForUpload(f);
      return { fileName: f.name, fileType: 'image/jpeg', data: base64, kind: 'image' };
    }
    const text = await f.text();
    return { fileName: f.name, fileType: f.type, data: text, kind: 'document' };
  }, [resizeImageForUpload]);

  const savePendingTodoIfNeeded = useCallback(async () => {
    if (!cellModal || !cellModalTodoForm.title.trim()) return;
    try {
      const res = await todoCreate({
        ...cellModalTodoForm,
        area: cellModal.areaId,
        status: 'pending',
        createdBy: 'Dan',
        dependsOnIds: cellModalTodoForm.dependsOnIds,
      });
      if (res.success) {
        setTodos(prev => [res.todo, ...prev]);
      }
    } catch (err) {
      console.error('Auto-save todo failed:', err);
    }
  }, [cellModal, cellModalTodoForm]);

  const saveCellModal = useCallback(async () => {
    if (!cellModal) return;
    const { person, areaId } = cellModal;
    const key = `${person}__${areaId}`;

    // Also save any pending todo from the "Create Next Step" form
    await savePendingTodoIfNeeded();

    if (cellModalFiles.length === 0) {
      setCellDrafts(prev => ({ ...prev, [key]: cellModalDraft }));
      setSavingCell(key);
      setCellModal(null);
      await gridSave(selectedDate, person, areaId, cellModalDraft);
      setSavingCell(null);
      return;
    }

    setCellModalSaving(true);
    setCellModalProcessingStatus('Preparing files...');

    try {
      const payloads: AttachmentPayload[] = [];
      for (let i = 0; i < cellModalFiles.length; i++) {
        const { file, kind } = cellModalFiles[i];
        setCellModalProcessingStatus(`Processing ${kind === 'image' ? '🖼️' : '📄'} ${file.name} (${i + 1}/${cellModalFiles.length})...`);
        const payload = await fileToPayload(file, kind);
        payloads.push(payload);
      }

      setCellModalProcessingStatus('Analyzing with AI and saving...');
      const res = await gridSaveWithAttachments(selectedDate, person, areaId, cellModalDraft, payloads);

      if (res.success && res.entry) {
        setCellDrafts(prev => ({ ...prev, [key]: res.entry.notes }));
        setEntries(prev => {
          const idx = prev.findIndex(e => e.person === person && e.area === areaId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.entry;
            return next;
          }
          return [...prev, res.entry];
        });
      } else {
        setCellDrafts(prev => ({ ...prev, [key]: cellModalDraft }));
      }

      cellModalFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setCellModal(null);
      setCellModalSaving(false);
      setCellModalProcessingStatus('');
      setSavingCell(null);
    } catch (err) {
      console.error('Save with attachments failed:', err);
      setCellModalSaving(false);
      const msg = err instanceof Error ? err.message : 'Save failed';
      setCellModalProcessingStatus(`Error: ${msg} — try with fewer files`);
      setTimeout(() => setCellModalProcessingStatus(''), 8000);
    }
  }, [cellModal, cellModalDraft, cellModalFiles, selectedDate, fileToPayload, savePendingTodoIfNeeded]);

  const [cellModalTodoSuccess, setCellModalTodoSuccess] = useState('');

  const createTodoFromModal = useCallback(async () => {
    if (!cellModal || !cellModalTodoForm.title.trim()) return;
    setCellModalTodoSaving(true);
    setCellModalTodoSuccess('');
    try {
      const res = await todoCreate({
        ...cellModalTodoForm,
        area: cellModal.areaId,
        status: 'pending',
        createdBy: 'Dan',
        dependsOnIds: cellModalTodoForm.dependsOnIds,
      });
      if (res.success) {
        setTodos(prev => [res.todo, ...prev]);
        setCellModalTodoSuccess(`Added: "${res.todo.title}"`);
        setCellModalTodoForm({ title: '', description: '', assignee: cellModal.person, priority: 'medium', dueDate: todayStr(), dependsOnIds: [] });
        setCellModalTodo(false);
        setTimeout(() => setCellModalTodoSuccess(''), 4000);
      } else {
        setCellModalTodoSuccess('Error creating task — please try again');
        setTimeout(() => setCellModalTodoSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Todo creation failed:', err);
      setCellModalTodoSuccess('Error creating task — please try again');
      setTimeout(() => setCellModalTodoSuccess(''), 5000);
    }
    setCellModalTodoSaving(false);
  }, [cellModal, cellModalTodoForm]);

  const handleCreateTodo = useCallback(async () => {
    if (!todoForm.title.trim()) return;
    const parentId = todoForm.parentId.trim() || undefined;
    const recurrence: RecurrenceRule = parentId ? null : (todoForm.recurrence === '' ? null : todoForm.recurrence);
    const res = await todoCreate({
      title: todoForm.title,
      description: todoForm.description,
      assignee: todoForm.assignee,
      area: todoForm.area,
      dueDate: todoForm.dueDate,
      priority: todoForm.priority,
      createdBy: todoForm.createdBy,
      parentId,
      dependsOnIds: todoForm.dependsOnIds,
      recurrence,
    });
    if (res.success) {
      setTodos(prev => [res.todo, ...prev]);
      setTodoForm({
        title: '', description: '', assignee: 'Kate', area: 'paid_media', dueDate: todayStr(), priority: 'medium', createdBy: 'Dan',
        parentId: '', dependsOnIds: [], recurrence: '',
      });
      setShowAddTodo(false);
    }
  }, [todoForm]);

  const handleToggleTodo = useCallback(async (todo: Todo) => {
    const nextStatus = todo.status === 'done' ? 'pending' : todo.status === 'pending' ? 'in_progress' : 'done';
    const res = await todoUpdate(todo.id, { status: nextStatus }) as { success?: boolean; todo?: Todo; spawnedRecurring?: Todo };
    if (res.success && res.todo) {
      setTodos(prev => {
        let next = prev.map(t => t.id === todo.id ? res.todo! : t);
        if (res.spawnedRecurring) next = [res.spawnedRecurring, ...next];
        return next;
      });
    }
  }, []);

  const handleStartEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo.id);
    setEditForm({
      title: todo.title,
      description: todo.description,
      assignee: todo.assignee,
      area: todo.area,
      dueDate: todo.dueDate,
      priority: todo.priority,
      parentId: todo.parentId,
      dependsOnIds: todo.dependsOnIds ? [...todo.dependsOnIds] : [],
      recurrence: todo.recurrence ?? null,
    });
  }, []);

  const handleSaveEdit = useCallback(async (todoId: string) => {
    setSavingEdit(true);
    const res = await todoUpdate(todoId, editForm) as { success?: boolean; todo?: Todo; spawnedRecurring?: Todo };
    if (res.success && res.todo) {
      setTodos(prev => {
        let next = prev.map(t => t.id === todoId ? res.todo! : t);
        if (res.spawnedRecurring) next = [res.spawnedRecurring, ...next];
        return next;
      });
      setEditingTodo(null);
      setEditForm({});
    }
    setSavingEdit(false);
  }, [editForm]);

  const handleCancelEdit = useCallback(() => {
    setEditingTodo(null);
    setEditForm({});
  }, []);

  const handleDeleteTodo = useCallback(async (todoId: string) => {
    const res = await fetch('/api/marketing/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', todoId }),
    });
    const data = await res.json();
    if (data.success) {
      setTodos(prev => prev.filter(t => t.id !== todoId));
      setExpandedTodo(null);
    }
  }, []);

  const handleAddTodoUpdate = useCallback(async (todoId: string) => {
    if (!updateText.trim()) return;
    setSavingUpdate(true);
    const res = await todoAddUpdate(todoId, updateText, updateAuthor);
    if (res.success) {
      setTodos(prev => prev.map(t => t.id === todoId ? res.todo : t));
      setUpdateText('');
    }
    setSavingUpdate(false);
  }, [updateText, updateAuthor]);

  const handleRegenerateSteps = useCallback(async () => {
    setRegenerating(true);
    setRegeneratedSteps('');
    try {
      const text = await aiRegenerateNextSteps(todos);
      setRegeneratedSteps(text);
    } catch (err) {
      setRegeneratedSteps(`Error: ${err}`);
    }
    setRegenerating(false);
  }, [todos]);

  const handleCreateDecision = useCallback(async () => {
    if (!decisionForm.title.trim() || !decisionForm.decision.trim()) return;
    const res = await decisionCreate(decisionForm);
    if (res.success) {
      setDecisions(prev => [res.decision, ...prev]);
      setDecisionForm({ title: '', decision: '', rationale: '', description: '', area: 'paid_media', madeBy: 'Dan', date: todayStr(), status: 'final' });
      setShowAddDecision(false);
    }
  }, [decisionForm]);

  const handleDeleteDecision = useCallback(async (id: string) => {
    const res = await decisionDelete(id);
    if (res.success) {
      setDecisions(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const handleSummarize = useCallback(async () => {
    setSummarizing(true);
    setSummaryText('');
    try {
      const text = await aiSummarize(summaryRange.start, summaryRange.end);
      setSummaryText(text);
    } catch (err) {
      setSummaryText(`Error: ${err}`);
    }
    setSummarizing(false);
  }, [summaryRange]);

  const handleAiAsk = useCallback(async () => {
    if (!aiQuestion.trim()) return;
    setAiAsking(true);
    setAiResponse('');
    try {
      const text = await marketingAiAsk(aiQuestion, entries);
      setAiResponse(text);
    } catch (err) {
      setAiResponse(`Error: ${err}`);
    }
    setAiAsking(false);
  }, [aiQuestion, entries]);

  // Marv multi-turn chat handler
  const handleMarvSend = useCallback(async () => {
    if (!marvInput.trim()) return;
    const userMsg: MarvMessage = { role: 'user', content: marvInput };
    const updated = [...marvMessages, userMsg];
    setMarvMessages(updated);
    setMarvInput('');
    setMarvChatLoading(true);
    try {
      const { text, conversationId } = await marvChat(updated, marvConvId);
      setMarvConvId(conversationId);
      setMarvMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      setMarvMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }]);
    }
    setMarvChatLoading(false);
  }, [marvInput, marvMessages, marvConvId]);

  const handleMarvNewChat = useCallback(() => {
    setMarvMessages([]);
    setMarvConvId(undefined);
  }, []);

  const handleMarvCorrect = useCallback(async (msgIndex: number, correction: string) => {
    if (!correction.trim()) return;
    setAiSaving(true);
    const originalMsg = marvMessages[msgIndex];
    await marketingAiTrain('correction', correction, originalMsg?.content?.slice(0, 500));
    setMarvCorrecting(null);
    setAiSaving(false);
  }, [marvMessages]);

  // Load Marv data status
  useEffect(() => {
    if (tab === 'marv' && marvSubTab === 'data' && !marvDataLoaded) {
      marvDataStatus().then(({ sources, blindSpots }) => {
        setMarvDataSources(sources);
        setMarvBlindSpots(blindSpots);
        setMarvDataLoaded(true);
      });
    }
  }, [tab, marvSubTab, marvDataLoaded]);

  // Marv blog draft handler
  const handleMarvBlogDraft = useCallback(async () => {
    if (!marvBlogForm.title.trim() || !marvBlogForm.brief.trim()) return;
    setMarvBlogLoading(true);
    setMarvBlogDraftText('');
    try {
      const text = await marvBlogDraft(marvBlogForm);
      setMarvBlogDraftText(text);
    } catch (err) {
      setMarvBlogDraftText(`Error: ${err}`);
    }
    setMarvBlogLoading(false);
  }, [marvBlogForm]);

  const [aiTrainSuccess, setAiTrainSuccess] = useState('');

  const handleAiTrain = useCallback(async () => {
    if (!aiTrainText.trim()) return;
    setAiSaving(true);
    setAiTrainSuccess('');
    try {
      await marketingAiTrain(aiTrainType, aiTrainText);
      setAiTrainSuccess(`Saved "${aiTrainText.slice(0, 60).trim()}${aiTrainText.length > 60 ? '...' : ''}" as ${aiTrainType}`);
      setAiTrainText('');
      setTimeout(() => setAiTrainSuccess(''), 6000);
    } catch {
      setAiTrainSuccess('Error saving — please try again');
      setTimeout(() => setAiTrainSuccess(''), 5000);
    }
    setAiSaving(false);
  }, [aiTrainType, aiTrainText]);

  const handleAiSynthesize = useCallback(async () => {
    setAiSynthesizing(true);
    const res = await marketingAiSynthesize();
    if (res.success) setAiGuide(res.guide);
    setAiSynthesizing(false);
  }, []);

  const loadAiDocs = useCallback(async () => {
    const res = await marketingDocList();
    if (res.success) setAiDocs(res.documents);
  }, []);

  useEffect(() => { loadAiDocs(); }, [loadAiDocs]);

  const [aiDocImagePreview, setAiDocImagePreview] = useState<string | null>(null);

  const handleAiDocFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiDocFileError('');
    setAiDocSubmitError('');

    if (isPptx(file)) {
      setAiDocFileError(
        'PowerPoint (.pptx) is not supported in the browser. Export to PDF and upload, or copy text into the Google Doc / URL tab.'
      );
      if (aiDocFileRef.current) aiDocFileRef.current.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAiDocImagePreview(dataUrl);
        setAiDocForm(prev => ({
          ...prev,
          content: dataUrl,
          title: prev.title || file.name.replace(/\.[^.]+$/, ''),
          sourceType: 'upload',
          uploadFileName: file.name,
          uploadMime: file.type || 'image/png',
        }));
      };
      reader.readAsDataURL(file);
      return;
    }

    setAiDocImagePreview(null);
    setAiDocExtracting(true);
    void (async () => {
      try {
        let text: string;
        if (isPdf(file)) {
          text = await extractPdfText(file);
        } else if (isDocx(file)) {
          text = await extractDocxText(file);
        } else {
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Could not read file'));
            reader.readAsText(file);
          });
        }

        if (!text.trim()) {
          setAiDocFileError('No text was extracted. For scans, try OCR or paste text manually.');
          setAiDocForm(prev => ({
            ...prev,
            content: '',
            uploadFileName: file.name,
            uploadMime: file.type,
          }));
          return;
        }

        const { text: safe, truncated } = truncateForUpload(text);
        setAiDocForm(prev => ({
          ...prev,
          content: safe,
          title: prev.title || file.name.replace(/\.[^.]+$/, ''),
          sourceType: 'upload',
          uploadFileName: file.name,
          uploadMime: file.type || 'text/plain',
        }));
        if (truncated) {
          setAiDocFileError(
            `Large document: only the first ${MAX_UPLOAD_CONTENT_CHARS.toLocaleString()} characters were kept (server upload limit).`
          );
        }
      } catch (err) {
        setAiDocFileError(err instanceof Error ? err.message : 'Could not read this file.');
        setAiDocForm(prev => ({ ...prev, content: '', uploadFileName: '', uploadMime: '' }));
      } finally {
        setAiDocExtracting(false);
      }
    })();
  }, []);

  const handleAiDocSubmit = useCallback(async () => {
    if (!aiDocForm.title.trim() || !aiDocForm.content.trim()) return;
    setAiDocSubmitError('');
    setAiDocUploading(true);
    try {
      const isImage = aiDocForm.content.startsWith('data:image/');
      const fileType = isImage
        ? aiDocForm.content.split(';')[0].split(':')[1] || 'image/png'
        : aiDocForm.uploadMime || 'text/plain';
      const res = await marketingDocUpload({
        title: aiDocForm.title,
        description: aiDocForm.description,
        sourceType: aiDocForm.sourceType,
        sourceUrl: aiDocForm.sourceUrl,
        content: aiDocForm.content,
        fileName: aiDocForm.uploadFileName || aiDocForm.title,
        fileType,
        uploadedBy: 'Dan',
      });
      if (res.success) {
        setAiDocForm({
          title: '',
          description: '',
          sourceType: 'upload',
          sourceUrl: '',
          content: '',
          uploadFileName: '',
          uploadMime: '',
        });
        setAiDocImagePreview(null);
        setAiDocFileError('');
        if (aiDocFileRef.current) aiDocFileRef.current.value = '';
        await loadAiDocs();
      } else {
        setAiDocSubmitError(res.error || 'Upload failed. Try a smaller file or paste content instead.');
      }
    } catch (e) {
      setAiDocSubmitError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setAiDocUploading(false);
    }
  }, [aiDocForm, loadAiDocs]);

  const handleAiDocDelete = useCallback(async (docId: string) => {
    await marketingDocDelete(docId);
    setAiDocs(prev => prev.filter(d => d.id !== docId));
  }, []);

  const handleDateFromCalendar = useCallback((date: string) => {
    setSelectedDate(date);
    setShowCalendar(false);
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'grid', label: 'Daily Grid', icon: <Calendar className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
    { id: 'todos', label: 'Next Steps & Decisions', icon: <ListTodo className="h-4 w-4" /> },
    { id: 'marv', label: 'Marv', icon: <Brain className="h-4 w-4" /> },
    { id: 'd2c', label: 'D2C Performance', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="p-4 pb-20 space-y-4 sm:p-6 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Marketing Hub</h1>
        <p className="text-xs text-gray-500 mt-1 sm:text-sm">Daily operations, next steps, decisions, and AI-powered insights across all marketing areas.</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 transition sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm',
              tab === t.id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            )}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'todos' && todos.filter(x => x.status !== 'done').length > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {todos.filter(x => x.status !== 'done').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════ TAB: ACTIVITY FEED ════════════ */}
      {tab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 max-w-xl">
              Recent updates across the daily grid, next steps, decisions, and Marv knowledge uploads — newest first.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadingActivity(true);
                fetchMarketingActivity(100).then(res => {
                  if (res.success && res.activities) setActivities(res.activities);
                  setLoadingActivity(false);
                }).catch(() => setLoadingActivity(false));
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className={cn('h-3 w-3', loadingActivity && 'animate-spin')} />
              Refresh
            </button>
          </div>
          {loadingActivity ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading activity…
            </div>
          ) : activities.length === 0 ? (
            <Card className="text-center py-12 text-sm text-gray-500">No activity yet. Add grid notes, tasks, or decisions to see them here.</Card>
          ) : (
            <div className="space-y-2">
              {activities.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 flex gap-3"
                >
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    item.kind === 'grid' && 'bg-teal-100 text-teal-700',
                    item.kind === 'todo' && 'bg-amber-100 text-amber-700',
                    item.kind === 'decision' && 'bg-violet-100 text-violet-700',
                    item.kind === 'document' && 'bg-sky-100 text-sky-700',
                  )}>
                    {item.kind === 'grid' && <Calendar className="h-4 w-4" />}
                    {item.kind === 'todo' && <ListTodo className="h-4 w-4" />}
                    {item.kind === 'decision' && <CheckCircle2 className="h-4 w-4" />}
                    {item.kind === 'document' && <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {item.kind === 'grid' && 'Daily grid'}
                        {item.kind === 'todo' && 'Next step'}
                        {item.kind === 'decision' && 'Decision'}
                        {item.kind === 'document' && 'Document'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ TAB: DAILY GRID ════════════ */}
      {tab === 'grid' && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                <Calendar className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-medium text-gray-900">{formatDate(selectedDate)}</span>
              </button>
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <MonthCalendar selectedDate={selectedDate} onDateSelect={handleDateFromCalendar} />
                </div>
              )}
            </div>
            <button onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setSelectedDate(todayStr())} className="text-xs text-brand-600 hover:text-brand-500 font-medium ml-1">
              Today
            </button>
            {loadingGrid && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-[1400px]">
              <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '120px repeat(14, 1fr)' }}>
                <div className="text-xs font-medium text-gray-400 p-2">Team</div>
                {AREAS.map(a => (
                  <div key={a.id} className="text-[10px] font-medium text-gray-400 p-2 text-center uppercase tracking-wider">
                    {a.short}
                  </div>
                ))}
              </div>

              {TEAM.map(person => (
                <div key={person} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '120px repeat(14, 1fr)' }}>
                  <div className="flex items-center gap-2 p-2">
                    <div className={cn('h-7 w-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold', MEMBER_COLORS[person])}>
                      {person[0]}
                    </div>
                    <span className="text-xs font-medium text-gray-900">{person}</span>
                  </div>

                  {AREAS.map(area => {
                    const key = `${person}__${area.id}`;
                    const isSaving = savingCell === key;
                    const value = cellDrafts[key] || '';
                    const cellEntry = entries.find(e => e.person === person && e.area === area.id);
                    const attCount = cellEntry?.attachments?.length || 0;

                    return (
                      <div
                        key={area.id}
                        onClick={() => openCellModal(person, area.id, area.label)}
                        className={cn(
                          'relative rounded-md border px-2 py-1.5 text-[11px] text-gray-700 cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition min-h-[60px] overflow-hidden',
                          isSaving ? 'border-brand-300 bg-brand-50' : value ? 'bg-teal-50/60 border-teal-200/70' : 'bg-gray-50 border-gray-200/80'
                        )}
                      >
                        {value ? (
                          <p className="line-clamp-3 whitespace-pre-wrap break-words">{value}</p>
                        ) : (
                          <span className="text-gray-300">...</span>
                        )}
                        {isSaving && (
                          <div className="absolute top-1 right-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin text-brand-500" />
                          </div>
                        )}
                        {!isSaving && value && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          </div>
                        )}
                        {attCount > 0 && (
                          <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-indigo-50 rounded px-1 py-0.5">
                            <Paperclip className="h-2.5 w-2.5 text-indigo-500" />
                            <span className="text-[9px] font-semibold text-indigo-600">{attCount}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ════════════ TAB: NEXT STEPS & DECISIONS ════════════ */}
      {tab === 'todos' && (
        <>
          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { id: 'tasks' as const, label: 'Next Steps', count: todos.filter(t => t.status !== 'done').length },
              { id: 'timeline' as const, label: 'Timeline', count: 0 },
              { id: 'decisions' as const, label: 'Decisions', count: decisions.length },
            ]).map(st => (
              <button
                key={st.id}
                onClick={() => setTodosSubTab(st.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  todosSubTab === st.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {st.label}
                {st.count > 0 && (
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', todosSubTab === st.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-600')}>{st.count}</span>
                )}
              </button>
            ))}
          </div>

          {todosSubTab === 'tasks' && (
          <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={todoFilter.assignee || ''}
                onChange={e => setTodoFilter(prev => ({ ...prev, assignee: e.target.value || undefined }))}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-brand-400"
              >
                <option value="">All People</option>
                {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={todoFilter.statusView ?? 'outstanding'}
                onChange={e => {
                  const v = e.target.value as TodoStatusView;
                  setTodoFilter(prev => ({ ...prev, statusView: v }));
                }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-brand-400"
              >
                <option value="outstanding">Outstanding</option>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateSteps}
                disabled={regenerating || todos.length === 0}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  regenerating || todos.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border border-brand-200 text-brand-600 hover:bg-brand-50'
                )}
              >
                {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate Priorities
              </button>
              <button
                onClick={() => setShowAddTodo(!showAddTodo)}
                className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition"
              >
                <Plus className="h-3 w-3" /> Add Task
              </button>
            </div>
          </div>

          {regeneratedSteps && (
            <Card className="border-brand-200 bg-brand-50/50">
              <CardHeader title="Marv Priority Analysis" subtitle="AI-generated review of current tasks and recommendations" />
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {regeneratedSteps}
              </div>
            </Card>
          )}

          {showAddTodo && (
            <Card>
              <CardHeader title="New Task" />
              <div className="space-y-3">
                <input
                  value={todoForm.title}
                  onChange={e => setTodoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/20"
                  placeholder="Task title..."
                />
                <textarea
                  value={todoForm.description}
                  onChange={e => setTodoForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none resize-none"
                  placeholder="Description (optional)..."
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Assignee</label>
                    <select value={todoForm.assignee} onChange={e => setTodoForm(prev => ({ ...prev, assignee: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                      {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Area</label>
                    <select value={todoForm.area} onChange={e => setTodoForm(prev => ({ ...prev, area: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                      {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Due Date</label>
                    <input type="date" value={todoForm.dueDate} onChange={e => setTodoForm(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Priority</label>
                    <select value={todoForm.priority} onChange={e => setTodoForm(prev => ({ ...prev, priority: e.target.value as Todo['priority'] }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Parent task (subtasks)</label>
                    <select
                      value={todoForm.parentId}
                      onChange={e => setTodoForm(prev => ({
                        ...prev,
                        parentId: e.target.value,
                        recurrence: e.target.value ? '' : prev.recurrence,
                      }))}
                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
                    >
                      <option value="">None — top-level task</option>
                      {todos.filter(t => !t.parentId).map(t => (
                        <option key={t.id} value={t.id}>{t.title.length > 70 ? `${t.title.slice(0, 70)}…` : t.title}</option>
                      ))}
                    </select>
                  </div>
                  {!todoForm.parentId && (
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Repeat className="h-3 w-3" /> Repeats</label>
                      <select
                        value={todoForm.recurrence}
                        onChange={e => setTodoForm(prev => ({ ...prev, recurrence: e.target.value as typeof prev.recurrence }))}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
                      >
                        <option value="">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" /> Depends on (finish these first)</label>
                  <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-2 space-y-1">
                    {todos.length === 0 ? (
                      <p className="text-[10px] text-gray-400">No other tasks yet.</p>
                    ) : (
                      todos.map(t => (
                        <label key={t.id} className="flex items-center gap-2 text-[10px] text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={todoForm.dependsOnIds.includes(t.id)}
                            onChange={(e) => {
                              setTodoForm(prev => {
                                const next = new Set(prev.dependsOnIds);
                                if (e.target.checked) next.add(t.id);
                                else next.delete(t.id);
                                return { ...prev, dependsOnIds: Array.from(next) };
                              });
                            }}
                          />
                          <span className="truncate">{t.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">Created By</label>
                    <select value={todoForm.createdBy} onChange={e => setTodoForm(prev => ({ ...prev, createdBy: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                      {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button onClick={handleCreateTodo} disabled={!todoForm.title.trim()} className={cn('mt-4 flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition', todoForm.title.trim() ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                    <Plus className="h-3 w-3" /> Create & Notify
                  </button>
                </div>
              </div>
            </Card>
          )}

          {loadingTodos ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading tasks...
            </div>
          ) : todosForNextStepsList.length === 0 ? (
            <Card className="text-center py-8">
              <ListTodo className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {todos.length === 0
                  ? 'No tasks yet. Click "Add Task" to create one.'
                  : (todoFilter.statusView ?? 'outstanding') === 'outstanding'
                    ? 'No outstanding tasks. Use All Status to see completed work.'
                    : 'No tasks match this filter.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {todosForNextStepsList.map(todo => {
                const isExpanded = expandedTodo === todo.id;
                const subs = subtasksFor(todos, todo.id);
                const blocked = isTodoBlocked(todo, todos);
                return (
                  <Card key={todo.id} className={cn(todo.status === 'done' && 'opacity-50', todo.parentId && 'ml-6 sm:ml-10 border-l-2 border-brand-200 pl-3')}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => handleToggleTodo(todo)} className="mt-0.5 flex-shrink-0">
                        {todo.status === 'done' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : todo.status === 'in_progress' ? (
                          <Clock className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {todo.parentId && (
                            <span className="text-[9px] font-semibold uppercase text-brand-500">Subtask</span>
                          )}
                          <button
                            onClick={() => setExpandedTodo(isExpanded ? null : todo.id)}
                            className={cn('text-sm font-medium text-left', todo.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900 hover:text-brand-600')}
                          >
                            {todo.title}
                          </button>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', PRIORITY_COLORS[todo.priority])}>
                            {todo.priority}
                          </span>
                          {todo.recurrence && !todo.parentId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-0.5">
                              <Repeat className="h-2.5 w-2.5" /> {todo.recurrence}
                            </span>
                          )}
                          {!todo.parentId && subs.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-0.5">
                              <GitBranch className="h-2.5 w-2.5" /> {subs.length} subtask{subs.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {blocked && todo.status !== 'done' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Blocked</span>
                          )}
                          {todo.updates && todo.updates.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              <MessageCircle className="h-2.5 w-2.5" /> {todo.updates.length}
                            </span>
                          )}
                        </div>
                        {todo.description && <p className="text-xs text-gray-500 mb-1">{todo.description}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {todo.assignee}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-2.5 w-2.5" />
                            {AREAS.find(a => a.id === todo.area)?.short || todo.area}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {todo.dueDate}
                          </span>
                          <span>by {todo.createdBy}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                            {blocked && todo.status !== 'done' && (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
                                <span className="font-semibold">Dependencies not complete: </span>
                                {(todo.dependsOnIds || []).map(id => todos.find(x => x.id === id)?.title).filter(Boolean).join(', ') || 'Linked tasks'}
                              </div>
                            )}
                            {/* Edit / Delete actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              {editingTodo !== todo.id ? (
                                <>
                                  <button onClick={() => handleStartEdit(todo)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition">
                                    <Pencil className="h-2.5 w-2.5" /> Edit
                                  </button>
                                  {!todo.parentId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAddTodo(true);
                                      setTodoForm(prev => ({ ...prev, parentId: todo.id, recurrence: '' }));
                                    }}
                                    className="flex items-center gap-1 rounded-lg border border-brand-200 px-2.5 py-1 text-[10px] font-medium text-brand-600 hover:bg-brand-50 transition"
                                  >
                                    <GitBranch className="h-2.5 w-2.5" /> Add subtask
                                  </button>
                                  )}
                                  <button onClick={() => { if (confirm('Delete this task?')) handleDeleteTodo(todo.id); }} className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50 transition">
                                    <Trash2 className="h-2.5 w-2.5" /> Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleSaveEdit(todo.id)} disabled={savingEdit} className="flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-brand-600 transition">
                                    {savingEdit ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />} Save
                                  </button>
                                  <button onClick={handleCancelEdit} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition">
                                    <X className="h-2.5 w-2.5" /> Cancel
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Inline edit form */}
                            {editingTodo === todo.id && (
                              <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-1">Title</label>
                                  <input value={editForm.title || ''} onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-brand-400 focus:outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-1">Description</label>
                                  <textarea value={editForm.description || ''} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-brand-400 focus:outline-none resize-none" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Assignee</label>
                                    <select value={editForm.assignee || ''} onChange={e => setEditForm(prev => ({ ...prev, assignee: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                      {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Area</label>
                                    <select value={editForm.area || ''} onChange={e => setEditForm(prev => ({ ...prev, area: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                      {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Due Date</label>
                                    <input type="date" value={editForm.dueDate || ''} onChange={e => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1">Priority</label>
                                    <select value={editForm.priority || ''} onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value as Todo['priority'] }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                                      <option value="low">Low</option>
                                      <option value="medium">Medium</option>
                                      <option value="high">High</option>
                                      <option value="urgent">Urgent</option>
                                    </select>
                                  </div>
                                </div>
                                {!editForm.parentId && (
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Repeat className="h-3 w-3" /> Repeats</label>
                                    <select
                                      value={editForm.recurrence ?? ''}
                                      onChange={e => setEditForm(prev => ({
                                        ...prev,
                                        recurrence: e.target.value === '' ? null : e.target.value as RecurrenceRule,
                                      }))}
                                      className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
                                    >
                                      <option value="">Does not repeat</option>
                                      <option value="daily">Daily</option>
                                      <option value="weekly">Weekly</option>
                                      <option value="monthly">Monthly</option>
                                    </select>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" /> Depends on</label>
                                  <div className="max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
                                    {todos.filter(t => t.id !== todo.id).map(t => (
                                      <label key={t.id} className="flex items-center gap-2 text-[10px] text-gray-700 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={(editForm.dependsOnIds || []).includes(t.id)}
                                          onChange={(e) => {
                                            setEditForm(prev => {
                                              const set = new Set(prev.dependsOnIds || []);
                                              if (e.target.checked) set.add(t.id);
                                              else set.delete(t.id);
                                              return { ...prev, dependsOnIds: Array.from(set) };
                                            });
                                          }}
                                        />
                                        <span className="truncate">{t.title}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {!todo.parentId && subs.length > 0 && editingTodo !== todo.id && (
                              <div className="rounded-lg border border-gray-100 bg-gray-50/90 p-3">
                                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><GitBranch className="h-3 w-3" /> Subtasks</h4>
                                <div className="space-y-1.5">
                                  {subs.map(st => (
                                    <div key={st.id} className="flex items-center justify-between gap-2 text-xs">
                                      <span className="text-gray-800 truncate">{st.title}</span>
                                      <span className={cn(
                                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
                                        st.status === 'done' ? 'bg-emerald-100 text-emerald-700' : st.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600',
                                      )}>{st.status}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Updates history */}
                            {todo.updates && todo.updates.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Updates</h4>
                                {todo.updates.map(u => (
                                  <div key={u.id} className="flex gap-2 text-xs">
                                    <div className={cn('h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0', MEMBER_COLORS[u.author] || 'from-gray-400 to-gray-500')}>
                                      {u.author[0]}
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">{u.author}</span>
                                      <span className="text-gray-400 ml-1">{new Date(u.timestamp).toLocaleDateString()}</span>
                                      <p className="text-gray-600 mt-0.5">{u.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add update */}
                            <div className="flex items-start gap-2">
                              <textarea
                                value={updateText}
                                onChange={e => setUpdateText(e.target.value)}
                                rows={2}
                                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none resize-none"
                                placeholder="Add an update..."
                              />
                              <div className="flex flex-col gap-1">
                                <select value={updateAuthor} onChange={e => setUpdateAuthor(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-600 outline-none">
                                  {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button
                                  onClick={() => handleAddTodoUpdate(todo.id)}
                                  disabled={savingUpdate || !updateText.trim()}
                                  className={cn(
                                    'flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition',
                                    savingUpdate || !updateText.trim()
                                      ? 'bg-gray-100 text-gray-400'
                                      : 'bg-brand-500 text-white hover:bg-brand-600'
                                  )}
                                >
                                  {savingUpdate ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Send className="h-2.5 w-2.5" />}
                                  Post
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          </>
          )}

          {/* ── Timeline Sub-tab ── */}
          {todosSubTab === 'timeline' && (() => {
            const activeTodos = todos.filter(t => t.status !== 'done');
            if (activeTodos.length === 0) {
              return (
                <Card className="text-center py-8">
                  <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No active tasks to display on the timeline.</p>
                </Card>
              );
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMs = today.getTime();
            const dayMs = 86400000;

            const dueDates = activeTodos.map(t => new Date(t.dueDate + 'T12:00:00').getTime());
            const minDate = Math.min(todayMs, ...dueDates);
            const maxDate = Math.max(todayMs + dayMs * 7, ...dueDates.map(d => d + dayMs));

            const startMon = new Date(minDate);
            startMon.setDate(startMon.getDate() - ((startMon.getDay() + 6) % 7));
            startMon.setHours(0, 0, 0, 0);
            const rangeStart = startMon.getTime();

            const endSun = new Date(maxDate);
            endSun.setDate(endSun.getDate() + (7 - endSun.getDay()) % 7);
            endSun.setHours(0, 0, 0, 0);
            const rangeEnd = endSun.getTime() + dayMs;

            const totalDays = Math.round((rangeEnd - rangeStart) / dayMs);
            const weeks: { label: string; startDay: number; days: number }[] = [];
            for (let i = 0; i < totalDays; i += 7) {
              const d = new Date(rangeStart + i * dayMs);
              weeks.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), startDay: i, days: Math.min(7, totalDays - i) });
            }

            const overdue = activeTodos.filter(t => new Date(t.dueDate + 'T23:59:59').getTime() < todayMs);
            const dueToday = activeTodos.filter(t => { const d = new Date(t.dueDate + 'T12:00:00'); d.setHours(0,0,0,0); return d.getTime() === todayMs; });
            const dueThisWeek = activeTodos.filter(t => { const d = new Date(t.dueDate + 'T12:00:00').getTime(); return d > todayMs && d <= todayMs + dayMs * 7; });

            const grouped: Record<string, Todo[]> = {};
            for (const t of activeTodos) {
              const key = t.assignee;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(t);
            }
            const sortedAssignees = Object.keys(grouped).sort();

            const todayOffset = Math.round((todayMs - rangeStart) / dayMs);

            return (
              <>
                {/* Summary counters */}
                <div className="grid grid-cols-3 gap-3">
                  <div className={cn('rounded-xl border p-3', overdue.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white')}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center', overdue.length > 0 ? 'bg-red-100' : 'bg-gray-100')}>
                        <Clock className={cn('h-3 w-3', overdue.length > 0 ? 'text-red-500' : 'text-gray-400')} />
                      </div>
                      <span className="text-[10px] font-medium uppercase text-gray-500">Overdue</span>
                    </div>
                    <p className={cn('text-lg font-bold', overdue.length > 0 ? 'text-red-600' : 'text-gray-300')}>{overdue.length}</p>
                  </div>
                  <div className={cn('rounded-xl border p-3', dueToday.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white')}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('h-6 w-6 rounded-full flex items-center justify-center', dueToday.length > 0 ? 'bg-amber-100' : 'bg-gray-100')}>
                        <Calendar className={cn('h-3 w-3', dueToday.length > 0 ? 'text-amber-500' : 'text-gray-400')} />
                      </div>
                      <span className="text-[10px] font-medium uppercase text-gray-500">Due Today</span>
                    </div>
                    <p className={cn('text-lg font-bold', dueToday.length > 0 ? 'text-amber-600' : 'text-gray-300')}>{dueToday.length}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center"><Target className="h-3 w-3 text-blue-500" /></div>
                      <span className="text-[10px] font-medium uppercase text-gray-500">This Week</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{dueThisWeek.length}</p>
                  </div>
                </div>

                {/* Gantt chart */}
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: Math.max(600, totalDays * 32 + 160) }}>
                      {/* Week headers */}
                      <div className="flex border-b border-gray-200 bg-gray-50">
                        <div className="w-40 flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase border-r border-gray-200">Assignee</div>
                        <div className="flex-1 flex">
                          {weeks.map((w, i) => (
                            <div key={i} className="flex-1 text-center text-[10px] font-semibold text-gray-500 py-2 border-r border-gray-100 last:border-r-0" style={{ minWidth: w.days * 32 }}>{w.label}</div>
                          ))}
                        </div>
                      </div>
                      {/* Day headers */}
                      <div className="flex border-b border-gray-100">
                        <div className="w-40 flex-shrink-0 border-r border-gray-200" />
                        <div className="flex-1 flex">
                          {Array.from({ length: totalDays }, (_, i) => {
                            const d = new Date(rangeStart + i * dayMs);
                            const isToday = i === todayOffset;
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <div key={i} className={cn('text-center text-[9px] py-1 border-r border-gray-50 last:border-r-0', isToday ? 'bg-brand-500 text-white font-bold' : isWeekend ? 'bg-gray-50 text-gray-400' : 'text-gray-400')} style={{ width: 32, minWidth: 32 }}>
                                {['S','M','T','W','T','F','S'][d.getDay()]}
                                <br/>{d.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Rows per assignee */}
                      {sortedAssignees.map(assignee => {
                        const tasks = grouped[assignee].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                        return (
                          <div key={assignee} className="flex border-b border-gray-100 last:border-b-0">
                            <div className="w-40 flex-shrink-0 px-3 py-2 border-r border-gray-200 flex items-center gap-2">
                              <div className={cn('h-5 w-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0', MEMBER_COLORS[assignee] || 'from-gray-400 to-gray-500')}>{assignee[0]}</div>
                              <span className="text-xs font-medium text-gray-700 truncate">{assignee}</span>
                              <span className="text-[9px] text-gray-400">{tasks.length}</span>
                            </div>
                            <div className="flex-1 relative" style={{ minHeight: tasks.length * 28 + 8 }}>
                              {/* Background grid */}
                              <div className="absolute inset-0 flex">
                                {Array.from({ length: totalDays }, (_, i) => {
                                  const d = new Date(rangeStart + i * dayMs);
                                  const isToday = i === todayOffset;
                                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                  return <div key={i} className={cn('border-r border-gray-50', isToday ? 'bg-brand-50' : isWeekend ? 'bg-gray-50/50' : '')} style={{ width: 32, minWidth: 32 }} />;
                                })}
                              </div>
                              {/* Task bars */}
                              {tasks.map((task, ti) => {
                                const taskDue = new Date(task.dueDate + 'T12:00:00');
                                taskDue.setHours(0, 0, 0, 0);
                                const dueDay = Math.round((taskDue.getTime() - rangeStart) / dayMs);
                                const barStart = Math.max(0, dueDay - 2);
                                const barEnd = Math.min(totalDays, dueDay + 1);
                                const isOverdue = taskDue.getTime() < todayMs;
                                const isDueToday = taskDue.getTime() === todayMs;
                                const priorityBar = task.priority === 'urgent' ? 'bg-red-400 border-red-500' : task.priority === 'high' ? 'bg-orange-400 border-orange-500' : task.priority === 'medium' ? 'bg-amber-400 border-amber-500' : 'bg-blue-400 border-blue-500';
                                return (
                                  <div
                                    key={task.id}
                                    title={`${task.title} — Due: ${formatDate(task.dueDate)} — ${task.priority}`}
                                    className="absolute flex items-center group"
                                    style={{ left: barStart * 32, width: (barEnd - barStart) * 32, top: ti * 28 + 4, height: 22 }}
                                  >
                                    <div className={cn(
                                      'h-full w-full rounded-md border text-[9px] font-medium text-white px-1.5 flex items-center gap-1 truncate cursor-default shadow-sm transition',
                                      isOverdue ? 'bg-red-500 border-red-600 animate-pulse' : isDueToday ? 'bg-amber-500 border-amber-600' : priorityBar,
                                    )}>
                                      {isOverdue && <Clock className="h-2.5 w-2.5 flex-shrink-0" />}
                                      <span className="truncate">{task.title}</span>
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-gray-900 text-white text-[10px] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                      <p className="font-semibold">{task.title}</p>
                                      <p className="text-gray-300">Due: {formatDate(task.dueDate)}</p>
                                      <p className="text-gray-300">{AREAS.find(a => a.id === task.area)?.short || task.area} &middot; {task.priority}</p>
                                      {isOverdue && <p className="text-red-300 font-medium mt-0.5">OVERDUE</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Overdue list */}
                {overdue.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Overdue Tasks ({overdue.length})</h3>
                    <div className="space-y-1.5">
                      {overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(t => (
                        <div key={t.id} className="flex items-center justify-between rounded-lg bg-white border border-red-100 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn('h-4 w-4 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0', MEMBER_COLORS[t.assignee] || 'from-gray-400 to-gray-500')}>{t.assignee[0]}</div>
                            <span className="text-xs font-medium text-gray-900 truncate">{t.title}</span>
                            <span className={cn('text-[9px] px-1 py-0 rounded-full border font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-red-600 font-medium">{formatDate(t.dueDate)}</span>
                            <span className="text-[9px] text-gray-400">{AREAS.find(a => a.id === t.area)?.short || t.area}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming sorted list */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> All Tasks by Due Date</h3>
                  <div className="space-y-1">
                    {activeTodos.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(t => {
                      const taskDate = new Date(t.dueDate + 'T12:00:00');
                      taskDate.setHours(0, 0, 0, 0);
                      const isOverdueItem = taskDate.getTime() < todayMs;
                      const isTodayItem = taskDate.getTime() === todayMs;
                      return (
                        <div key={t.id} className={cn('flex items-center justify-between rounded-lg px-3 py-2 transition', isOverdueItem ? 'bg-red-50 border border-red-100' : isTodayItem ? 'bg-amber-50 border border-amber-100' : 'hover:bg-gray-50')}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={cn('h-4 w-4 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0', MEMBER_COLORS[t.assignee] || 'from-gray-400 to-gray-500')}>{t.assignee[0]}</div>
                            <span className={cn('text-xs font-medium truncate', isOverdueItem ? 'text-red-700' : 'text-gray-900')}>{t.title}</span>
                            <span className={cn('text-[9px] px-1 py-0 rounded-full border font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                            {t.status === 'in_progress' && <span className="text-[9px] px-1 py-0 rounded-full bg-amber-100 text-amber-700 font-medium">in progress</span>}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-[10px] text-gray-400">{AREAS.find(a => a.id === t.area)?.short || t.area}</span>
                            <span className={cn('text-[10px] font-medium', isOverdueItem ? 'text-red-600' : isTodayItem ? 'text-amber-600' : 'text-gray-600')}>{formatDate(t.dueDate)}</span>
                            {isOverdueItem && <span className="text-[9px] font-bold text-red-500">OVERDUE</span>}
                            {isTodayItem && <span className="text-[9px] font-bold text-amber-500">TODAY</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* ── Decisions Sub-tab ── */}
          {todosSubTab === 'decisions' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Key decisions made by the team — tracked for context and accountability.</p>
              <button
                onClick={() => setShowAddDecision(!showAddDecision)}
                className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition"
              >
                <Plus className="h-3 w-3" /> Log Decision
              </button>
            </div>

            {showAddDecision && (
              <Card>
                <CardHeader title="Log a Decision" />
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Decision Title</label>
                    <input
                      value={decisionForm.title}
                      onChange={e => setDecisionForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/20"
                      placeholder="e.g. Pausing Google Non-Brand until CAC improves"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">What was decided?</label>
                    <textarea
                      value={decisionForm.decision}
                      onChange={e => setDecisionForm(prev => ({ ...prev, decision: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none resize-none"
                      placeholder="Describe the decision clearly..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Rationale (optional)</label>
                    <textarea
                      value={decisionForm.rationale}
                      onChange={e => setDecisionForm(prev => ({ ...prev, rationale: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none resize-none"
                      placeholder="Why this decision was made..."
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Area</label>
                      <select value={decisionForm.area} onChange={e => setDecisionForm(prev => ({ ...prev, area: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                        {AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Decided By</label>
                      <select value={decisionForm.madeBy} onChange={e => setDecisionForm(prev => ({ ...prev, madeBy: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                        {TEAM.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Date</label>
                      <input type="date" value={decisionForm.date} onChange={e => setDecisionForm(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Status</label>
                      <select value={decisionForm.status} onChange={e => setDecisionForm(prev => ({ ...prev, status: e.target.value as Decision['status'] }))} className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none">
                        <option value="final">Final</option>
                        <option value="draft">Draft</option>
                        <option value="revisited">Revisited</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateDecision}
                    disabled={!decisionForm.title.trim() || !decisionForm.decision.trim()}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition',
                      decisionForm.title.trim() && decisionForm.decision.trim()
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Plus className="h-3 w-3" /> Log Decision
                  </button>
                </div>
              </Card>
            )}

            {loadingDecisions ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading decisions...
              </div>
            ) : decisions.length === 0 ? (
              <Card className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No decisions logged yet. Click &quot;Log Decision&quot; to start tracking.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {decisions.map(dec => (
                  <Card key={dec.id}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                        dec.status === 'final' ? 'bg-emerald-100' : dec.status === 'draft' ? 'bg-amber-100' : 'bg-blue-100'
                      )}>
                        <CheckCircle2 className={cn(
                          'h-3 w-3',
                          dec.status === 'final' ? 'text-emerald-600' : dec.status === 'draft' ? 'text-amber-600' : 'text-blue-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">{dec.title}</h4>
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                            dec.status === 'final' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            dec.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          )}>
                            {dec.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 mb-1.5">{dec.decision}</p>
                        {dec.rationale && (
                          <p className="text-[11px] text-gray-500 italic mb-1.5">Rationale: {dec.rationale}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {dec.madeBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-2.5 w-2.5" />
                            {AREAS.find(a => a.id === dec.area)?.short || dec.area}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {dec.date}
                          </span>
                          <button
                            onClick={() => { if (confirm('Delete this decision?')) handleDeleteDecision(dec.id); }}
                            className="ml-auto flex items-center gap-1 text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="h-2.5 w-2.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
          )}
        </>
      )}

      {/* ════════════ TAB: MARV ════════════ */}
      {tab === 'marv' && (
        <>
          {/* Marv Header */}
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/50">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">Marv</h2>
                  <span className="bg-violet-100 text-violet-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">Marketing Intelligence Agent</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your always-on strategic marketing partner. Marv has visibility across paid media, email/lifecycle, blog pipeline, content calendar, influencer program, growth initiatives, D2C acquisition, and team tasks — and proactively flags what&apos;s missing.
                </p>
              </div>
            </div>
          </Card>

          {/* Marv Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { id: 'chat' as const, label: 'Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { id: 'data' as const, label: 'What Marv Knows', icon: <Database className="h-3.5 w-3.5" /> },
              { id: 'train' as const, label: 'Train & Summary', icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: 'docs' as const, label: 'Knowledge Base', icon: <FileText className="h-3.5 w-3.5" /> },
            ]).map(st => (
              <button key={st.id} onClick={() => setMarvSubTab(st.id)} className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition', marvSubTab === st.id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {st.icon} {st.label}
              </button>
            ))}
          </div>

          {/* ── Chat Sub-tab ── */}
          {marvSubTab === 'chat' && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardHeader title="Chat with Marv" subtitle="Multi-turn conversation with full marketing context" />
                {marvMessages.length > 0 && (
                  <button onClick={handleMarvNewChat} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition">
                    <Plus className="h-3 w-3" /> New Chat
                  </button>
                )}
              </div>

              {/* Message Thread */}
              {marvMessages.length > 0 && (
                <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
                  {marvMessages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : '')}>
                      {msg.role === 'assistant' && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn('rounded-xl px-4 py-3 max-w-[85%]', msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-gray-50 border border-gray-100')}>
                        <div className={cn('text-sm whitespace-pre-wrap leading-relaxed', msg.role === 'user' ? 'text-white' : 'text-gray-700')}>
                          {msg.content}
                        </div>
                        {msg.role === 'assistant' && (
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
                            {marvCorrecting === i ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="What should Marv know instead?"
                                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 outline-none focus:border-violet-400"
                                  onKeyDown={e => { if (e.key === 'Enter') handleMarvCorrect(i, (e.target as HTMLInputElement).value); }}
                                />
                                <button onClick={() => setMarvCorrecting(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setMarvCorrecting(i)} className="text-[10px] text-gray-400 hover:text-violet-600 transition flex items-center gap-1">
                                <Pencil className="h-2.5 w-2.5" /> Correct this
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {marvChatLoading && (
                    <div className="flex gap-3">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-400">Marv is thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  value={marvInput}
                  onChange={e => setMarvInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMarvSend(); } }}
                  rows={2}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none resize-none"
                  placeholder="Ask Marv anything about your marketing... (Enter to send, Shift+Enter for newline)"
                />
                <button onClick={handleMarvSend} disabled={marvChatLoading || !marvInput.trim()} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition self-end', marvChatLoading || !marvInput.trim() ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700')}>
                  {marvChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </Card>
          )}

          {/* ── What Marv Knows Sub-tab ── */}
          {marvSubTab === 'data' && (
            <Card>
              <CardHeader title="What Marv Knows" subtitle="Connected data sources and known blind spots" />
              {!marvDataLoaded ? (
                <div className="flex items-center gap-2 py-8 justify-center text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading data status...
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Connected Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {marvDataSources.map((s, i) => (
                        <div key={i} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-xs border', s.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : s.status === 'no_data' ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-red-50 border-red-200 text-red-700')}>
                          <span className="text-sm">{s.status === 'active' ? '✅' : s.status === 'no_data' ? '⚪' : '❌'}</span>
                          <span className="font-medium">{s.name}</span>
                          {s.lastDate && <span className="text-[10px] ml-auto opacity-70">Last: {s.lastDate}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {marvBlindSpots.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3">Known Blind Spots</h3>
                      <div className="space-y-1.5">
                        {marvBlindSpots.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            <span className="flex-shrink-0 mt-0.5">🔴</span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setMarvDataLoaded(false); }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-300 transition">
                    <RefreshCw className="h-3 w-3" /> Refresh Status
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* ── Train & Summary Sub-tab ── */}
          {marvSubTab === 'train' && (
            <>
              {/* Marketing Summary */}
              <Card>
                <CardHeader title="Marketing Summary" subtitle="Marv synthesizes team notes into a strategic, actionable overview" />
                <div className="flex items-center gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">From</label>
                    <input type="date" value={summaryRange.start} onChange={e => setSummaryRange(prev => ({ ...prev, start: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">To</label>
                    <input type="date" value={summaryRange.end} onChange={e => setSummaryRange(prev => ({ ...prev, end: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-violet-400" />
                  </div>
                  <button onClick={handleSummarize} disabled={summarizing} className={cn('mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition', summarizing ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700')}>
                    {summarizing ? <><Loader2 className="h-4 w-4 animate-spin" /> Summarizing...</> : <><Sparkles className="h-4 w-4" /> Generate Summary</>}
                  </button>
                </div>
                {summaryText && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-violet-600">Marv Summary</span>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{summaryText}</div>
                  </div>
                )}
              </Card>

              {/* Train Marv */}
              <Card>
                <CardHeader title="Train Marv" subtitle="Provide guidance, corrections, and examples to refine the model" />
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['guidance', 'correction', 'example', 'preference'] as const).map(t => (
                      <button key={t} onClick={() => setAiTrainType(t)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium border transition capitalize', aiTrainType === t ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={aiTrainText}
                    onChange={e => setAiTrainText(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none resize-none"
                    placeholder={
                      aiTrainType === 'guidance' ? "e.g. Prioritize brand consistency over speed to market..." :
                      aiTrainType === 'correction' ? "e.g. Marv suggested X but the right approach would actually be Y because..." :
                      aiTrainType === 'example' ? "e.g. When facing a similar situation, the preferred approach was..." :
                      "e.g. Prefer warm color palettes and clean typography in ads..."
                    }
                  />
                  <div className="flex items-center gap-3">
                    <button onClick={handleAiTrain} disabled={aiSaving || !aiTrainText.trim()} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition', aiSaving || !aiTrainText.trim() ? 'bg-gray-100 text-gray-400' : 'bg-violet-600 text-white hover:bg-violet-500')}>
                      {aiSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                      Save Training Input
                    </button>
                    <button onClick={handleAiSynthesize} disabled={aiSynthesizing} className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition', aiSynthesizing ? 'bg-gray-100 text-gray-400' : 'border border-violet-300 text-violet-600 hover:bg-violet-50')}>
                      {aiSynthesizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Synthesize Framework
                    </button>
                  </div>
                  {aiTrainSuccess && (
                    <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium mt-2', aiTrainSuccess.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')}>
                      {aiTrainSuccess.startsWith('Error') ? <X className="h-3 w-3 shrink-0" /> : <Check className="h-3 w-3 shrink-0" />}
                      {aiTrainSuccess}
                    </div>
                  )}
                </div>
              </Card>

              {aiGuide && (
                <Card>
                  <CardHeader title="Marv Decision Framework" subtitle="Synthesized from all training data and inputs" />
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiGuide}</div>
                </Card>
              )}
            </>
          )}

          {/* ── Knowledge Base Sub-tab (docs) ── */}
          {marvSubTab === 'docs' && (
          <Card>
            <CardHeader title="Marv Knowledge Base" subtitle="Upload documents, Google Docs/Sheets, or paste content for Marv to reference" />

            {/* Upload mode tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
              <button onClick={() => setAiDocTab('upload')} className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition', aiDocTab === 'upload' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                <Upload className="h-3 w-3" /> Upload File
              </button>
              <button onClick={() => setAiDocTab('link')} className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition', aiDocTab === 'link' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                <Link2 className="h-3 w-3" /> Google Doc / URL
              </button>
            </div>

            <div className="space-y-3">
              {aiDocTab === 'upload' && (
                <div
                  onClick={() => {
                    if (!aiDocExtracting) aiDocFileRef.current?.click();
                  }}
                  className={cn(
                    'border-2 border-dashed border-gray-200 rounded-lg p-4 text-center transition',
                    aiDocExtracting ? 'cursor-wait opacity-80' : 'cursor-pointer hover:border-violet-300 hover:bg-violet-50/30'
                  )}
                >
                  {aiDocImagePreview ? (
                    <div className="space-y-2">
                      <img src={aiDocImagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                      <p className="text-xs text-emerald-600 font-medium">Image loaded — Claude Vision will analyze this</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiDocImagePreview(null);
                          setAiDocForm(prev => ({ ...prev, content: '', uploadFileName: '', uploadMime: '' }));
                          if (aiDocFileRef.current) aiDocFileRef.current.value = '';
                        }}
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                      >Remove</button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">
                        {aiDocExtracting
                          ? 'Extracting text from document…'
                          : aiDocForm.content && aiDocForm.sourceType === 'upload'
                            ? `File loaded — ${aiDocForm.content.length.toLocaleString()} characters of text`
                            : 'Click to upload images, documents, or text files'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        PDF &amp; Word text is extracted properly. Images use vision. Plain text: .txt, .csv, .md, .json. Not supported: .pptx (export to PDF first).
                      </p>
                      {aiDocFileError && (
                        <p className="text-[11px] text-amber-700 mt-2 text-left max-w-md mx-auto">{aiDocFileError}</p>
                      )}
                    </>
                  )}
                  <input
                    ref={aiDocFileRef}
                    type="file"
                    accept="image/*,.txt,.csv,.md,.json,.tsv,.xml,.html,.log,.pdf,.docx"
                    className="hidden"
                    onChange={handleAiDocFileChange}
                  />
                </div>
              )}

              {aiDocTab === 'link' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={aiDocForm.sourceUrl}
                      onChange={e => setAiDocForm(prev => ({ ...prev, sourceUrl: e.target.value, sourceType: e.target.value.includes('docs.google') ? 'google_doc' : e.target.value.includes('sheets.google') ? 'google_sheet' : 'url' }))}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                      placeholder="https://docs.google.com/document/d/... or any URL"
                    />
                  </div>
                  <textarea
                    value={aiDocForm.content}
                    onChange={e => setAiDocForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none resize-none"
                    placeholder="Paste the document content here (copy from Google Doc/Sheet, or paste any text)..."
                  />
                </div>
              )}

              <input
                type="text"
                value={aiDocForm.title}
                onChange={e => setAiDocForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none"
                placeholder="Document title (e.g. GLP-1 Graduation Sprint Plan)"
              />

              <textarea
                value={aiDocForm.description}
                onChange={e => setAiDocForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none resize-none"
                placeholder="Brief description — what is this document? Why is it important for marketing strategy? (optional but helps Marv understand context)"
              />

              <button
                onClick={handleAiDocSubmit}
                disabled={aiDocUploading || aiDocExtracting || !aiDocForm.title.trim() || !aiDocForm.content.trim()}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition',
                  aiDocUploading || aiDocExtracting || !aiDocForm.title.trim() || !aiDocForm.content.trim()
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-violet-600 text-white hover:bg-violet-500'
                )}
              >
                {aiDocUploading ? <><Loader2 className="h-3 w-3 animate-spin" /> Processing &amp; Summarizing...</> : <><Upload className="h-3 w-3" /> Upload to Marv</>}
              </button>
              {aiDocSubmitError && (
                <p className="text-[11px] text-red-600 mt-2">{aiDocSubmitError}</p>
              )}
            </div>

            {/* Uploaded documents list */}
            {aiDocs.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-3">{aiDocs.length} document{aiDocs.length !== 1 ? 's' : ''} in knowledge base</p>
                <div className="space-y-2">
                  {aiDocs.map(doc => (
                    <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 group">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {doc.sourceType === 'google_doc' || doc.sourceType === 'google_sheet' ? <Globe className="h-4 w-4 text-violet-500" /> : doc.sourceType === 'url' ? <Link2 className="h-4 w-4 text-violet-500" /> : <FileText className="h-4 w-4 text-violet-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">{doc.title}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        {doc.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{doc.description}</p>}
                        {doc.summary && <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 italic">{doc.summary.slice(0, 200)}...</p>}
                        {doc.sourceUrl && <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-500 hover:text-violet-600 mt-0.5 inline-flex items-center gap-0.5"><ExternalLink className="h-2.5 w-2.5" /> Source</a>}
                      </div>
                      <button onClick={() => handleAiDocDelete(doc.id)} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-red-50 rounded" title="Remove document">
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          )}

          {/* How Marv Works */}
          <Card className="border-violet-100 bg-violet-50/50">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 space-y-1.5">
                <p><strong className="text-violet-600">How Marv learns &amp; operates:</strong></p>
                <p>1. <strong>Full data visibility</strong> — Marv sees paid media, email campaigns, blog pipeline, content calendar, influencer program, growth initiatives, D2C performance, and team tasks.</p>
                <p>2. <strong>Daily Grid absorption</strong> — Team notes are absorbed to understand thinking patterns, priorities, and decision-making style.</p>
                <p>3. <strong>Direct training</strong> — Training inputs teach Marv specific rules, corrections, and preferences.</p>
                <p>4. <strong>Multi-turn chat</strong> — Have conversations with Marv and correct its answers inline to improve accuracy.</p>
                <p>5. <strong>Proactive gap detection</strong> — Marv identifies which data it&apos;s missing and flags blind spots.</p>
                <p>6. <strong>Blog generation</strong> — Generate SEO-optimized, brand-aligned blog content with Marv&apos;s full marketing context.</p>
                <p>7. <strong>Daily Slack briefing</strong> — Every weekday at 7am ET, Marv posts a proactive morning briefing with priorities, gaps, and action items.</p>
                <p>8. <strong>Continuous improvement</strong> — Over time, Marv becomes increasingly accurate at predicting how to approach any marketing decision.</p>
              </div>
            </div>
          </Card>
        </>
      )}

      {tab === 'd2c' && (
        <>
          {/* ── Subscription Sales (Mode) ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Subscription Sales</h3>
                  <p className="text-xs text-gray-500">New subscription sales from Recurly &amp; Shopify &middot; via Mode</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingSubSales && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {subSales?.lastUpdated && <span className="text-[10px] text-gray-400">Updated {new Date(subSales.lastUpdated).toLocaleTimeString()}</span>}
                <button onClick={loadSubSales} disabled={loadingSubSales} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw className={cn('h-3 w-3', loadingSubSales && 'animate-spin')} /> Refresh
                </button>
              </div>
            </div>

            {loadingSubSales && !subSales ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-purple-400" /><span className="ml-2 text-sm text-gray-400">Loading subscription sales from Mode...</span></div>
            ) : subSales && !subSales.connected ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm text-amber-700">{subSales.error || 'Mode not connected'}</p>
                {subSales.error?.includes('created') && <p className="text-xs text-amber-600 mt-1">The query was just created in Mode. Please refresh in a few minutes once the report run completes.</p>}
              </div>
            ) : subSales ? (
              <>
                {/* KPI Row: Yesterday / Last 7 Days / Last 30 Days */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  {/* Yesterday */}
                  <div className={cn('rounded-xl border p-4', subSales.yesterday ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 bg-gray-50')}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Yesterday</p>
                    {subSales.yesterday ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{subSales.yesterday.saleCount} <span className="text-sm font-normal text-gray-400">sales</span></p>
                        <p className="text-sm text-gray-600 mt-1">${Math.round(subSales.yesterday.totalRevenue).toLocaleString()} revenue</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Recurly: {subSales.yesterday.recurlyCount}</span>
                          <span>Shopify: {subSales.yesterday.shopifyCount}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No data yet</p>
                    )}
                  </div>

                  {/* Last 7 Days */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last 7 Days</p>
                    <p className="text-3xl font-bold text-gray-900">{subSales.last7Days.sales} <span className="text-sm font-normal text-gray-400">sales</span></p>
                    <p className="text-sm text-gray-600 mt-1">${Math.round(subSales.last7Days.revenue).toLocaleString()} revenue</p>
                    <p className="text-xs text-gray-500 mt-2">Avg: {subSales.last7Days.avgDailySales} sales/day</p>
                  </div>

                  {/* Last 30 Days */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last 30 Days</p>
                    <p className="text-3xl font-bold text-gray-900">{subSales.last30Days.sales} <span className="text-sm font-normal text-gray-400">sales</span></p>
                    <p className="text-sm text-gray-600 mt-1">${Math.round(subSales.last30Days.revenue).toLocaleString()} revenue</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>Avg: {subSales.last30Days.avgDailySales}/day</span>
                      {subSales.last30Days.recurlySales !== undefined && <span>Recurly: {subSales.last30Days.recurlySales}</span>}
                      {subSales.last30Days.shopifySales !== undefined && <span>Shopify: {subSales.last30Days.shopifySales}</span>}
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown Table — Last 7 Days */}
                {subSales.last7Days.days && subSales.last7Days.days.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Daily Breakdown (Last 7 Days)</h4>
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Date</th>
                            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Total Sales</th>
                            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Revenue</th>
                            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Recurly</th>
                            <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Shopify</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subSales.last7Days.days.map(d => {
                            const salesColor = d.saleCount >= 35 ? 'text-emerald-600 font-bold' : d.saleCount >= 25 ? 'text-teal-600 font-semibold' : d.saleCount >= 18 ? 'text-gray-700 font-medium' : d.saleCount > 0 ? 'text-red-500' : 'text-gray-300';
                            const dayName = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                            return (
                              <tr key={d.date} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                <td className="py-1.5 px-2 text-gray-700 font-medium tabular-nums">
                                  <span>{d.date.slice(5).replace('-', '/')}</span>
                                  <span className="ml-2 text-xs text-gray-400">{dayName}</span>
                                </td>
                                <td className={cn('py-1.5 px-2 text-right tabular-nums', salesColor)}>{d.saleCount}</td>
                                <td className="py-1.5 px-2 text-right text-gray-700 tabular-nums">${Math.round(d.totalRevenue).toLocaleString()}</td>
                                <td className="py-1.5 px-2 text-right text-gray-500 tabular-nums">{d.recurlyCount} <span className="text-gray-300">/ ${Math.round(d.recurlyRevenue).toLocaleString()}</span></td>
                                <td className="py-1.5 px-2 text-right text-gray-500 tabular-nums">{d.shopifyCount} <span className="text-gray-300">/ ${Math.round(d.shopifyRevenue).toLocaleString()}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 font-semibold">
                            <td className="py-2 px-2 text-gray-900">7-Day Total</td>
                            <td className="py-2 px-2 text-right text-gray-900 tabular-nums">{subSales.last7Days.sales}</td>
                            <td className="py-2 px-2 text-right text-gray-900 tabular-nums">${Math.round(subSales.last7Days.revenue).toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-gray-500 tabular-nums">{subSales.last7Days.days.reduce((s, d) => s + d.recurlyCount, 0)}</td>
                            <td className="py-2 px-2 text-right text-gray-500 tabular-nums">{subSales.last7Days.days.reduce((s, d) => s + d.shopifyCount, 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 30-Day Trend Mini Chart */}
                {subSales.daily.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">30-Day Sales Trend</h4>
                    <div className="flex items-end gap-[2px] h-20">
                      {(() => {
                        const last30d = subSales.daily.slice(0, 30).reverse();
                        const maxSales = Math.max(...last30d.map(d => d.saleCount), 1);
                        return last30d.map((d, i) => {
                          const heightPct = (d.saleCount / maxSales) * 100;
                          const isToday = d.date === new Date().toISOString().split('T')[0];
                          const yesterday2 = new Date(); yesterday2.setDate(yesterday2.getDate() - 1);
                          const isYesterday = d.date === yesterday2.toISOString().split('T')[0];
                          return (
                            <div key={i} className="flex-1 group relative">
                              <div className={cn('rounded-t-sm transition-all', isToday ? 'bg-purple-500' : isYesterday ? 'bg-purple-400' : 'bg-purple-200 hover:bg-purple-300')} style={{ height: `${Math.max(heightPct, 2)}%` }} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-[9px] rounded px-2 py-1 whitespace-nowrap">
                                  {d.date.slice(5)}: {d.saleCount} sales / ${Math.round(d.totalRevenue).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>30 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </Card>

          {/* ── Spekk Agency Report ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Spekk Agency Report</h3>
                  <p className="text-xs text-gray-500">Looker Studio performance data from Spekk &middot; updated weekly</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {([['report', 'Live Report'], ['data', 'Ingested Data'], ['upload', 'Upload Data']] as const).map(([id, label]) => (
                  <button key={id} onClick={() => { setSpekkTab(id); if (id === 'data' && !spekkData.length) { loadSpekkSnapshots(); loadSpekkData(); } }} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition', spekkTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {spekkTab === 'report' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-200 overflow-hidden bg-white">
                  <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between border-b border-indigo-100">
                    <span className="text-xs font-medium text-indigo-700 flex items-center gap-1.5"><ExternalLink className="h-3 w-3" /> Interactive Looker Studio Report</span>
                    <a href="https://lookerstudio.google.com/u/0/reporting/f44ca05b-9643-49e3-bd5a-79b991ece48c/page/p_57oxpw710d" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">Open in new tab <ExternalLink className="h-2.5 w-2.5" /></a>
                  </div>
                  <iframe
                    src="https://lookerstudio.google.com/embed/reporting/f44ca05b-9643-49e3-bd5a-79b991ece48c/page/p_57oxpw710d"
                    width="100%"
                    height="800"
                    style={{ border: 0 }}
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                  <p className="text-xs text-amber-800 font-medium mb-1">About this embed</p>
                  <p className="text-[11px] text-amber-700">This is a live embed of the Looker Studio report from Spekk. You can interact with pages and filters directly. If prompted to sign in, use your Google account that has access. To get data into the dashboard database for tracking, use the &quot;Upload Data&quot; tab to paste or upload CSV exports from the report.</p>
                </div>
              </div>
            )}

            {spekkTab === 'data' && (
              <div className="space-y-4">
                {/* Summary stats */}
                {spekkSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Metrics Stored</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{spekkSummary.totalMetrics.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Snapshots</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{spekkSummary.totalSnapshots}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Report Pages</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{spekkSummary.pages.length || '—'}</p>
                      {spekkSummary.pages.length > 0 && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{spekkSummary.pages.join(', ')}</p>}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Last Updated</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{spekkSummary.latestSnapshot ? new Date(spekkSummary.latestSnapshot.ingested_at).toLocaleDateString() : '—'}</p>
                      {spekkSummary.latestSnapshot && <p className="text-[10px] text-gray-400 mt-0.5">{spekkSummary.latestSnapshot.page_name}</p>}
                    </div>
                  </div>
                )}

                {/* Page filter */}
                {spekkSummary && spekkSummary.pages.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Filter by page:</span>
                    <select value={spekkSelectedPage} onChange={e => { setSpekkSelectedPage(e.target.value); loadSpekkData(e.target.value); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white">
                      <option value="">All pages</option>
                      {spekkSummary.pages.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button onClick={() => loadSpekkData()} disabled={spekkLoading} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      <RefreshCw className={cn('h-3 w-3', spekkLoading && 'animate-spin')} /> Refresh
                    </button>
                  </div>
                )}

                {/* Snapshots list */}
                {spekkSnapshots.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Recent Uploads</h4>
                    <div className="space-y-1.5">
                      {spekkSnapshots.slice(0, 8).map(s => (
                        <div key={s.id} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-800">{s.page_name || 'General'}</span>
                            <span className="text-gray-400 ml-2">{s.time_period}</span>
                            {s.summary && <p className="text-[10px] text-gray-400 truncate">{s.summary}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(Number(s.ingested_at)).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data table */}
                {spekkData.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Metric Data ({spekkData.length} rows)</h4>
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Date</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Page</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Metric</th>
                            <th className="text-right py-2 px-2 font-semibold text-gray-500">Value</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Channel</th>
                            <th className="text-left py-2 px-2 font-semibold text-gray-500">Campaign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spekkData.slice(0, 100).map((r, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-1.5 px-2 text-gray-600 tabular-nums">{(r.report_date as string || '').slice(5)}</td>
                              <td className="py-1.5 px-2 text-gray-500">{r.page_name as string || '—'}</td>
                              <td className="py-1.5 px-2 text-gray-800 font-medium">{r.metric_name as string}</td>
                              <td className="py-1.5 px-2 text-right text-gray-900 font-medium tabular-nums">{r.metric_text as string || (Number(r.metric_value) || 0).toLocaleString()}</td>
                              <td className="py-1.5 px-2 text-gray-500">{r.channel as string || '—'}</td>
                              <td className="py-1.5 px-2 text-gray-500 max-w-[150px] truncate">{r.campaign as string || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {spekkData.length > 100 && <p className="text-[10px] text-gray-400 mt-2 text-center">Showing first 100 of {spekkData.length} rows</p>}
                    </div>
                  </div>
                )}

                {spekkData.length === 0 && !spekkLoading && spekkSummary?.totalMetrics === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                    <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No data ingested yet</p>
                    <p className="text-xs text-gray-400 mt-1">Switch to the &quot;Upload Data&quot; tab to paste or upload CSV data from the Looker Studio report.</p>
                  </div>
                )}
              </div>
            )}

            {spekkTab === 'upload' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                  <p className="text-xs text-blue-800 font-medium mb-1">How to get data from the Looker Studio report</p>
                  <ol className="text-[11px] text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Open the <a href="https://lookerstudio.google.com/u/0/reporting/f44ca05b-9643-49e3-bd5a-79b991ece48c/page/p_57oxpw710d" target="_blank" rel="noopener noreferrer" className="underline font-medium">Looker Studio report</a></li>
                    <li>Right-click on any chart or table → &quot;Export to CSV&quot; or &quot;Export to Google Sheets&quot;</li>
                    <li>Open the exported file and copy all the data (Ctrl/Cmd+A, Ctrl/Cmd+C)</li>
                    <li>Come back here and paste it into the text area below, or upload the CSV directly</li>
                  </ol>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Report Page Name</label>
                    <input type="text" value={spekkPageName} onChange={e => setSpekkPageName(e.target.value)} placeholder="e.g. Overview, SEM Performance, Meta Ads..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Time Period</label>
                    <select value={spekkTimePeriod} onChange={e => setSpekkTimePeriod(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Paste area */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Paste Data (tab or comma separated)</label>
                  <textarea
                    value={spekkPasteText}
                    onChange={e => setSpekkPasteText(e.target.value)}
                    rows={8}
                    placeholder={"Metric\tValue\tChannel\nSpend\t$12,500\tGoogle Ads\nClicks\t8,432\tGoogle Ads\nConversions\t156\tGoogle Ads\n\nPaste your data here — first row should be column headers."}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono resize-vertical"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleSpekkPaste} disabled={spekkIngesting || !spekkPasteText.trim()} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition">
                    {spekkIngesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Import Pasted Data
                  </button>

                  <span className="text-gray-300">or</span>

                  <input ref={spekkFileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleSpekkCsvUpload} className="hidden" />
                  <button onClick={() => spekkFileRef.current?.click()} disabled={spekkIngesting} className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-40">
                    {spekkIngesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload CSV
                  </button>
                </div>

                {spekkIngestResult && (
                  <div className={cn('rounded-lg border px-4 py-3 text-xs', spekkIngestResult.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
                    {spekkIngestResult.startsWith('Error') ? <X className="h-3.5 w-3.5 inline mr-1" /> : <Check className="h-3.5 w-3.5 inline mr-1" />}
                    {spekkIngestResult}
                  </div>
                )}

                {/* Quick reference */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">Expected Format</h4>
                  <p className="text-[11px] text-gray-500 mb-2">The importer auto-detects tab-separated or comma-separated data. The first row should contain column headers. Recognized columns:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-[10px]">
                    {['metric / metric_name / kpi', 'value / metric_value', 'date / report_date', 'channel / source', 'campaign', 'dimension', 'period'].map(col => (
                      <span key={col} className="bg-white border border-gray-200 rounded px-2 py-1 font-mono text-gray-600">{col}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Any columns not matching these names are stored as metadata and still queryable.</p>
                </div>
              </div>
            )}
          </Card>

          {/* Goal Tracking Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const target = perfGoals?.monthlyTargets.find(t => t.month === perfMonth);
              const targetSales = target?.targetSales || 0;
              const actualSales = perfTotals?.totalSales || 0;
              const daysWithData = perfTotals?.daysWithData || 0;
              const daysInMonth = new Date(parseInt(perfMonth.slice(0, 4)), parseInt(perfMonth.slice(5, 7)), 0).getDate();
              const pace = daysWithData > 0 ? Math.round((actualSales / daysWithData) * daysInMonth) : 0;
              const pctOfGoal = targetSales > 0 ? Math.round((actualSales / targetSales) * 100) : 0;
              const avgCAC = perfTotals?.avgCostPerSale || 0;
              const targetCAC = perfGoals?.targetCAC || 200;
              const monthLabel = new Date(parseInt(perfMonth.slice(0, 4)), parseInt(perfMonth.slice(5, 7)) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

              return (
                <>
                  <Card>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Sales Progress</p>
                        <p className="text-2xl font-bold text-gray-900">{actualSales.toLocaleString()}<span className="text-sm text-gray-400 ml-1">/ {targetSales.toLocaleString()}</span></p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                      <div className={cn('h-2.5 rounded-full transition-all', pctOfGoal >= 100 ? 'bg-emerald-500' : pctOfGoal >= 70 ? 'bg-teal-500' : pctOfGoal >= 40 ? 'bg-amber-500' : 'bg-red-400')} style={{ width: `${Math.min(pctOfGoal, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{pctOfGoal}% of goal</span>
                      <span>Pace: {pace.toLocaleString()} projected</span>
                    </div>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', avgCAC <= targetCAC ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-400 to-rose-500')}>
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">CAC (All Channels)</p>
                        <p className="text-2xl font-bold text-gray-900">${avgCAC}<span className="text-sm text-gray-400 ml-1">/ ${targetCAC} goal</span></p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                      <div className={cn('h-2.5 rounded-full', avgCAC <= targetCAC ? 'bg-emerald-500' : avgCAC <= targetCAC * 1.5 ? 'bg-amber-500' : 'bg-red-400')} style={{ width: `${Math.min((targetCAC / Math.max(avgCAC, 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{avgCAC <= targetCAC ? 'On target' : `$${avgCAC - targetCAC} above target`} — SEM/Meta: ${perfTotals?.avgSemMetaCostPerSale || 0}</p>
                  </Card>

                  <Card>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">{monthLabel} Spend</p>
                        <p className="text-2xl font-bold text-gray-900">${(perfTotals?.spend || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>SEM+Social: <span className="text-gray-700 font-medium">${(perfTotals?.semPaidSocialSpend || 0).toLocaleString()}</span></div>
                      <div>Days: <span className="text-gray-700 font-medium">{daysWithData} / {daysInMonth}</span></div>
                      <div>Avg/day: <span className="text-gray-700 font-medium">{daysWithData > 0 ? Math.round(actualSales / daysWithData) : 0} sales</span></div>
                      <div>Avg spend/day: <span className="text-gray-700 font-medium">${daysWithData > 0 ? Math.round((perfTotals?.spend || 0) / daysWithData).toLocaleString() : 0}</span></div>
                    </div>
                  </Card>
                </>
              );
            })()}
          </div>

          {/* Month Selector */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const [y, m] = perfMonth.split('-').map(Number);
                  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
                  setPerfMonth(prev);
                }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold text-gray-900">
                  {new Date(parseInt(perfMonth.slice(0, 4)), parseInt(perfMonth.slice(5, 7)) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => {
                  const [y, m] = perfMonth.split('-').map(Number);
                  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
                  setPerfMonth(next);
                }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {loadingPerf && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                <span className="text-xs text-gray-400">{perfEntries.length} days loaded</span>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 w-24">Date</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500 w-20">Day</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Notes</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">All Ch. Spend</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">SEM+Social</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Sales</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Total CAC</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">SEM/Meta CAC</th>
                  </tr>
                </thead>
                <tbody>
                  {perfEntries.map(e => {
                    const cacColor = e.totalCostPerSale <= 200 ? 'bg-emerald-50 text-emerald-700' : e.totalCostPerSale <= 400 ? 'bg-amber-50 text-amber-700' : e.totalCostPerSale <= 600 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700';
                    const semCacColor = e.semMetaCostPerSale <= 200 ? 'bg-emerald-50 text-emerald-700' : e.semMetaCostPerSale <= 350 ? 'bg-amber-50 text-amber-700' : e.semMetaCostPerSale <= 500 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700';
                    const salesColor = e.totalSales >= 35 ? 'text-emerald-600 font-bold' : e.totalSales >= 25 ? 'text-teal-600 font-semibold' : e.totalSales >= 18 ? 'text-gray-700' : e.totalSales > 0 ? 'text-red-500' : 'text-gray-300';
                    return (
                      <tr key={e.date} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="py-1.5 px-2 text-gray-700 font-medium tabular-nums">{e.date.slice(5).replace('-', '/')}</td>
                        <td className="py-1.5 px-2 text-gray-500 text-xs">{e.dayOfWeek}</td>
                        <td className="py-1.5 px-2 text-gray-500 text-xs italic max-w-[200px] truncate">{e.notes || '—'}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700 tabular-nums">${e.spend.toLocaleString()}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700 tabular-nums">${e.semPaidSocialSpend.toLocaleString()}</td>
                        <td className={cn('py-1.5 px-2 text-right tabular-nums', salesColor)}>{e.totalSales || '—'}</td>
                        <td className="py-1.5 px-2 text-right"><span className={cn('inline-block px-1.5 py-0.5 rounded text-xs tabular-nums', e.totalCostPerSale > 0 ? cacColor : 'text-gray-300')}>{e.totalCostPerSale > 0 ? `$${e.totalCostPerSale.toLocaleString()}` : '—'}</span></td>
                        <td className="py-1.5 px-2 text-right"><span className={cn('inline-block px-1.5 py-0.5 rounded text-xs tabular-nums', e.semMetaCostPerSale > 0 ? semCacColor : 'text-gray-300')}>{e.semMetaCostPerSale > 0 ? `$${e.semMetaCostPerSale.toLocaleString()}` : '—'}</span></td>
                      </tr>
                    );
                  })}
                  {perfEntries.length === 0 && !loadingPerf && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400 text-sm">No data for this month. Use the seed button or add entries manually.</td></tr>
                  )}
                </tbody>
                {perfTotals && perfEntries.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-semibold">
                      <td className="py-2 px-2 text-gray-900">Totals</td>
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2" />
                      <td className="py-2 px-2 text-right text-gray-900 tabular-nums">${perfTotals.spend.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-gray-900 tabular-nums">${perfTotals.semPaidSocialSpend.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-gray-900 tabular-nums">{perfTotals.totalSales.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right"><span className={cn('inline-block px-1.5 py-0.5 rounded text-xs tabular-nums', perfTotals.avgCostPerSale <= 200 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>${perfTotals.avgCostPerSale}</span></td>
                      <td className="py-2 px-2 text-right"><span className={cn('inline-block px-1.5 py-0.5 rounded text-xs tabular-nums', perfTotals.avgSemMetaCostPerSale <= 200 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>${perfTotals.avgSemMetaCostPerSale}</span></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          {/* Monthly Goals Overview */}
          {perfGoals && (
            <Card>
              <CardHeader title="Monthly Sales Targets" subtitle="Track progress toward acquisition volume goals" />
              <div className="space-y-3">
                {perfGoals.monthlyTargets.map(t => {
                  const isActive = t.month === perfMonth;
                  const actual = isActive ? (perfTotals?.totalSales || 0) : 0;
                  const pct = t.targetSales > 0 ? Math.round((actual / t.targetSales) * 100) : 0;
                  const label = new Date(parseInt(t.month.slice(0, 4)), parseInt(t.month.slice(5, 7)) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <div key={t.month} className={cn('flex items-center gap-4 p-3 rounded-lg border', isActive ? 'border-teal-200 bg-teal-50/50' : 'border-gray-100 bg-gray-50')}>
                      <div className="min-w-[120px]">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500">Target: {t.targetSales.toLocaleString()} sales</p>
                      </div>
                      {isActive ? (
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{actual.toLocaleString()} actual</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={cn('h-2 rounded-full', pct >= 90 ? 'bg-emerald-500' : pct >= 60 ? 'bg-teal-500' : 'bg-amber-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-xs text-gray-400 italic">Switch to this month to view progress</div>
                      )}
                      <button onClick={() => setPerfMonth(t.month)} className={cn('text-xs px-3 py-1 rounded-lg border transition', isActive ? 'border-teal-300 text-teal-700 bg-teal-100' : 'border-gray-200 text-gray-500 hover:bg-gray-100')}>
                        {isActive ? 'Viewing' : 'View'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Cell Edit Modal ── */}
      {cellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setCellModal(null)}>
          <div
            className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{cellModal.areaLabel}</h3>
                <p className="text-xs text-gray-500">{cellModal.person} &middot; {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
              <button onClick={() => setCellModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <textarea
                value={cellModalDraft}
                onChange={e => setCellModalDraft(e.target.value)}
                rows={8}
                autoFocus
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400/20 resize-none leading-relaxed"
                placeholder="Enter notes for this area..."
              />

              {/* Attachments Upload */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
                      <Paperclip className="h-3.5 w-3.5 text-indigo-500" /> Attachments
                      {(cellModalFiles.length + cellModalExistingAtts.length) > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          {cellModalFiles.length + cellModalExistingAtts.length}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => cellModalFileRef.current?.click()}
                      disabled={cellModalSaving}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition disabled:opacity-50"
                    >
                      <Upload className="h-3 w-3" /> Add Files
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Images, decks, docs — processed by AI on save</p>
                  <input
                    ref={cellModalFileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.json,.html"
                    onChange={handleCellModalFileChange}
                    className="hidden"
                  />
                </div>

                {cellModalExistingAtts.length > 0 && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Previously uploaded</p>
                    <div className="space-y-1.5">
                      {cellModalExistingAtts.map(att => (
                        <div key={att.id} className="flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 rounded-md px-2.5 py-1.5">
                          {att.kind === 'image' ? <ImageIcon className="h-3 w-3 text-blue-500 shrink-0" /> : <FileText className="h-3 w-3 text-orange-500 shrink-0" />}
                          <span className="truncate font-medium">{att.fileName}</span>
                          <Check className="h-3 w-3 text-emerald-500 shrink-0 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cellModalFiles.length > 0 && (
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold text-gray-500 mb-1.5">New files to upload</p>
                    <div className="space-y-1.5">
                      {cellModalFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-700 bg-indigo-50 rounded-md px-2.5 py-1.5">
                          {f.kind === 'image' ? (
                            f.preview ? (
                              <img src={f.preview} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                            ) : (
                              <ImageIcon className="h-3 w-3 text-blue-500 shrink-0" />
                            )
                          ) : (
                            <FileText className="h-3 w-3 text-orange-500 shrink-0" />
                          )}
                          <span className="truncate font-medium">{f.file.name}</span>
                          <span className="text-[9px] text-gray-400 shrink-0">{(f.file.size / 1024).toFixed(0)}KB</span>
                          <button
                            onClick={() => removeCellModalFile(idx)}
                            disabled={cellModalSaving}
                            className="ml-auto p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cellModalFiles.length === 0 && cellModalExistingAtts.length === 0 && (
                  <button
                    type="button"
                    onClick={() => cellModalFileRef.current?.click()}
                    disabled={cellModalSaving}
                    className="w-full px-4 py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition disabled:opacity-50"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-[11px]">Drop files or click to upload</span>
                  </button>
                )}
              </div>

              {/* Create Next Step inline */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCellModalTodo(!cellModalTodo)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <Plus className="h-3.5 w-3.5 text-teal-600" /> Create Next Step for {cellModal.areaLabel}
                  </span>
                  {cellModalTodo ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                </button>

                {cellModalTodo && (
                  <div className="p-4 space-y-3 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={cellModalTodoForm.title}
                        onChange={e => setCellModalTodoForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none"
                        placeholder="What needs to happen next?"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Description (optional)</label>
                      <textarea
                        value={cellModalTodoForm.description}
                        onChange={e => setCellModalTodoForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none resize-none"
                        placeholder="Additional details..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Assignee</label>
                        <select
                          value={cellModalTodoForm.assignee}
                          onChange={e => setCellModalTodoForm(prev => ({ ...prev, assignee: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-teal-400 focus:outline-none"
                        >
                          {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Priority</label>
                        <select
                          value={cellModalTodoForm.priority}
                          onChange={e => setCellModalTodoForm(prev => ({ ...prev, priority: e.target.value as Todo['priority'] }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-teal-400 focus:outline-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-500 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={cellModalTodoForm.dueDate}
                          onChange={e => setCellModalTodoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={createTodoFromModal}
                      disabled={cellModalTodoSaving || !cellModalTodoForm.title.trim()}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition',
                        cellModalTodoSaving || !cellModalTodoForm.title.trim()
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-teal-600 text-white hover:bg-teal-500'
                      )}
                    >
                      {cellModalTodoSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add Next Step
                    </button>
                  </div>
                )}

                {cellModalTodoSuccess && (
                  <div className={cn(
                    'px-4 py-2 text-xs font-medium border-t border-gray-100',
                    cellModalTodoSuccess.startsWith('Error') ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                  )}>
                    <span className="flex items-center gap-1.5">
                      {cellModalTodoSuccess.startsWith('Error') ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      {cellModalTodoSuccess}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50">
              {cellModalProcessingStatus && (
                <div className="px-5 py-2 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border-b border-indigo-100">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {cellModalProcessingStatus}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 px-5 py-3">
                <button
                  onClick={() => { if (!cellModalSaving) setCellModal(null); }}
                  disabled={cellModalSaving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCellModal}
                  disabled={cellModalSaving}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition',
                    cellModalSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-500'
                  )}
                >
                  {cellModalSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save{cellModalFiles.length > 0 ? ` & Process ${cellModalFiles.length} file${cellModalFiles.length !== 1 ? 's' : ''}` : ''}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
