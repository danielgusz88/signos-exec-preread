'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send, Loader2, Copy, Check, MessageSquare, Sparkles, Eye, Code,
  ChevronDown, Save, FolderOpen, Trash2, ImagePlus, Monitor,
  Smartphone, Sun, Moon, X, ArrowLeft, RotateCcw, Upload, Link2,
  Palette, FileText, Pencil, PencilOff, Users, UserX, Share2,
  Plus, ArrowUp, ArrowDown, Layers, Type, LayoutGrid,
  Wand2, AlertCircle, CheckCircle2, Lightbulb,
} from 'lucide-react';

type DesignSuggestion = {
  id: string;
  category: 'content' | 'design' | 'hierarchy' | string;
  title: string;
  problem: string;
  fix: string;
  impact: 'high' | 'medium' | 'low' | string;
};

type LinterFinding = {
  rule: 'repeated-heading' | 'missing-design-moment' | 'text-only-run' | 'opener-inconsistency' | 'imbalanced-sections';
  severity: 'high' | 'medium' | 'low';
  blockIds: string[];
  note: string;
  evidence?: string;
};

type LinterResult = {
  findings: LinterFinding[];
  summary: {
    totalBlocks: number;
    sectionCount: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
};

type DesignReview = {
  overview: string;
  scores: { content?: number; design?: number; hierarchy?: number };
  suggestions: DesignSuggestion[];
  linter?: LinterResult;
};

type BlockTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'media' | 'transition' | 'accent';
  html: string;
};

