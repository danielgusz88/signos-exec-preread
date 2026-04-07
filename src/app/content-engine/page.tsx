'use client';

import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Video,
  Sparkles,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  Zap,
  FileText,
  Image as ImageIcon,
  Volume2,
  Film,
  AlertCircle,
  Pencil,
  Timer,
  DollarSign,
  Star,
  Shield,
  Eye,
  Target,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  BarChart3,
  Layers,
  Type,
  User,
  MessageSquareQuote,
  Utensils,
  Copy,
  MessageCircle,
  Send,
  RefreshCw,
  ExternalLink,
  Bot,
  Palette,
} from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType = 'testimonial' | 'data_card' | 'lifestyle' | 'food_comparison' | 'ugc_video' | 'edu_video';

interface ContentTypeOption {
  id: ContentType;
  label: string;
  description: string;
  outputs: ('image' | 'video')[];
  tier: 'post_ready' | 'near_final' | 'concept';
  tierLabel: string;
  color: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: 'testimonial', label: 'Testimonial Quote', description: 'Powerful quote on clean background', outputs: ['image'], tier: 'post_ready', tierLabel: 'Post-Ready', color: 'from-violet-500 to-purple-500' },
  { id: 'data_card', label: 'Data & Education Card', description: 'Bold stat or fact with explanation', outputs: ['image'], tier: 'post_ready', tierLabel: 'Post-Ready', color: 'from-teal-500 to-cyan-500' },
  { id: 'lifestyle', label: 'Lifestyle Aspiration', description: 'Aspirational photo with text overlay', outputs: ['image'], tier: 'near_final', tierLabel: '~2 min to post', color: 'from-amber-500 to-orange-500' },
  { id: 'food_comparison', label: 'Food Comparison', description: '"This vs That" food photography', outputs: ['image'], tier: 'near_final', tierLabel: '~2 min to post', color: 'from-lime-500 to-green-500' },
  { id: 'ugc_video', label: 'UGC Script + Preview', description: 'Script for creators + AI preview video', outputs: ['image', 'video'], tier: 'concept', tierLabel: 'Script + Preview', color: 'from-pink-500 to-rose-500' },
  { id: 'edu_video', label: 'Educational Script + Preview', description: 'Expert explainer script + AI preview', outputs: ['image', 'video'], tier: 'concept', tierLabel: 'Script + Preview', color: 'from-blue-500 to-indigo-500' },
];

const IMAGE_ONLY_TYPES: ContentType[] = ['testimonial', 'data_card', 'lifestyle', 'food_comparison'];

interface Platform {
  id: string;
  label: string;
  aspectRatio: string;
  maxDuration: number;
  icon: string;
}

const PLATFORMS: Platform[] = [
  { id: 'tiktok', label: 'TikTok', aspectRatio: '9:16', maxDuration: 60, icon: '🎵' },
  { id: 'instagram_reels', label: 'Instagram Reels', aspectRatio: '9:16', maxDuration: 90, icon: '📸' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', aspectRatio: '9:16', maxDuration: 60, icon: '▶️' },
  { id: 'instagram_feed', label: 'Instagram Feed', aspectRatio: '3:4', maxDuration: 60, icon: '📷' },
];

const VOICE_STYLES = [
  { id: 'female_health', label: 'Female Health Educator', prompt: 'Confident, warm female voice in her 30s. Speaks clearly with authority but approachably. Slight conversational tone.' },
  { id: 'male_clinical', label: 'Male Clinical Expert', prompt: 'Professional male doctor voice. Calm, authoritative, measured pace. Trustworthy and educational.' },
  { id: 'female_lifestyle', label: 'Female Lifestyle Coach', prompt: 'Energetic, friendly female voice. Upbeat and motivational. Like talking to a supportive friend.' },
  { id: 'male_casual', label: 'Male Casual Explainer', prompt: 'Relaxed, conversational male voice. Like explaining something interesting to a friend. Natural pacing.' },
  { id: 'female_urgent', label: 'Female Investigative', prompt: 'Intense, urgent female voice. Whistle-blower energy. "They don\'t want you to know this" vibe.' },
];

interface VideoIdea {
  id: string;
  contentType: ContentType;
  hook: string;
  angle: string;
  fullScript: string;
  ctaText: string;
  hookText: string;
  estimatedDuration: number;
  targetEmotion: string;
  imagePrompt: string;
  presenterDescription: string;
  headline?: string;
  subheadline?: string;
  textColor?: string;
  approved: boolean;
}

interface ReviewScores {
  overall: number;
  realism: number;
  hookStrength: number;
  scriptQuality: number;
  brandSafety: number;
  ctaEffectiveness: number;
  predictedEngagement: number;
  platformScores: Record<string, number>;
  verdict: 'publish' | 'edit_and_regenerate' | 'reject';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  platformNotes: Record<string, string>;
}

type JobPhase =
  | 'queued'
  | 'generating_image'
  | 'composing_image'
  | 'generating_assets'
  | 'generating_avatar'
  | 'composing'
  | 'complete'
  | 'reviewing'
  | 'reviewed'
  | 'error';

interface ContentJob {
  id: string;
  idea: VideoIdea;
  contentType: ContentType;
  phase: JobPhase;
  imageModel?: string;
  imageRequestId?: string;
  imageUrl?: string;
  imageDone: boolean;
  ttsModel?: string;
  ttsRequestId?: string;
  audioUrl?: string;
  ttsDone: boolean;
  avatarModel?: string;
  avatarRequestId?: string;
  avatarVideoUrl?: string;
  avatarDone: boolean;
  composeRenderId?: string;
  finalVideoUrl?: string;
  finalImageUrl?: string;
  review?: ReviewScores;
  error?: string;
  cost: number;
  parentJobId?: string;
  iterationNumber?: number;
  iterationReasoning?: string;
}

// ─── fal.ai + Shotstack API helpers ──────────────────────────────────────────

const FAL_MODELS = {
  image: 'fal-ai/kling-image/v3/text-to-image',
  tts: 'fal-ai/qwen-3-tts/voice-design/1.7b',
  avatar: 'fal-ai/kling-video/ai-avatar/v2/standard',
} as const;

async function falSubmit(model: string, input: Record<string, unknown>) {
  const res = await fetch('/api/content/fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', model, input }),
  });
  return res.json();
}

async function falStatus(model: string, requestId: string) {
  const res = await fetch('/api/content/fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', model, requestId }),
  });
  return res.json();
}

async function falResult(model: string, requestId: string) {
  const res = await fetch('/api/content/fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'result', model, requestId }),
  });
  const data = await res.json();
  if (data.error) {
    return { success: false, error: data.error, details: data.details, output: null, _debug: data._debug };
  }
  return data;
}

async function composeSubmit(payload: Record<string, unknown>) {
  const res = await fetch('/api/content/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', ...payload }),
  });
  return res.json();
}

async function composeStatus(renderId: string) {
  const res = await fetch('/api/content/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', renderId }),
  });
  return res.json();
}

async function recraftGenerate(prompt: string, size = '1024x1365', style = 'realistic_image') {
  const res = await fetch('/api/content/recraft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size, style }),
  });
  return res.json();
}

// ─── Feedback API helpers ─────────────────────────────────────────────────────

const FEEDBACK_TAGS = [
  { id: 'text_too_small', label: 'Text too small', positive: false },
  { id: 'text_unreadable', label: 'Text unreadable', positive: false },
  { id: 'bad_layout', label: 'Bad layout', positive: false },
  { id: 'bg_too_busy', label: 'Background busy', positive: false },
  { id: 'colors_wrong', label: 'Wrong colors', positive: false },
  { id: 'looks_fake', label: 'Looks artificial', positive: false },
  { id: 'headline_weak', label: 'Weak headline', positive: false },
  { id: 'cta_unclear', label: 'CTA unclear', positive: false },
  { id: 'off_brand', label: 'Off brand', positive: false },
  { id: 'great_overall', label: 'Great overall', positive: true },
  { id: 'great_headline', label: 'Great headline', positive: true },
  { id: 'nice_composition', label: 'Nice composition', positive: true },
  { id: 'good_colors', label: 'Good colors', positive: true },
  { id: 'text_readable', label: 'Text readable', positive: true },
  { id: 'would_post', label: 'Would post this', positive: true },
];

async function feedbackSave(feedback: {
  id: string; jobId: string; contentType: string; rating: number;
  tags: string[]; notes: string; imagePrompt: string; headline?: string; hook?: string; timestamp: number;
}) {
  const res = await fetch('/api/content/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', feedback }),
  });
  return res.json();
}

async function feedbackList(contentType?: string, limit = 30) {
  const res = await fetch('/api/content/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', contentType, limit }),
  });
  return res.json();
}

async function iteratePrompt(params: {
  originalPrompt: string; contentType: string; rating: number; tags: string[];
  notes: string; headline?: string; hook?: string; aiWeaknesses?: string[]; aiImprovements?: string[];
}) {
  const res = await fetch('/api/content/iterate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

async function feedbackSynthesize(contentType?: string) {
  const res = await fetch('/api/content/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'synthesize', contentType }),
  });
  return res.json();
}

// ─── Figma Cloud Agent API helpers ────────────────────────────────────────────

async function figmaAgentLaunch(adConcept: {
  contentType: string; headline: string; subheadline?: string; ctaText: string;
  attribution?: string; backgroundImageUrl: string; figmaTemplateUrl?: string;
  style?: string; targetEmotion?: string; notes?: string;
}) {
  const res = await fetch('/api/content/figma-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'launch', adConcept }),
  });
  return res.json();
}

async function figmaAgentStatus(agentId: string) {
  const res = await fetch('/api/content/figma-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', agentId }),
  });
  return res.json();
}

async function figmaAgentFollowup(agentId: string, followupText: string) {
  const res = await fetch('/api/content/figma-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'followup', agentId, followupText }),
  });
  return res.json();
}

