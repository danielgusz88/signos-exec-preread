'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Users, Plus, ArrowLeft, Trash2, Edit3, Star, ChevronDown, ChevronUp,
  Briefcase, Mail, Phone, Linkedin, FileText, MessageSquare, Clock,
  CheckCircle2, XCircle, MinusCircle, Search, Filter, UserPlus,
} from 'lucide-react';

const ADMINS = ['karen', 'roger', 'kate', 'sharam', 'dan'];

const STATUS_OPTIONS = [
  { value: 'screening', label: 'Screening', color: 'bg-gray-100 text-gray-700' },
  { value: 'phone_screen', label: 'Phone Screen', color: 'bg-blue-100 text-blue-700' },
  { value: 'interview', label: 'Interview', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'final_round', label: 'Final Round', color: 'bg-purple-100 text-purple-700' },
  { value: 'offer', label: 'Offer', color: 'bg-green-100 text-green-700' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-amber-100 text-amber-700' },
];

const INTERVIEW_TYPES = [
  'phone_screen', 'technical', 'behavioral', 'culture_fit', 'final', 'general',
];

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_hire', label: 'Strong Hire', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'hire', label: 'Hire', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'neutral', label: 'Neutral', icon: MinusCircle, color: 'text-gray-500' },
  { value: 'no_hire', label: 'No Hire', icon: XCircle, color: 'text-red-500' },
  { value: 'strong_no_hire', label: 'Strong No Hire', icon: XCircle, color: 'text-red-600' },
];

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role_applied: string;
  department: string;
  status: string;
  linkedin_url: string;
  resume_url: string;
  source: string;
  notes: string;
  tags: string[];
  created_by: string;
  created_at: number;
  updated_at: number;
}

interface InterviewNote {
  id: string;
  candidate_id: string;
  interviewer_name: string;
  interviewer_email: string;
  interview_type: string;
  interview_date: string;
  rating: number;
  strengths: string;
  concerns: string;
  recommendation: string;
  notes: string;
  created_at: number;
}

interface ActivityItem {
  id: string;
  candidate_id: string;
  action: string;
  detail: string;
  actor: string;
  created_at: number;
}

