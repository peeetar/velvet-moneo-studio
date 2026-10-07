import type { FormatId, Post, Slide, SlideText, TemplateId, Topic } from '../types';
import { PALETTES } from '../data/palettes';
import { PRESETS, type Preset, DEFAULT_HASHTAGS, CAPTION_HOOKS, CAPTION_BODIES, CAPTION_CTAS } from '../data/phrases';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const FORMATS: Record<FormatId, { name: string; w: number; h: number; hint: string }> = {
  portrait: { name: 'Feed 4:5', w: 1080, h: 1350, hint: 'Best for the feed' },
  square: { name: 'Square 1:1', w: 1080, h: 1080, hint: 'Classic square' },
  story: { name: 'Story 9:16', w: 1080, h: 1920, hint: 'Stories & Reels cover' },
};

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  hint: string;
  fields: (keyof SlideText)[];
  rows?: { min: number; max: number; status?: string; statusLabel?: string; textLabel?: string };
  labels: Partial<Record<keyof SlideText, string>>;
  defaultPalette: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'loading', name: 'Loading bar', hint: 'A progress bar and a checklist',
    fields: ['label', 'headline', 'percent', 'headline2', 'rows', 'cta'],
    rows: { min: 2, max: 5, status: 'yes', statusLabel: 'Status', textLabel: 'Checklist item' },
    labels: { label: 'Corner label', headline: 'Headline', headline2: 'Text under the bar', cta: 'Button text' },
    defaultPalette: 'olive',
  },
  {
    id: 'list', name: 'Numbered cards', hint: 'Up to 5 tilted cards',
    fields: ['label', 'headline', 'rows', 'cta'],
    rows: { min: 2, max: 5, textLabel: 'Card' },
    labels: { label: 'Small text on top', headline: 'Headline', cta: 'Button text' },
    defaultPalette: 'olive',
  },
  {
    id: 'statement', name: 'Big statement', hint: 'Solid + outline headline, tags',
    fields: ['label', 'headline', 'headline2', 'rows', 'cta'],
    rows: { min: 0, max: 6, textLabel: 'Tag' },
    labels: { label: 'Corner label', headline: 'Headline (solid)', headline2: 'Second line (outline)', cta: 'Button text' },
    defaultPalette: 'cream',
  },
  {
    id: 'quote', name: 'Quote', hint: 'A quote with the author',
    fields: ['label', 'headline', 'headline2', 'body', 'cta'],
    labels: { label: 'Corner label', headline: 'Quote', headline2: 'Author', body: 'Author role', cta: 'Button text (optional)' },
    defaultPalette: 'forest',
  },
  {
    id: 'tip', name: 'Tip', hint: 'Numbered tip with explanation',
    fields: ['label', 'number', 'headline', 'body', 'cta'],
    labels: { label: 'Small label', number: 'Tip number', headline: 'Tip', body: 'Explanation', cta: 'Button text' },
    defaultPalette: 'paper',
  },
  {
    id: 'myth', name: 'Myth vs fact', hint: 'A wrong belief, then the truth',
    fields: ['label', 'headline', 'body', 'cta'],
    labels: { label: 'Corner label', headline: 'Myth', body: 'Fact', cta: 'Button text' },
    defaultPalette: 'olive',
  },
  {
    id: 'stat', name: 'Big number', hint: 'One true number, explained',
    fields: ['label', 'number', 'headline', 'body', 'cta'],
    labels: { label: 'Corner label', number: 'Number', headline: 'What it counts', body: 'Explanation', cta: 'Button text' },
    defaultPalette: 'cream',
  },
  {
    id: 'photo', name: 'Photo + headline', hint: 'Photo on top, words below',
    fields: ['label', 'headline', 'cta'],
    labels: { label: 'Label on the photo', headline: 'Headline', cta: 'Button text' },
    defaultPalette: 'olive',
  },
  {
    id: 'versus', name: 'Before / after', hint: 'Two columns compared',
    fields: ['label', 'headline', 'headline2', 'rows', 'cta'],
    rows: { min: 2, max: 5, status: 'yes', statusLabel: 'Right side', textLabel: 'Left side' },
    labels: { label: 'Corner label', headline: 'Left title', headline2: 'Right title', cta: 'Button text' },
    defaultPalette: 'cream',
  },
];

