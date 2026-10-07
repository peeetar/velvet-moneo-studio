import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { FormatId, Palette, Slide } from '../types';
import { FORMATS } from '../lib/factory';
import { BRAND } from '../data/palettes';
import { FitText } from './FitText';
import { Logo } from './Logo';
import { PatternLayer } from './Pattern';
import { StickerLayer } from './Stickers';

export const M = 84; // safe margin

interface Props {
  slide: Slide;
  format: FormatId;
  scale?: number;
  selectedSticker?: string | null;
  onSelectSticker?: (id: string | null) => void;
  onMoveSticker?: (id: string, x: number, y: number) => void;
  slideNo?: { n: number; of: number };
}

const lines = (s: string) => s.split('\n').map((l, i, a) => (
  <span key={i}>{l}{i < a.length - 1 && <br />}</span>
));

function Label({ text, color, align = 'right' }: { text: string; color: string; align?: 'left' | 'right' }) {
  if (!text.trim()) return <span />;
  return <p className="p-label" style={{ color, textAlign: align }}>{lines(text)}</p>;
}

function Head({ s, pal, light }: { s: Slide; pal: Palette; light?: boolean }) {
  const col = light ? BRAND.cream : pal.ink;
  return (
    <div className="p-head">
      {s.footer.logo ? <Logo color={col} variant={s.footer.logoVariant} h={s.footer.logoVariant.endsWith('sqr') ? 130 : 76} /> : <span />}
      <Label text={s.text.label} color={col} />
    </div>
  );
}

function Cta({ text, pal, compact }: { text: string; pal: Palette; compact?: boolean }) {
  if (!text.trim()) return null;
  return (
    <div className={compact ? 'p-cta p-cta--compact' : 'p-cta'} style={{ background: pal.bar, color: pal.onBar }}>
      <span className="p-cta__text">{text}</span>
      <span className="p-cta__arrow" style={{ color: pal.arrow }}>↗</span>
    </div>
  );
}

function Contacts({ s, color }: { s: Slide; color: string }) {
  const parts = [s.footer.site && 'velvetmoneo.com', s.footer.handle && '@velvetmoneo', s.footer.email && 'contact@velvetmoneo.com'].filter(Boolean);
  if (!parts.length) return null;
  return <p className="p-contacts" style={{ color }}>{parts.join('   ·   ')}</p>;
}