async function figmaAgentList() {
  const res = await fetch('/api/content/figma-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });
  return res.json();
}

// ─── Result URL extraction helpers (handle varying fal.ai response structures) ─

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(output: any): string | undefined {
  if (!output) return undefined;
  if (output.images?.[0]?.url) return output.images[0].url;
  if (output.data?.images?.[0]?.url) return output.data.images[0].url;
  if (output.image?.url) return output.image.url;
  if (output.output?.images?.[0]?.url) return output.output.images[0].url;
  return deepFindUrl(output, 'image');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAudioUrl(output: any): string | undefined {
  if (!output) return undefined;
  if (output.audio?.url) return output.audio.url;
  if (output.audio_url) return output.audio_url;
  if (output.data?.audio?.url) return output.data.audio.url;
  if (output.output?.audio?.url) return output.output.audio.url;
  if (output.output?.audio_url) return output.output.audio_url;
  return deepFindUrl(output, 'audio');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVideoUrl(output: any): string | undefined {
  if (!output) return undefined;
  if (output.video?.url) return output.video.url;
  if (output.video_url) return output.video_url;
  if (output.data?.video?.url) return output.data.video.url;
  if (output.output?.video?.url) return output.output.video.url;
  return deepFindUrl(output, 'video');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepFindUrl(obj: any, hint: string, depth = 0): string | undefined {
  if (depth > 4 || !obj || typeof obj !== 'object') return undefined;
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'url' && typeof val === 'string' && val.startsWith('http')) return val;
    if (typeof val === 'string' && val.startsWith('http') && key.toLowerCase().includes(hint)) return val;
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        const found = deepFindUrl(item, hint, depth + 1);
        if (found) return found;
      }
    } else if (typeof val === 'object' && val !== null) {
      const found = deepFindUrl(val, hint, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── Cost estimation ──────────────────────────────────────────────────────────

const COST_PER_RECRAFT = 0.04;
const COST_PER_FAL_IMAGE = 0.028;
const COST_PER_TTS = 0.09;
const COST_PER_AVATAR_30S = 1.69;
const COST_PER_COMPOSE = 0.05;
const COST_PER_REVIEW = 0.03;

function estimateCost(count: number, ct: ContentType, withOverlay: boolean): number {
  const isImg = IMAGE_ONLY_TYPES.includes(ct);
  if (isImg) {
    return count * (COST_PER_RECRAFT + COST_PER_REVIEW);
  }
  return count * (
    COST_PER_FAL_IMAGE +
    COST_PER_TTS +
    COST_PER_AVATAR_30S +
    (withOverlay ? COST_PER_COMPOSE : 0) +
    COST_PER_REVIEW
  );
}

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<JobPhase, { label: string; color: string; icon: typeof Loader2 }> = {
  queued: { label: 'Queued', color: 'text-gray-500', icon: Clock },
  generating_image: { label: 'Generating Ad (Recraft V3)', color: 'text-blue-400', icon: ImageIcon },
  composing_image: { label: 'Compositing', color: 'text-purple-400', icon: Type },
  generating_assets: { label: 'Generating Image + Voice', color: 'text-blue-400', icon: ImageIcon },
  generating_avatar: { label: 'Generating Talking Head Video', color: 'text-amber-400', icon: Film },
  composing: { label: 'Adding Text Overlays', color: 'text-purple-400', icon: Layers },
  complete: { label: 'Complete', color: 'text-cyan-400', icon: Check },
  reviewing: { label: 'AI Reviewing...', color: 'text-violet-400', icon: Eye },
  reviewed: { label: 'Reviewed', color: 'text-emerald-400', icon: Check },
  error: { label: 'Error', color: 'text-red-400', icon: AlertCircle },
};

function contentTypeIcon(ct: ContentType) {
  switch (ct) {
    case 'testimonial': return MessageSquareQuote;
    case 'data_card': return BarChart3;
    case 'lifestyle': return ImageIcon;
    case 'food_comparison': return Utensils;
    case 'ugc_video': return User;
    case 'edu_video': return FileText;
  }
}

function tierBadgeStyle(tier: ContentTypeOption['tier']): string {
  switch (tier) {
    case 'post_ready': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'near_final': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'concept': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function ContentEnginePage() {
  // ── Config state ──
  const [contentType, setContentType] = useState<ContentType>('testimonial');
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'instagram_reels']);
  const [voiceStyle, setVoiceStyle] = useState(VOICE_STYLES[0].id);
  const [notes, setNotes] = useState('');
  const [ideaCount, setIdeaCount] = useState(1);
  const [enableTextOverlay, setEnableTextOverlay] = useState(true);

  // ── Ideation state ──
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [ideating, setIdeating] = useState(false);
  const [ideateError, setIdeateError] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);

  // ── Generation state ──
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [generating, setGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── History state ──
  const [history, setHistory] = useState<Array<{ id: string; timestamp: Date; topic: string; contentType: ContentType; platforms: string[]; totalItems: number; completedItems: number; totalCost: number; jobs: ContentJob[] }>>([]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const currentContentTypeConfig = CONTENT_TYPES.find((c) => c.id === contentType)!;
  const hasVideo = currentContentTypeConfig.outputs.includes('video');
  const isImageOnly = IMAGE_ONLY_TYPES.includes(contentType);

  // ── Review state ──
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [reviewSortBy, setReviewSortBy] = useState<'overall' | 'realism' | 'hookStrength' | 'predictedEngagement' | 'brandSafety'>('overall');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  // ── Section collapse state ──
  const [configOpen, setConfigOpen] = useState(true);
  const [ideasOpen, setIdeasOpen] = useState(true);
  const [generationOpen, setGenerationOpen] = useState(true);

  // ── Debug state ──
  const [debugLogs, setDebugLogs] = useState<Array<{ ts: string; msg: string; data?: string }>>([]);
  const [debugOpen, setDebugOpen] = useState(true);
  const addDebug = useCallback((msg: string, data?: unknown) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev.slice(-80), { ts, msg, data: data ? JSON.stringify(data, null, 2) : undefined }]);
  }, []);

  // ── Feedback state ──
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<string>>(new Set());
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [styleGuide, setStyleGuide] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);

  useEffect(() => {
    feedbackList(undefined, 5).then((data) => {
      if (data.success) setFeedbackCount(data.total || 0);
    }).catch(() => {});
  }, []);

  const handleFeedbackSubmit = useCallback(async (job: ContentJob, rating: number, tags: string[], notes: string) => {
    const entry = {
      id: `fb_${Date.now()}_${job.id}`,
      jobId: job.id,
      contentType: job.contentType,
      rating,
      tags,
      notes,
      imagePrompt: job.idea.imagePrompt,
      headline: job.idea.headline || job.idea.hook,
      hook: job.idea.hook,
      timestamp: Date.now(),
    };
    const result = await feedbackSave(entry);
    if (result.success) {
      setFeedbackSubmitted((prev) => { const next = new Set(Array.from(prev)); next.add(job.id); return next; });
      setFeedbackCount((prev) => prev + 1);
    }
    return result;
  }, []);

  const handleSynthesize = useCallback(async () => {
    setSynthesizing(true);
    try {
      const result = await feedbackSynthesize();
      if (result.success && result.guide) {
        setStyleGuide(result.guide);
      }
    } finally {
      setSynthesizing(false);
    }
  }, []);

  const handleIterate = useCallback(async (job: ContentJob, rating: number, tags: string[], notes: string) => {
    const isImage = IMAGE_ONLY_TYPES.includes(job.contentType);
    if (!isImage) return;

    const fbEntry = {
      id: `fb_${Date.now()}_${job.id}`,
      jobId: job.id,
      contentType: job.contentType,
      rating,
      tags,
      notes,
      imagePrompt: job.idea.imagePrompt,
      headline: job.idea.headline || job.idea.hook,
      hook: job.idea.hook,
      timestamp: Date.now(),
    };
    feedbackSave(fbEntry).then(() => {
      setFeedbackSubmitted((prev) => { const next = new Set(Array.from(prev)); next.add(job.id); return next; });
      setFeedbackCount((prev) => prev + 1);
    });

    addDebug(`[Iterate] Refining prompt for job ${job.id}...`);
    const refined = await iteratePrompt({
      originalPrompt: job.idea.imagePrompt,
      contentType: job.contentType,
      rating,
      tags,
      notes,
      headline: job.idea.headline || job.idea.hook,
      hook: job.idea.hook,
      aiWeaknesses: job.review?.weaknesses || [],
      aiImprovements: job.review?.improvements || [],
    });

    if (!refined.success || !refined.imagePrompt) {
      addDebug(`[Iterate] Prompt refinement failed`, refined);
      return;
    }
    addDebug(`[Iterate] Refined prompt ready. Reasoning: ${refined.reasoning}`);

    const parentIteration = job.iterationNumber || 1;
    const iterationId = `iter_${Date.now()}_${job.id}`;
    const newJob: ContentJob = {
      id: iterationId,
      idea: {
        ...job.idea,
        id: iterationId,
        imagePrompt: refined.imagePrompt,
        headline: refined.headline || job.idea.headline,
        hook: refined.headline || job.idea.hook,
      },
      contentType: job.contentType,
      phase: 'generating_image',
      imageDone: false,
      ttsDone: true,
      avatarDone: true,
      cost: 0,
      parentJobId: job.id,
      iterationNumber: parentIteration + 1,
      iterationReasoning: refined.reasoning || '',
    };

    setJobs((prev) => [newJob, ...prev]);
    setGenerating(true);
    setGenerationOpen(true);

    addDebug(`[Iterate] Generating with Recraft V3...`);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/88b67abd-b5ee-473f-8d50-7658689e1c4f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:iterate-pre-recraft',message:'Prompt being sent to Recraft',data:{promptLength:refined.imagePrompt.length,prompt:refined.imagePrompt},timestamp:Date.now(),hypothesisId:'H1-H3'})}).catch(()=>{});
    // #endregion
    const result = await recraftGenerate(refined.imagePrompt, '1024x1365', 'realistic_image');
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/88b67abd-b5ee-473f-8d50-7658689e1c4f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:iterate-post-recraft',message:'Recraft full result',data:{success:result.success,error:result.error,details:result.details,_request:result._request,hasUrl:!!result.imageUrl},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(()=>{});
    // #endregion
    addDebug(`[Iterate] Recraft result`, { success: result.success, error: result.error, details: result.details, _request: result._request });

    if (result.success && result.imageUrl) {
      newJob.imageUrl = result.imageUrl;
      newJob.finalImageUrl = result.imageUrl;
      newJob.imageDone = true;
      newJob.cost += COST_PER_RECRAFT;
      newJob.phase = 'reviewing';
      newJob.cost += COST_PER_REVIEW;
      setJobs((prev) => prev.map((j) => j.id === iterationId ? { ...newJob } : j));

      triggerReview(newJob).then((review) => {
        setJobs((prev) => prev.map((j) =>
          j.id === iterationId ? { ...j, phase: review ? 'reviewed' : 'complete', review: review || undefined } : j
        ));
        setExpandedReview(iterationId);
        setReviewsOpen(true);
        setGenerating(false);
      });
    } else {
      newJob.error = result.error || 'Recraft failed on iteration';
      newJob.phase = 'error';
      setJobs((prev) => prev.map((j) => j.id === iterationId ? { ...newJob } : j));
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDebug]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ── Ideation handler ──
  const handleIdeate = useCallback(async () => {
    if (!topic.trim()) return;
    setIdeating(true);
    setIdeateError(null);
    setIdeas([]);

    try {
      const res = await fetch('/api/content/ideate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          contentType,
          platforms: selectedPlatforms,
          voiceStyle: VOICE_STYLES.find((v) => v.id === voiceStyle)?.prompt || voiceStyle,
          notes: notes.trim(),
          count: ideaCount,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText.includes('{') ? (JSON.parse(errText).error || errText) : `HTTP ${res.status}: ${errText.substring(0, 200)}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Failed to parse ideas from response');

      const rawIdeas = JSON.parse(jsonMatch[0]);
      const ideasWithIds = rawIdeas.map((idea: Record<string, unknown>, i: number) => ({
        id: `idea_${Date.now()}_${i}`,
        contentType,
        ...idea,
        approved: true,
      }));

      setIdeas(ideasWithIds);
      setIdeasOpen(true);
    } catch (err) {
      setIdeateError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIdeating(false);
    }
  }, [topic, contentType, selectedPlatforms, voiceStyle, notes, ideaCount]);

  const toggleApproval = (id: string) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, approved: !i.approved } : i)));
  };

  const updateIdeaField = (id: string, field: keyof VideoIdea, value: string) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  // ── Review handler ──
  const triggerReview = useCallback(async (job: ContentJob) => {
    try {
      const res = await fetch('/api/content/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: job.finalVideoUrl || job.avatarVideoUrl || '',
          imageUrl: job.finalImageUrl || job.imageUrl || '',
          script: job.idea.fullScript,
          hook: job.idea.hook,
          ctaText: job.idea.ctaText,
          targetEmotion: job.idea.targetEmotion,
          platforms: selectedPlatforms,
        }),
      });
      const data = await res.json();
      if (data.success && data.review) return data.review as ReviewScores;
      return null;
    } catch {
      return null;
    }
  }, [selectedPlatforms]);

  // ── Generation handler ──
  const handleGenerate = useCallback(async () => {
    const approved = ideas.filter((i) => i.approved);
    if (approved.length === 0) return;

    setGenerating(true);
    setGenerationOpen(true);

    const aspectRatio = isImageOnly ? '3:4' : '9:16';
    const voice = VOICE_STYLES.find((v) => v.id === voiceStyle)?.prompt || '';

    const newJobs: ContentJob[] = approved.map((idea) => ({
      id: `job_${Date.now()}_${idea.id}`,
      idea,
      contentType,
      phase: 'queued' as JobPhase,
      imageDone: false,
      ttsDone: isImageOnly,
      avatarDone: isImageOnly,
      cost: 0,
      iterationNumber: 1,
    }));
    setJobs(newJobs);

    const updatedJobs = [...newJobs];

    for (let i = 0; i < updatedJobs.length; i++) {
      const job = updatedJobs[i];
      try {
        if (isImageOnly) {
          addDebug(`[Job ${i}] ${contentType} — generating with Recraft V3...`);
          job.phase = 'generating_image';
          setJobs([...updatedJobs]);

          const recraftSize = '1024x1365';
          const recraftStyle = (job.idea as VideoIdea & { recraftStyle?: string }).recraftStyle || 'realistic_image';
          const result = await recraftGenerate(job.idea.imagePrompt, recraftSize, recraftStyle);
          addDebug(`[Job ${i}] Recraft result`, { success: result.success, error: result.error, hasUrl: !!result.imageUrl });

          if (result.success && result.imageUrl) {
            job.imageUrl = result.imageUrl;
            job.finalImageUrl = result.imageUrl;
            job.imageDone = true;
            job.cost += COST_PER_RECRAFT;
            job.phase = 'reviewing';
            job.cost += COST_PER_REVIEW;
            addDebug(`[Job ${i}] Recraft DONE — finished ad ready`, { url: result.imageUrl.substring(0, 80) });

            triggerReview(job).then((review) => {
              setJobs((prev) => prev.map((j) =>
                j.id === job.id ? { ...j, phase: review ? 'reviewed' : 'complete', review: review || undefined } : j
              ));
            });
          } else {
            job.error = result.error || 'Recraft generation failed';
            job.phase = 'error';
            addDebug(`[Job ${i}] Recraft FAILED`, { error: result.error, details: result.details });
          }
        } else {
          addDebug(`[Job ${i}] ${contentType} — submitting image + TTS in parallel...`);

          const imgPromise = falSubmit(FAL_MODELS.image, {
            prompt: job.idea.imagePrompt,
            aspect_ratio: aspectRatio,
          }).then((result) => {
            addDebug(`[Job ${i}] Image submit`, { success: result.success, requestId: result.requestId });
            if (result.success) {
              job.imageModel = result.model;
              job.imageRequestId = result.requestId;
              job.cost += COST_PER_FAL_IMAGE;
            } else {
              job.error = result.error || 'Image submit failed';
            }
          });

          const ttsPromise = falSubmit(FAL_MODELS.tts, {
            text: job.idea.fullScript,
            prompt: voice,
            speed: 0.95,
          }).then((result) => {
            addDebug(`[Job ${i}] TTS submit`, { success: result.success, requestId: result.requestId });
            if (result.success) {
              job.ttsModel = result.model;
              job.ttsRequestId = result.requestId;
              job.cost += COST_PER_TTS;
            } else {
              job.error = result.error || 'TTS submit failed';
            }
          });

          await Promise.all([imgPromise, ttsPromise]);
          job.phase = job.error ? 'error' : 'generating_assets';
        }
      } catch (err) {
        job.phase = 'error';
        job.error = err instanceof Error ? err.message : 'Submit failed';
        addDebug(`[Job ${i}] SUBMIT ERROR`, String(err));
      }

      setJobs([...updatedJobs]);
    }

    startPolling(updatedJobs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas, selectedPlatforms, voiceStyle, enableTextOverlay, contentType, isImageOnly, addDebug]);

  // ── Polling logic ──
  const startPolling = (initialJobs: ContentJob[]) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    let currentJobs = [...initialJobs];

    pollingRef.current = setInterval(async () => {
      let changed = false;
      const updatedJobs = [...currentJobs];

      for (const job of updatedJobs) {
        if (['reviewed', 'complete', 'error'].includes(job.phase)) continue;
        if (job.phase === 'reviewing') continue;

        try {
          // Phase: generating_assets — poll image + TTS (video pipeline)
          if (job.phase === 'generating_assets') {
            if (!job.imageDone && job.imageModel && job.imageRequestId) {
              const status = await falStatus(job.imageModel, job.imageRequestId);
              if (status.status === 'COMPLETED') {
                const result = await falResult(job.imageModel, job.imageRequestId);
                addDebug(`Image result`, { outputKeys: result.output ? Object.keys(result.output) : 'no output', error: result.error, details: result.details?.substring?.(0, 300) || result.details, _debug: result._debug });
                job.imageUrl = extractImageUrl(result.output);
                job.imageDone = true;
                changed = true;
                addDebug(`Image COMPLETED`, { url: job.imageUrl?.substring(0, 80) || 'EXTRACTION FAILED' });
              } else if (status.status === 'FAILED' || status.error) {
                job.phase = 'error';
                job.error = 'Image generation failed';
                changed = true;
                addDebug(`Image FAILED`, status);
              }
            }

            if (!job.ttsDone && job.ttsModel && job.ttsRequestId) {
              const status = await falStatus(job.ttsModel, job.ttsRequestId);
              if (status.status === 'COMPLETED') {
                const result = await falResult(job.ttsModel, job.ttsRequestId);
                addDebug(`TTS result`, { outputKeys: result.output ? Object.keys(result.output) : 'no output', error: result.error, details: result.details?.substring?.(0, 300) || result.details, _debug: result._debug });
                job.audioUrl = extractAudioUrl(result.output);
                job.ttsDone = true;
                changed = true;
                addDebug(`TTS COMPLETED`, { url: job.audioUrl?.substring(0, 80) || 'EXTRACTION FAILED' });
              } else if (status.status === 'FAILED' || status.error) {
                job.phase = 'error';
                job.error = 'TTS generation failed';
                changed = true;
              }
            }

            if (job.imageDone && !job.imageUrl) {
              job.phase = 'error';
              job.error = 'Image completed but URL not found';
              changed = true;
            }
            if (job.ttsDone && !job.audioUrl) {
              job.phase = 'error';
              job.error = 'TTS completed but URL not found';
              changed = true;
            }

            if (job.imageDone && job.ttsDone && job.imageUrl && job.audioUrl) {
              addDebug(`Image + TTS ready, submitting avatar...`);
              job.phase = 'generating_avatar';
              changed = true;

              const avatarResult = await falSubmit(FAL_MODELS.avatar, {
                image_url: job.imageUrl,
                audio_url: job.audioUrl,
                prompt: 'Natural talking head. Subtle head movement, expressive facial gestures, direct eye contact with camera, realistic lip sync to audio.',
              });
              addDebug(`Avatar submit`, { success: avatarResult.success, requestId: avatarResult.requestId });

              if (avatarResult.success) {
                job.avatarModel = avatarResult.model;
                job.avatarRequestId = avatarResult.requestId;
                job.cost += COST_PER_AVATAR_30S;
              } else {
                job.phase = 'error';
                job.error = avatarResult.error || 'Avatar submit failed';
              }
              setJobs([...updatedJobs]);
            }
          }

          // Phase: generating_avatar — poll the avatar video
          if (job.phase === 'generating_avatar' && job.avatarModel && job.avatarRequestId) {
            const status = await falStatus(job.avatarModel, job.avatarRequestId);
            addDebug(`Avatar status`, { status: status.status, progress: status.progress });

            if (status.status === 'COMPLETED') {
              const result = await falResult(job.avatarModel, job.avatarRequestId);
              addDebug(`Avatar result`, { outputKeys: result.output ? Object.keys(result.output) : 'no output', error: result.error });
              job.avatarVideoUrl = extractVideoUrl(result.output);
              job.avatarDone = true;
              changed = true;
              addDebug(`Avatar COMPLETED`, { url: job.avatarVideoUrl?.substring(0, 60) });

              if (enableTextOverlay && (job.idea.hookText || job.idea.ctaText)) {
                addDebug(`Submitting Shotstack text overlay...`);
                const composeResult = await composeSubmit({
                  clipUrls: [job.avatarVideoUrl!],
                  audioUrl: '',
                  hookText: job.idea.hookText,
                  ctaText: job.idea.ctaText,
                  enableTextOverlay: true,
                  aspectRatio: '9:16',
                  videoDuration: 30,
                });
                addDebug(`Compose submit`, composeResult);

                if (composeResult.success) {
                  job.composeRenderId = composeResult.renderId;
                  job.phase = 'composing';
                  job.cost += COST_PER_COMPOSE;
                } else {
                  addDebug(`Overlay failed, using raw avatar video`, { error: composeResult.error });
                  job.finalVideoUrl = job.avatarVideoUrl;
                  job.phase = 'reviewing';
                  job.cost += COST_PER_REVIEW;
                }
              } else {
                job.finalVideoUrl = job.avatarVideoUrl;
                job.phase = 'reviewing';
                job.cost += COST_PER_REVIEW;
              }
              changed = true;

              if (job.phase === 'reviewing') {
                triggerReview(job).then((review) => {
                  setJobs((prev) =>
                    prev.map((j) =>
                      j.id === job.id
                        ? { ...j, phase: review ? 'reviewed' : 'complete', review: review || undefined }
                        : j
                    )
                  );
                });
              }
            } else if (status.status === 'FAILED' || status.error) {
              job.phase = 'error';
              job.error = 'Avatar video generation failed';
              changed = true;
              addDebug(`Avatar FAILED`, status);
            }
          }

          // Phase: composing — poll Shotstack render
          if (job.phase === 'composing' && job.composeRenderId) {
            const status = await composeStatus(job.composeRenderId);
            addDebug(`Compose status`, { status: status.status });

            if (status.status === 'done') {
              job.finalVideoUrl = status.url;
              job.phase = 'reviewing';
              job.cost += COST_PER_REVIEW;
              changed = true;
              addDebug(`Compose DONE`, { url: status.url?.substring(0, 80) });

              triggerReview(job).then((review) => {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === job.id
                      ? { ...j, phase: review ? 'reviewed' : 'complete', review: review || undefined }
                      : j
                  )
                );
              });
            } else if (status.status === 'failed') {
              addDebug(`Compose failed, falling back to raw avatar video`);
              job.finalVideoUrl = job.avatarVideoUrl;
              job.phase = 'reviewing';
              changed = true;

              triggerReview(job).then((review) => {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === job.id
                      ? { ...j, phase: review ? 'reviewed' : 'complete', review: review || undefined }
                      : j
                  )
                );
              });
            }
          }
        } catch (err) {
          addDebug(`POLL ERROR`, { jobId: job.id, phase: job.phase, error: String(err) });
          console.error(`Polling error for job ${job.id}:`, err);
        }
      }

      if (changed) {
        currentJobs = updatedJobs;
        setJobs([...updatedJobs]);
      }

      const allDone = updatedJobs.every(
        (j) => j.phase === 'reviewed' || j.phase === 'complete' || j.phase === 'error'
      );
      if (allDone) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setGenerating(false);

        setHistory((prev) => [{
          id: `run_${Date.now()}`,
          timestamp: new Date(),
          topic,
          contentType,
          platforms: selectedPlatforms,
          totalItems: updatedJobs.length,
          completedItems: updatedJobs.filter((j) => j.phase === 'reviewed' || j.phase === 'complete').length,
          totalCost: updatedJobs.reduce((s, j) => s + j.cost, 0),
          jobs: updatedJobs,
        }, ...prev]);
      }
    }, 6000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const approvedCount = ideas.filter((i) => i.approved).length;
  const estimatedTotal = estimateCost(approvedCount, contentType, enableTextOverlay);
  const completedJobs = jobs.filter((j) => j.phase === 'reviewed' || j.phase === 'complete').length;
  const errorJobs = jobs.filter((j) => j.phase === 'error').length;
  const reviewedJobs = jobs.filter((j) => j.phase === 'reviewed' && j.review);
  const sortedReviewedJobs = [...reviewedJobs].sort(
    (a, b) => (b.review?.[reviewSortBy] ?? 0) - (a.review?.[reviewSortBy] ?? 0)
  );

  const imagesDone = jobs.filter((j) => j.imageDone).length;
  const ttsDoneCount = jobs.filter((j) => j.ttsDone).length;
  const avatarsDone = jobs.filter((j) => j.avatarDone).length;
  const overlaysDone = jobs.filter((j) => ['complete', 'reviewing', 'reviewed'].includes(j.phase)).length;

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Content Engine</h1>
              <p className="text-xs text-gray-500">AI-powered multi-format content for Signos conversion</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-500">
            <span className="text-gray-500">Mode:</span>{' '}
            <span className="font-medium text-gray-700">{currentContentTypeConfig.label}</span>
          </div>
        </div>
      </div>

      {/* ── Content Type Selector ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {CONTENT_TYPES.map((ct) => {
          const Icon = contentTypeIcon(ct.id);
          return (
            <button
              key={ct.id}
              onClick={() => setContentType(ct.id)}
              className={cn(
                'relative rounded-xl border p-4 text-left transition-all',
                contentType === ct.id
                  ? 'border-brand-500/40 bg-brand-500/5 ring-1 ring-brand-500/20'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br', ct.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', tierBadgeStyle(ct.tier))}>
                  {ct.tierLabel}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{ct.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{ct.description}</p>
              <div className="mt-2 flex gap-1.5">
                {ct.outputs.map((o) => (
                  <span key={o} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gray-500">
                    {o}
                  </span>
                ))}
              </div>
              {contentType === ct.id && (
                <div className="absolute right-3 bottom-3">
                  <Check className="h-4 w-4 text-brand-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Conversion Mission Banner ── */}
      <div className="rounded-lg border border-brand-500/20 bg-gradient-to-r from-brand-500/5 to-purple-500/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
          <div>
            <p className="text-sm font-semibold text-brand-600">Tiered Content Engine</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Three tiers of content — choose your speed-to-publish:
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2">
                <span className="mt-0.5 text-[10px] font-bold text-emerald-400">POST-READY</span>
                <span className="text-[11px] text-gray-500">Download and post within 60 seconds</span>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/[0.03] px-3 py-2">
                <span className="mt-0.5 text-[10px] font-bold text-amber-400">~2 MIN</span>
                <span className="text-[11px] text-gray-500">Add your logo in Canva and post</span>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/[0.03] px-3 py-2">
                <span className="mt-0.5 text-[10px] font-bold text-blue-400">CONCEPT</span>
                <span className="text-[11px] text-gray-500">Hand the script to a creator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Configuration Section ── */}
      <Card>
        <button onClick={() => setConfigOpen(!configOpen)} className="flex w-full items-center justify-between">
          <CardHeader title="Configuration" subtitle="Set up your Signos ad generation parameters" />
          {configOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {configOpen && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Target Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                      selectedPlatforms.includes(p.id)
                        ? 'border-brand-500/40 bg-brand-500/10 text-brand-600'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <span>{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-[10px] text-gray-500">{p.aspectRatio}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn('grid grid-cols-1 gap-4', hasVideo ? 'lg:grid-cols-2' : '')}>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Ad Angle / Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={isImageOnly
                    ? 'e.g., CGM benefits, weight loss transformation, blood sugar control'
                    : 'e.g., weight loss plateau, blood sugar spikes, CGM benefits, GLP-1 graduation'}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                />
              </div>
              {hasVideo && (
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Presenter Voice</label>
                  <select
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                  >
                    {VOICE_STYLES.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Creative Direction</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g., Focus on the &quot;your healthy food might be spiking you&quot; angle. Mention CGM sensor. Target women 30-45 who've tried diets..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/20 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Ads to Generate</label>
                <select
                  value={ideaCount}
                  onChange={(e) => setIdeaCount(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500/40 focus:outline-none"
                >
                  {[1, 2, 3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'ad' : 'ads'}</option>
                  ))}
                </select>
              </div>

              {hasVideo && (
                <button
                  onClick={() => setEnableTextOverlay(!enableTextOverlay)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all',
                    enableTextOverlay
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-600'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  )}
                >
                  <Type className="h-4 w-4" />
                  <span className="font-medium">Text Overlays</span>
                  <span className={cn('text-[10px]', enableTextOverlay ? 'text-brand-500' : 'text-gray-500')}>
                    {enableTextOverlay ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              <button
                onClick={handleIdeate}
                disabled={ideating || !topic.trim() || selectedPlatforms.length === 0}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all',
                  ideating || !topic.trim() || selectedPlatforms.length === 0
                    ? 'bg-zinc-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20'
                )}
              >
                {ideating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {ideating ? 'Writing Concepts...' : `Generate ${currentContentTypeConfig.label} Concepts`}
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              <span className="font-medium text-gray-500">Pipeline ({currentContentTypeConfig.label}):</span>{' '}
              {hasVideo ? (
                <>AI writes conversion script → generates presenter image → creates TTS narration → Kling Avatar v2 generates 30s talking-head video
                {enableTextOverlay && <span> → Shotstack adds text overlays</span>}
                <span> → outputs <span className="text-gray-700">image ad + video ad</span> → AI reviews quality</span></>
              ) : (
                <>AI writes ad concept → <span className="text-gray-700">Recraft V3 generates finished ad with text</span> (single step) → AI reviews quality</>
              )}
            </div>

            {ideateError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="mb-1 inline h-4 w-4" /> {ideateError}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Ideas Section ── */}
      {ideas.length > 0 && (
        <Card>
          <button onClick={() => setIdeasOpen(!ideasOpen)} className="flex w-full items-center justify-between">
            <CardHeader
              title={`Ad Concepts (${approvedCount}/${ideas.length} approved)`}
              subtitle="Review conversion scripts before generation"
            />
            {ideasOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>

          {ideasOpen && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setIdeas((prev) => prev.map((i) => ({ ...i, approved: true })))} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 transition-colors">Approve All</button>
                <button onClick={() => setIdeas((prev) => prev.map((i) => ({ ...i, approved: false })))} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 transition-colors">Reject All</button>
                <div className="ml-auto text-xs text-gray-500">
                  Est. cost: <span className="font-medium text-gray-700">${estimatedTotal.toFixed(2)}</span>
                  {' '}for {approvedCount} {hasVideo ? `${approvedCount === 1 ? 'concept' : 'concepts'} (image + 30s video each)` : `image ${approvedCount === 1 ? 'ad' : 'ads'}`}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    isEditing={editingIdeaId === idea.id}
                    onToggleApproval={() => toggleApproval(idea.id)}
                    onEdit={() => setEditingIdeaId(editingIdeaId === idea.id ? null : idea.id)}
                    onUpdateField={(field, value) => updateIdeaField(idea.id, field, value)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500">
                  <DollarSign className="mr-1 inline h-3.5 w-3.5" />
                  Estimated cost: <span className="font-semibold text-gray-900">${estimatedTotal.toFixed(2)}</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <Timer className="mr-1 inline h-3.5 w-3.5" />
                  ~{Math.ceil(approvedCount * (isImageOnly ? 1.5 : 3))} min generation time
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating || approvedCount === 0}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all',
                    generating || approvedCount === 0
                      ? 'bg-zinc-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20'
                  )}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {generating ? 'Generating...' : `Generate ${approvedCount} ${currentContentTypeConfig.label} ${approvedCount === 1 ? 'Ad' : 'Ads'}`}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Generation Progress ── */}
      {jobs.length > 0 && (
        <Card>
          <button onClick={() => setGenerationOpen(!generationOpen)} className="flex w-full items-center justify-between">
            <CardHeader
              title={`Generation Pipeline (${completedJobs}/${jobs.length} complete${errorJobs > 0 ? `, ${errorJobs} failed` : ''})`}
              subtitle={`${currentContentTypeConfig.label} pipeline`}
            />
            {generationOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>

          {generationOpen && (
            <div className="space-y-3">
              <div className="mb-4 flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 overflow-x-auto">
                <PipelineStep label={isImageOnly ? 'Recraft V3' : 'Image'} icon={ImageIcon} completedCount={imagesDone} totalCount={jobs.length} />
                {!isImageOnly && (
                  <>
                    <PipelineArrow />
                    <PipelineStep label="Voice" icon={Volume2} completedCount={ttsDoneCount} totalCount={jobs.length} />
                    <PipelineArrow />
                    <PipelineStep label="Avatar" icon={User} completedCount={avatarsDone} totalCount={jobs.length} />
                    <PipelineArrow />
                    <PipelineStep label={enableTextOverlay ? 'Overlay' : 'Final'} icon={Layers} completedCount={overlaysDone} totalCount={jobs.length} />
                  </>
                )}
                <PipelineArrow />
                <PipelineStep label="Review" icon={Eye} completedCount={jobs.filter((j) => j.phase === 'reviewed').length} totalCount={jobs.length} />
              </div>

              {jobs.map((job) => (
                <JobRow key={job.id} job={job} enableTextOverlay={enableTextOverlay} onFeedback={handleFeedbackSubmit} feedbackSubmitted={feedbackSubmitted.has(job.id)} />
              ))}

              <div className="border-t border-gray-200 pt-3 text-right text-xs text-gray-500">
                Total cost so far: <span className="font-semibold text-gray-900">${jobs.reduce((s, j) => s + j.cost, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── AI Review Results ── */}
      {reviewedJobs.length > 0 && (
        <Card>
          <button onClick={() => setReviewsOpen(!reviewsOpen)} className="flex w-full items-center justify-between">
            <CardHeader title={`AI Review Results (${reviewedJobs.length} reviewed)`} subtitle="Quality scores, platform fit, and conversion potential" />
            {reviewsOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>

          {reviewsOpen && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <ReviewStatCard label="Avg Score" value={(reviewedJobs.reduce((s, j) => s + (j.review?.overall ?? 0), 0) / reviewedJobs.length).toFixed(1)} suffix="/10" color="text-brand-500" />
                <ReviewStatCard label="Publish" value={String(reviewedJobs.filter((j) => j.review?.verdict === 'publish').length)} suffix={`/${reviewedJobs.length}`} color="text-emerald-400" />
                <ReviewStatCard label="Edit & Redo" value={String(reviewedJobs.filter((j) => j.review?.verdict === 'edit_and_regenerate').length)} suffix={`/${reviewedJobs.length}`} color="text-amber-400" />
                <ReviewStatCard label="Reject" value={String(reviewedJobs.filter((j) => j.review?.verdict === 'reject').length)} suffix={`/${reviewedJobs.length}`} color="text-red-400" />
                <ReviewStatCard label="Avg Realism" value={(reviewedJobs.reduce((s, j) => s + (j.review?.realism ?? 0), 0) / reviewedJobs.length).toFixed(1)} suffix="/10" color="text-cyan-400" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Sort by:</span>
                {([['overall', 'Overall'], ['realism', 'Realism'], ['hookStrength', 'Hook'], ['predictedEngagement', 'Engagement'], ['brandSafety', 'Brand Safety']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setReviewSortBy(key)} className={cn('rounded-md px-2 py-1 text-[10px] font-semibold transition-all', reviewSortBy === key ? 'bg-brand-500/15 text-brand-500 border border-brand-500/30' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:text-gray-700')}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {sortedReviewedJobs.map((job) => (
                  <ReviewCard
                    key={job.id}
                    job={job}
                    expanded={expandedReview === job.id}
                    onToggle={() => setExpandedReview(expandedReview === job.id ? null : job.id)}
                    onIterate={handleIterate}
                    onFeedbackOnly={handleFeedbackSubmit}
                    feedbackDone={feedbackSubmitted.has(job.id)}
                    hasChildIteration={jobs.some((j) => j.parentJobId === job.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <Card>
          <CardHeader title="Generation History" subtitle="Past ad generation runs" />
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-100">
                <button onClick={() => setExpandedHistory(expandedHistory === entry.id ? null : entry.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500">{entry.timestamp.toLocaleString()}</div>
                    <div className="text-sm font-medium text-gray-700 truncate max-w-xs">{entry.topic}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] rounded bg-gray-100 px-1.5 py-0.5 text-gray-500 uppercase">{entry.contentType}</span>
                    <span className="text-xs text-emerald-400">{entry.completedItems}/{entry.totalItems} ads</span>
                    <span className="text-xs text-gray-500">${entry.totalCost.toFixed(2)}</span>
                    {expandedHistory === entry.id ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
                  </div>
                </button>
                {expandedHistory === entry.id && (
                  <div className="border-t border-gray-200 px-4 py-3 space-y-2">
                    {entry.jobs.map((job) => <JobRow key={job.id} job={job} enableTextOverlay={false} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Debug Log ── */}
      {debugLogs.length > 0 && (
        <Card>
          <button onClick={() => setDebugOpen(!debugOpen)} className="flex w-full items-center justify-between">
            <CardHeader title={`Debug Log (${debugLogs.length} entries)`} subtitle="Real-time pipeline debugging" />
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); setDebugLogs([]); }} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-900">Clear</button>
              {debugOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>
          </button>
          {debugOpen && (
            <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-black/30 p-3 font-mono text-[11px]">
              {debugLogs.map((log, i) => (
                <div key={i} className="border-b border-white/[0.03] py-1.5">
                  <span className="text-gray-400">{log.ts}</span>{' '}
                  <span className={log.msg.includes('ERROR') || log.msg.includes('FAILED') || log.msg.includes('BUG') ? 'text-red-400 font-bold' : log.msg.includes('COMPLETED') || log.msg.includes('DONE') ? 'text-emerald-400' : 'text-gray-700'}>{log.msg}</span>
                  {log.data && <pre className="mt-0.5 ml-4 text-[10px] text-gray-500 whitespace-pre-wrap break-all">{log.data}</pre>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Feedback & Learning ── */}
      <Card>
        <CardHeader title="Feedback & Continuous Learning" subtitle={`${feedbackCount} ratings collected — improving future generations`} />
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
            <MessageCircle className="h-5 w-5 flex-shrink-0 text-brand-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-700">
                Rate each generated ad to teach the system your preferences. Feedback is stored in Netlify and injected into future prompts.
              </p>
              <p className="mt-1 text-[10px] text-gray-500">
                {feedbackCount === 0 && 'No feedback yet — rate your first ad to start the learning loop.'}
                {feedbackCount > 0 && feedbackCount < 5 && `${feedbackCount} ratings collected. Add more for better results.`}
                {feedbackCount >= 5 && feedbackCount < 15 && `${feedbackCount} ratings collected. Click "Update Style Guide" to synthesize your preferences.`}
                {feedbackCount >= 15 && `${feedbackCount} ratings collected. Your style guide is actively improving generations.`}
              </p>
            </div>
            <button
              onClick={handleSynthesize}
              disabled={synthesizing || feedbackCount < 3}
              className={cn('flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all',
                synthesizing || feedbackCount < 3
                  ? 'bg-zinc-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20'
              )}
            >
              {synthesizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {synthesizing ? 'Synthesizing...' : 'Update Style Guide'}
            </button>
          </div>

          {styleGuide && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Active Style Guide</span>
              </div>
              <pre className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{styleGuide}</pre>
            </div>
          )}
        </div>
      </Card>

      {/* ── API Key Status ── */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Required Environment Variables</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <EnvVarStatus name="ANTHROPIC_API_KEY" description="Claude for ad scripts + review" />
          <EnvVarStatus name="RECRAFT_API_KEY" description="Recraft V3 for finished image ads" />
          <EnvVarStatus name="FAL_KEY" description="fal.ai for TTS + Avatar (video)" />
          <EnvVarStatus name="SHOTSTACK_API_KEY" description="Video overlays (optional)" />
          <EnvVarStatus name="CURSOR_API_KEY" description="Cloud Agents for Figma workflow" />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function IdeaCard({ idea, isEditing, onToggleApproval, onEdit, onUpdateField }: {
  idea: VideoIdea; isEditing: boolean; onToggleApproval: () => void; onEdit: () => void; onUpdateField: (field: keyof VideoIdea, value: string) => void;
}) {
  const isVideo = !IMAGE_ONLY_TYPES.includes(idea.contentType);
  const typeConfig = CONTENT_TYPES.find((c) => c.id === idea.contentType);
  const [scriptCopied, setScriptCopied] = useState(false);

  const handleCopyScript = async () => {
    if (!idea.fullScript) return;
    try {
      await navigator.clipboard.writeText(idea.fullScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className={cn('rounded-lg border p-4 transition-all', idea.approved ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-gray-200 bg-gray-50 opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
              idea.contentType === 'testimonial' && 'bg-violet-500/10 text-violet-400',
              idea.contentType === 'data_card' && 'bg-teal-500/10 text-teal-400',
              idea.contentType === 'lifestyle' && 'bg-amber-500/10 text-amber-400',
              idea.contentType === 'food_comparison' && 'bg-lime-500/10 text-lime-400',
              idea.contentType === 'ugc_video' && 'bg-pink-500/10 text-pink-400',
              idea.contentType === 'edu_video' && 'bg-blue-500/10 text-blue-400',
            )}>{idea.contentType.replace('_', ' ')}</span>
            {typeConfig && (
              <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', tierBadgeStyle(typeConfig.tier))}>
                {typeConfig.tierLabel}
              </span>
            )}
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
              idea.targetEmotion === 'curiosity' && 'bg-blue-500/10 text-blue-400',
              idea.targetEmotion === 'fear' && 'bg-red-500/10 text-red-400',
              idea.targetEmotion === 'hope' && 'bg-emerald-500/10 text-emerald-400',
              idea.targetEmotion === 'shock' && 'bg-amber-500/10 text-amber-400',
              idea.targetEmotion === 'frustration' && 'bg-orange-500/10 text-orange-400',
              idea.targetEmotion === 'relief' && 'bg-cyan-500/10 text-cyan-400',
              !['curiosity', 'fear', 'hope', 'shock', 'frustration', 'relief'].includes(idea.targetEmotion) && 'bg-purple-500/10 text-purple-400',
            )}>{idea.targetEmotion}</span>
            <span className="text-[10px] text-gray-500">{isVideo ? '30s talking head + image' : 'image ad'}</span>
            {idea.presenterDescription && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <User className="h-2.5 w-2.5" /> {idea.presenterDescription}
              </span>
            )}
          </div>

          {isEditing ? (
            <input type="text" value={idea.hook} onChange={(e) => onUpdateField('hook', e.target.value)}
              className="mb-2 w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-sm font-bold text-gray-900 focus:border-brand-500/40 focus:outline-none" />
          ) : (
            <h4 className="mb-1 text-sm font-bold text-gray-900 leading-tight">&ldquo;{idea.hook}&rdquo;</h4>
          )}
          <p className="mb-2 text-xs text-gray-500">{idea.angle}</p>

          {!isVideo && idea.headline && (
            <div className="mb-2 rounded-md bg-gray-100 px-3 py-2 border border-gray-200">
              <p className="text-xs font-bold text-gray-900">{idea.headline}</p>
              {idea.subheadline && <p className="text-[11px] text-gray-500 mt-0.5">{idea.subheadline}</p>}
            </div>
          )}

          {isVideo && idea.fullScript && (
            <div className="mb-2 rounded-md bg-gray-100 px-3 py-2.5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Script (hand to creator)</span>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {scriptCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {isEditing ? (
                <textarea
                  value={idea.fullScript}
                  onChange={(e) => onUpdateField('fullScript', e.target.value)}
                  rows={6}
                  className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-brand-500/40 focus:outline-none resize-none"
                />
              ) : (
                <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{idea.fullScript}</p>
              )}
            </div>
          )}

          {!isVideo && idea.fullScript && (
            <details className="group mb-2">
              <summary className="cursor-pointer text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
                <FileText className="mr-1 inline h-3 w-3" /> View Ad Copy
              </summary>
              <div className="mt-2 rounded-md bg-gray-100 p-3 border border-gray-200">
                {isEditing ? (
                  <textarea
                    value={idea.fullScript}
                    onChange={(e) => onUpdateField('fullScript', e.target.value)}
                    rows={6}
                    className="w-full rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-900 focus:border-brand-500/40 focus:outline-none resize-none"
                  />
                ) : (
                  <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{idea.fullScript}</p>
                )}
              </div>
            </details>
          )}

          <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
            {idea.hookText && <span>Hook: <span className="text-red-400 font-medium">{idea.hookText}</span></span>}
            {idea.ctaText && <span>CTA: <span className="text-emerald-400 font-medium">{idea.ctaText}</span></span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onToggleApproval} className={cn('flex h-8 w-8 items-center justify-center rounded-lg border transition-all', idea.approved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700')}>
            {idea.approved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
          <button onClick={onEdit} className={cn('flex h-8 w-8 items-center justify-center rounded-lg border transition-all', isEditing ? 'border-brand-500/30 bg-brand-500/10 text-brand-500' : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700')}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function JobRow({ job, enableTextOverlay, onFeedback, feedbackSubmitted }: {
  job: ContentJob; enableTextOverlay: boolean;
  onFeedback?: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<unknown>;
  feedbackSubmitted?: boolean;
}) {
  const phaseInfo = PHASE_CONFIG[job.phase];
  const PhaseIcon = phaseInfo.icon;
  const isTerminal = ['reviewed', 'complete', 'error'].includes(job.phase);
  const jobIsImageOnly = IMAGE_ONLY_TYPES.includes(job.contentType);
  const jobHasVideo = !jobIsImageOnly;
  const [scriptCopied, setScriptCopied] = useState(false);

  const handleCopyScript = async () => {
    if (!job.idea.fullScript) return;
    try {
      await navigator.clipboard.writeText(job.idea.fullScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
          {job.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-zinc-700" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-200">&ldquo;{job.idea.hook}&rdquo;</p>
          <div className="flex items-center gap-2 mt-0.5">
            {!isTerminal ? <Loader2 className={cn('h-3 w-3 animate-spin', phaseInfo.color)} /> : <PhaseIcon className={cn('h-3 w-3', phaseInfo.color)} />}
            <span className={cn('text-xs font-medium', phaseInfo.color)}>{phaseInfo.label}</span>
            {job.error && <span className="text-xs text-red-400/70">— {job.error}</span>}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <PhaseIndicator done={job.imageDone} active={(job.phase === 'generating_assets' || job.phase === 'generating_image') && !job.imageDone} label={jobIsImageOnly ? 'AD' : 'IMG'} />
          {jobHasVideo && (
            <>
              <div className="w-2 border-t border-zinc-700" />
              <PhaseIndicator done={job.ttsDone} active={job.phase === 'generating_assets' && !job.ttsDone} label="TTS" />
              <div className="w-2 border-t border-zinc-700" />
              <PhaseIndicator done={job.avatarDone} active={job.phase === 'generating_avatar'} label="VID" />
              <div className="w-2 border-t border-zinc-700" />
              <PhaseIndicator done={['complete', 'reviewing', 'reviewed'].includes(job.phase)} active={job.phase === 'composing'} label={enableTextOverlay ? 'TXT' : 'OK'} />
            </>
          )}
          <div className="w-2 border-t border-zinc-700" />
          <PhaseIndicator done={job.phase === 'reviewed'} active={job.phase === 'reviewing'} label="REV" />
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">${job.cost.toFixed(2)}</p>
        </div>

        {job.review && (
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold',
            job.review.overall >= 8 ? 'border-emerald-500/30 text-emerald-400' : job.review.overall >= 6 ? 'border-blue-500/30 text-blue-400' : job.review.overall >= 4 ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'
          )}>{job.review.overall.toFixed(0)}</div>
        )}
      </div>

      {/* Script section for video types */}
      {isTerminal && jobHasVideo && job.idea.fullScript && (
        <div className="mt-3 rounded-md bg-gray-100 px-3 py-2.5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Script for Creator</span>
            <button
              onClick={handleCopyScript}
              className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Copy className="h-3 w-3" />
              {scriptCopied ? 'Copied!' : 'Copy Script'}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{job.idea.fullScript}</p>
        </div>
      )}

      {/* Output previews — final image ad and/or video */}
      {isTerminal && (job.finalImageUrl || job.imageUrl || job.finalVideoUrl || job.avatarVideoUrl) && (
        <div className={cn('mt-3 grid gap-3 border-t border-gray-200 pt-3', jobHasVideo ? 'grid-cols-2' : 'grid-cols-1')}>
          {(job.finalImageUrl || job.imageUrl) && (
            <div className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500"><ImageIcon className="mr-1 inline h-3 w-3" />{job.finalImageUrl && job.finalImageUrl !== job.imageUrl ? 'Final Ad' : 'Image'}</span>
                <a
                  href={job.finalImageUrl || job.imageUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download Ad
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.finalImageUrl || job.imageUrl} alt="Generated ad" className="w-full aspect-[3/4] object-cover" />
            </div>
          )}
          {jobHasVideo && (job.finalVideoUrl || job.avatarVideoUrl) && (
            <div className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500"><Video className="mr-1 inline h-3 w-3" />Video Ad (30s)</span>
                <a
                  href={job.finalVideoUrl || job.avatarVideoUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download Video
                </a>
              </div>
              <video src={job.finalVideoUrl || job.avatarVideoUrl} controls className="w-full aspect-[9/16] object-cover bg-black" />
            </div>
          )}
        </div>
      )}

      {/* Feedback Widget */}
      {isTerminal && job.phase !== 'error' && onFeedback && (
        <FeedbackWidget job={job} onSubmit={onFeedback} alreadySubmitted={feedbackSubmitted || false} />
      )}
    </div>
  );
}

function FeedbackWidget({ job, onSubmit, alreadySubmitted }: {
  job: ContentJob;
  onSubmit: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<unknown>;
  alreadySubmitted: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [expanded, setExpanded] = useState(false);

  if (submitted) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2">
        <Check className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs text-emerald-400 font-medium">Feedback saved — will improve future generations</span>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-500 hover:text-zinc-200 hover:border-gray-300 transition-all w-full"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Rate this ad to improve future generations
      </button>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(job, rating, selectedTags, notes);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  return (
    <div className="mt-3 rounded-lg border border-brand-500/20 bg-brand-500/[0.02] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">Rate This Ad</span>
        <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-gray-700"><X className="h-3.5 w-3.5" /></button>
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            className={cn('flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
              s <= rating
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500'
            )}
          >
            <Star className={cn('h-4 w-4', s <= rating && 'fill-current')} />
          </button>
        ))}
        <span className="ml-2 text-xs text-gray-500">
          {rating === 0 && 'Select rating'}
          {rating === 1 && 'Poor — would never use'}
          {rating === 2 && 'Below average'}
          {rating === 3 && 'OK — needs work'}
          {rating === 4 && 'Good — minor tweaks'}
          {rating === 5 && 'Excellent — post-ready'}
        </span>
      </div>

      {/* Structured Tags */}
      {rating > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            {rating <= 2 ? 'What needs improvement?' : rating >= 4 ? 'What worked well?' : 'Select all that apply'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS
              .filter((t) => rating <= 2 ? !t.positive : rating >= 4 ? t.positive : true)
              .map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn('rounded-md border px-2 py-1 text-[10px] font-medium transition-all',
                  selectedTags.includes(tag.id)
                    ? tag.positive
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                      : 'border-red-500/40 bg-red-500/15 text-red-400'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700'
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free Text */}
      {rating > 0 && (
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any specific feedback? e.g., 'Make text bigger', 'Love the warm tones', 'CTA should say something different'..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500/40 focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Submit */}
      {rating > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">{selectedTags.length} tags selected{notes ? ' + notes' : ''}</span>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={cn('flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
              submitting ? 'bg-zinc-700 text-gray-500' : 'bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:from-brand-500 hover:to-purple-500'
            )}
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {submitting ? 'Saving...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseIndicator({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className={cn('flex h-6 min-w-[2.5rem] items-center justify-center rounded px-1 text-[8px] font-bold',
      done && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      active && 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse',
      !done && !active && 'bg-gray-100 text-gray-400 border border-gray-200'
    )}>{label}</div>
  );
}

function PipelineStep({ label, icon: Icon, completedCount, totalCount }: { label: string; icon: typeof ImageIcon; completedCount: number; totalCount: number }) {
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4', pct === 100 ? 'text-emerald-400' : 'text-gray-500')} />
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-500">{completedCount}/{totalCount}</p>
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="text-gray-400">
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none"><path d="M0 6H16M16 6L11 1M16 6L11 11" stroke="currentColor" strokeWidth="1.5" /></svg>
    </div>
  );
}

function EnvVarStatus({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-100 px-3 py-2">
      <div className="h-2 w-2 rounded-full bg-zinc-600" />
      <div>
        <p className="text-xs font-mono text-gray-700">{name}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// REVIEW COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function ReviewStatCard({ label, value, suffix, color }: { label: string; value: string; suffix: string; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold', color)}>{value}<span className="text-xs font-normal text-gray-500">{suffix}</span></p>
    </div>
  );
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: typeof Star }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-blue-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-blue-400' : score >= 4 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
      <div className="w-24 flex-shrink-0 text-xs text-gray-500">{label}</div>
      <div className="flex-1"><div className="h-2 rounded-full bg-gray-100"><div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${pct}%` }} /></div></div>
      <span className={cn('w-8 text-right text-xs font-bold', textColor)}>{score.toFixed(1)}</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const config = { publish: { label: 'Publish', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: ThumbsUp }, edit_and_regenerate: { label: 'Edit & Redo', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Pencil }, reject: { label: 'Reject', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: ThumbsDown } }[verdict] || { label: verdict, color: 'bg-zinc-500/10 text-gray-500 border-zinc-500/20', icon: AlertCircle };
  const Icon = config.icon;
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold', config.color)}><Icon className="h-3 w-3" />{config.label}</span>;
}

function FigmaAgentPanel({ job }: { job: ContentJob }) {
  const [launching, setLaunching] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [followup, setFollowup] = useState('');
  const [sendingFollowup, setSendingFollowup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = IMAGE_ONLY_TYPES.includes(job.contentType);
  if (!isImage) return null;

  const handleLaunch = async () => {
    if (!job.imageUrl && !job.finalImageUrl) return;
    setLaunching(true);
    setError(null);
    try {
      const result = await figmaAgentLaunch({
        contentType: job.contentType,
        headline: job.idea.headline || job.idea.hook,
        subheadline: job.idea.subheadline || '',
        ctaText: job.idea.ctaText || 'Learn More',
        attribution: job.contentType === 'testimonial' ? `— ${job.idea.hook.split('"')[0] || 'Signos Member'}` : undefined,
        backgroundImageUrl: job.finalImageUrl || job.imageUrl || '',
        style: job.idea.targetEmotion,
        targetEmotion: job.idea.targetEmotion,
      });
      if (result.success && result.agentId) {
        setAgentId(result.agentId);
        setAgentStatus(result.agent?.status || 'running');
        startPolling(result.agentId);
      } else {
        setError(result.error || 'Failed to launch agent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Launch failed');
    } finally {
      setLaunching(false);
    }
  };

  const startPolling = (id: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const result = await figmaAgentStatus(id);
        if (result.success && result.agent) {
          setAgentStatus(result.agent.status);
          if (['completed', 'stopped', 'failed', 'error'].includes(result.agent.status)) {
            setPolling(false);
            clearInterval(interval);
          }
        }
      } catch {
        // keep polling
      }
    }, 15000);
  };

  const handleFollowup = async () => {
    if (!agentId || !followup.trim()) return;
    setSendingFollowup(true);
    try {
      await figmaAgentFollowup(agentId, followup);
      setFollowup('');
    } finally {
      setSendingFollowup(false);
    }
  };

  const statusColor = {
    running: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    completed: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    stopped: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    failed: 'text-red-400 border-red-500/30 bg-red-500/10',
    error: 'text-red-400 border-red-500/30 bg-red-500/10',
  }[agentStatus || ''] || 'text-gray-500 border-gray-200 bg-gray-50';

  if (agentId) {
    return (
      <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Figma Cloud Agent</span>
          <span className={cn('ml-auto rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase', statusColor)}>
            {agentStatus || 'unknown'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-mono text-[10px] text-gray-500">{agentId}</span>
          <a
            href={`https://cursor.com/agents`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View in Cursor
          </a>
        </div>

        {polling && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Agent is working in Figma... polling every 15s
          </div>
        )}

        {agentStatus === 'completed' && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Agent finished — check the repo for the exported ad PNG</span>
          </div>
        )}

        {/* Follow-up input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            placeholder="Send a follow-up instruction to the agent..."
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-500/40 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleFollowup()}
          />
          <button
            onClick={handleFollowup}
            disabled={sendingFollowup || !followup.trim()}
            className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              sendingFollowup ? 'bg-zinc-700 text-gray-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            )}
          >
            {sendingFollowup ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-500/15 bg-indigo-500/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Figma Design Agent</span>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Launch a Cursor Cloud Agent to open Figma and create a polished ad with perfect typography using the AI-generated background image.
      </p>
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
      <button
        onClick={handleLaunch}
        disabled={launching}
        className={cn('flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all w-full justify-center',
          launching
            ? 'bg-zinc-700 text-gray-500'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20'
        )}
      >
        {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
        {launching ? 'Launching Cloud Agent...' : 'Create Ad in Figma with Cloud Agent'}
      </button>
    </div>
  );
}

function ReviewFeedbackPanel({ job, onIterate, onFeedbackOnly, feedbackDone, hasChildIteration }: {
  job: ContentJob;
  onIterate?: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<void>;
  onFeedbackOnly?: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<unknown>;
  feedbackDone: boolean;
  hasChildIteration: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [iterating, setIterating] = useState(false);
  const [savingOnly, setSavingOnly] = useState(false);
  const [lastAction, setLastAction] = useState<'iterated' | 'saved' | null>(feedbackDone ? 'saved' : null);

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const resetForm = () => {
    setRating(0);
    setSelectedTags([]);
    setNotes('');
    setLastAction(null);
  };

  const handleIterate = async () => {
    if (rating === 0 || !onIterate) return;
    setIterating(true);
    try {
      await onIterate(job, rating, selectedTags, notes);
      setLastAction('iterated');
    } finally {
      setIterating(false);
    }
  };

  const handleSaveOnly = async () => {
    if (rating === 0 || !onFeedbackOnly) return;
    setSavingOnly(true);
    try {
      await onFeedbackOnly(job, rating, selectedTags, notes);
      setLastAction('saved');
    } finally {
      setSavingOnly(false);
    }
  };

  if (lastAction) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-3">
          <Check className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">
            {lastAction === 'iterated'
              ? 'Feedback saved — new iteration generating. Check the review list for the updated version.'
              : 'Feedback saved — will improve future generations.'}
          </span>
        </div>
        {!hasChildIteration && (
          <button
            onClick={resetForm}
            className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Iterate again with different feedback
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.02] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Your Feedback</span>
        <span className="ml-auto text-[10px] text-gray-500">Rate → Add notes → Iterate or Save</span>
      </div>

      {/* Star Rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            className={cn('flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
              s <= rating
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                : 'border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-500'
            )}
          >
            <Star className={cn('h-4.5 w-4.5', s <= rating && 'fill-current')} />
          </button>
        ))}
        <span className="ml-3 text-xs text-gray-500">
          {rating === 0 && 'Select a rating'}
          {rating === 1 && 'Poor — would never use'}
          {rating === 2 && 'Below average — major issues'}
          {rating === 3 && 'OK — needs work'}
          {rating === 4 && 'Good — minor tweaks needed'}
          {rating === 5 && 'Excellent — post-ready'}
        </span>
      </div>

      {/* Structured Tags */}
      {rating > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            {rating <= 2 ? 'What needs improvement?' : rating >= 4 ? 'What worked well?' : 'Select all that apply'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FEEDBACK_TAGS
              .filter((t) => rating <= 2 ? !t.positive : rating >= 4 ? t.positive : true)
              .map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all',
                  selectedTags.includes(tag.id)
                    ? tag.positive
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                      : 'border-red-500/40 bg-red-500/15 text-red-400'
                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700'
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free Text */}
      {rating > 0 && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Specific feedback: 'Make the headline bigger', 'Use warmer tones', 'CTA should say Get Started', 'Background is too busy'..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-amber-500/40 focus:outline-none resize-none"
        />
      )}

      {/* Action Buttons */}
      {rating > 0 && (
        <div className="flex items-center gap-3 pt-1">
          {onIterate && (
            <button
              onClick={handleIterate}
              disabled={iterating || savingOnly}
              className={cn('flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all',
                iterating
                  ? 'bg-zinc-700 text-gray-500'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/20'
              )}
            >
              {iterating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {iterating ? 'Iterating...' : `Iterate & Regenerate → V${(job.iterationNumber || 1) + 1}`}
            </button>
          )}
          {onFeedbackOnly && (
            <button
              onClick={handleSaveOnly}
              disabled={iterating || savingOnly}
              className={cn('flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all',
                savingOnly
                  ? 'border-zinc-700 text-gray-500'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              {savingOnly ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {savingOnly ? 'Saving...' : 'Save Feedback Only'}
            </button>
          )}
          <span className="ml-auto text-[10px] text-gray-400">
            {selectedTags.length} tags{notes ? ' + notes' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ job, expanded, onToggle, onIterate, onFeedbackOnly, feedbackDone, hasChildIteration }: {
  job: ContentJob; expanded: boolean; onToggle: () => void;
  onIterate?: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<void>;
  onFeedbackOnly?: (job: ContentJob, rating: number, tags: string[], notes: string) => Promise<unknown>;
  feedbackDone?: boolean;
  hasChildIteration?: boolean;
}) {
  const review = job.review;
  if (!review) return null;

  const bestPlatform = Object.entries(review.platformScores).reduce((best, [p, s]) => (s > best[1] ? [p, s] : best), ['', 0] as [string, number]);
  const jobHasVideo = !IMAGE_ONLY_TYPES.includes(job.contentType);
  const isImage = IMAGE_ONLY_TYPES.includes(job.contentType);
  const version = job.iterationNumber || 1;

  return (
    <div className={cn('rounded-lg border overflow-hidden', version > 1 ? 'border-amber-500/15 bg-gray-50' : 'border-gray-200 bg-gray-50')}>
      <button onClick={onToggle} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.01] transition-colors">
        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
          {job.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-gray-400" />
          )}
          {version > 1 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-black">V{version}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-zinc-200">&ldquo;{job.idea.hook}&rdquo;</p>
            {version > 1 && (
              <span className="flex-shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                ITERATION V{version}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            {job.iterationReasoning || review.summary}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-center">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold', review.overall >= 8 ? 'border-emerald-500/40 text-emerald-400' : review.overall >= 6 ? 'border-blue-500/40 text-blue-400' : review.overall >= 4 ? 'border-amber-500/40 text-amber-400' : 'border-red-500/40 text-red-400')}>{review.overall.toFixed(1)}</div>
          <span className="mt-0.5 text-[9px] text-gray-500">overall</span>
        </div>
        <VerdictBadge verdict={review.verdict} />
        <div className="hidden md:flex flex-col items-center">
          <span className="text-xs font-medium text-gray-700">{bestPlatform[0]}</span>
          <span className="text-[9px] text-gray-500">best fit ({bestPlatform[1].toFixed(1)})</span>
        </div>
        {(job.finalImageUrl || job.imageUrl) && (
          <a
            href={job.finalImageUrl || job.imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
        {jobHasVideo && (job.finalVideoUrl || job.avatarVideoUrl) && (
          <a
            href={job.finalVideoUrl || job.avatarVideoUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Video className="h-3.5 w-3.5" />
          </a>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-5">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">Quality Scores</p>
            <div className="space-y-2.5">
              <ScoreBar label="Realism" score={review.realism} icon={Eye} />
              <ScoreBar label="Hook Strength" score={review.hookStrength} icon={Zap} />
              <ScoreBar label="Script Quality" score={review.scriptQuality} icon={FileText} />
              <ScoreBar label="Brand Safety" score={review.brandSafety} icon={Shield} />
              <ScoreBar label="CTA Effect" score={review.ctaEffectiveness} icon={Target} />
              <ScoreBar label="Engagement" score={review.predictedEngagement} icon={BarChart3} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-gray-500">Platform Fit</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {Object.entries(review.platformScores).map(([platform, score]) => (
                <div key={platform} className={cn('rounded-lg border px-3 py-2 text-center', score >= 8 ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : score >= 6 ? 'border-blue-500/20 bg-blue-500/[0.03]' : 'border-gray-200 bg-gray-50')}>
                  <p className="text-xs font-medium text-gray-700">{platform}</p>
                  <p className={cn('text-lg font-bold', score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-blue-400' : score >= 4 ? 'text-amber-400' : 'text-red-400')}>{score.toFixed(1)}</p>
                  {review.platformNotes[platform] && <p className="mt-1 text-[10px] leading-tight text-gray-500">{review.platformNotes[platform]}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-emerald-500">Strengths</p>
              <ul className="space-y-1">{review.strengths.map((s, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500"><ThumbsUp className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500/50" />{s}</li>)}</ul>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-red-500">Weaknesses</p>
              <ul className="space-y-1">{review.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500"><ThumbsDown className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500/50" />{w}</li>)}</ul>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-blue-500">Improvements</p>
              <ul className="space-y-1">{review.improvements.map((imp, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500"><ArrowUpRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500/50" />{imp}</li>)}</ul>
            </div>
          </div>

          {/* ── Figma Cloud Agent ── */}
          {isImage && <FigmaAgentPanel job={job} />}

          {/* ── Feedback & Iterate Section ── */}
          {isImage && (onIterate || onFeedbackOnly) && (
            <ReviewFeedbackPanel
              job={job}
              onIterate={onIterate}
              onFeedbackOnly={onFeedbackOnly}
              feedbackDone={feedbackDone || false}
              hasChildIteration={hasChildIteration || false}
            />
          )}

          {/* Iteration context */}
          {job.iterationReasoning && (
            <div className="rounded-lg border border-violet-500/15 bg-violet-500/[0.03] px-4 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-violet-400 mb-1">Iteration Reasoning</p>
              <p className="text-xs text-gray-500">{job.iterationReasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