const EMAIL_BLOCKS: BlockTemplate[] = [
  { id: 'eyebrow', name: 'Eyebrow Label', description: 'JetBrains Mono uppercase label', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 16px 8px 16px;"><p class="eyebrow" style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:22px;line-height:1;text-transform:uppercase;color:#fd3576;margin:0;">EYEBROW LABEL</p></td></tr>` },
  { id: 'heading', name: 'Section Heading', description: 'Large cerise uppercase heading', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:32px 16px 0 16px;"><p class="h2" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:30px;line-height:1.1;text-transform:uppercase;margin:0 0 16px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">SECTION HEADING</p></td></tr>` },
  { id: 'subheading', name: 'Subheading', description: 'Expanded-width cerise subheading', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 16px 16px;"><p class="h3" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:26px;line-height:1.1;margin:0 0 16px 0;color:#fd3576;font-stretch:expanded;font-variation-settings:'wdth' 125;">Subheading Text Here</p></td></tr>` },
  { id: 'body-pebble', name: 'Body Text', description: 'Paragraph on pebble background', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 24px 16px;"><p class="body-lg" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:16px;line-height:24px;margin:0;color:#21263a;">Your paragraph text goes here. Edit this content to match your email message.</p></td></tr>` },
  { id: 'body-gray', name: 'Body Text (Gray)', description: 'Paragraph on gray background', category: 'content',
    html: `<tr><td class="bg-gray px-m" style="background-color:#e3e4e7;padding:0 16px 20px 16px;"><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">Your paragraph text goes here on a gray background section.</p></td></tr>` },
  { id: 'list-item', name: 'Numbered List Item', description: 'Icon + title + description', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 32px 16px 32px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td width="32" valign="top" style="padding-right:16px;"><img src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/numbered-button.png" width="32" height="32" alt="" style="display:block;" /></td><td valign="top"><p class="list-title" style="font-family:'Archivo',Arial,sans-serif;font-weight:600;font-size:20px;line-height:1;text-transform:uppercase;margin:0 0 6px 0;color:#21263a;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">List item title</p><p class="body-sm" style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.6;margin:0;color:#21263a;">Description text for this list item goes here.</p></td></tr></table></td></tr>` },
  { id: 'cta', name: 'CTA Button', description: 'Cerise call-to-action button', category: 'content',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:0 16px 32px 16px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center"><a href="#" class="btn-cerise" style="display:inline-block;padding:16px 30px;border-radius:16px;font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:18px;line-height:normal;text-decoration:none;color:#ffffff;background-color:#fd3576;text-align:center;border:2px solid #ce0259;border-bottom:4px solid #ce0259;max-width:520px;box-sizing:border-box;width:100%;font-stretch:expanded;font-variation-settings:'wdth' 125;">Call to Action &rarr;</a></td></tr></table></td></tr>` },
  { id: 'cerise-band', name: 'Cerise Accent Band', description: 'Bold full-width callout on cerise', category: 'accent',
    html: `<tr><td style="background-color:#fd3576;padding:40px 24px;text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:28px;line-height:1.1;text-transform:uppercase;margin:0 0 12px 0;color:#ffffff;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">BOLD CALLOUT HEADLINE</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:15px;line-height:1.5;margin:0;color:#ffffff;opacity:0.92;">Supporting sentence or key insight that stands out.</p></td></tr>` },
  { id: 'stat-card', name: 'Stat Highlight', description: 'Large number with label and context', category: 'accent',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:24px 16px;"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:4px solid #fd3576;padding-top:24px;"><tr><td style="text-align:center;"><p style="font-family:'Archivo',Arial,sans-serif;font-weight:700;font-size:52px;line-height:1;margin:0 0 8px 0;color:#fd3576;font-stretch:extra-condensed;font-variation-settings:'wdth' 62.5;">42%</p><p style="font-family:'JetBrains Mono','Courier New',monospace;font-weight:600;font-size:13px;line-height:1.4;text-transform:uppercase;margin:0 0 12px 0;color:#21263a;letter-spacing:0.5px;">STAT LABEL</p><p style="font-family:'Archivo',Arial,sans-serif;font-weight:400;font-size:14px;line-height:1.5;margin:0;color:#21263a;">Context explaining what this stat means.</p></td></tr></table></td></tr>` },
  { id: 'section-image', name: 'Section Image', description: 'Full-width rounded image', category: 'media',
    html: `<tr><td class="bg-pebble px-m" style="background-color:#f5f6f7;padding:16px 32px 24px 32px;"><img src="https://funnel-ai-signos.netlify.app/email-assets/experiments/section-photo-1.jpg" width="536" alt="Section image" style="display:block;width:100%;height:auto;border-radius:16px;" /></td></tr>` },
  { id: 'hero-image', name: 'Hero Image', description: 'Full-width hero photo with wave overlay', category: 'media',
    html: `<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/hero-photo.jpg" width="600" alt="Hero image" style="display:block;width:100%;height:auto;" /><img src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/hero-wave-transparent.png" width="600" alt="" style="display:block;width:100%;height:auto;" /></td></tr>` },
  { id: 'product-section', name: 'Product Section', description: 'CGM product image on white bg', category: 'media',
    html: `<tr><td class="bg-white" style="background-color:#ffffff;padding:17px 0;text-align:center;"><img class="product-img" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/product-desktop.png" width="346" alt="Signos CGM kit" style="display:inline-block;width:346px;height:auto;margin:0 auto;" /></td></tr>` },
  { id: 'wave-p2g', name: 'Wave: Pebble → Gray', description: 'Transition from pebble to gray', category: 'transition',
    html: `<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-gray.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-gray-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>` },
  { id: 'wave-g2p', name: 'Wave: Gray → Pebble', description: 'Transition from gray to pebble', category: 'transition',
    html: `<tr><td class="bg-gray" style="background-color:#e3e4e7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-gray-to-pebble.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-gray-to-pebble-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>` },
  { id: 'wave-p2w', name: 'Wave: Pebble → White', description: 'Transition from pebble to white', category: 'transition',
    html: `<tr><td class="bg-pebble" style="background-color:#f5f6f7;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-white.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-pebble-to-white-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>` },
  { id: 'wave-w2p', name: 'Wave: White → Pebble', description: 'Transition from white to pebble', category: 'transition',
    html: `<tr><td class="bg-white" style="background-color:#ffffff;padding:0;line-height:0;font-size:0;"><img class="hex-light" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-white-to-pebble.png?v=5" width="600" alt="" style="display:block;width:100%;height:auto;" /><!--[if !mso]><!--><img class="hex-dark" src="https://funnel-ai-signos.netlify.app/email-assets/nutrition/wave-white-to-pebble-dark.png?v=5" width="600" alt="" style="display:none;max-height:0;overflow:hidden;width:100%;height:auto;" /><!--<![endif]--></td></tr>` },
];

const BLOCK_CATEGORIES = [
  { id: 'content', name: 'Content', icon: Type },
  { id: 'accent', name: 'Accents', icon: Sparkles },
  { id: 'media', name: 'Media', icon: ImagePlus },
  { id: 'transition', name: 'Waves', icon: Layers },
] as const;

type ViewMode = 'preview' | 'code';
type DeviceMode = 'desktop' | 'mobile';
type ColorMode = 'light' | 'dark';
type EditMessage = { role: 'user' | 'system'; text: string };
type Draft = { id: string; title: string; theme: string; audience: string; updated_at: number };
type Phase = 'input' | 'generating' | 'options' | 'refining';
type ReviewStatus = 'pending' | 'reviewing' | 'done' | 'error';
type EmailOption = { id: string; html: string; summary: string; reviewStatus: ReviewStatus; audience: string };

function DraftRow({ draft, onLoad, onCopyLink, onDelete }: {
  draft: Draft;
  onLoad: (id: string) => void;
  onCopyLink: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  return (
    <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
      <button onClick={() => onLoad(draft.id)} className="text-xs font-medium text-gray-800 truncate flex-1 text-left">{draft.title}</button>
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => { onCopyLink(draft.id); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 1500); }}
          title="Copy share link"
          className="text-gray-400 hover:text-brand-500 p-0.5"
        >
          {linkCopied ? <Check className="h-3 w-3 text-green-500" /> : <Share2 className="h-3 w-3" />}
        </button>
        <button onClick={() => onDelete(draft.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

export default function EmailHubPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading…</div>}>
      <EmailHubPage />
    </Suspense>
  );
}

function EmailHubPage() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>('input');

  const [concept, setConcept] = useState('');
  const [details, setDetails] = useState('');
  const [audience, setAudience] = useState('both');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [visualTheme, setVisualTheme] = useState('');
  const [contextDocuments, setContextDocuments] = useState('');
  const [contextLinks, setContextLinks] = useState('');
  const [contentFidelity, setContentFidelity] = useState<'general' | 'exact'>('general');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePlacement, setImagePlacement] = useState('hero section');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showCreativePanel, setShowCreativePanel] = useState(false);
  const [directCopyMode, setDirectCopyMode] = useState(false);
  const [directCopyText, setDirectCopyText] = useState('');
  const [directCopyFiles, setDirectCopyFiles] = useState<{ name: string; content: string }[]>([]);
  const directCopyFileRef = useRef<HTMLInputElement>(null);

  /* Design presets (B): layout / palette / type scale. These are the
     primary levers for making each email visually distinct. */
  const [layout, setLayout] = useState<'editorial' | 'newsletter' | 'announcement' | 'digest' | ''>('');
  const [palette, setPalette] = useState<'cerise' | 'navy' | 'warm' | 'cool' | ''>('');
  const [typeScale, setTypeScale] = useState<'display' | 'editorial' | 'tight' | ''>('');
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);

  /* Apply-preview state: when the background worker returns a preview,
     the user sees a summary + preview before committing. */
  type OpSummary =
    | { op: 'replace_text'; block_id: string; selector: string; preview: string }
    | { op: 'swap_image'; block_id: string; image_key: string }
    | { op: 'insert_module'; after_block_id: string; module: string }
    | { op: 'replace_module'; block_id: string; module: string }
    | { op: 'delete_block'; block_id: string }
    | { op: 'reorder'; block_id: string; after_block_id: string };
  const [pendingPreview, setPendingPreview] = useState<{
    jobId: string;
    previewHtml: string;
    opsSummary: OpSummary[];
    auditNote: string;
    acceptedTitles: string[];
    backupHtml: string;
  } | null>(null);
  const [previewCommitting, setPreviewCommitting] = useState(false);

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [editingImage, setEditingImage] = useState<{ src: string; rect: DOMRect; el: HTMLImageElement } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const imgFileRef = useRef<HTMLInputElement>(null);
  const imageSwapsRef = useRef<Map<string, string>>(new Map());
  const [taggedSection, setTaggedSection] = useState<{ text: string; trIndex: number } | null>(null);
  const inlineEditModeRef = useRef(false);
  const [leftPanelMode, setLeftPanelMode] = useState<'chat' | 'blocks'>('chat');
  const [blockFilter, setBlockFilter] = useState<string>('all');

  const [draftId, setDraftId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState<DesignReview | null>(null);
  const [reviewError, setReviewError] = useState<{
    phase: 'review' | 'apply';
    message: string;
    debug?: string;
  } | null>(null);
  const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState<Set<string>>(new Set());
  const [applyingReview, setApplyingReview] = useState(false);
  const [applyProgress, setApplyProgress] = useState('');

  const [error, setError] = useState('');

  const editScrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deepLinkHandled = useRef(false);

  const updateUrl = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set('draft', id);
    } else {
      url.searchParams.delete('draft');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const copyShareLink = useCallback(() => {
    if (!draftId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('draft', draftId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [draftId]);

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

  // Deep-link: auto-load draft from ?draft=ID on first mount
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const id = searchParams.get('draft');
    if (!id) return;
    deepLinkHandled.current = true;
    (async () => {
      try {
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
          setEditHistory([{ role: 'system', text: `Loaded "${data.draft.title}" from shared link` }]);
          setPhase('refining');
        }
      } catch { /* ignore — draft may not exist */ }
    })();
  }, [searchParams]);

  const captureInlineEdits = (): string => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !inlineEditMode) return selectedHtml;
    doc.querySelectorAll('img[data-img-editable]').forEach((img) => {
      img.removeEventListener('click', handleImageClick);
    });
    cleanupEditMarkers(doc);
    applyTrackedSwaps(doc);
    imageSwapsRef.current.clear();
    const html = '<!doctype html>\n' + doc.documentElement.outerHTML;
    setSelectedHtml(html);
    setInlineEditMode(false);
    setEditingImage(null);
    setEditHistory(h => [...h, { role: 'system', text: 'Inline edits saved.' }]);
    return html;
  };

  const handleSave = async () => {
    if (!selectedHtml && !inlineEditMode) return;
    setSaving(true);
    const htmlToSave = inlineEditMode ? captureInlineEdits() : selectedHtml;
    try {
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-draft',
          id: draftId || undefined,
          title: draftTitle || concept || 'Untitled',
          theme: concept, details, audience, html: htmlToSave,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setEditHistory(h => [...h, { role: 'system', text: `Save failed (${res.status}). ${txt.slice(0, 100)}` }]);
        setSaving(false);
        return;
      }
      const data = await res.json();
      if (data.id) {
        setDraftId(data.id);
        updateUrl(data.id);
      }
      setEditHistory(h => [...h, { role: 'system', text: 'Draft saved.' }]);
      loadDrafts();
    } catch (err) {
      setEditHistory(h => [...h, { role: 'system', text: `Save error: ${err instanceof Error ? err.message : 'Unknown'}` }]);
    }
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
      updateUrl(data.draft.id);
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

  // ── Direct copy file handling ───────────────────────────

  const handleDirectCopyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: { name: string; content: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        newFiles.push({ name: file.name, content: text.slice(0, 30000) });
      } catch { /* skip binary */ }
    }
    const all = [...directCopyFiles, ...newFiles];
    setDirectCopyFiles(all);
    setDirectCopyText(all.map(f => f.content).join('\n\n'));
    if (directCopyFileRef.current) directCopyFileRef.current.value = '';
  };

  const removeDirectCopyFile = (name: string) => {
    const updated = directCopyFiles.filter(f => f.name !== name);
    setDirectCopyFiles(updated);
    setDirectCopyText(updated.map(f => f.content).join('\n\n'));
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

    // Direct Copy mode — single output, preserves exact text
    if (directCopyMode && directCopyText.trim()) {
      try {
        const res = await fetch('/api/email-hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-direct-copy',
            theme: concept,
            details,
            sourceText: directCopyText,
            audience,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          setError(`HTTP ${res.status} — ${text.slice(0, 200)}`);
          setPhase('input');
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

        // #region agent log — All hypotheses: capture backend debug + HTML stats
        try {
          const debugMatch = html.match(/<!-- DEBUG_f702a4:([\s\S]*?) -->/);
          const backendDebug = debugMatch ? JSON.parse(debugMatch[1]) : null;
          const hasFooter = html.includes('bg-stone');
          const lastTrClose = html.lastIndexOf('</tr>');
          const lastTrOpen = html.lastIndexOf('<tr');
          const logPayload = {
            sessionId: 'f702a4',
            location: 'page.tsx:directCopy',
            message: 'direct-copy-response-received',
            data: {
              htmlLength: html.length,
              hasFooter,
              brokenEnd: lastTrOpen > lastTrClose,
              last300: html.slice(-300),
              backendDebug,
            },
            timestamp: Date.now(),
          };
          fetch('http://127.0.0.1:7244/ingest/e1c51a61-f7de-4bd7-81ad-84709d64d4b4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f702a4' },
            body: JSON.stringify(logPayload),
          }).catch(() => {});
        } catch { /* debug only */ }
        // #endregion

        if (!html.trim()) {
          setError('Empty response from server.');
          setPhase('input');
          return;
        }
        const dcAudience = audience === 'both' ? 'members' : audience;
        setOptions([{
          id: 'direct-copy',
          html,
          summary: 'Direct Copy Email',
          reviewStatus: 'done',
          audience: dcAudience,
        }]);
        setPhase('options');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Generation failed');
        setPhase('input');
      }
      return;
    }

    const basePayload: Record<string, string> = {
      action: 'generate-option',
      theme: concept,
      details,
      creativeDirection,
      visualTheme,
      contextDocuments,
      contextLinks,
      contentFidelity,
      // Design presets (B) — drive layout/palette/type variety.
      layout,
      palette,
      typeScale,
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
    updateUrl(null);
  };

  // ── Inline text + image editing ─────────────────────────

  const cleanupEditMarkers = (doc: Document) => {
    doc.querySelectorAll('[contenteditable="true"]').forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.contentEditable = 'false';
      htmlEl.style.outline = '';
      htmlEl.style.outlineOffset = '';
      htmlEl.style.cursor = '';
    });
    doc.querySelectorAll('[data-img-editable]').forEach((el) => {
      const img = el as HTMLElement;
      img.style.outline = '';
      img.style.outlineOffset = '';
      img.style.cursor = '';
      img.removeAttribute('data-img-editable');
    });
  };

  const handleImageClick = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const img = e.currentTarget as HTMLImageElement;
    const iframeEl = iframeRef.current;
    if (!iframeEl) return;
    const iframeRect = iframeEl.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const adjustedRect = new DOMRect(
      iframeRect.left + imgRect.left,
      iframeRect.top + imgRect.top,
      imgRect.width,
      imgRect.height
    );
    setNewImageUrl(img.src || '');
    setEditingImage({ src: img.src, rect: adjustedRect, el: img });
  }, []);

  // ── Section click-to-tag (for refinement chat) ─────────

  const setupSectionClickHandlers = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || inlineEditModeRef.current) return;

    const handler = (e: MouseEvent) => {
      if (inlineEditModeRef.current) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      const tr = target.closest('tr') as HTMLTableRowElement | null;
      if (!tr) return;
      const text = (tr.textContent || '').trim();
      if (text.length < 5) return;

      e.preventDefault();
      e.stopPropagation();

      doc.querySelectorAll('tr[data-section-hl]').forEach(el => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.outlineOffset = '';
        el.removeAttribute('data-section-hl');
      });

      tr.style.outline = '2px solid #3b88ff';
      tr.style.outlineOffset = '-2px';
      tr.setAttribute('data-section-hl', '1');

      const heading = tr.querySelector('.eyebrow, .h1, .h2, .h3, .list-title, .product-heading, h1, h2, h3, h4');
      let name = heading?.textContent?.trim() || '';
      if (!name) {
        const firstP = tr.querySelector('p, td');
        name = (firstP?.textContent || text).trim();
      }
      if (name.length > 60) name = name.slice(0, 57) + '...';

      const idx = Array.from(doc.querySelectorAll('tr')).indexOf(tr);
      setTaggedSection({ text: name, trIndex: idx });
    };

    const bodyAny = doc.body as unknown as Record<string, unknown>;
    const prev = bodyAny.__sectionHandler as ((e: MouseEvent) => void) | undefined;
    if (prev) doc.body.removeEventListener('click', prev as EventListener);
    doc.body.addEventListener('click', handler as EventListener);
    bodyAny.__sectionHandler = handler;
    doc.body.style.cursor = 'pointer';
  }, []);

  const clearSectionHighlights = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const bodyAny = doc.body as unknown as Record<string, unknown>;
    const prev = bodyAny.__sectionHandler as ((e: MouseEvent) => void) | undefined;
    if (prev) {
      doc.body.removeEventListener('click', prev as EventListener);
      delete bodyAny.__sectionHandler;
    }
    doc.querySelectorAll('tr[data-section-hl]').forEach(el => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
      el.removeAttribute('data-section-hl');
    });
    doc.body.style.cursor = '';
    setTaggedSection(null);
  }, []);

  const enableInlineEdit = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    clearSectionHighlights();
    setInlineEditMode(true);
    inlineEditModeRef.current = true;
    setEditingImage(null);

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

    doc.querySelectorAll('img').forEach((img) => {
      if (img.width < 20 || img.height < 20) return;
      img.setAttribute('data-img-editable', 'true');
      img.style.outline = '2px dashed #8b5cf6';
      img.style.outlineOffset = '2px';
      img.style.cursor = 'pointer';
      img.addEventListener('click', handleImageClick);
    });
  };

  const disableInlineEdit = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('img[data-img-editable]').forEach((img) => {
      img.removeEventListener('click', handleImageClick);
    });
    cleanupEditMarkers(doc);
    imageSwapsRef.current.clear();
    setInlineEditMode(false);
    inlineEditModeRef.current = false;
    setEditingImage(null);
    setTimeout(() => setupSectionClickHandlers(), 50);
  };

  const trackImageSwap = (oldSrc: string, newSrc: string) => {
    const map = imageSwapsRef.current;
    let foundKey: string | null = null;
    map.forEach((val, key) => {
      if (val === oldSrc) foundKey = key;
    });
    if (foundKey) {
      map.set(foundKey, newSrc);
    } else {
      map.set(oldSrc, newSrc);
    }
  };

  const applyTrackedSwaps = (doc: Document) => {
    const map = imageSwapsRef.current;
    if (map.size === 0) return;
    doc.querySelectorAll('img').forEach((img) => {
      const attrSrc = img.getAttribute('src') || '';
      const propSrc = img.src;
      const swap = map.get(attrSrc) || map.get(propSrc);
      if (swap) img.setAttribute('src', swap);
    });
  };

  const compressImage = (file: File, maxWidth = 600, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxWidth) {
          h = Math.round(h * (maxWidth / w));
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  };

  const applyImageChange = (url: string) => {
    if (!editingImage?.el || !url.trim()) return;
    trackImageSwap(editingImage.src, url);
    try { editingImage.el.src = url; } catch { /* stale ref */ }
    setEditingImage(null);
    setNewImageUrl('');
  };

  const removeImage = () => {
    if (!editingImage?.el) return;
    const img = editingImage.el;
    const td = img.closest('td');
    const tr = img.closest('tr');

    const siblingImgs = td ? td.querySelectorAll('img') : null;
    const hasOtherContent = siblingImgs && siblingImgs.length > 1;

    if (hasOtherContent) {
      img.remove();
    } else if (tr) {
      const nextTr = tr.nextElementSibling;
      if (nextTr) {
        const nextImgs = nextTr.querySelectorAll('img');
        const isWaveRow = nextImgs.length > 0 && Array.from(nextImgs).every(i =>
          (i.getAttribute('src') || '').includes('wave-')
        );
        if (isWaveRow) nextTr.remove();
      }
      tr.remove();
    } else {
      img.remove();
    }
    setEditingImage(null);
    setNewImageUrl('');
    setEditHistory(h => [...h, { role: 'system', text: 'Image removed.' }]);
  };

  const insertBlock = (block: BlockTemplate) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const container = doc.querySelector('table.container tbody') || doc.querySelector('table.container');
    if (!container) return;

    const allTrs = Array.from(container.querySelectorAll(':scope > tr'));
    let insertAfterEl: Element | null = null;

    if (taggedSection && allTrs[taggedSection.trIndex]) {
      insertAfterEl = allTrs[taggedSection.trIndex];
    } else {
      for (let i = allTrs.length - 1; i >= 0; i--) {
        const td = allTrs[i].querySelector('td');
        const bgStone = td?.classList.contains('bg-stone') ||
          (td?.getAttribute('style') || '').includes('#21263a');
        if (bgStone) { insertAfterEl = allTrs[i - 1] || null; break; }
      }
      if (!insertAfterEl) insertAfterEl = allTrs[allTrs.length - 1];
    }

    const temp = doc.createElement('tbody');
    temp.innerHTML = block.html;
    const newRows = Array.from(temp.children);

    let anchor = insertAfterEl;
    newRows.forEach(row => {
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(row, anchor.nextSibling);
        anchor = row;
      }
    });

    const updatedHtml = '<!doctype html>\n' + doc.documentElement.outerHTML;
    setSelectedHtml(updatedHtml);
    setTaggedSection(null);
    setEditHistory(h => [...h, { role: 'system', text: `Inserted "${block.name}" block.` }]);
    setLeftPanelMode('chat');
  };

  const moveSection = (direction: 'up' | 'down') => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !taggedSection) return;

    const container = doc.querySelector('table.container tbody') || doc.querySelector('table.container');
    if (!container) return;
    const allTrs = Array.from(container.querySelectorAll(':scope > tr'));
    const tr = allTrs[taggedSection.trIndex];
    if (!tr) return;

    if (direction === 'up' && tr.previousElementSibling) {
      tr.parentNode!.insertBefore(tr, tr.previousElementSibling);
    } else if (direction === 'down' && tr.nextElementSibling) {
      tr.parentNode!.insertBefore(tr.nextElementSibling, tr);
    } else return;

    const updatedHtml = '<!doctype html>\n' + doc.documentElement.outerHTML;
    setSelectedHtml(updatedHtml);
    setTaggedSection(null);
    setEditHistory(h => [...h, { role: 'system', text: `Section moved ${direction}.` }]);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const capturedEditingImage = editingImage;
    if (!capturedEditingImage) return;
    try {
      const dataUrl = await compressImage(file);
      trackImageSwap(capturedEditingImage.src, dataUrl);
      try { capturedEditingImage.el.src = dataUrl; } catch { /* stale ref */ }
      setEditingImage(null);
      setNewImageUrl('');
    } catch {
      setEditHistory(h => [...h, { role: 'system', text: 'Failed to process uploaded image.' }]);
    }
    if (imgFileRef.current) imgFileRef.current.value = '';
  };

  const saveInlineEdits = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('img[data-img-editable]').forEach((img) => {
      img.removeEventListener('click', handleImageClick);
    });
    cleanupEditMarkers(doc);
    applyTrackedSwaps(doc);
    imageSwapsRef.current.clear();
    const updatedHtml = '<!doctype html>\n' + doc.documentElement.outerHTML;
    setSelectedHtml(updatedHtml);
    setInlineEditMode(false);
    inlineEditModeRef.current = false;
    setEditingImage(null);
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
    // Post-stream heal: send the accumulated HTML through the server's
    // tag-balancer so that any mid-stream cutoff or model-emitted dangling
    // tags get repaired before the user saves or runs a design review.
    try {
      if (result && result.includes('<!-- ===== CONTENT =====')) {
        const healRes = await fetch('/api/email-hub', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heal-html', html: result }),
        });
        if (healRes.ok) {
          const healJson = await healRes.json();
          if (healJson.healed && healJson.healed !== result) {
            result = healJson.healed;
            setSelectedHtml(result);
          }
        }
      }
    } catch (healErr) {
      // Best-effort; don't block on heal failure.
      console.warn('[heal-html] skipped:', healErr);
    }
    return result;
  };

  const handleEdit = async () => {
    if (!editInput.trim() || !selectedHtml) return;
    const rawInput = editInput.trim();
    const sectionCtx = taggedSection;
    const instruction = sectionCtx
      ? `[FOCUS ON THIS SECTION: "${sectionCtx.text}"] ${rawInput}`
      : rawInput;
    const displayText = sectionCtx ? `${rawInput}\n📍 ${sectionCtx.text}` : rawInput;
    setEditInput('');
    setTaggedSection(null);
    setEditing(true);
    setEditHistory(h => [...h, { role: 'user', text: displayText }]);

    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll('tr[data-section-hl]').forEach(el => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.outlineOffset = '';
        el.removeAttribute('data-section-hl');
      });
    }

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
    const htmlToCopy = inlineEditMode ? captureInlineEdits() : selectedHtml;
    navigator.clipboard.writeText(htmlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── AI Design Review ────────────────────────────────────

  const openDesignReview = useCallback(async () => {
    if (!selectedHtml) return;
    setReviewOpen(true);
    setReview(null);
    setReviewError(null);
    setAcceptedSuggestionIds(new Set());
    setReviewLoading(true);
    try {
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai-design-review', html: selectedHtml }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `Server returned ${res.status}`;
        try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await res.json() as DesignReview;
      setReview(data);
      // Pre-select all 3 suggestions by default — user can dismiss any they don't want
      setAcceptedSuggestionIds(new Set((data.suggestions || []).map(s => s.id)));
    } catch (e: unknown) {
      setReviewError({
        phase: 'review',
        message: e instanceof Error ? e.message : 'Review failed',
      });
    }
    setReviewLoading(false);
  }, [selectedHtml]);

  const toggleSuggestion = useCallback((id: string) => {
    setAcceptedSuggestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyAcceptedSuggestions = useCallback(async () => {
    if (!review || !selectedHtml) return;
    const accepted = review.suggestions.filter(s => acceptedSuggestionIds.has(s.id));
    if (!accepted.length) return;

    // Keep a backup so we can restore if something goes wrong.
    const backupHtml = selectedHtml;
    const t0 = Date.now();

    setApplyingReview(true);
    setApplyProgress('Queueing apply job...');
    setReviewError(null);

    const debugLog = (step: string, extra?: Record<string, unknown>) => {
      console.log(`[apply] +${Date.now() - t0}ms ${step}`, extra ?? '');
    };

    // Stable jobId so the client can resume polling even if the
    // initial response races the background function.
    const jobId = `apply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      debugLog('start', { jobId, htmlLen: selectedHtml.length, suggestions: accepted.length });

      const startRes = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-start',
          jobId,
          currentHtml: selectedHtml,
          suggestions: accepted.map(s => ({ title: s.title, fix: s.fix, category: s.category })),
        }),
      });

      if (!startRes.ok) {
        const text = await startRes.text().catch(() => '');
        let msg = `Server returned ${startRes.status}`;
        try { msg = JSON.parse(text).error || msg; } catch { if (text) msg = text.slice(0, 200); }
        throw new Error(msg);
      }
      const startData = await startRes.json();
      debugLog('started', startData);
      setApplyProgress('AI is generating changes...');

      // Poll for status. Cap at 8 min of total polling time — background
      // fn has 15 min, but we want to surface a useful error earlier.
      const POLL_INTERVAL_MS = 2000;
      const MAX_POLL_MS = 8 * 60 * 1000;
      const deadline = Date.now() + MAX_POLL_MS;
      let finalData: {
        status: string;
        html?: string;
        previewHtml?: string;
        opsSummary?: OpSummary[];
        auditNote?: string;
        error?: string;
        progress?: string;
        debug?: Record<string, unknown>;
      } | null = null;
      let consecutiveNetworkErrors = 0;

      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        let statusRes: Response;
        try {
          statusRes = await fetch('/api/email-hub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'apply-status', jobId }),
          });
        } catch (err) {
          consecutiveNetworkErrors++;
          debugLog('poll:network-error', { consecutive: consecutiveNetworkErrors, err: String(err) });
          if (consecutiveNetworkErrors >= 5) {
            throw Object.assign(
              new Error(`Lost connection to server while polling (${consecutiveNetworkErrors} consecutive errors).`),
              { debug: `jobId=${jobId}\nlastError=${String(err)}` },
            );
          }
          continue;
        }
        consecutiveNetworkErrors = 0;
        if (!statusRes.ok) {
          const text = await statusRes.text().catch(() => '');
          debugLog('poll:http-error', { status: statusRes.status, text: text.slice(0, 200) });
          if (statusRes.status === 404) {
            throw Object.assign(
              new Error('Job not found — background worker may have crashed before it started.'),
              { debug: `jobId=${jobId}` },
            );
          }
          continue;
        }
        const data = await statusRes.json();
        debugLog('poll', { status: data.status, progress: data.progress });
        if (data.progress && typeof data.progress === 'string') {
          setApplyProgress(data.progress);
        }

        if (data.status === 'preview_ready' || data.status === 'done' || data.status === 'error') {
          finalData = data;
          break;
        }
        // status === 'pending' or 'running' → keep polling
      }

      if (!finalData) {
        throw Object.assign(
          new Error('Apply did not complete within 8 minutes. Try again or accept fewer changes.'),
          { debug: `jobId=${jobId}` },
        );
      }

      if (finalData.status === 'error') {
        const dbgJson = finalData.debug ? JSON.stringify(finalData.debug, null, 2) : '';
        throw Object.assign(
          new Error(finalData.error || 'Apply failed'),
          { debug: `jobId=${jobId}\n${dbgJson}` },
        );
      }

      // New flow: preview_ready → open preview dialog. The committed
      // html path (finalData.status === 'done' with html set) only
      // happens if an older worker returned pre-patch-preview directly.
      const candidate = finalData.previewHtml || finalData.html || '';

      if (!candidate.includes('<!-- ===== FOOTER =====') || candidate.length < 2000) {
        throw Object.assign(
          new Error(`Final HTML was malformed (${candidate.length.toLocaleString()} bytes).`),
          { debug: JSON.stringify(finalData.debug || {}, null, 2) },
        );
      }

      debugLog('preview-ready', { finalLen: candidate.length, ...finalData.debug });

      if (finalData.status === 'preview_ready') {
        // Stage the preview — user must click Apply or Cancel.
        setPendingPreview({
          jobId,
          previewHtml: candidate,
          opsSummary: finalData.opsSummary || [],
          auditNote: finalData.auditNote || '',
          acceptedTitles: accepted.map(s => s.title),
          backupHtml,
        });
      } else {
        // Legacy path: status === 'done' (old worker) — commit immediately.
        setSelectedHtml(candidate);
        setEditHistory(h => [...h, {
          role: 'system',
          text: `Applied ${accepted.length} design review change${accepted.length === 1 ? '' : 's'}: ${accepted.map(s => s.title).join('; ')}`,
        }]);
        setReviewOpen(false);
        setReview(null);
        setAcceptedSuggestionIds(new Set());
      }
    } catch (e: unknown) {
      setSelectedHtml(backupHtml);
      const message = e instanceof Error ? e.message : 'Apply failed';
      const debug = (e && typeof e === 'object' && 'debug' in e) ? String((e as { debug?: unknown }).debug) : undefined;
      console.error(`[apply] FAILED in ${Date.now() - t0}ms:`, message, debug ?? '');
      setReviewError({ phase: 'apply', message, debug });
    }
    setApplyingReview(false);
    setApplyProgress('');
  }, [review, selectedHtml, acceptedSuggestionIds]);

  // ── Preview commit / cancel ─────────────────────────────

  const commitPreview = useCallback(async () => {
    if (!pendingPreview || previewCommitting) return;
    setPreviewCommitting(true);
    try {
      const res = await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-commit', jobId: pendingPreview.jobId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Commit failed (${res.status}): ${text.slice(0, 200)}`);
      }
      setSelectedHtml(pendingPreview.previewHtml);
      setEditHistory(h => [...h, {
        role: 'system',
        text: `Applied ${pendingPreview.acceptedTitles.length} design review change${pendingPreview.acceptedTitles.length === 1 ? '' : 's'}: ${pendingPreview.acceptedTitles.join('; ')}`,
      }]);
      setReviewOpen(false);
      setReview(null);
      setAcceptedSuggestionIds(new Set());
      setPendingPreview(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Commit failed';
      setReviewError({ phase: 'apply', message });
    } finally {
      setPreviewCommitting(false);
    }
  }, [pendingPreview, previewCommitting]);

  const cancelPreview = useCallback(async () => {
    if (!pendingPreview || previewCommitting) return;
    const { jobId, backupHtml } = pendingPreview;
    setPendingPreview(null);
    // Restore original in case anything transient referenced previewHtml.
    if (backupHtml && backupHtml !== selectedHtml) {
      setSelectedHtml(backupHtml);
    }
    // Fire-and-forget the server cancel — we don't block UI on it.
    try {
      await fetch('/api/email-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-cancel', jobId }),
      });
    } catch {
      /* ignore; the preview row will be GC'd by db TTL */
    }
  }, [pendingPreview, previewCommitting, selectedHtml]);

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

  const copyDraftLink = (id: string) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('draft', id);
    navigator.clipboard.writeText(url.toString());
  };

  const draftsDropdown = showDrafts && drafts.length > 0 && (
    <div className="border-b border-gray-200 bg-white px-6 py-2">
      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
        {drafts.map(d => (
          <DraftRow key={d.id} draft={d} onLoad={handleLoadDraft} onCopyLink={copyDraftLink} onDelete={handleDeleteDraft} />
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
                {/* Quick upload document */}
                {!directCopyMode && !directCopyText.trim() && (
                  <div
                    className="relative rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/70 cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.txt,.md,.html,.doc,.docx,.csv';
                      input.onchange = async (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const content = text.slice(0, 60000);
                          setDirectCopyMode(true);
                          setDirectCopyFiles([{ name: file.name, content }]);
                          setDirectCopyText(content);
                          const firstLine = content.split('\n').find(l => l.trim().length > 3)?.trim() || file.name.replace(/\.[^.]+$/, '');
                          if (!concept.trim()) setConcept(firstLine.slice(0, 80));
                        } catch { /* skip binary files */ }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="mx-auto h-6 w-6 text-emerald-500 mb-1.5" />
                    <p className="text-sm font-semibold text-emerald-700">Upload a Document</p>
                    <p className="text-[11px] text-emerald-600/70 mt-0.5">Drop a .txt, .md, or .html file and we&apos;ll build a Signos email from it</p>
                  </div>
                )}
                {directCopyMode && directCopyText.trim() && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-emerald-700 truncate">{directCopyFiles[0]?.name || 'Pasted content'}</p>
                      <p className="text-[10px] text-emerald-600">{Math.round(directCopyText.length / 5)} words loaded — will create email from this text</p>
                    </div>
                    <button onClick={() => { setDirectCopyMode(false); setDirectCopyText(''); setDirectCopyFiles([]); }} className="text-emerald-400 hover:text-emerald-700"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}

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
                  {/* Preset prompt chips — click to append variety/personalization instructions */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: "+ Add variety", prompt: "Make each section visually distinct — alternate between stat cards, pull quotes, cerise bands, bicolor headlines, and editorial pairs rather than stacking the same block type. No two adjacent sections should share the same module sequence." },
                      { label: "+ Personalize", prompt: "Personalize every headline and body paragraph with specific references to the topic and audience. Replace generic phrases like \"discover\" or \"learn more\" with phrases a senior copywriter would use for this exact topic and reader." },
                      { label: "+ Add stats/data", prompt: "Include at least one stat-highlight block with a large percentage or number relevant to the topic, plus one supporting stats-grid or comparison block that adds data depth." },
                      { label: "+ Cycle-email feel", prompt: "Model the structure on the Signos menstrual-cycle email: 3 themed sections, each introduced by a rail image with an icon, phase-title + subtitle (colored), body paragraphs with citations, then a polygon-cut card + \"How to put it to the test\" section. Use wave bands between phases." },
                      { label: "+ Editorial / magazine", prompt: "Give it an editorial-magazine feel — more JetBrains Mono numbered eyebrows (e.g. \"Chapter · 01\"), chapter-mark section headers (oversized numeral), pull quotes set in large italic, asymmetric photo-and-text pairs rather than centered stacks." },
                    ].map(p => (
                      <button
                        key={p.label}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setDetails(d => d.trim() ? `${d.trim()}\n\n${p.prompt}` : p.prompt)}
                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                        title={p.prompt}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
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
                      onClick={() => setShowPresetsPanel(!showPresetsPanel)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        showPresetsPanel || layout || palette || typeScale ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-60`}
                      title="Layout / palette / typography presets — the primary lever for making this email visually distinct"
                    >
                      <Palette className="h-3.5 w-3.5" /> Design
                      {(layout || palette || typeScale) && (
                        <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                          {[layout, palette, typeScale].filter(Boolean).length}
                        </span>
                      )}
                    </button>
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
                    <button
                      onClick={() => setDirectCopyMode(!directCopyMode)}
                      disabled={isGenerating}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        directCopyMode ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-60`}
                    >
                      <FileText className="h-3.5 w-3.5" /> Direct Copy
                    </button>
                  </div>
                </div>

                {/* Design Presets Panel — primary lever for visual variety */}
                {showPresetsPanel && (
                  <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">Design Presets</label>
                        <p className="mt-0.5 text-[11px] text-amber-700">
                          Choose a layout, palette, and type scale. These are the primary levers for making each email feel different from the last.
                        </p>
                      </div>
                      <button onClick={() => setShowPresetsPanel(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Layout</label>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {([
                          { id: '', label: 'Auto', desc: 'Let the system rotate layouts across options' },
                          { id: 'editorial', label: 'Editorial', desc: 'Magazine — big hero, long narrative' },
                          { id: 'newsletter', label: 'Newsletter', desc: '3–5 equal-weight sections' },
                          { id: 'announcement', label: 'Announcement', desc: 'Single focus, one big CTA' },
                          { id: 'digest', label: 'Digest', desc: 'List-driven, light imagery' },
                        ] as const).map(opt => (
                          <button
                            key={opt.id || 'auto'}
                            type="button"
                            onClick={() => setLayout(opt.id as typeof layout)}
                            disabled={isGenerating}
                            className={`rounded-md border px-2 py-2 text-left transition-colors ${
                              layout === opt.id
                                ? 'border-amber-500 bg-amber-100 text-amber-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/40'
                            } disabled:opacity-60`}
                          >
                            <div className="text-[11px] font-semibold">{opt.label}</div>
                            <div className="text-[10px] leading-tight text-gray-500">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Palette</label>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { id: '', label: 'Classic Cerise', swatch: '#fd3576' },
                          { id: 'cerise', label: 'Classic Cerise', swatch: '#fd3576' },
                          { id: 'navy', label: 'Navy-Forward', swatch: '#21263a' },
                          { id: 'warm', label: 'Warm', swatch: '#d97706' },
                          { id: 'cool', label: 'Cool', swatch: '#0d9488' },
                        ] as const).filter((_, i) => i !== 0 || !palette).slice(palette ? 1 : 0).map(opt => (
                          <button
                            key={opt.id || 'auto'}
                            type="button"
                            onClick={() => setPalette(opt.id as typeof palette)}
                            disabled={isGenerating}
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                              palette === opt.id
                                ? 'border-amber-500 bg-amber-100 text-amber-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
                            } disabled:opacity-60`}
                          >
                            <span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: opt.swatch }} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Type Scale</label>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {([
                          { id: '', label: 'Editorial (default)', desc: 'Signos magazine style' },
                          { id: 'display', label: 'Display', desc: 'Huge headlines, lots of air' },
                          { id: 'editorial', label: 'Editorial', desc: 'Classic Signos type pairing' },
                          { id: 'tight', label: 'Tight', desc: 'Compact, information-dense' },
                        ] as const).map(opt => (
                          <button
                            key={opt.id || 'auto'}
                            type="button"
                            onClick={() => setTypeScale(opt.id as typeof typeScale)}
                            disabled={isGenerating}
                            className={`rounded-md border px-2 py-2 text-left transition-colors ${
                              typeScale === opt.id
                                ? 'border-amber-500 bg-amber-100 text-amber-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
                            } disabled:opacity-60`}
                          >
                            <div className="text-[11px] font-semibold">{opt.label}</div>
                            <div className="text-[10px] leading-tight text-gray-500">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {(layout || palette || typeScale) && (
                      <div className="flex items-center justify-between rounded-md bg-white/70 px-2.5 py-1.5 text-[11px] text-gray-600">
                        <span>
                          Active:
                          {layout && <span className="ml-1 font-semibold text-amber-700">{layout}</span>}
                          {palette && <span className="ml-1 font-semibold text-amber-700">· {palette}</span>}
                          {typeScale && <span className="ml-1 font-semibold text-amber-700">· {typeScale}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setLayout(''); setPalette(''); setTypeScale(''); }}
                          className="text-[10px] font-medium text-gray-500 underline hover:text-gray-700"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Creative Direction Panel */}
                {showCreativePanel && (
                  <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Creative Direction</label>
                      <button onClick={() => setShowCreativePanel(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Visual Theme</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: '', label: 'Default' },
                          { id: 'female-focused', label: 'Female Focused' },
                          { id: 'male-focused', label: 'Male Focused' },
                          { id: 'clinical', label: 'Clinical / Science' },
                          { id: 'lifestyle', label: 'Lifestyle / Aspirational' },
                          { id: 'food-nutrition', label: 'Food & Nutrition' },
                          { id: 'fitness-active', label: 'Fitness / Active' },
                          { id: 'warm-community', label: 'Warm / Community' },
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setVisualTheme(t.id)}
                            disabled={isGenerating}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-60 ${
                              visualTheme === t.id
                                ? 'border-purple-400 bg-purple-100 text-purple-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Additional Direction</label>
                      <textarea
                        value={creativeDirection}
                        onChange={e => setCreativeDirection(e.target.value)}
                        placeholder="E.g., Use a warm and inviting tone, focus on food imagery, emphasize community feeling, include a sense of urgency for the offer..."
                        rows={2}
                        disabled={isGenerating}
                        className="w-full rounded border border-purple-200 bg-white px-2.5 py-1.5 text-xs focus:border-purple-400 focus:outline-none resize-none disabled:opacity-60"
                      />
                    </div>
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

                    {/* Content fidelity toggle */}
                    {uploadedFiles.length > 0 && (
                      <div className="rounded-md border border-blue-200 bg-white p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">How should uploaded content be used?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setContentFidelity('general')}
                            disabled={isGenerating}
                            className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                              contentFidelity === 'general'
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400/30'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <p className={`text-xs font-semibold ${contentFidelity === 'general' ? 'text-blue-700' : 'text-gray-700'}`}>General Direction</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Use as inspiration and reference — adapt freely</p>
                          </button>
                          <button
                            onClick={() => setContentFidelity('exact')}
                            disabled={isGenerating}
                            className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                              contentFidelity === 'exact'
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400/30'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <p className={`text-xs font-semibold ${contentFidelity === 'exact' ? 'text-blue-700' : 'text-gray-700'}`}>Follow Closely</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Preserve structure, key phrases, and flow from the content</p>
                          </button>
                        </div>
                      </div>
                    )}

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

                {/* Direct Copy Panel */}
                {directCopyMode && (
                  <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Direct Copy — Preserve Exact Wording</label>
                      <button onClick={() => { setDirectCopyMode(false); setDirectCopyText(''); setDirectCopyFiles([]); }} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Upload a text file and we&apos;ll build a clean Signos-branded email using the <strong>exact words</strong> from your document. No AI rewriting — just light formatting into a professional email layout.
                    </p>

                    <div>
                      <p className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1"><Upload className="h-3 w-3" /> Upload your content (.txt, .md, .html)</p>
                      <input
                        ref={directCopyFileRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.html,.csv"
                        onChange={handleDirectCopyUpload}
                        disabled={isGenerating}
                        className="w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-emerald-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-emerald-700 hover:file:bg-emerald-200"
                      />
                      {directCopyFiles.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {directCopyFiles.map(f => (
                            <span key={f.name} className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              {f.name}
                              <button onClick={() => removeDirectCopyFile(f.name)} className="text-emerald-400 hover:text-emerald-700"><X className="h-2.5 w-2.5" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {directCopyFiles.length === 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 mb-1">Or paste content directly</p>
                        <textarea
                          value={directCopyText}
                          onChange={e => setDirectCopyText(e.target.value)}
                          placeholder="Paste your email copy here..."
                          rows={6}
                          disabled={isGenerating}
                          className="w-full rounded border border-emerald-200 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-400 focus:outline-none resize-none disabled:opacity-60"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleGenerateOptions}
                  disabled={isGenerating || !concept.trim() || (directCopyMode && !directCopyText.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  {isGenerating
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {directCopyMode ? 'Building Email...' : 'Generating Emails...'}</>
                    : directCopyMode
                      ? <><FileText className="h-4 w-4" /> Build Direct Copy Email</>
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
          <button
            onClick={openDesignReview}
            disabled={!selectedHtml || reviewLoading || applyingReview}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
            title="AI reviews your email and suggests 3 specific design improvements"
          >
            {reviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            AI Design Review
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
          {draftId && (
            <button onClick={copyShareLink} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              {copiedLink ? <><Check className="h-3.5 w-3.5 text-green-500" /> Link Copied!</> : <><Share2 className="h-3.5 w-3.5" /> Share Link</>}
            </button>
          )}
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
            Edit Mode — Click <span className="text-blue-800">text</span> to edit directly, click <span className="text-purple-700">images</span> to replace them. Click &quot;Save Edits&quot; when done.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — tabbed: Chat / Blocks */}
        <div className="flex w-[380px] min-w-[380px] flex-col border-r border-gray-200 bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setLeftPanelMode('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${leftPanelMode === 'chat' ? 'text-brand-600 border-b-2 border-brand-500 bg-brand-50/30' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Chat
            </button>
            <button
              onClick={() => setLeftPanelMode('blocks')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${leftPanelMode === 'blocks' ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/30' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Blocks
            </button>
          </div>

          {leftPanelMode === 'chat' ? (
            <>
              <div ref={editScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {editHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
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
                {taggedSection && (
                  <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-medium text-blue-700 max-w-[65%]">
                      <span className="text-blue-400">&#x1f4cd;</span>
                      <span className="truncate">{taggedSection.text}</span>
                      <button onClick={() => {
                        setTaggedSection(null);
                        const doc = iframeRef.current?.contentDocument;
                        if (doc) doc.querySelectorAll('tr[data-section-hl]').forEach(el => {
                          (el as HTMLElement).style.outline = '';
                          (el as HTMLElement).style.outlineOffset = '';
                          el.removeAttribute('data-section-hl');
                        });
                      }} className="text-blue-400 hover:text-blue-700 ml-0.5 flex-shrink-0">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => moveSection('up')} title="Move section up" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><ArrowUp className="h-3 w-3" /></button>
                      <button onClick={() => moveSection('down')} title="Move section down" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><ArrowDown className="h-3 w-3" /></button>
                      <button onClick={() => setLeftPanelMode('blocks')} title="Insert block after this section" className="rounded p-1 text-purple-400 hover:bg-purple-50 hover:text-purple-700"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={editInput}
                    onChange={e => setEditInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleEdit()}
                    placeholder={taggedSection ? `Describe changes to "${taggedSection.text}"...` : 'Request changes...'}
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
                {!taggedSection && !inlineEditMode && phase === 'refining' && viewMode === 'preview' && (
                  <p className="mt-1.5 text-[9px] text-gray-400 text-center">Click any section in the preview to target your changes</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-gray-100">
                <p className="text-[10px] text-gray-500 mb-2">
                  {taggedSection
                    ? <>Inserting after: <span className="font-semibold text-blue-600">{taggedSection.text}</span></>
                    : 'Click a section in the preview first, or blocks will be added before the footer.'}
                </p>
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setBlockFilter('all')} className={`rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors ${blockFilter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>All</button>
                  {BLOCK_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button key={cat.id} onClick={() => setBlockFilter(cat.id)} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors ${blockFilter === cat.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        <Icon className="h-2.5 w-2.5" /> {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-2 space-y-1.5">
                {EMAIL_BLOCKS.filter(b => blockFilter === 'all' || b.category === blockFilter).map(block => (
                  <button
                    key={block.id}
                    onClick={() => insertBlock(block)}
                    className="w-full flex items-start gap-3 rounded-lg border border-gray-200 p-2.5 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-colors group"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 group-hover:text-purple-700">{block.name}</p>
                      <p className="text-[10px] text-gray-400 leading-snug">{block.description}</p>
                      <span className="inline-block mt-1 rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-medium text-gray-500 uppercase">{block.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — preview / code */}
        <div className={`relative flex-1 overflow-hidden ${!inlineEditMode && colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
                    if (!inlineEditModeRef.current) setupSectionClickHandlers();
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

          {/* Image editor popover */}
          {editingImage && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setEditingImage(null); setNewImageUrl(''); }} />
              <div
                className="fixed z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-2xl"
                style={{
                  top: Math.min(editingImage.rect.bottom + 8, window.innerHeight - 280),
                  left: Math.max(8, Math.min(editingImage.rect.left, window.innerWidth - 340)),
                }}
              >
                <div className="border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5 text-purple-500" /> Replace Image
                  </span>
                  <button onClick={() => { setEditingImage(null); setNewImageUrl(''); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {editingImage.src && !editingImage.src.startsWith('data:') && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400 mb-1">Current</p>
                      <p className="text-[10px] text-gray-500 truncate">{editingImage.src}</p>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">New Image URL</label>
                    <input
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newImageUrl.trim()) applyImageChange(newImageUrl.trim()); }}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-[9px] font-medium text-gray-400 uppercase">or</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <div>
                    <input ref={imgFileRef} type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                    <button
                      onClick={() => imgFileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs font-medium text-gray-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload Image File
                    </button>
                  </div>
                  <button
                    onClick={() => { if (newImageUrl.trim()) applyImageChange(newImageUrl.trim()); }}
                    disabled={!newImageUrl.trim() || newImageUrl === editingImage.src}
                    className="w-full rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
                  >
                    Apply URL
                  </button>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                  <button
                    onClick={removeImage}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Image
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {reviewOpen && (
        <DesignReviewModal
          review={review}
          loading={reviewLoading}
          applying={applyingReview}
          applyProgress={applyProgress}
          error={reviewError}
          accepted={acceptedSuggestionIds}
          onToggle={toggleSuggestion}
          onApply={applyAcceptedSuggestions}
          onClose={() => { if (!applyingReview) { setReviewOpen(false); setReview(null); setReviewError(null); } }}
          onRerun={openDesignReview}
          onRetryApply={applyAcceptedSuggestions}
          onDismissError={() => setReviewError(null)}
        />
      )}

      {pendingPreview && (
        <ApplyPreviewModal
          jobId={pendingPreview.jobId}
          previewHtml={pendingPreview.previewHtml}
          opsSummary={pendingPreview.opsSummary}
          auditNote={pendingPreview.auditNote}
          acceptedTitles={pendingPreview.acceptedTitles}
          committing={previewCommitting}
          onCommit={commitPreview}
          onCancel={cancelPreview}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DESIGN REVIEW MODAL
// ═══════════════════════════════════════════════════════

function DesignReviewModal(props: {
  review: DesignReview | null;
  loading: boolean;
  applying: boolean;
  applyProgress: string;
  error: { phase: 'review' | 'apply'; message: string; debug?: string } | null;
  accepted: Set<string>;
  onToggle: (id: string) => void;
  onApply: () => void;
  onClose: () => void;
  onRerun: () => void;
  onRetryApply: () => void;
  onDismissError: () => void;
}) {
  const { review, loading, applying, applyProgress, error, accepted, onToggle, onApply, onClose, onRerun, onRetryApply, onDismissError } = props;
  const [showDebug, setShowDebug] = useState(false);

  const categoryStyle = (cat: string) => {
    switch (cat) {
      case 'hierarchy':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Layers, label: 'HIERARCHY' };
      case 'design':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: Palette, label: 'DESIGN' };
      case 'content':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: FileText, label: 'CONTENT' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: Lightbulb, label: cat.toUpperCase() };
    }
  };

  const impactStyle = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-rose-100 text-rose-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const scoreColor = (s?: number) => {
    if (typeof s !== 'number') return 'text-gray-400';
    if (s >= 8) return 'text-green-600';
    if (s >= 6) return 'text-amber-600';
    return 'text-rose-600';
  };

  const acceptedCount = review?.suggestions.filter(s => accepted.has(s.id)).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <div className="flex h-full max-h-[720px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Wand2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Design Review</h2>
              <p className="text-xs text-gray-500">Up to 6 specific improvements a senior designer would make</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                Reading your email as a designer would…
              </div>
              <p className="mt-2 text-xs text-gray-400">Evaluating hierarchy, visual design, and content quality</p>
            </div>
          )}

          {error && !loading && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{error.phase === 'apply' ? 'Apply failed' : 'Review failed'}</p>
                    <button
                      onClick={onDismissError}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-medium uppercase tracking-wide"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-rose-600 mt-0.5 break-words">{error.message}</p>
                  <p className="mt-2 text-[11px] text-rose-500">
                    Your email was not changed. You can retry or tweak your selections.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {error.phase === 'apply' ? (
                      <button
                        onClick={onRetryApply}
                        disabled={applying}
                        className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Retry apply
                      </button>
                    ) : (
                      <button
                        onClick={onRerun}
                        className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Try again
                      </button>
                    )}
                    {error.debug && (
                      <button
                        onClick={() => setShowDebug(v => !v)}
                        className="rounded-md border border-rose-200 bg-white px-3 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                      >
                        {showDebug ? 'Hide' : 'Show'} debug
                      </button>
                    )}
                  </div>
                  {showDebug && error.debug && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-rose-100/60 border border-rose-200 p-2 text-[10px] leading-tight text-rose-800 whitespace-pre-wrap break-words">
{error.debug}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {review && !loading && (
            <>
              {review.overview && (
                <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Designer's Assessment</p>
                  <p className="text-sm leading-relaxed text-gray-700">{review.overview}</p>
                  {review.scores && Object.keys(review.scores).length > 0 && (
                    <div className="mt-3 flex gap-3">
                      {(['hierarchy', 'design', 'content'] as const).map(k => {
                        const val = review.scores?.[k];
                        if (typeof val !== 'number') return null;
                        return (
                          <div key={k} className="flex items-baseline gap-1.5">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{k}</span>
                            <span className={`text-sm font-bold ${scoreColor(val)}`}>{val}/10</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {review.linter && review.linter.findings.length > 0 && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Pattern Linter · {review.linter.summary.highSeverity} high · {review.linter.summary.mediumSeverity} medium · {review.linter.summary.lowSeverity} low
                    </p>
                    <p className="text-[10px] text-amber-700">
                      {review.linter.summary.totalBlocks} blocks, {review.linter.summary.sectionCount} sections
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {review.linter.findings.slice(0, 6).map((f, i) => (
                      <li key={i} className="text-xs leading-snug text-amber-900">
                        <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          f.severity === 'high' ? 'bg-rose-200 text-rose-900'
                            : f.severity === 'medium' ? 'bg-amber-200 text-amber-900'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {f.severity}
                        </span>
                        <span className="font-mono text-[10px] text-amber-800">{f.rule}</span>
                        <span className="ml-1.5">{f.note}</span>
                        {f.blockIds.length > 0 && (
                          <span className="ml-1 font-mono text-[10px] text-amber-700">
                            [{f.blockIds.slice(0, 4).join(', ')}{f.blockIds.length > 4 ? '…' : ''}]
                          </span>
                        )}
                      </li>
                    ))}
                    {review.linter.findings.length > 6 && (
                      <li className="text-[10px] italic text-amber-700">
                        …+{review.linter.findings.length - 6} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {review.suggestions.map((s, i) => {
                  const isAccepted = accepted.has(s.id);
                  const cat = categoryStyle(s.category);
                  const Icon = cat.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onToggle(s.id)}
                      disabled={applying}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        isAccepted
                          ? 'border-purple-400 bg-purple-50/50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      } ${applying ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors ${
                          isAccepted ? 'bg-purple-500 text-white' : 'border-2 border-gray-300 bg-white'
                        }`}>
                          {isAccepted && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${cat.bg} ${cat.border}`}>
                              <Icon className={`h-3 w-3 ${cat.text}`} />
                              <span className={`text-[9px] font-bold tracking-wide ${cat.text}`}>{cat.label}</span>
                            </div>
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${impactStyle(s.impact)}`}>
                              {s.impact} impact
                            </span>
                            <span className="ml-auto text-[10px] text-gray-400">#{i + 1}</span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h3>
                          {s.problem && (
                            <p className="text-xs text-gray-600 leading-relaxed mb-2">{s.problem}</p>
                          )}
                          {s.fix && (
                            <div className="rounded-md bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Proposed fix</p>
                              <p className="text-xs text-gray-700 leading-relaxed">{s.fix}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {review && !loading && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-2 text-xs text-gray-500">
              {applying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-purple-500" />
                  <span className="truncate font-medium text-gray-700">
                    {applyProgress || 'Working…'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                  <span className="font-medium text-gray-700">{acceptedCount}</span>
                  of {review.suggestions.length} changes selected
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRerun}
                disabled={applying}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Re-run review
              </button>
              <button
                onClick={onApply}
                disabled={applying || acceptedCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {applying ? 'Applying…' : `Apply ${acceptedCount} change${acceptedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  APPLY PREVIEW MODAL (staged patch review before commit)
// ═══════════════════════════════════════════════════════

type ApplyOpSummary =
  | { op: 'replace_text'; block_id: string; selector: string; preview: string }
  | { op: 'swap_image'; block_id: string; image_key: string }
  | { op: 'insert_module'; after_block_id: string; module: string }
  | { op: 'replace_module'; block_id: string; module: string }
  | { op: 'delete_block'; block_id: string }
  | { op: 'reorder'; block_id: string; after_block_id: string };

type DebugBundle = {
  claudeRaw?: string;
  opsDetail?: Array<{
    opIndex: number;
    op: ApplyOpSummary | Record<string, unknown>;
    blockId: string | null;
    status: 'applied' | 'failed' | 'dropped';
    reason?: string;
    beforeSnippet?: string;
    afterSnippet?: string;
  }>;
  preAudit?: { ok: boolean; topLevelTrCount: number; imbalances: string[] } | null;
  postAudit?: { ok: boolean; topLevelTrCount: number; imbalances: string[] } | null;
  healEvents?: Array<{
    blockIndex: number;
    action: string;
    count: number;
    position: 'between-blocks' | 'end-of-stream';
  }>;
  generatorMeta?: {
    model: string;
    totalMs: number;
    claudeMs: number;
    execMs: number;
    healMs: number;
    structuralCapped: number;
    structuralDropped: number;
  } | null;
};

function ApplyPreviewModal(props: {
  jobId: string;
  previewHtml: string;
  opsSummary: ApplyOpSummary[];
  auditNote: string;
  acceptedTitles: string[];
  committing: boolean;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const { jobId, previewHtml, opsSummary, auditNote, acceptedTitles, committing, onCommit, onCancel } = props;
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [debugOpen, setDebugOpen] = useState(false);
  const [debug, setDebug] = useState<DebugBundle | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [rawCopied, setRawCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDebugLoading(true);
    fetch('/api/email-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'apply-status', jobId, debug: true }),
    })
      .then(r => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.debugBundle) setDebug(data.debugBundle as DebugBundle);
      })
      .catch(() => { /* non-fatal */ })
      .finally(() => { if (!cancelled) setDebugLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  const copyRaw = () => {
    if (!debug?.claudeRaw) return;
    navigator.clipboard.writeText(debug.claudeRaw);
    setRawCopied(true);
    setTimeout(() => setRawCopied(false), 1500);
  };

  const opLabel = (op: ApplyOpSummary): { verb: string; detail: string; tone: 'safe' | 'structural' } => {
    switch (op.op) {
      case 'replace_text':
        return {
          verb: 'Edit text',
          detail: `${op.block_id} · ${op.selector} → "${op.preview.slice(0, 60)}${op.preview.length > 60 ? '…' : ''}"`,
          tone: 'safe',
        };
      case 'swap_image':
        return { verb: 'Swap image', detail: `${op.block_id} → ${op.image_key}`, tone: 'safe' };
      case 'insert_module':
        return { verb: 'Insert module', detail: `after ${op.after_block_id} · ${op.module}`, tone: 'structural' };
      case 'replace_module':
        return { verb: 'Replace module', detail: `${op.block_id} → ${op.module}`, tone: 'structural' };
      case 'delete_block':
        return { verb: 'Delete block', detail: op.block_id, tone: 'structural' };
      case 'reorder':
        return { verb: 'Reorder', detail: `${op.block_id} → after ${op.after_block_id}`, tone: 'structural' };
      default:
        return { verb: 'Change', detail: JSON.stringify(op).slice(0, 80), tone: 'structural' };
    }
  };

  const structuralCount = opsSummary.filter(o =>
    o.op === 'insert_module' || o.op === 'replace_module' || o.op === 'delete_block' || o.op === 'reorder'
  ).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
      <div className="flex h-full max-h-[820px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preview AI-proposed changes</h2>
              <p className="text-xs text-gray-500">
                {opsSummary.length} operation{opsSummary.length === 1 ? '' : 's'} staged · {acceptedTitles.length} suggestion{acceptedTitles.length === 1 ? '' : 's'} accepted
                {structuralCount > 0 && ` · ${structuralCount} structural`}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={committing}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: 2-column layout */}
        <div className="flex min-h-0 flex-1">

          {/* Left: summary panel */}
          <div className="flex w-[360px] flex-col border-r border-gray-100 bg-gray-50/50">

            {/* Accepted suggestions */}
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <CheckCircle2 className="h-3 w-3" />
                Suggestions accepted
              </div>
              <ul className="space-y-1">
                {acceptedTitles.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="mt-0.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ops summary */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                <Layers className="h-3 w-3" />
                Operations ({opsSummary.length})
              </div>
              {opsSummary.length === 0 ? (
                <p className="text-xs italic text-gray-400">No operations — preview unchanged.</p>
              ) : (
                <ul className="space-y-2">
                  {opsSummary.map((op, i) => {
                    const { verb, detail, tone } = opLabel(op);
                    return (
                      <li
                        key={i}
                        className={`rounded-md border px-2.5 py-2 text-xs ${
                          tone === 'structural'
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`font-semibold ${tone === 'structural' ? 'text-amber-800' : 'text-gray-800'}`}>
                          {verb}
                        </div>
                        <div className="mt-0.5 break-all font-mono text-[11px] text-gray-600">{detail}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Audit note */}
            {auditNote && (
              <div className="border-t border-gray-100 bg-blue-50 px-5 py-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                  <AlertCircle className="h-3 w-3" />
                  Structural audit
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900">{auditNote}</p>
              </div>
            )}

            {/* Debug panel — collapsed by default */}
            <div className="border-t border-gray-100 bg-white">
              <button
                type="button"
                onClick={() => setDebugOpen(v => !v)}
                className="flex w-full items-center justify-between px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 hover:bg-gray-50"
              >
                <span className="flex items-center gap-1.5">
                  <Code className="h-3 w-3" />
                  Debug
                  {debug?.generatorMeta && (
                    <span className="ml-1 font-mono text-[10px] font-normal normal-case tracking-normal text-gray-400">
                      {debug.generatorMeta.totalMs}ms · {debug.generatorMeta.structuralCapped}/{debug.generatorMeta.structuralCapped + debug.generatorMeta.structuralDropped} struct
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
              </button>
              {debugOpen && (
                <div className="max-h-[340px] overflow-y-auto border-t border-gray-100 px-5 py-3 text-[11px]">
                  {debugLoading && <p className="italic text-gray-400">Loading debug bundle…</p>}
                  {!debugLoading && !debug && <p className="italic text-gray-400">No debug data.</p>}
                  {debug && (
                    <div className="space-y-4">
                      {/* Timing summary */}
                      {debug.generatorMeta && (
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Runtime</div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-gray-700">
                            <div>model: <span className="text-gray-500">{debug.generatorMeta.model}</span></div>
                            <div>total: <span className="text-gray-500">{debug.generatorMeta.totalMs}ms</span></div>
                            <div>claude: <span className="text-gray-500">{debug.generatorMeta.claudeMs}ms</span></div>
                            <div>exec: <span className="text-gray-500">{debug.generatorMeta.execMs}ms</span></div>
                            <div>heal: <span className="text-gray-500">{debug.generatorMeta.healMs}ms</span></div>
                            <div>structural: <span className="text-gray-500">{debug.generatorMeta.structuralCapped} kept, {debug.generatorMeta.structuralDropped} dropped</span></div>
                          </div>
                        </div>
                      )}

                      {/* Pre vs post audit */}
                      {(debug.preAudit || debug.postAudit) && (
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Structural audit (before → after)</div>
                          <div className="grid grid-cols-2 gap-2">
                            {(['preAudit', 'postAudit'] as const).map((key) => {
                              const a = debug[key];
                              const label = key === 'preAudit' ? 'before' : 'after';
                              return (
                                <div key={key} className={`rounded-md border p-2 ${a?.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold uppercase text-gray-600">{label}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${a?.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
                                      {a?.ok ? 'OK' : 'BROKEN'}
                                    </span>
                                  </div>
                                  <div className="mt-1 font-mono text-[10px] text-gray-600">blocks: {a?.topLevelTrCount ?? '—'}</div>
                                  {a && !a.ok && a.imbalances.length > 0 && (
                                    <ul className="mt-1 space-y-0.5">
                                      {a.imbalances.slice(0, 3).map((s: string, i: number) => (
                                        <li key={i} className="break-all font-mono text-[10px] text-rose-800">{s}</li>
                                      ))}
                                      {a.imbalances.length > 3 && (
                                        <li className="text-[10px] italic text-rose-700">…+{a.imbalances.length - 3} more</li>
                                      )}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Heal events */}
                      {debug.healEvents && debug.healEvents.length > 0 && (
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Heal events ({debug.healEvents.length})</div>
                          <ul className="space-y-0.5">
                            {debug.healEvents.slice(0, 20).map((e, i) => (
                              <li key={i} className="flex items-center gap-2 font-mono text-[10px] text-gray-700">
                                <span className="w-16 text-gray-400">block {e.blockIndex}</span>
                                <span className="rounded bg-amber-100 px-1 text-amber-900">{e.action} ×{e.count}</span>
                                <span className="text-gray-400">{e.position}</span>
                              </li>
                            ))}
                          </ul>
                          {debug.healEvents.length > 20 && (
                            <p className="mt-1 text-[10px] italic text-gray-400">…+{debug.healEvents.length - 20} more</p>
                          )}
                        </div>
                      )}

                      {/* Ops detail table */}
                      {debug.opsDetail && debug.opsDetail.length > 0 && (
                        <div>
                          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Operations detail ({debug.opsDetail.length})</div>
                          <table className="w-full border-collapse font-mono text-[10px]">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-500">
                                <th className="py-1 pr-1">#</th>
                                <th className="pr-1">op</th>
                                <th className="pr-1">block</th>
                                <th className="pr-1">status</th>
                                <th>reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {debug.opsDetail.map((o) => {
                                const statusClass =
                                  o.status === 'applied' ? 'bg-emerald-100 text-emerald-900'
                                    : o.status === 'failed' ? 'bg-rose-100 text-rose-900'
                                    : 'bg-amber-100 text-amber-900';
                                return (
                                  <tr key={o.opIndex} className="border-b border-gray-50 align-top">
                                    <td className="py-1 pr-1 text-gray-400">{o.opIndex}</td>
                                    <td className="pr-1 text-gray-700">{(o.op as { op?: string }).op || '—'}</td>
                                    <td className="pr-1 text-gray-600">{o.blockId || '—'}</td>
                                    <td className="pr-1">
                                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${statusClass}`}>
                                        {o.status}
                                      </span>
                                    </td>
                                    <td className="break-words text-gray-500">{o.reason || ''}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Raw Claude response */}
                      {debug.claudeRaw && (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Raw Claude response</div>
                            <button
                              type="button"
                              onClick={copyRaw}
                              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-600 hover:bg-gray-50"
                            >
                              {rawCopied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              {rawCopied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-gray-900 p-2 font-mono text-[10px] leading-snug text-gray-100">
{debug.claudeRaw}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="border-t border-gray-100 bg-white px-5 py-4">
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  disabled={committing}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={onCommit}
                  disabled={committing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  {committing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {committing ? 'Applying…' : 'Apply to email'}
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-gray-500">
                Applying replaces the email HTML. Cancel keeps the current version.
              </p>
            </div>
          </div>

          {/* Right: preview iframe */}
          <div className="flex min-h-0 flex-1 flex-col bg-gray-100">
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
              <div className="text-xs font-medium text-gray-500">Preview</div>
              <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    previewDevice === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Monitor className="h-3 w-3" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    previewDevice === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Smartphone className="h-3 w-3" /> Mobile
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div
                className="mx-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all"
                style={{ maxWidth: previewDevice === 'mobile' ? 390 : '100%' }}
              >
                <iframe
                  srcDoc={previewHtml}
                  title="Preview of proposed changes"
                  className="h-[720px] w-full"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