export const templateMeta = (id: TemplateId) => TEMPLATES.find((t) => t.id === id)!;

const EMPTY_TEXT: SlideText = {
  label: '', headline: '', headline2: '', body: '', rows: [], cta: '', number: '', percent: 80,
};

export function paletteById(id: string) {
  return (PALETTES.find((p) => p.id === id) ?? PALETTES[0]);
}

export function slideFromPreset(preset: Preset, base?: Slide): Slide {
  const meta = templateMeta(preset.template);
  const paletteId = base?.paletteId ?? meta.defaultPalette;
  const pal = base?.palette ?? paletteById(paletteId).palette;
  return {
    id: uid(),
    template: preset.template,
    paletteId,
    palette: { ...pal },
    text: { ...EMPTY_TEXT, ...structuredClone(preset.text) },
    bg: base?.bg ? structuredClone(base.bg) : {
      pattern: 'none', emoji: '📊', patternColor: '', opacity: 0.12, size: 1, tilt: false,
      photoMode: preset.template === 'photo' ? 'frame' : 'none', tint: 'duotone',
    },
    stickers: [],
    footer: base?.footer ? { ...base.footer } : { logo: true, logoVariant: 'en-hor', site: false, handle: false, email: false },
    headlineScale: 1,
  };
}

export function presetsFor(template: TemplateId) {
  return PRESETS.filter((p) => p.template === template);
}

export function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function captionFor(topic: Topic, headline = ''): string {
  const pick = (list: { topic: string; text: string }[]) => {
    const own = list.filter((x) => x.topic === topic);
    return randomOf(own.length ? own : list.filter((x) => x.topic === 'any')).text;
  };
  const hook = pick(CAPTION_HOOKS);
  const body = pick(CAPTION_BODIES);
  const cta = pick(CAPTION_CTAS);
  void headline;
  return `${hook}\n\n${body}\n\n${cta}\n\n${DEFAULT_HASHTAGS[topic].join(' ')}`;
}

export function newPost(opts: { preset?: Preset; topic?: Topic; template?: TemplateId; format?: FormatId } = {}): Post {
  let preset = opts.preset;
  if (!preset) {
    let pool = PRESETS;
    if (opts.template) pool = pool.filter((p) => p.template === opts.template);
    if (opts.topic) {
      const t = pool.filter((p) => p.topic === opts.topic);
      if (t.length) pool = t;
    }
    preset = randomOf(pool);
  }
  const slide = slideFromPreset(preset);
  const now = Date.now();
  return {
    id: uid(),
    status: 'draft',
    format: opts.format ?? 'portrait',
    slides: [slide],
    caption: captionFor(preset.topic),
    tags: [preset.topic],
    topic: preset.topic,
    title: firstLine(slide.text.headline),
    createdAt: now,
    updatedAt: now,
  };
}

export function firstLine(s: string) {
  const t = s.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? t.slice(0, 57) + '…' : t || 'Untitled post';
}

/** Surprise: random preset + random palette + maybe a pattern. */
export function surprisePost(topic?: Topic): Post {
  const p = newPost({ topic });
  const s = p.slides[0];
  const pal = randomOf(PALETTES.slice(0, 4));
  s.paletteId = pal.id;
  s.palette = { ...pal.palette };
  if (s.template !== 'photo' && Math.random() < 0.6) {
    s.bg.pattern = randomOf(['dollar', 'denar', 'dots', 'grid', 'ledger', 'percent', 'plus', 'stripes'] as const);
    s.bg.opacity = 0.1;
  }
  return p;
}