async function api(body: Record<string, unknown>) {
  const res = await fetch('/api/team/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${opt?.color || 'bg-gray-100 text-gray-700'}`}>
      {opt?.label || status}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          disabled={!onChange}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star className={`h-4 w-4 ${s <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

function formatDate(ts: number | string) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatInterviewType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TeamPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<InterviewNote[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showActivity, setShowActivity] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', phone: '', role_applied: '', department: '',
    status: 'screening', linkedin_url: '', resume_url: '', source: '', notes: '', tags: '',
  });

  const [noteForm, setNoteForm] = useState({
    interviewer_name: '', interview_type: 'general', interview_date: '',
    rating: 0, strengths: '', concerns: '', recommendation: 'neutral', notes: '',
  });

  const userEmail = user?.email || '';
  const isUserAdmin = ADMINS.some((a) => userEmail.toLowerCase().includes(a));

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    const res = await api({ action: 'list_candidates', userEmail });
    if (res.error) {
      if (res.error.includes('Access denied')) setAccessDenied(true);
      setLoading(false);
      return;
    }
    setCandidates(res.candidates || []);
    setLoading(false);
  }, [userEmail]);

  const loadCandidate = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await api({ action: 'get_candidate', id, userEmail });
    if (res.error) { setDetailLoading(false); return; }
    setCandidate(res.candidate);
    setNotes(res.notes || []);
    setActivity(res.activity || []);
    setDetailLoading(false);
  }, [userEmail]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  useEffect(() => {
    if (selectedId) loadCandidate(selectedId);
  }, [selectedId, loadCandidate]);

  useEffect(() => {
    if (user) {
      const firstName = user.name?.split(' ')[0] || '';
      setNoteForm((p) => ({ ...p, interviewer_name: firstName || user.name || '' }));
    }
  }, [user]);

  const handleCreateCandidate = async () => {
    if (!form.name.trim()) return;
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    const res = await api({ action: 'create_candidate', data, userEmail });
    if (res.ok) {
      setShowCreateForm(false);
      setForm({ name: '', email: '', phone: '', role_applied: '', department: '', status: 'screening', linkedin_url: '', resume_url: '', source: '', notes: '', tags: '' });
      loadCandidates();
    }
  };

  const handleUpdateCandidate = async () => {
    if (!candidate) return;
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    const res = await api({ action: 'update_candidate', id: candidate.id, data, userEmail });
    if (res.ok) {
      setEditingCandidate(false);
      loadCandidate(candidate.id);
      loadCandidates();
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('Delete this candidate and all their interview notes?')) return;
    await api({ action: 'delete_candidate', id, userEmail });
    setSelectedId(null);
    setCandidate(null);
    loadCandidates();
  };

  const handleAddNote = async () => {
    if (!candidate) return;
    const res = await api({ action: 'add_note', candidateId: candidate.id, data: noteForm, userEmail });
    if (res.ok) {
      setShowNoteForm(false);
      setNoteForm((p) => ({ ...p, interview_type: 'general', interview_date: '', rating: 0, strengths: '', concerns: '', recommendation: 'neutral', notes: '' }));
      loadCandidate(candidate.id);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this interview note?')) return;
    await api({ action: 'delete_note', id: noteId, userEmail });
    if (candidate) loadCandidate(candidate.id);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await api({ action: 'update_candidate', id, data: { status: newStatus }, userEmail });
    if (candidate?.id === id) loadCandidate(id);
    loadCandidates();
  };

  const filtered = candidates.filter((c) => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q)
        || c.role_applied.toLowerCase().includes(q)
        || c.department.toLowerCase().includes(q)
        || c.email.toLowerCase().includes(q);
    }
    return true;
  });

  const avgRating = notes.length
    ? (notes.reduce((s, n) => s + (n.rating || 0), 0) / notes.filter((n) => n.rating > 0).length) || 0
    : 0;

  if (accessDenied || !isUserAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Access Restricted</h2>
          <p className="mt-1 text-sm text-gray-500">This page is only available to admin team members.</p>
        </div>
      </div>
    );
  }

  // ── CANDIDATE DETAIL VIEW ───────────────────────────────────────────
  if (selectedId && candidate) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => { setSelectedId(null); setCandidate(null); setEditingCandidate(false); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Candidates
          </button>
          <div className="flex gap-2">
            <button onClick={() => {
              setEditingCandidate(true);
              setForm({
                name: candidate.name, email: candidate.email, phone: candidate.phone,
                role_applied: candidate.role_applied, department: candidate.department,
                status: candidate.status, linkedin_url: candidate.linkedin_url,
                resume_url: candidate.resume_url, source: candidate.source,
                notes: candidate.notes, tags: (candidate.tags || []).join(', '),
              });
            }} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => handleDeleteCandidate(candidate.id)} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Candidate Info Card */}
            {editingCandidate ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Edit Candidate</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs text-gray-500">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Role Applied</label><input value={form.role_applied} onChange={(e) => setForm({ ...form, role_applied: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className="mb-1 block text-xs text-gray-500">LinkedIn URL</label><input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Resume URL</label><input value={form.resume_url} onChange={(e) => setForm({ ...form, resume_url: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Source</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. LinkedIn, Referral" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs text-gray-500">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="engineering, senior" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div className="sm:col-span-2"><label className="mb-1 block text-xs text-gray-500">General Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setEditingCandidate(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button onClick={handleUpdateCandidate} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Save</button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">{candidate.name}</h2>
                      {statusBadge(candidate.status)}
                    </div>
                    {candidate.role_applied && <p className="mt-1 text-sm text-gray-600"><Briefcase className="mr-1 inline h-3.5 w-3.5" />{candidate.role_applied}{candidate.department ? ` — ${candidate.department}` : ''}</p>}
                  </div>
                  {notes.filter((n) => n.rating > 0).length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Avg Rating</p>
                      <div className="flex items-center gap-1.5">
                        <StarRating value={Math.round(avgRating)} />
                        <span className="text-sm font-semibold text-gray-900">{avgRating.toFixed(1)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{notes.filter((n) => n.rating > 0).length} review(s)</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {candidate.email && <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-brand-600"><Mail className="h-3.5 w-3.5" />{candidate.email}</a>}
                  {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{candidate.phone}</span>}
                  {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-600"><Linkedin className="h-3.5 w-3.5" />LinkedIn</a>}
                  {candidate.resume_url && <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-600"><FileText className="h-3.5 w-3.5" />Resume</a>}
                </div>

                {candidate.source && <p className="mt-3 text-xs text-gray-400">Source: {candidate.source}</p>}
                {candidate.notes && <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{candidate.notes}</p>}
                {candidate.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {candidate.tags.map((t) => <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{t}</span>)}
                  </div>
                )}

                {/* Quick status change */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-gray-500">Move to stage:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s.value} onClick={() => handleStatusChange(candidate.id, s.value)} disabled={candidate.status === s.value}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${candidate.status === s.value ? s.color + ' ring-2 ring-offset-1 ring-gray-300' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Interview Notes */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MessageSquare className="h-4 w-4 text-brand-500" /> Interview Notes ({notes.length})
                </h3>
                <button onClick={() => setShowNoteForm(!showNoteForm)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                  <Plus className="h-3.5 w-3.5" /> Add Note
                </button>
              </div>

              {showNoteForm && (
                <div className="border-b border-gray-100 bg-gray-50/50 p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Your Name</label>
                      <input value={noteForm.interviewer_name} onChange={(e) => setNoteForm({ ...noteForm, interviewer_name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Interview Type</label>
                      <select value={noteForm.interview_type} onChange={(e) => setNoteForm({ ...noteForm, interview_type: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                        {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{formatInterviewType(t)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Interview Date</label>
                      <input type="date" value={noteForm.interview_date} onChange={(e) => setNoteForm({ ...noteForm, interview_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Rating</label>
                      <StarRating value={noteForm.rating} onChange={(v) => setNoteForm({ ...noteForm, rating: v })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-gray-500">Strengths</label>
                      <textarea rows={2} value={noteForm.strengths} onChange={(e) => setNoteForm({ ...noteForm, strengths: e.target.value })} placeholder="What stood out positively?" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-gray-500">Concerns</label>
                      <textarea rows={2} value={noteForm.concerns} onChange={(e) => setNoteForm({ ...noteForm, concerns: e.target.value })} placeholder="Any red flags or areas of concern?" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-gray-500">Additional Notes</label>
                      <textarea rows={3} value={noteForm.notes} onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })} placeholder="General observations, questions asked, etc." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs text-gray-500">Recommendation</label>
                      <div className="flex flex-wrap gap-2">
                        {RECOMMENDATION_OPTIONS.map((r) => (
                          <button key={r.value} onClick={() => setNoteForm({ ...noteForm, recommendation: r.value })}
                            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${noteForm.recommendation === r.value ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <r.icon className={`h-3.5 w-3.5 ${r.color}`} /> {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setShowNoteForm(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button onClick={handleAddNote} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Submit Note</button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {notes.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">No interview notes yet. Be the first to add one.</div>
                ) : (
                  notes.map((note) => {
                    const rec = RECOMMENDATION_OPTIONS.find((r) => r.value === note.recommendation);
                    const isExpanded = expandedNotes.has(note.id);
                    return (
                      <div key={note.id} className="px-6 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                              {note.interviewer_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{note.interviewer_name}</span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{formatInterviewType(note.interview_type)}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                {note.interview_date && <span>{formatDate(note.interview_date)}</span>}
                                {note.rating > 0 && <StarRating value={note.rating} />}
                                {rec && (
                                  <span className={`flex items-center gap-0.5 ${rec.color}`}>
                                    <rec.icon className="h-3 w-3" /> {rec.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { const s = new Set(expandedNotes); isExpanded ? s.delete(note.id) : s.add(note.id); setExpandedNotes(s); }}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100">
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 ml-11 space-y-2 text-sm">
                            {note.strengths && <div><span className="font-medium text-green-700">Strengths:</span> <span className="text-gray-600">{note.strengths}</span></div>}
                            {note.concerns && <div><span className="font-medium text-red-600">Concerns:</span> <span className="text-gray-600">{note.concerns}</span></div>}
                            {note.notes && <div className="text-gray-600 whitespace-pre-wrap">{note.notes}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <button onClick={() => setShowActivity(!showActivity)} className="flex w-full items-center justify-between px-6 py-4 text-left">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Clock className="h-4 w-4 text-gray-400" /> Activity Log ({activity.length})
                </h3>
                {showActivity ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showActivity && (
                <div className="border-t border-gray-100 divide-y divide-gray-50 max-h-60 overflow-y-auto">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-6 py-2.5 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="text-gray-500">{a.detail}</span>
                      <span className="ml-auto text-gray-400 whitespace-nowrap">{formatDate(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── CANDIDATE LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team &amp; Hiring</h1>
        <p className="mt-1 text-sm text-gray-500">Manage candidates and interview feedback. Admin access only.</p>
      </div>

      {/* Stats */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: candidates.length, color: 'text-gray-900' },
            { label: 'In Pipeline', value: candidates.filter((c) => !['hired', 'rejected', 'withdrawn'].includes(c.status)).length, color: 'text-brand-600' },
            { label: 'Offers', value: candidates.filter((c) => c.status === 'offer').length, color: 'text-green-600' },
            { label: 'Hired', value: candidates.filter((c) => c.status === 'hired').length, color: 'text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search candidates..." className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 pl-9 pr-8 py-2 text-sm appearance-none bg-white">
              <option value="">All Stages</option>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-sm">
          <UserPlus className="h-4 w-4" /> Add Candidate
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">New Candidate</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs text-gray-500">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Role Applied For</label><input value={form.role_applied} onChange={(e) => setForm({ ...form, role_applied: e.target.value })} placeholder="e.g. Senior Engineer" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering, Marketing" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Source</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. LinkedIn, Referral" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">LinkedIn URL</label><input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Resume URL</label><input value={form.resume_url} onChange={(e) => setForm({ ...form, resume_url: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div><label className="mb-1 block text-xs text-gray-500">Tags (comma separated)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="engineering, senior, remote" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Initial Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="mb-1 block text-xs text-gray-500">Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={handleCreateCandidate} disabled={!form.name.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Create Candidate</button>
          </div>
        </div>
      )}

      {/* Candidate List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Users className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">{candidates.length === 0 ? 'No candidates yet' : 'No matches'}</p>
          <p className="mt-1 text-xs text-gray-500">{candidates.length === 0 ? 'Add your first candidate to get started.' : 'Try adjusting your search or filters.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {c.role_applied || 'No role specified'}{c.department ? ` — ${c.department}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-gray-400">Updated {formatDate(c.updated_at)}</p>
                  {c.source && <p className="text-[10px] text-gray-400">via {c.source}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
