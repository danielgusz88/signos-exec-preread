'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Copy, Check, Sparkles, MessageSquare, Download, ImagePlus, X, ChevronDown, Layers, Pencil } from 'lucide-react';

type EditMessage = { role: 'user' | 'system'; text: string };
type Mode = 'single' | 'batch';
type BatchVariation = { name: string; headline: string; subhead: string; hook_angle: string; html?: string; generating?: boolean };

const SIZE_OPTIONS = [
  { id: 'square', label: 'Square 1:1', width: 1200, height: 1200 },
  { id: 'horizontal', label: 'Landscape 1.91:1', width: 1200, height: 628 },
  { id: 'vertical', label: 'Portrait 4:5', width: 1080, height: 1350 },
  { id: 'story', label: 'Story 9:16', width: 1080, height: 1920 },
];

const STYLE_OPTIONS = ['Bold & punchy', 'Dark & premium', 'Warm lifestyle', 'Bright & minimal', 'Split layout (photo top, text bottom)', 'Editorial / magazine'];

export default function AdSketchPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [headline, setHeadline] = useState('');
  const [subhead, setSubhead] = useState('');
  const [cta, setCta] = useState('');
  const [style, setStyle] = useState('Bold & punchy');
  const [details, setDetails] = useState('');
  const [sizeId, setSizeId] = useState('square');
  const [html, setHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editInput, setEditInput] = useState('');
  const [editHistory, setEditHistory] = useState<EditMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [batchTopic, setBatchTopic] = useState('');
  const [batchDetails, setBatchDetails] = useState('');
  const [variations, setVariations] = useState<BatchVariation[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState(-1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editScrollRef = useRef<HTMLDivElement>(null);

  const selectedSize = SIZE_OPTIONS.find(s => s.id === sizeId) || SIZE_OPTIONS[0];

  const streamResponse = useCallback(async (payload: Record<string, string>, onChunk?: (partial: string) => void) => {
    const res = await fetch('/api/ad-sketch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const t = await res.text(); try { const j = JSON.parse(t); throw new Error(j.error); } catch (e) { if (e instanceof Error && e.message) throw e; throw new Error('Request failed'); } }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) { const j = await res.json(); if (j.error) throw new Error(j.error); return j.html || ''; }
    const reader = res.body?.getReader(); const decoder = new TextDecoder(); let result = '';
    if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); if (onChunk) onChunk(result); else setHtml(result); } }
    return result;
  }, []);

  const handleGenerate = async () => {
    if (!headline.trim() && !details.trim()) return;
    setGenerating(true); setError(''); setEditHistory([]);
    try {
      const payload: Record<string, string> = { action: 'generate', headline, subhead, cta, style, details, width: String(selectedSize.width), height: String(selectedSize.height), sizeLabel: selectedSize.label };
      if (imageUrl) payload.imageUrl = imageUrl;
      let result = await streamResponse(payload);
      if (result.startsWith('```')) result = result.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(result);
      setEditHistory([{ role: 'system', text: 'Ad created. Request edits below.' }]);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    setGenerating(false);
  };

  const handleEdit = async () => {
    if (!editInput.trim() || !html) return;
    const instruction = editInput.trim(); setEditInput(''); setEditing(true);
    setEditHistory(h => [...h, { role: 'user', text: instruction }]);
    try {
      let result = await streamResponse({ action: 'edit', currentHtml: html, editInstructions: instruction });
      if (result.startsWith('```')) result = result.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(result);
      setEditHistory(h => [...h, { role: 'system', text: 'Done.' }]);
    } catch (e: unknown) { setEditHistory(h => [...h, { role: 'system', text: `Error: ${e instanceof Error ? e.message : 'failed'}` }]); }
    setEditing(false);
    setTimeout(() => editScrollRef.current?.scrollTo({ top: editScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const handleBatchGenerate = async () => {
    if (!batchTopic.trim()) return;
    setBatchLoading(true); setError(''); setVariations([]); setSelectedVariation(-1);
    try {
      const res = await fetch('/api/ad-sketch', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', topic: batchTopic, details: batchDetails, width: String(selectedSize.width), height: String(selectedSize.height) }) });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server is busy. Please wait a moment and try again.'); }
      if (data.error) {
        const msg = data.error;
        throw new Error(msg.includes('Overloaded') || msg.includes('529') ? 'Anthropic API is temporarily overloaded. Please wait a moment and try again.' : msg);
      }
      setVariations((data.variations || []).map((v: BatchVariation) => ({ ...v, html: '', generating: false })));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    setBatchLoading(false);
  };

  const handleRenderVariation = async (idx: number) => {
    const v = variations[idx]; if (!v) return;
    setVariations(prev => prev.map((vv, i) => i === idx ? { ...vv, generating: true } : vv));
    setSelectedVariation(idx);
    try {
      const result = await streamResponse({
        action: 'generate', headline: v.headline, subhead: v.subhead, cta: '', style: 'Bold & punchy', details: v.hook_angle,
        width: String(selectedSize.width), height: String(selectedSize.height), sizeLabel: selectedSize.label,
      }, (partial) => { setHtml(partial); });
      let clean = result; if (clean.startsWith('```')) clean = clean.replace(/^```html?\n?/, '').replace(/\n?```$/, '');
      setHtml(clean);
      setVariations(prev => prev.map((vv, i) => i === idx ? { ...vv, html: clean, generating: false } : vv));
      setEditHistory([{ role: 'system', text: `Rendered "${v.name}". Edit below or pick another variation.` }]);
    } catch { setVariations(prev => prev.map((vv, i) => i === idx ? { ...vv, generating: false } : vv)); }
  };

  const handleCopy = () => { navigator.clipboard.writeText(html); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => { const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ad-sketch-${sizeId}.html`; a.click(); URL.revokeObjectURL(url); };

  const maxPreviewH = 560;
  const scale = Math.min(1, maxPreviewH / selectedSize.height, 560 / selectedSize.width);

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Ad Sketch Pad</h1>
          <p className="text-xs text-gray-500">Lo-fi ad comps with AI — iterate fast before Figma</p>
        </div>
        {html && (
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Download className="h-3.5 w-3.5" /> Download</button>
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
              {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy HTML</>}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex w-[400px] min-w-[400px] flex-col border-r border-gray-200 bg-white">
          {/* Mode toggle */}
          <div className="flex border-b border-gray-200">
            <button onClick={() => setMode('single')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition-colors ${mode === 'single' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Pencil className="h-3.5 w-3.5" /> Single Ad
            </button>
            <button onClick={() => setMode('batch')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition-colors ${mode === 'batch' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Layers className="h-3.5 w-3.5" /> 5 Variations
            </button>
          </div>

          <div className="overflow-y-auto border-b border-gray-200 p-4 space-y-3">
            {/* Size picker */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Ad Size</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_OPTIONS.map(s => (
                  <button key={s.id} onClick={() => setSizeId(s.id)}
                    className={`flex flex-col items-center rounded-lg border p-2 text-center transition-all ${sizeId === s.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`mb-1 rounded border border-current ${s.id === 'square' ? 'h-6 w-6' : s.id === 'horizontal' ? 'h-4 w-7' : s.id === 'vertical' ? 'h-7 w-5' : 'h-8 w-4'} ${sizeId === s.id ? 'border-brand-500 bg-brand-100' : 'border-gray-300 bg-gray-50'}`} />
                    <span className="text-[10px] font-medium text-gray-600 leading-tight">{s.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'single' ? (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Headline</label>
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g., The Scale Is Gaslighting You" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Subhead <span className="text-gray-400">(optional)</span></label>
                  <input value={subhead} onChange={e => setSubhead(e.target.value)} placeholder="e.g., Your blood sugar tells the real story" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Style</label>
                    <div className="relative">
                      <select value={style} onChange={e => setStyle(e.target.value)} className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-brand-500 focus:outline-none">
                        {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="pt-5">
                    <button onClick={() => setShowImageInput(!showImageInput)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${showImageInput || imageUrl ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <ImagePlus className="h-3.5 w-3.5" /> Photo
                    </button>
                  </div>
                </div>
                {showImageInput && (
                  <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Background Image URL</label>
                      <button onClick={() => { setShowImageInput(false); setImageUrl(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Extra Details <span className="text-gray-400">(optional)</span></label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Offer text, target audience, mood..." rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none" />
                </div>
                <button onClick={handleGenerate} disabled={generating || (!headline.trim() && !details.trim())} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Ad</>}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Topic / Campaign Theme</label>
                  <input value={batchTopic} onChange={e => setBatchTopic(e.target.value)} placeholder="e.g., GLP-1 graduation, weight management after Ozempic" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Extra Context <span className="text-gray-400">(optional)</span></label>
                  <textarea value={batchDetails} onChange={e => setBatchDetails(e.target.value)} placeholder="Target audience, key messages, tone..." rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none" />
                </div>
                <button onClick={handleBatchGenerate} disabled={batchLoading || !batchTopic.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  {batchLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating ideas...</> : <><Layers className="h-4 w-4" /> Generate 5 Variations</>}
                </button>
                {variations.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Click to render →</label>
                    {variations.map((v, i) => (
                      <button key={i} onClick={() => handleRenderVariation(i)} disabled={v.generating}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${selectedVariation === i ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">{v.name}</span>
                          {v.generating && <Loader2 className="h-3 w-3 animate-spin text-brand-500" />}
                          {v.html && !v.generating && <Check className="h-3 w-3 text-green-500" />}
                        </div>
                        <p className="text-[11px] font-semibold text-gray-700 leading-snug mb-0.5">{v.headline}</p>
                        <p className="text-[10px] text-gray-500 leading-snug">{v.subhead}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          {/* Edit conversation */}
          {html && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Iterate</span>
              </div>
              <div ref={editScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {editHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{msg.text}</div>
                  </div>
                ))}
                {editing && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Applying...</div></div>}
              </div>
              <div className="border-t border-gray-200 p-2.5">
                <div className="flex gap-2">
                  <input value={editInput} onChange={e => setEditInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleEdit()}
                    placeholder="e.g., bigger headline, add 20% off badge, darker overlay..." disabled={editing}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-50" />
                  <button onClick={handleEdit} disabled={editing || !editInput.trim()} className="rounded-lg bg-brand-500 px-3 py-2 text-white hover:bg-brand-600 disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Preview */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          {!html ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800"><Sparkles className="h-8 w-8 text-gray-600" /></div>
              <p className="text-sm font-medium text-gray-400">No ad created yet</p>
              <p className="mt-1 text-xs text-gray-500">{mode === 'single' ? 'Enter a headline and click Generate' : 'Enter a topic and generate 5 variations'}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center overflow-auto p-6">
              <div className="mb-3"><span className="rounded-full bg-gray-800 px-3 py-1 text-[10px] font-medium text-gray-400">{selectedSize.width}×{selectedSize.height} &middot; {selectedSize.label} &middot; {Math.round(scale * 100)}%</span></div>
              <div className="rounded-lg shadow-2xl ring-1 ring-white/10" style={{ width: selectedSize.width * scale, height: selectedSize.height * scale, overflow: 'hidden' }}>
                <iframe ref={iframeRef} srcDoc={html} title="Ad preview" className="border-0 origin-top-left"
                  style={{ width: selectedSize.width, height: selectedSize.height, transform: `scale(${scale})`, transformOrigin: 'top left' }} sandbox="allow-same-origin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
