'use client';

import { cn } from '@/lib/utils';
import {
  FileText, Loader2, Check, Upload, Clock, AlertTriangle,
  CheckCircle2, RefreshCw, Eye, Send, LogIn, BookOpen, PenTool,
  LinkIcon, FileUp, File,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import mammoth from 'mammoth';

interface Writer {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

interface BlogPost {
  id: string;
  title: string;
  brief: string;
  status: string;
  deadline: string | null;
  draft_content: string;
  human_notes: string;
  seo_keywords: string;
  target_word_count: number;
  category: string;
  revision_history: { content: string; notes: string; timestamp: number; by: string }[];
}

async function blogStore(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/blog-hub/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', description: 'Ready for you to write' },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-700', description: 'Under review by the team' },
  review: { label: 'In Review', color: 'bg-purple-100 text-purple-700', description: 'Being reviewed by the editor' },
  revision: { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700', description: 'Please review the feedback and resubmit' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', description: 'Great work — your post is approved!' },
  published: { label: 'Published', color: 'bg-brand-100 text-brand-700', description: 'Live on the Signos blog' },
};

const CATEGORIES = ['Health & Wellness', 'Weight Loss', 'Metabolic Health', 'GLP-1', 'CGM', 'Nutrition', 'Fitness', 'Research', 'Lifestyle', 'Product'];

export default function BlogSubmitPage() {
  const [token, setToken] = useState('');
  const [writer, setWriter] = useState<Writer | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Open submission mode
  const [openMode, setOpenMode] = useState(false);
  const [osName, setOsName] = useState('');
  const [osEmail, setOsEmail] = useState('');
  const [osBio, setOsBio] = useState('');
  const [osTitle, setOsTitle] = useState('');
  const [osCategory, setOsCategory] = useState('');
  const [osKeywords, setOsKeywords] = useState('');
  const [osContent, setOsContent] = useState('');
  const [osSubmitting, setOsSubmitting] = useState(false);
  const [osSuccess, setOsSuccess] = useState(false);
  const [osError, setOsError] = useState('');
  const [osGoogleDocsUrl, setOsGoogleDocsUrl] = useState('');

  // File upload state (shared)
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');

  // Google Docs URL for authenticated writer
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('open') === '1') {
      setOpenMode(true);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      handleAuth(urlToken);
    }
    const stored = localStorage.getItem('blog_writer_token');
    if (stored && !urlToken) {
      setToken(stored);
      handleAuth(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = useCallback(async (authToken?: string) => {
    const t = authToken || token;
    if (!t.trim()) return;
    setLoading(true);
    setAuthError('');
    const res = await blogStore('auth_writer', { token: t });
    if (res.ok) {
      setWriter(res.writer as Writer);
      localStorage.setItem('blog_writer_token', t);
      window.history.replaceState({}, '', window.location.pathname);
      const postsRes = await blogStore('writer_posts', { writerId: res.writer.id });
      if (postsRes.ok) {
        const parsed = (postsRes.posts || []).map((p: BlogPost) => ({
          ...p,
          revision_history: typeof p.revision_history === 'string' ? JSON.parse(p.revision_history) : (p.revision_history || []),
        }));
        setPosts(parsed);
      }
    } else {
      setAuthError(res.error || 'Invalid token');
    }
    setLoading(false);
  }, [token]);

  const logout = useCallback(() => {
    setWriter(null);
    setPosts([]);
    setToken('');
    setSelectedPost(null);
    localStorage.removeItem('blog_writer_token');
  }, []);

  const openPost = useCallback((post: BlogPost) => {
    setSelectedPost(post);
    setDraftContent(post.draft_content || '');
    setSubmitSuccess(false);
  }, []);

  const handleSubmitDraft = useCallback(async () => {
    const hasContent = draftContent.trim() || googleDocsUrl.trim();
    if (!selectedPost || !writer || !hasContent) return;
    setSubmitting(true);

    let finalContent = draftContent;
    if (googleDocsUrl.trim()) {
      const docsHeader = `📄 Google Docs: ${googleDocsUrl.trim()}\n\n---\n\n`;
      finalContent = docsHeader + finalContent;
    }

    const res = await blogStore('submit_draft', {
      postId: selectedPost.id,
      writerId: writer.id,
      content: finalContent,
    });
    if (res.ok) {
      setSubmitSuccess(true);
      setSelectedPost({ ...selectedPost, draft_content: finalContent, status: 'submitted' });
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, draft_content: finalContent, status: 'submitted' } : p));
    }
    setSubmitting(false);
  }, [selectedPost, writer, draftContent, googleDocsUrl]);

  const handleOpenSubmit = useCallback(async () => {
    const hasContent = osContent.trim() || osGoogleDocsUrl.trim();
    if (!osName.trim() || !osTitle.trim() || !hasContent) {
      setOsError('Name, title, and content (or a Google Docs link) are required');
      return;
    }
    setOsSubmitting(true);
    setOsError('');

    let finalContent = osContent;
    if (osGoogleDocsUrl.trim()) {
      const docsHeader = `📄 Google Docs: ${osGoogleDocsUrl.trim()}\n\n---\n\n`;
      finalContent = docsHeader + finalContent;
    }

    const res = await blogStore('open_submit', {
      writerName: osName,
      writerEmail: osEmail,
      writerBio: osBio,
      title: osTitle,
      category: osCategory,
      content: finalContent,
      seoKeywords: osKeywords,
    });
    if (res.ok) {
      setOsSuccess(true);
    } else {
      setOsError(res.error || 'Submission failed');
    }
    setOsSubmitting(false);
  }, [osName, osEmail, osBio, osTitle, osCategory, osContent, osKeywords, osGoogleDocsUrl]);

  const parseFile = useCallback(async (file: globalThis.File, target: 'open' | 'draft') => {
    setFileLoading(true);
    setFileError('');
    setFileName(file.name);

    try {
      const ext = file.name.toLowerCase().split('.').pop() || '';

      if (ext === 'txt' || ext === 'md') {
        const text = await file.text();
        if (target === 'open') setOsContent(text);
        else setDraftContent(text);
      } else if (ext === 'docx' || ext === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (target === 'open') setOsContent(result.value);
        else setDraftContent(result.value);
      } else {
        setFileError('Unsupported file type. Please upload .docx, .doc, .txt, or .md files.');
      }
    } catch {
      setFileError('Failed to read file. Please try pasting your content directly.');
    }
    setFileLoading(false);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent, target: 'open' | 'draft') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file, target);
  }, [parseFile]);

  const osWordCount = osContent.split(/\s+/).filter(Boolean).length;
  const wordCount = draftContent.split(/\s+/).filter(Boolean).length;

  // ─── Open Submission Mode ────────────────────────────────────────────
  if (openMode && !writer) {
    if (osSuccess) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50/30 p-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Submission Received!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Thank you for your submission. The Signos editorial team will review your writing and get back to you.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => { setOsSuccess(false); setOsTitle(''); setOsContent(''); setOsCategory(''); setOsKeywords(''); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Submit Another
              </button>
              <button
                onClick={() => setOpenMode(false)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Already have a token? Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <PenTool className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Signos — Submit Your Writing</h1>
                <p className="text-[10px] text-gray-500">Share your blog post with the Signos editorial team</p>
              </div>
            </div>
            <button
              onClick={() => setOpenMode(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
            >
              Already have a token?
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-8">
          {osError && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-600">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {osError}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* About you */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">About You</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Full Name *</label>
                  <input
                    value={osName}
                    onChange={e => setOsName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
                  <input
                    value={osEmail}
                    onChange={e => setOsEmail(e.target.value)}
                    type="email"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-gray-700">Bio / Expertise</label>
                <input
                  value={osBio}
                  onChange={e => setOsBio(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Health & wellness writer with 5 years of experience..."
                />
              </div>
            </div>

            {/* Article details */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Article Details</h2>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Article Title *</label>
                <input
                  value={osTitle}
                  onChange={e => setOsTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="10 Ways CGMs Can Transform Your Weight Loss Journey"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Category</label>
                  <select
                    value={osCategory}
                    onChange={e => setOsCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">SEO Keywords</label>
                  <input
                    value={osKeywords}
                    onChange={e => setOsKeywords(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="CGM, weight loss, glucose..."
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-900">Your Article *</label>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div onDragOver={e => e.preventDefault()} onDrop={e => handleFileDrop(e, 'open')} className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
                  <FileUp className="mx-auto h-5 w-5 text-gray-400 mb-1.5" />
                  <p className="text-xs font-medium text-gray-700">Upload a document</p>
                  <p className="text-[10px] text-gray-400 mb-2">.docx, .doc, .txt, or .md</p>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition">
                    <Upload className="h-3 w-3" /> {fileLoading ? 'Reading...' : 'Choose File'}
                    <input type="file" accept=".docx,.doc,.txt,.md" className="hidden" disabled={fileLoading} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f, 'open'); e.target.value = ''; }} />
                  </label>
                  {fileName && !fileError && <p className="mt-1.5 text-[10px] text-emerald-600 truncate"><File className="inline h-3 w-3 mr-0.5" />{fileName}</p>}
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5"><LinkIcon className="h-4 w-4 text-blue-500" /><p className="text-xs font-medium text-gray-700">Google Docs Link</p></div>
                  <p className="text-[10px] text-gray-400 mb-2">Paste a link to your Google Doc</p>
                  <input value={osGoogleDocsUrl} onChange={e => setOsGoogleDocsUrl(e.target.value)} placeholder="https://docs.google.com/document/d/..." className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none" />
                </div>
              </div>
              {fileError && (<div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {fileError}</div>)}
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500">Or write / paste content directly</label>
                <span className={cn('text-[10px] font-medium', osWordCount >= 800 ? 'text-emerald-600' : osWordCount >= 500 ? 'text-amber-600' : 'text-gray-400')}>{osWordCount} words</span>
              </div>
              <textarea
                value={osContent}
                onChange={e => setOsContent(e.target.value)}
                rows={16}
                placeholder="Paste or write your blog post here, or use upload / link above..."
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 leading-relaxed placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-serif"
              />

              <button
                onClick={handleOpenSubmit}
                disabled={osSubmitting || !osName.trim() || !osTitle.trim() || (!osContent.trim() && !osGoogleDocsUrl.trim())}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition"
              >
                {osSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="h-4 w-4" /> Submit Writing</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Not authenticated ────────────────────────────────────────────────
  if (!writer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30 p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Signos Writer Portal</h1>
            <p className="mt-1 text-sm text-gray-500">Submit and manage your blog post drafts</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-xs font-medium text-gray-700">Your Writer Token</label>
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="Paste your unique token here..."
              className="mb-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            {authError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {authError}
              </div>
            )}
            <button
              onClick={() => handleAuth()}
              disabled={loading || !token.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign In
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <button
              onClick={() => setOpenMode(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <PenTool className="h-4 w-4" />
              Submit New Writing (No Token Needed)
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-gray-400">
            Have a token? Enter it above. Want to submit new writing? Use the button above.
          </p>
        </div>
      </div>
    );
  }

  // ─── Authenticated ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Signos Writer Portal</h1>
              <p className="text-[10px] text-gray-500">Welcome, {writer.name}</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
            Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Post list */}
        {!selectedPost && (
          <div>
            <h2 className="mb-4 text-sm font-bold text-gray-900">Your Assignments ({posts.length})</h2>
            {posts.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No assignments yet</p>
                <p className="mt-1 text-xs text-gray-400">New assignments will appear here when the Signos team assigns you a post.</p>
              </div>
            )}
            <div className="space-y-3">
              {posts.map(post => {
                const sc = STATUS_LABELS[post.status] || STATUS_LABELS.assigned;
                const needsAction = post.status === 'assigned' || post.status === 'revision';
                return (
                  <button
                    key={post.id}
                    onClick={() => openPost(post)}
                    className={cn(
                      'w-full text-left rounded-xl border bg-white p-5 transition hover:shadow-md',
                      needsAction ? 'border-brand-200 ring-1 ring-brand-100' : 'border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', sc.color)}>
                            {sc.label}
                          </span>
                          {needsAction && (
                            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                              Action needed
                            </span>
                          )}
                          {post.category && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{post.category}</span>}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{post.title}</h3>
                        {post.brief && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{post.brief}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-4">
                        {post.deadline && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="h-2.5 w-2.5" /> Due: {post.deadline}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">{post.target_word_count} words target</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Post detail / submission */}
        {selectedPost && (
          <div>
            <button onClick={() => { setSelectedPost(null); setSubmitSuccess(false); }} className="mb-4 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              &larr; Back to assignments
            </button>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Post header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  {(() => { const sc = STATUS_LABELS[selectedPost.status] || STATUS_LABELS.assigned; return <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', sc.color)}>{sc.label}</span>; })()}
                  {selectedPost.category && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{selectedPost.category}</span>}
                </div>
                <h2 className="text-lg font-bold text-gray-900">{selectedPost.title}</h2>
                {(() => { const sc = STATUS_LABELS[selectedPost.status]; return sc ? <p className="mt-1 text-xs text-gray-500">{sc.description}</p> : null; })()}
              </div>

              <div className="p-6 space-y-5">
                {/* Brief */}
                {selectedPost.brief && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Brief / Instructions</label>
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedPost.brief}
                    </div>
                  </div>
                )}

                {/* Guidelines */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <span className="text-[10px] font-medium uppercase text-gray-400">Target</span>
                    <p className="text-xs font-semibold text-gray-900">{selectedPost.target_word_count} words</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <span className="text-[10px] font-medium uppercase text-gray-400">Deadline</span>
                    <p className="text-xs font-semibold text-gray-900">{selectedPost.deadline || 'No deadline'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <span className="text-[10px] font-medium uppercase text-gray-400">Category</span>
                    <p className="text-xs font-semibold text-gray-900">{selectedPost.category || 'General'}</p>
                  </div>
                </div>

                {/* SEO Keywords */}
                {selectedPost.seo_keywords && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">SEO Keywords to Include</label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPost.seo_keywords.split(',').map((k, i) => (
                        <span key={i} className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-medium text-blue-700">{k.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revision feedback */}
                {selectedPost.status === 'revision' && selectedPost.human_notes && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-700">Revision Requested</span>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{selectedPost.human_notes}</p>
                  </div>
                )}

                {/* Draft submission area */}
                {(selectedPost.status === 'assigned' || selectedPost.status === 'revision') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-700">
                        {selectedPost.status === 'revision' ? 'Revised Draft' : 'Your Draft'}
                      </label>
                    </div>

                    {/* Upload / Google Docs options */}
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div onDragOver={e => e.preventDefault()} onDrop={e => handleFileDrop(e, 'draft')} className="rounded-lg border-2 border-dashed border-gray-200 p-3 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
                        <FileUp className="mx-auto h-4 w-4 text-gray-400 mb-1" />
                        <p className="text-[11px] font-medium text-gray-700">Upload document</p>
                        <p className="text-[10px] text-gray-400 mb-1.5">.docx, .doc, .txt, .md</p>
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition">
                          <Upload className="h-2.5 w-2.5" /> {fileLoading ? 'Reading...' : 'Choose File'}
                          <input type="file" accept=".docx,.doc,.txt,.md" className="hidden" disabled={fileLoading} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f, 'draft'); e.target.value = ''; }} />
                        </label>
                        {fileName && !fileError && <p className="mt-1 text-[10px] text-emerald-600 truncate"><File className="inline h-2.5 w-2.5 mr-0.5" />{fileName}</p>}
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-1"><LinkIcon className="h-3.5 w-3.5 text-blue-500" /><p className="text-[11px] font-medium text-gray-700">Google Docs Link</p></div>
                        <p className="text-[10px] text-gray-400 mb-1.5">Paste a link to your Google Doc</p>
                        <input value={googleDocsUrl} onChange={e => setGoogleDocsUrl(e.target.value)} placeholder="https://docs.google.com/document/d/..." className="w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] focus:border-brand-500 focus:outline-none" />
                      </div>
                    </div>
                    {fileError && (<div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {fileError}</div>)}

                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-medium text-gray-500">Or write / paste directly</label>
                      <span className={cn('text-[10px] font-medium', wordCount >= selectedPost.target_word_count ? 'text-emerald-600' : wordCount >= selectedPost.target_word_count * 0.8 ? 'text-amber-600' : 'text-gray-400')}>
                        {wordCount} / {selectedPost.target_word_count} words
                      </span>
                    </div>
                    <textarea
                      value={draftContent}
                      onChange={e => setDraftContent(e.target.value)}
                      rows={16}
                      placeholder="Paste or write your blog post here, or use upload / link above..."
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 leading-relaxed placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-serif"
                    />

                    {submitSuccess ? (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">Draft submitted!</p>
                          <p className="text-xs text-emerald-600">The Signos team will review your submission and get back to you.</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubmitDraft}
                        disabled={submitting || (!draftContent.trim() && !googleDocsUrl.trim())}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                      >
                        {submitting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                          <><Send className="h-4 w-4" /> Submit Draft</>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* View submitted draft (read-only) */}
                {selectedPost.draft_content && selectedPost.status !== 'assigned' && selectedPost.status !== 'revision' && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Your Submitted Draft ({selectedPost.draft_content.split(/\s+/).filter(Boolean).length} words)
                    </label>
                    <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                      {selectedPost.draft_content}
                    </div>
                  </div>
                )}

                {/* Revision history */}
                {selectedPost.revision_history?.length > 0 && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-700">Revision History</label>
                    <div className="space-y-2">
                      {selectedPost.revision_history.map((rev, i) => (
                        <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-gray-500">Round {i + 1}</span>
                            <span className="text-[10px] text-gray-400">{new Date(rev.timestamp).toLocaleDateString()}</span>
                          </div>
                          {rev.notes && <p className="text-[11px] text-orange-600 italic">&ldquo;{rev.notes}&rdquo;</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
