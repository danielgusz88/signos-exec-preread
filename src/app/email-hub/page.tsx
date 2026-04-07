'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, Copy, Check, MessageSquare, Sparkles, Eye, Code,
  ChevronDown, Save, FolderOpen, Trash2, ImagePlus, Monitor,
  Smartphone, Sun, Moon, X, ArrowLeft, RotateCcw, Upload, Link2,
  Palette, FileText, Pencil, PencilOff, Users, UserX,
} from 'lucide-react';

type ViewMode = 'preview' | 'code';
type DeviceMode = 'desktop' | 'mobile';
type ColorMode = 'light' | 'dark';
type EditMessage = { role: 'user' | 'system'; text: string };
type Draft = { id: string; title: string; theme: string; audience: string; updated_at: number };
type Phase = 'input' | 'generating' | 'options' | 'refining';
type ReviewStatus = 'pending' | 'reviewing' | 'done' | 'error';
type EmailOption = { id: string; html: string; summary: string; reviewStatus: ReviewStatus; audience: string };

export default function EmailHubPage() {
  const [phase, setPhase] = useState<Phase>('input');

  const [concept, setConcept] = useState('');
  const [details, setDetails] = useState('');
  const [audience, setAudience] = useState('both');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [contextDocuments, setContextDocuments] = useState('');
  const [contextLinks, setContextLinks] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePlacement, setImagePlacement] = useState('hero section');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showCreativePanel, setShowCreativePanel] = useState(false);

  const [options, setOptions] = useState<EmailOption[]>([]);
  const [selectedHtml, setSelectedHtml] = useState('');
  const [codeViewOption, setCodeViewOption] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editHistory, setEditHistory] = useState<EditMessage[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [copied, setCopied] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);

  const [draftId, setDraftId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const editScrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drafts ──────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-drafts' }),
      });
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const handleSave = async () => {
    if (!selectedHtml) return;
    setSaving(true);
    try {
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-draft',
          id: draftId || undefined,
          title: draftTitle || concept || 'Untitled',
          theme: concept, details, audience, html: selectedHtml,
        }),
      });
      const data = await res.json();
      if (data.id) setDraftId(data.id);
      loadDrafts();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleLoadDraft = async (id: string) => {
    const res = await fetch('/api/email-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'load-draft', id }),
    });
    const data = await res.json();
    if (data.draft) {
      setConcept(data.draft.theme || '');
      setDetails(data.draft.details || '');
      setAudience(data.draft.audience || 'both');
      setSelectedHtml(data.draft.html || '');
      setDraftId(data.draft.id);
      setDraftTitle(data.draft.title || '');
      setEditHistory([{ role: 'system', text: `Loaded "${data.draft.title}"` }]);
      setPhase('refining');
    }
    setShowDrafts(false);
  };

  const handleDeleteDraft = async (id: string) => {
    await fetch('/api/email-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-draft', id }),
    });
    loadDrafts();
  };

  // ── File upload ─────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: { name: string; content: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        newFiles.push({ name: file.name, content: text.slice(0, 15000) });
      } catch { /* skip binary files */ }
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
    const combined = [...uploadedFiles, ...newFiles].map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n');
    setContextDocuments(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (name: string) => {
    const updated = uploadedFiles.filter(f => f.name !== name);
    setUploadedFiles(updated);
    setContextDocuments(updated.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n'));
  };

  // ── Generate options ────────────────────────────────────

  const reviewEmail = async (optionId: string, rawHtml: string) => {
    try {
      setOptions(prev => prev.map(o => o.id === optionId ? { ...o, reviewStatus: 'reviewing' as ReviewStatus } : o));
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review-option', html: rawHtml }),
      });
      if (!res.ok) {
        setOptions(prev => prev.map(o => o.id === optionId ? { ...o, reviewStatus: 'error' as ReviewStatus } : o));
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let reviewed = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reviewed += decoder.decode(value, { stream: true });
        }
      }
      if (reviewed.startsWith('```')) reviewed = reviewed.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      if (reviewed.trim() && reviewed.includes('<html')) {
        setOptions(prev => prev.map(o => o.id === optionId ? { ...o, html: reviewed, reviewStatus: 'done' as ReviewStatus } : o));
      } else {
        setOptions(prev => prev.map(o => o.id === optionId ? { ...o, reviewStatus: 'done' as ReviewStatus } : o));
      }
    } catch {
      setOptions(prev => prev.map(o => o.id === optionId ? { ...o, reviewStatus: 'error' as ReviewStatus } : o));
    }
  };

  const handleGenerateOptions = async () => {
    if (!concept.trim()) return;
    setPhase('generating');
    setError('');
    setOptions([]);
    setCodeViewOption(null);

    const basePayload: Record<string, string> = {
      action: 'generate-option',
      theme: concept,
      details,
      creativeDirection,
      contextDocuments,
      contextLinks,
    };
    if (imageUrl) {
      basePayload.imageUrl = imageUrl;
      basePayload.imagePlacement = imagePlacement;
    }

    type GenSpec = { id: string; audience: string; variationId: string; label: string };
    let specs: GenSpec[] = [];

    if (audience === 'both') {
      specs = [
        { id: 'members-a', audience: 'members', variationId: 'a', label: 'Members' },
        { id: 'nonmembers-a', audience: 'non-members', variationId: 'a', label: 'Non-Members' },
      ];
    } else {
      specs = [
        { id: `${audience}-a`, audience, variationId: 'a', label: `${audience === 'members' ? 'Members' : 'Non-Members'} — Bold` },
        { id: `${audience}-b`, audience, variationId: 'b', label: `${audience === 'members' ? 'Members' : 'Non-Members'} — Educational` },
      ];
    }

    let arrived = 0;
    const errors: string[] = [];

    const promises = specs.map(async (spec) => {
      const t0 = Date.now();
      try {
        const res = await fetch('/api/email-hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, audience: spec.audience, variationId: spec.variationId }),
        });
        if (!res.ok) {
          const text = await res.text();
          errors.push(`${spec.label}: HTTP ${res.status} — ${text.slice(0, 200)}`);
          return;
        }
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let html = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
          }
        }
        if (html.startsWith('```')) html = html.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
        if (!html.trim()) {
          errors.push(`${spec.label}: Empty response after ${Date.now() - t0}ms`);
          return;
        }

        arrived++;
        const newOption: EmailOption = {
          id: spec.id,
          html,
          summary: spec.label,
          reviewStatus: 'done',
          audience: spec.audience,
        };
        setOptions(prev => [...prev, newOption]);
        if (arrived >= 1) setPhase('options');
      } catch (e: unknown) {
        errors.push(`${spec.label}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    });

    await Promise.all(promises);
    if (arrived === 0) {
      setError(errors.join('\n\n') || 'All generations failed.');
      setPhase('input');
    }
  };

  // ── Option selection ────────────────────────────────────

  const handleSelectOption = (opt: EmailOption) => {
    setSelectedHtml(opt.html);
    setDraftTitle(concept);
    setEditHistory([{ role: 'system', text: `Selected "${opt.summary}". Request refinements below or edit text directly.` }]);
    setEditInput('');
    setPhase('refining');
  };

  const handleBackToOptions = () => {
    setPhase('options');
    setEditHistory([]);
    setEditInput('');
    setInlineEditMode(false);
  };

  const handleBackToInput = () => {
    setPhase('input');
    setError('');
  };

  // ── Inline text editing ─────────────────────────────────

  const enableInlineEdit = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    setInlineEditMode(true);
    const editableSelectors = 'p, h1, h2, h3, h4, li, span, a, td';
    doc.querySelectorAll(editableSelectors).forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.children.length === 0 || (htmlEl.children.length > 0 && htmlEl.innerText.trim().length > 0 && htmlEl.closest('table[role="presentation"]'))) {
        if (htmlEl.innerText.trim().length > 0 && htmlEl.tagName !== 'TD') {
          htmlEl.contentEditable = 'true';
          htmlEl.style.outline = '1px dashed #3b88ff';
          htmlEl.style.outlineOffset = '2px';
          htmlEl.style.cursor = 'text';
        }
      }
    });
  };

  const disableInlineEdit = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.contentEditable = 'false';
      htmlEl.style.outline = '';
      htmlEl.style.outlineOffset = '';
      htmlEl.style.cursor = '';
    });
    setInlineEditMode(false);
  };

  const saveInlineEdits = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.contentEditable = 'false';
      htmlEl.style.outline = '';
      htmlEl.style.outlineOffset = '';
      htmlEl.style.cursor = '';
    });
    const updatedHtml = '<!doctype html>\n' + doc.documentElement.outerHTML;
    setSelectedHtml(updatedHtml);
    setInlineEditMode(false);
    setEditHistory(h => [...h, { role: 'system', text: 'Inline edits saved.' }]);
  };

  // ── AI edit (chat) ──────────────────────────────────────

  const streamResponse = async (payload: Record<string, string>) => {
    const res = await fetch('/api/email-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text();
      try { const j = JSON.parse(t); throw new Error(j.error); }
      catch (e) { if (e instanceof Error && e.message) throw e; throw new Error('Request failed'); }
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      return j.html || '';
    }
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = '';
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setSelectedHtml(result);
      }
    }
    return result;
  };

  const handleEdit = async () => {
    if (!editInput.trim() || !selectedHtml) return;
    const instruction = editInput.trim();
    setEditInput('');
    setEditing(true);
    setEditHistory(h => [...h, { role: 'user', text: instruction }]);
    try {
      const payload: Record<string, string> = {
        action: 'edit',
        currentHtml: selectedHtml,
        editInstructions: instruction,
      };
      const result = await streamResponse(payload);
      let clean = result;
      if (clean.startsWith('```')) clean = clean.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setSelectedHtml(clean);
      setEditHistory(h => [...h, { role: 'system', text: 'Edit applied.' }]);
    } catch (e: unknown) {
      setEditHistory(h => [...h, { role: 'system', text: `Error: ${e instanceof Error ? e.message : 'failed'}` }]);
    }
    setEditing(false);
    setTimeout(() => editScrollRef.current?.scrollTo({ top: editScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Dark-mode preview ───────────────────────────────────

  const getPreviewHtml = (html: string) => {
    if (colorMode !== 'dark') return html;
    return html
      .replace(/<body/i, '<body data-ogsc="true" ')
      .replace(
        /<\/style>/i,
        `
.logo-light,.hex-light { display: none !important; max-height: 0 !important; overflow: hidden !important; }
.logo-dark,.hex-dark { display: block !important; max-height: none !important; overflow: visible !important; }
body,.wrapper,.bg-pebble-lt { background-color: #21263a !important; }
.card,.bg-white { background-color: #2a3050 !important; }
.h1,.h3,.h3-section,.body-copy,.body-sm { color: #f5f6f7 !important; }
.exp-tag { color: #8097b5 !important; border-color: #465b7a !important; }
.list-item { color: #f5f6f7 !important; }
</style>`,
      );
  };

  // ── Shared UI ───────────────────────────────────────────

  const draftsDropdown = showDrafts && drafts.length > 0 && (
    <div className="border-b border-gray-200 bg-white px-6 py-2">
      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {drafts.map(d => (
          <div key={d.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
            <button onClick={() => handleLoadDraft(d.id)} className="text-xs font-medium text-gray-800 truncate flex-1 text-left">{d.title}</button>
            <button onClick={() => handleDeleteDraft(d.id)} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const savedEmailsBtn = (
    <button
      onClick={() => { setShowDrafts(!showDrafts); loadDrafts(); }}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      <FolderOpen className="h-3.5 w-3.5" /> Saved ({drafts.length})
    </button>
  );

  // ═══════════════════════════════════════════════════════
  //  PHASE: INPUT / GENERATING
  // ═══════════════════════════════════════════════════════

  if (phase === 'input' || phase === 'generating') {
    const isGenerating = phase === 'generating';

    return (
      <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Email Hub</h1>
            <p className="text-xs text-gray-500">Generate Iterable-ready Signos HTML emails</p>
          </div>
          {savedEmailsBtn}
        </div>

        {draftsDropdown}

        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                  <Sparkles className="h-6 w-6 text-brand-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Create Email Campaign</h2>
                <p className="mt-1 text-sm text-gray-500">Describe your email and we&apos;ll generate options for Members &amp; Non-Members</p>
              </div>

              <div className="space-y-4">
                {/* Concept */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Email Concept</label>
                  <input
                    value={concept}
                    onChange={e => setConcept(e.target.value)}
                    placeholder="e.g., GLP-1 Graduation Program, Sleep & Glucose Tips"
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>

                {/* Details */}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Details &amp; Instructions</label>
                  <textarea
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    placeholder="Key messages, specific content to include, target outcomes..."
                    rows={3}
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none disabled:opacity-60"
                  />
                </div>

                {/* Audience + action buttons */}
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Audience</label>
                    <div className="relative">
                      <select
                        value={audience}
                        onChange={e => setAudience(e.target.value)}
                        disabled={isGenerating}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-8 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
                      >
                        <option value="both">Both (Members &amp; Non-Members)</option>
                        <option value="members">Members Only</option>
                        <option value="non-members">Non-Members Only</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-5">
                    <button
                      onClick={() => setShowCreativePanel(!showCreativePanel)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        showCreativePanel || creativeDirection ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-60`}
                    >
                      <Palette className="h-3.5 w-3.5" /> Creative
                    </button>
                    <button
                      onClick={() => setShowContextPanel(!showContextPanel)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        showContextPanel || contextDocuments || contextLinks ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-60`}
                    >
                      <FileText className="h-3.5 w-3.5" /> Context
                    </button>
                    <button
                      onClick={() => setShowImageInput(!showImageInput)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        showImageInput || imageUrl ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-60`}
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Image
                    </button>
                  </div>
                </div>

                {/* Creative Direction Panel */}
                {showCreativePanel && (
                  <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Creative Direction</label>
                      <button onClick={() => setShowCreativePanel(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>
                    <textarea
                      value={creativeDirection}
                      onChange={e => setCreativeDirection(e.target.value)}
                      placeholder="E.g., Use a warm and inviting tone, focus on food imagery, emphasize community feeling, include a sense of urgency for the offer..."
                      rows={3}
                      disabled={isGenerating}
                      className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs focus:border-purple-400 focus:outline-none resize-none disabled:opacity-60"
                    />
                  </div>
                )}

                {/* Context Panel */}
                {showContextPanel && (
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Context Materials</label>
                      <button onClick={() => setShowContextPanel(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>

                    {/* File upload */}
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1"><Upload className="h-3 w-3" /> Upload documents (.txt, .md, .html, .csv)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.html,.csv,.tsv,.json"
                        onChange={handleFileUpload}
                        disabled={isGenerating}
                        className="w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-blue-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:file:bg-blue-200"
                      />
                      {uploadedFiles.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {uploadedFiles.map(f => (
                            <span key={f.name} className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              {f.name}
                              <button onClick={() => removeFile(f.name)} className="text-blue-400 hover:text-blue-700"><X className="h-2.5 w-2.5" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" /> Reference links (one per line)</p>
                      <textarea
                        value={contextLinks}
                        onChange={e => setContextLinks(e.target.value)}
                        placeholder="https://www.signos.com/blog/some-article&#10;https://pubmed.ncbi.nlm.nih.gov/12345678/"
                        rows={2}
                        disabled={isGenerating}
                        className="w-full rounded border border-blue-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-400 focus:outline-none resize-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                {/* Image input */}
                {showImageInput && (
                  <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Custom Image URL</label>
                      <button onClick={() => { setShowImageInput(false); setImageUrl(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none" />
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Placement</label>
                    <select value={imagePlacement} onChange={e => setImagePlacement(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs">
                      <option value="hero section">Hero (top of email)</option>
                      <option value="after the first content section">After first section</option>
                      <option value="between content sections">Between sections</option>
                    </select>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleGenerateOptions}
                  disabled={isGenerating || !concept.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {isGenerating
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Emails...</>
                    : <><Sparkles className="h-4 w-4" /> Generate Emails</>}
                </button>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Generation Failed</p>
                    <pre className="whitespace-pre-wrap text-[11px] text-red-600 font-mono leading-relaxed">{error}</pre>
                    <button
                      onClick={async () => {
                        try {
                          const t0 = Date.now();
                          const r = await fetch('/api/email-hub', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'ping' }),
                          });
                          const text = await r.text();
                          setError(`PING: HTTP ${r.status} in ${Date.now() - t0}ms\n${text.slice(0, 500)}`);
                        } catch (e: unknown) {
                          setError(`PING FAILED: ${e instanceof Error ? e.message : 'Unknown'}`);
                        }
                      }}
                      className="mt-2 rounded border border-red-300 px-2.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100"
                    >
                      Test API Connection
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isGenerating && (
            <div className="mx-auto max-w-6xl px-6 pb-12">
              <div className="mb-6 text-center">
                <p className="text-sm font-medium text-gray-600">Generating email options&hellip;</p>
                <p className="mt-1 text-xs text-gray-400">This usually takes 30–60 seconds</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {[0, 1].map(i => (
                  <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="h-4 w-24 rounded bg-gray-200 mb-2" />
                    <div className="h-3 w-3/4 rounded bg-gray-100 mb-4" />
                    <div className="h-[280px] rounded-lg bg-gray-100" />
                    <div className="h-9 rounded-lg bg-gray-200 mt-3" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  PHASE: OPTIONS
  // ═══════════════════════════════════════════════════════

  if (phase === 'options') {
    const memberOptions = options.filter(o => o.audience === 'members');
    const nonMemberOptions = options.filter(o => o.audience === 'non-members');
    const hasBothGroups = memberOptions.length > 0 && nonMemberOptions.length > 0;

    const renderOptionCard = (opt: EmailOption) => {
      const isReviewing = opt.reviewStatus === 'reviewing' || opt.reviewStatus === 'pending';
      return (
        <div
          key={opt.id}
          className={`group flex flex-col rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow ${isReviewing ? 'border-amber-300' : 'border-gray-200'}`}
        >
          <div className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {opt.audience === 'members'
                  ? <Users className="h-3 w-3 text-green-500" />
                  : <UserX className="h-3 w-3 text-orange-500" />}
                <span className="text-xs font-bold text-gray-800">{opt.summary}</span>
              </div>
              {opt.reviewStatus === 'reviewing' && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Reviewing
                </span>
              )}
              {opt.reviewStatus === 'done' && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                  <Check className="h-2.5 w-2.5" /> Ready
                </span>
              )}
            </div>
          </div>

          {codeViewOption === opt.id ? (
            <div className="mx-3 flex-1 overflow-auto rounded-lg border border-gray-100 bg-gray-900 p-3" style={{ maxHeight: 300 }}>
              <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-green-400 font-mono">{opt.html}</pre>
            </div>
          ) : (
            <div className="relative mx-3 overflow-hidden rounded-lg border border-gray-100 bg-white" style={{ height: 300 }}>
              {isReviewing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px]">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500 mb-2" />
                  <span className="text-xs font-medium text-amber-600">Reviewing quality...</span>
                </div>
              )}
              <iframe
                srcDoc={opt.html}
                title={opt.summary}
                className="absolute top-0 left-0 border-0 pointer-events-none"
                style={{ width: 700, height: 700, transform: 'scale(0.43)', transformOrigin: 'top left' }}
                sandbox="allow-same-origin"
              />
            </div>
          )}

          <div className="p-3 flex gap-2 mt-auto">
            <button
              onClick={() => handleSelectOption(opt)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Select &amp; Refine
            </button>
            <button
              onClick={() => setCodeViewOption(codeViewOption === opt.id ? null : opt.id)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {codeViewOption === opt.id ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToInput} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Choose an Option</h1>
              <p className="text-xs text-gray-500 truncate max-w-xs">{concept}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleGenerateOptions} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <RotateCcw className="h-3.5 w-3.5" /> Regenerate
            </button>
            {savedEmailsBtn}
          </div>
        </div>

        {draftsDropdown}

        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="mx-auto max-w-7xl">
            {options.some(o => o.reviewStatus === 'reviewing' || o.reviewStatus === 'pending') && (
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {options.length < (audience === 'both' ? 4 : 3) ? 'Generating options…' : 'AI quality review in progress…'}
                </p>
              </div>
            )}

            {hasBothGroups ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" /> Members
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberOptions.map(renderOptionCard)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <UserX className="h-4 w-4 text-orange-500" /> Non-Members
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nonMemberOptions.map(renderOptionCard)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map(renderOptionCard)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  PHASE: REFINING
  // ═══════════════════════════════════════════════════════

  const previewWidth = deviceMode === 'mobile' ? 375 : 620;
  const previewHtml = inlineEditMode ? selectedHtml : getPreviewHtml(selectedHtml);

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          {options.length > 0 && (
            <button onClick={handleBackToOptions} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-3.5 w-3.5" /> Options
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">Refine Email</h1>
            <p className="text-xs text-gray-500 truncate max-w-xs">{concept || 'Loaded draft'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Inline edit toggle */}
          {viewMode === 'preview' && (
            inlineEditMode ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={saveInlineEdits}
                  className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" /> Save Edits
                </button>
                <button
                  onClick={disableInlineEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <PencilOff className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={enableInlineEdit}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Text
              </button>
            )
          )}

          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setDeviceMode('desktop')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${deviceMode === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Monitor className="h-3.5 w-3.5" /></button>
            <button onClick={() => setDeviceMode('mobile')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${deviceMode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Smartphone className="h-3.5 w-3.5" /></button>
          </div>
          {!inlineEditMode && (
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button onClick={() => setColorMode('light')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${colorMode === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Sun className="h-3.5 w-3.5" /></button>
              <button onClick={() => setColorMode('dark')} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${colorMode === 'dark' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Moon className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => { setViewMode('preview'); setInlineEditMode(false); }} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Eye className="h-3.5 w-3.5" /> Preview</button>
            <button onClick={() => { setViewMode('code'); setInlineEditMode(false); }} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Code className="h-3.5 w-3.5" /> Code</button>
          </div>
          {savedEmailsBtn}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
          <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy HTML</>}
          </button>
        </div>
      </div>

      {draftsDropdown}

      {inlineEditMode && (
        <div className="border-b border-blue-200 bg-blue-50 px-6 py-2 text-center">
          <p className="text-xs font-medium text-blue-700">
            <Pencil className="inline h-3 w-3 mr-1" />
            Edit Mode — Click any text in the email to edit it directly. Click &quot;Save Edits&quot; when done.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — refinement chat */}
        <div className="flex w-[380px] min-w-[380px] flex-col border-r border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
            <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Refinement Chat</span>
          </div>
          <div ref={editScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {editHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {editing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Applying&hellip;
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 p-2.5">
            <div className="flex gap-2">
              <input
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleEdit()}
                placeholder="Request changes..."
                disabled={editing}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleEdit}
                disabled={editing || !editInput.trim()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — preview / code */}
        <div className={`flex-1 overflow-hidden ${!inlineEditMode && colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
          {viewMode === 'preview' ? (
            <div className="flex h-full items-start justify-center overflow-auto p-6">
              <div
                className={`rounded-lg shadow-lg transition-all duration-300 ${!inlineEditMode && colorMode === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
                style={{ width: previewWidth }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  title="Email preview"
                  className="w-full border-0"
                  style={{ minHeight: '600px', height: '100%', width: previewWidth }}
                  sandbox="allow-same-origin"
                  onLoad={() => {
                    const f = iframeRef.current;
                    if (f?.contentDocument?.body) f.style.height = f.contentDocument.body.scrollHeight + 40 + 'px';
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto p-4">
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-900 p-5 text-xs leading-relaxed text-green-400 font-mono">
                {selectedHtml}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