const H1: CSSProperties = { fontFamily: 'Oswald, sans-serif', fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', margin: 0, whiteSpace: 'pre-line', letterSpacing: '-0.005em' };

function Headline({ text, color, max, outline, align, deps = [] }: { text: string; color: string; max: number; outline?: boolean; align?: 'start' | 'center' | 'end'; deps?: unknown[] }) {
  return (
    <FitText max={max} align={align} deps={[text, outline, ...deps]} style={{ ...H1, color: outline ? 'transparent' : color, WebkitTextStroke: outline ? `2.5px ${color}` : undefined }}>
      {text}
    </FitText>
  );
}

/* Chips and checklists get a solid backing only when a pattern or photo sits behind them. */
const slide_bgFill = (s: Slide) => (s.bg.pattern !== 'none' && !(s.bg.photoMode === 'full' && s.bg.photo) ? s.palette.ground : undefined);

/* --------------------------------------------------------------- */

function Body({ s, f, H }: { s: Slide; f: FormatId; H: number }) {
  const t = s.text;
  const pal = s.palette;
  const sq = f === 'square';
  const k = s.headlineScale;
  const maxRows = sq ? 4 : f === 'story' ? 6 : 4;
  const rows = t.rows.slice(0, maxRows);

  switch (s.template) {
    case 'loading':
      return (
        <>
          <Head s={s} pal={pal} />
          <Headline text={t.headline} color={pal.ink} max={150 * k} align="center" deps={[H]} />
          <div>
            <div className="p-progress" style={{ borderColor: pal.ink }}>
              <div style={{ width: `${Math.max(2, Math.min(100, t.percent))}%`, background: pal.ink, height: sq ? 52 : 64 }} />
            </div>
            <div className="p-progress__meta" style={{ color: pal.ink }}>
              <span>{Math.round(t.percent)}%</span>
              <span>{t.headline2}</span>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="p-checks" style={{ color: pal.ink, gap: sq ? 0 : 18, lineHeight: sq ? 1.45 : undefined }}>
              {rows.map((r, i) => (
                <div key={i} className="p-check">
                  <span>▸&nbsp;&nbsp;{r.text}</span>
                  <span className={r.strike ? 'p-strike' : ''} style={r.strike ? { color: pal.ink, opacity: 0.42 } : undefined}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'list':
      return (
        <>
          <div className="p-head">
            <Label text={t.label} color={pal.ink} align="left" />
          </div>
          <Headline text={t.headline} color={pal.ink} max={(sq ? 96 : 120) * k} align="start" deps={[H]} />
          <div className="p-cards">
            {rows.map((r, i) => (
              <div key={i} className="p-card" style={{ background: pal.accent === pal.ground ? BRAND.paper : pal.accent, color: BRAND.forest, transform: `rotate(${i % 2 ? 0.5 : -0.7}deg)`, padding: sq ? (rows.length > 3 ? '18px 40px' : '26px 44px') : '36px 48px' }}>
                <span className="p-card__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="p-card__text" style={{ fontSize: sq ? (rows.length > 3 ? 40 : 46) : 54 }}>{r.text}</span>
              </div>
            ))}
          </div>
          <div className="p-foot">
            {s.footer.logo ? <Logo color={pal.ink} variant={s.footer.logoVariant} h={s.footer.logoVariant.endsWith('sqr') ? 120 : 84} /> : <span />}
            <Cta text={t.cta} pal={pal} compact />
          </div>
        </>
      );

    case 'statement':
      return (
        <>
          <Head s={s} pal={pal} />
          <div className="p-stack" style={{ flex: '1 1 0', minHeight: 0 }}>
            <Headline text={t.headline} color={pal.ink} max={(sq ? 120 : 150) * k} align="end" deps={[H, t.headline2]} />
            {t.headline2.trim() && <Headline text={t.headline2} color={pal.ink} outline max={(sq ? 120 : 150) * k} align="start" deps={[H, t.headline]} />}
          </div>
          {rows.length > 0 && (
            <div className="p-chips">
              {t.rows.slice(0, sq ? 4 : 6).map((r, i) => (
                <span key={i} className="p-chip" style={{ borderColor: pal.ink, color: pal.ink, background: slide_bgFill(s) }}>{r.text}</span>
              ))}
            </div>
          )}
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'quote':
      return (
        <>
          <Head s={s} pal={pal} />
          <div className="p-quote-mark" style={{ color: pal.accent }}>“</div>
          <Headline text={t.headline} color={pal.ink} max={(sq ? 84 : 104) * k} align="start" deps={[H]} />
          <div className="p-author" style={{ borderColor: pal.accent }}>
            <div className="p-author__name" style={{ color: pal.ink }}>{t.headline2}</div>
            {t.body && <div className="p-author__role" style={{ color: pal.ink }}>{t.body}</div>}
          </div>
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'tip':
      return (
        <>
          <div className="p-head">
            {s.footer.logo ? <Logo color={pal.ink} variant={s.footer.logoVariant} h={s.footer.logoVariant.endsWith('sqr') ? 130 : 76} /> : <span />}
            <div className="p-tipno" style={{ color: pal.ink, borderColor: pal.ink }}>
              <span>{t.label}</span>
              {t.number && <b>#{t.number}</b>}
            </div>
          </div>
          <Headline text={t.headline} color={pal.ink} max={(sq ? 112 : 136) * k} align="center" deps={[H]} />
          <div className="p-rule" style={{ background: pal.ink }} />
          {t.body && <p className="p-body" style={{ color: pal.ink, fontSize: sq ? 38 : 44 }}>{t.body}</p>}
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'myth': {
      const card = pal.accent === pal.ground ? BRAND.paper : pal.accent;
      return (
        <>
          <Head s={s} pal={pal} />
          <div className="p-myth">
            <span className="p-pill" style={{ borderColor: pal.ink, color: pal.ink }}>МИТ ✕</span>
            <Headline text={t.headline} color={pal.ink} max={(sq ? 80 : 100) * k} align="start" deps={[H, t.body]} />
          </div>
          <div className="p-fact" style={{ background: card, color: BRAND.forest }}>
            <span className="p-pill p-pill--solid" style={{ background: BRAND.forest, color: card }}>{t.headline2 || 'ФАКТ'} ✓</span>
            <p className="p-fact__text" style={{ fontSize: sq ? 40 : 48 }}>{t.body}</p>
          </div>
          <Cta text={t.cta} pal={pal} />
        </>
      );
    }

    case 'stat':
      return (
        <>
          <Head s={s} pal={pal} />
          <div className="p-stat">
            <FitText max={(sq ? 360 : 460) * k} align="end" deps={[t.number, H]} style={{ ...H1, color: pal.ink, lineHeight: 0.98, letterSpacing: '-0.02em' }}>
              {t.number}
            </FitText>
          </div>
          <div className="p-stat__label" style={{ color: pal.ink, fontSize: sq ? 72 : 88 }}>{t.headline}</div>
          {t.body && <p className="p-body" style={{ color: pal.ink, fontSize: sq ? 36 : 42 }}>{t.body}</p>}
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'photo':
      return (
        <>
          <div className="p-photo-pad" style={{ height: (sq ? H * 0.52 : H * 0.56) - (f === 'story' ? 200 : M) + 40, flexShrink: 0 }} />
          <Headline text={t.headline} color={pal.ink} max={(sq ? 104 : 124) * k} align="center" deps={[H]} />
          <Cta text={t.cta} pal={pal} />
        </>
      );

    case 'versus': {
      const card = pal.accent === pal.ground ? BRAND.paper : pal.accent;
      return (
        <>
          <Head s={s} pal={pal} />
          <div className="p-vs">
            <div className="p-vs__col">
              <div className="p-vs__title" style={{ color: pal.ink }}>✕ {t.headline}</div>
              {t.rows.slice(0, maxRows + 1).map((r, i) => (
                <div key={i} className="p-vs__cell" style={{ color: pal.ink, borderColor: pal.ink }}>{r.text}</div>
              ))}
            </div>
            <div className="p-vs__col p-vs__col--good" style={{ background: card, color: BRAND.forest }}>
              <div className="p-vs__title">✓ {t.headline2}</div>
              {t.rows.slice(0, maxRows + 1).map((r, i) => (
                <div key={i} className="p-vs__cell" style={{ borderColor: BRAND.forest }}>{r.status}</div>
              ))}
            </div>
          </div>
          <Cta text={t.cta} pal={pal} />
        </>
      );
    }
  }
}

function PhotoLayer({ s, w, h, f }: { s: Slide; w: number; h: number; f: FormatId }) {
  const ph = s.bg.photo;
  const frame = s.template === 'photo';
  if (!ph && !frame) return null;
  if (!frame && s.bg.photoMode !== 'full') return null;
  const box: CSSProperties = frame
    ? { position: 'absolute', left: 0, top: 0, width: w, height: f === 'square' ? h * 0.52 : h * 0.56, overflow: 'hidden' }
    : { position: 'absolute', inset: 0, overflow: 'hidden' };
  const tint = s.bg.tint;
  const pal = s.palette;
  const img: CSSProperties = {
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
    objectPosition: ph ? `${ph.posX}% ${ph.posY}%` : undefined,
    transform: ph ? `scale(${ph.zoom})` : undefined,
    filter: tint === 'duotone' ? 'grayscale(1) contrast(1.1)' : tint === 'none' ? undefined : 'saturate(0.85)',
  };
  return (
    <div style={box}>
      {ph ? <img src={ph.src} style={img} alt="" crossOrigin="anonymous" /> : (
        <div className="p-photo-empty" style={{ background: pal.ink === BRAND.forest ? BRAND.forestSoft : BRAND.forest }}>
          <span>Pick a photo in “Background”</span>
        </div>
      )}
      {ph && tint === 'duotone' && <div style={{ position: 'absolute', inset: 0, background: BRAND.olive, mixBlendMode: 'multiply' }} />}
      {ph && tint === 'duotone' && <div style={{ position: 'absolute', inset: 0, background: BRAND.forest, mixBlendMode: 'screen', opacity: 0.25 }} />}
      {ph && tint === 'dark' && <div style={{ position: 'absolute', inset: 0, background: BRAND.forest, opacity: frame ? 0.35 : 0.68 }} />}
      {ph && tint === 'light' && <div style={{ position: 'absolute', inset: 0, background: BRAND.cream, opacity: frame ? 0.3 : 0.78 }} />}
      {frame && (
        <div className="p-photo-head" style={{ padding: `${f === 'story' ? 200 : M}px ${M}px 0` }}>
          {s.footer.logo ? <Logo color={BRAND.cream} variant={s.footer.logoVariant} h={s.footer.logoVariant.endsWith('sqr') ? 130 : 76} /> : <span />}
        </div>
      )}
      {frame && s.text.label.trim() && (
        <div className="p-photo-label" style={{ background: pal.bar, color: pal.bar === BRAND.forest ? BRAND.olive : pal.onBar, left: M, bottom: 40 }}>
          {s.text.label}
        </div>
      )}
    </div>
  );
}

export const PostCanvas = forwardRef<HTMLDivElement, Props>(function PostCanvas(
  { slide, format, selectedSticker, onSelectSticker, onMoveSticker, scale, slideNo },
  ref,
) {
  const { w, h } = FORMATS[format];
  const pal = slide.palette;
  const story = format === 'story';
  // Full-bleed photo with dark tint: flip text to cream so it stays readable.
  const flip = slide.bg.photoMode === 'full' && !!slide.bg.photo && slide.template !== 'photo';
  const effPal: Palette = flip
    ? slide.bg.tint === 'light'
      ? { ...pal, ink: BRAND.forest }
      : { ...pal, ink: BRAND.cream }
    : pal;
  const s2 = flip ? { ...slide, palette: effPal } : slide;
  const content: ReactNode = <Body s={s2} f={format} H={h} />;
  return (
    <div
      ref={ref}
      className="post"
      style={{ width: w, height: h, background: pal.ground, color: effPal.ink }}
      onPointerDown={() => onSelectSticker?.(null)}
    >
      <PhotoLayer s={slide} w={w} h={h} f={format} />
      <PatternLayer bg={slide.bg} ink={effPal.ink} w={w} h={h} />
      <div
        className="post__inner"
        style={{ padding: `${story ? 200 : M}px ${M}px ${story ? 230 : M}px`, gap: format === 'square' ? 26 : 40 }}
      >
        {content}
        <Contacts s={slide} color={effPal.ink} />
      </div>
      {slideNo && slideNo.of > 1 && (
        <div className="p-slideno" style={{ color: effPal.ink }}>{slideNo.n}/{slideNo.of}</div>
      )}
      <StickerLayer
        stickers={slide.stickers}
        pal={effPal}
        selectedId={selectedSticker}
        scale={scale}
        onSelect={onSelectSticker ? (id) => onSelectSticker(id) : undefined}
        onMove={onMoveSticker}
      />
    </div>
  );
});
