import type { LogoVariant } from './brand/logo';

export type FormatId = 'portrait' | 'square' | 'story';
export type TemplateId =
  | 'loading'
  | 'list'
  | 'statement'
  | 'quote'
  | 'tip'
  | 'myth'
  | 'stat'
  | 'photo'
  | 'versus';
export type Topic = 'controlling' | 'management' | 'tips' | 'about';

export interface Row {
  text: string;
  /** Right-hand text: a status in "loading", the "after" side in "versus". */
  status?: string;
  /** Cross out the status (the ИЗБРИШАНИ joke). */
  strike?: boolean;
}

export interface SlideText {
  label: string; // small mono corner label / eyebrow
  headline: string;
  headline2: string; // outline line, author name, versus right title, etc.
  body: string;
  rows: Row[];
  cta: string;
  number: string; // stat number, tip number
  percent: number;
}

export interface Palette {
  ground: string;
  ink: string;
  accent: string; // cards, stickers
  bar: string; // CTA / progress fill
  onBar: string;
  arrow: string;
}

export type PatternId =
  | 'none'
  | 'dollar'
  | 'denar'
  | 'euro'
  | 'percent'
  | 'dots'
  | 'bigdots'
  | 'grid'
  | 'ledger'
  | 'stripes'
  | 'plus'
  | 'checks'
  | 'arrows'
  | 'numbers'
  | 'bars'
  | 'emoji'
  | 'logo';

export interface Background {
  pattern: PatternId;
  emoji: string;
  patternColor: string;
  opacity: number; // 0..1
  size: number; // 0.5..2
  tilt: boolean;
  photo?: PhotoRef;
  photoMode: 'none' | 'full' | 'frame';
  tint: 'duotone' | 'dark' | 'light' | 'none';
}

export interface PhotoRef {
  src: string; // data: URL (safe for export)
  credit?: string;
  creditUrl?: string;
  posX: number; // 0..100
  posY: number;
  zoom: number; // 1..2
}

export type StickerKind =
  | 'tag'
  | 'stamp'
  | 'arrow'
  | 'emoji'
  | 'note'
  | 'circle'
  | 'underline'
  | 'chart'
  | 'ring'
  | 'star';

export interface Sticker {
  id: string;
  kind: StickerKind;
  text: string;
  x: number; // px on the 1080 canvas
  y: number;
  rot: number;
  scale: number;
  color?: string;
}

export interface Footer {
  logo: boolean;
  logoVariant: LogoVariant;
  site: boolean;
  handle: boolean;
  email: boolean;
}

export interface Slide {
  id: string;
  template: TemplateId;
  paletteId: string;
  palette: Palette;
  text: SlideText;
  bg: Background;
  stickers: Sticker[];
  footer: Footer;
  headlineScale: number; // 0.7..1.2, user tweak on auto-fit
}

export interface Post {
  id: string;
  status: 'draft' | 'posted';
  format: FormatId;
  slides: Slide[];
  caption: string;
  tags: string[];
  topic: Topic;
  title: string;
  createdAt: number;
  updatedAt: number;
  postedAt?: number;
  thumb?: string; // small PNG data URL of slide 1
}

export interface ArchivePost {
  id: string;
  title: string;
  caption: string;
  tags: string[];
  postedAt: number;
  image: string | null;
  link: string;
}
