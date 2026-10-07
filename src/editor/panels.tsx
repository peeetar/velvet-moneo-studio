import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorApi } from '../pages/Generate';
import type { FormatId, Palette, PatternId, Row, SlideText, StickerKind, TemplateId, Topic } from '../types';
import { TEMPLATES, templateMeta, presetsFor, slideFromPreset, FORMATS, uid, paletteById, newPost } from '../lib/factory';
import { PALETTES, SWATCHES, BRAND, contrast } from '../data/palettes';
import {
  LABEL_IDEAS, HEADLINE_IDEAS, HEADLINE2_IDEAS, BODY_IDEAS, CTA_IDEAS, ROW_IDEAS, STATUS_IDEAS,
  CAPTION_HOOKS, CAPTION_BODIES, CAPTION_CTAS, HASHTAGS, DEFAULT_HASHTAGS, TOPIC_NAMES, CURATED_PHOTO_SEARCHES,
} from '../data/phrases';
import { PATTERNS, PatternLayer } from '../post/Pattern';
import { STICKER_TYPES, StickerArt } from '../post/Stickers';
import { LOGO_NAMES, LOGOS, type LogoVariant } from '../brand/logo';
import { Slider, Toggle, Section, useToast, MiniPost } from '../ui';
import { useConfig } from '../App';
import { searchPhotos, fetchPhotoBlob, polishCaption, type StockPhoto } from '../lib/api';
import { blobToDataUrl } from '../lib/image';
import { getMisc, setMisc } from '../lib/store';

/* =================================================================
   1. LAYOUT
================================================================= */
export function LayoutPanel({ post, slide, update, updSlide }: EditorApi) {
  const samples = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, newPost({ template: t.id })])), []);
  const changeTemplate = (id: TemplateId) => {
    if (id === slide.template) return;
    const preset = presetsFor(id).find((p) => p.topic === post.topic) ?? presetsFor(id)[0];
    updSlide((s) => {
      const fresh = slideFromPreset(preset, s);
      Object.assign(s, { ...fresh, id: s.id, stickers: s.stickers });
      if (id === 'photo') s.bg.photoMode = 'frame';
      else if (s.bg.photoMode === 'frame') s.bg.photoMode = s.bg.photo ? 'full' : 'none';
    });
  };
  return (
    <>
      <Section title="Size" hint="Feed posts are 4:5. Use Story for stories and reels covers.">
        <div className="seg">
          {(Object.keys(FORMATS) as FormatId[]).map((f) => (
            <button key={f} className={`seg__btn ${post.format === f ? 'seg__btn--on' : ''}`} onClick={() => update((p) => { p.format = f; })}>
              <span className={`seg__shape seg__shape--${f}`} aria-hidden />
              <b>{FORMATS[f].name}</b>
              <small>{FORMATS[f].hint}</small>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Layout" hint="Your words stay in the post when the new layout needs the same kind of text.">
        <div className="tpl-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className={`tpl ${slide.template === t.id ? 'tpl--on' : ''}`} onClick={() => changeTemplate(t.id)} aria-pressed={slide.template === t.id}>
              <MiniPost post={samples[t.id]} />
              <b>{t.name}</b>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

/* =================================================================
   2. WORDS
================================================================= */
function Ideas({ list, onPick, label }: { list: string[]; onPick: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="ideas" ref={ref}>
      <button type="button" className="btn btn--sm" aria-expanded={open} onClick={() => setOpen(!open)}>💡 Ideas</button>
      {open && (
        <div className="ideas__menu" role="listbox" aria-label={`Ideas for ${label}`}>
          {list.map((v, i) => (
            <button key={i} role="option" className="ideas__item" onClick={() => { onPick(v); setOpen(false); }}>
              {v.split('\n').map((l, j) => <span key={j}>{l}</span>)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ideasFor(field: keyof SlideText, template: TemplateId): string[] {
  const fromPresets = (k: keyof SlideText) =>
    [...new Set(presetsFor(template).map((p) => p.text[k]).filter((v): v is string => typeof v === 'string' && !!v))];
  switch (field) {
    case 'label': return [...new Set([...fromPresets('label'), ...LABEL_IDEAS])];
    case 'headline': return [...new Set([...fromPresets('headline'), ...(template === 'quote' || template === 'myth' ? [] : HEADLINE_IDEAS)])];
    case 'headline2': return [...new Set([...fromPresets('headline2'), ...(template === 'statement' ? HEADLINE2_IDEAS : [])])];
    case 'body': return [...new Set([...fromPresets('body'), ...(template === 'quote' ? [] : BODY_IDEAS)])];
    case 'cta': return CTA_IDEAS;
    case 'number': return fromPresets('number');
    default: return [];
  }
}

export function WordsPanel({ slide, updSlide, post }: EditorApi) {
  const meta = templateMeta(slide.template);
  const t = slide.text;
  const presets = presetsFor(slide.template);
  const [pi, setPi] = useState(() => Math.max(0, presets.findIndex((p) => p.text.headline === t.headline)));
  const setText = (k: keyof SlideText, v: string | number) => updSlide((s) => { (s.text as unknown as Record<string, unknown>)[k] = v; }, 'text-' + k);

  const nextIdea = () => {
    const sameTopic = presets.filter((p) => p.topic === post.topic);
    const pool = sameTopic.length > 1 ? sameTopic : presets;
    const idx = (pi + 1) % pool.length;
    setPi(idx);
    const p = pool[idx];
    updSlide((s) => { s.text = { ...s.text, ...structuredClone(p.text) }; if (p.photoQuery) s.bg.photoMode = s.bg.photoMode; });
  };

  const setRow = (i: number, patch: Partial<Row>) => updSlide((s) => { s.text.rows[i] = { ...s.text.rows[i], ...patch }; }, `row-${i}-${Object.keys(patch)[0]}`);

  return (
    <>
      <div className="callout">
        <div>
          <b>Need different words?</b>
          <p>Swap all the text on this slide for another ready-made version.</p>
        </div>
        <button className="btn btn--primary btn--lg" onClick={nextIdea}>🔀 New words</button>
      </div>

      {meta.fields.map((f) => {
        if (f === 'rows' || f === 'percent') return null;
        const isLong = f === 'headline' || f === 'headline2' || f === 'body' || f === 'label';
        const list = ideasFor(f, slide.template);
        const label = meta.labels[f] ?? f;
        const id = `w-${f}`;
        return (
          <div className="field" key={f}>
            <div className="field__top">
              <label className="field__label" htmlFor={id}>{label}</label>
              {list.length > 0 && <Ideas list={list} label={label} onPick={(v) => setText(f, v)} />}
            </div>
            {isLong ? (
              <textarea id={id} className="input input--lg" rows={f === 'body' ? 4 : Math.max(2, (t[f] as string).split('\n').length)} value={t[f] as string} onChange={(e) => setText(f, e.target.value)} />
            ) : (
              <input id={id} className="input input--lg" value={t[f] as string} onChange={(e) => setText(f, e.target.value)} />
            )}
            {(f === 'headline' || f === 'headline2') && <p className="field__hint">Press Enter to start a new line. Text is shown in capitals automatically.</p>}
          </div>
        );
      })}

      {meta.fields.includes('percent') && (
        <Slider label="Progress bar" value={t.percent} min={5} max={99} onChange={(v) => setText('percent', v)} format={(v) => `${Math.round(v)}%`} />
      )}

      {meta.rows && (
        <Section title={slide.template === 'versus' ? 'Rows (left side → right side)' : slide.template === 'statement' ? 'Tags' : slide.template === 'list' ? 'Cards' : 'Checklist'}>
          <div className="rows">
            {t.rows.map((r, i) => (
              <div className="rowedit" key={i}>
                <span className="rowedit__no">{i + 1}</span>
                <div className="rowedit__fields">
                  <div className="field__top">
                    <label className="field__label field__label--sm" htmlFor={`row-${i}`}>{meta.rows!.textLabel}</label>
                    <Ideas list={ROW_IDEAS} label="row" onPick={(v) => setRow(i, { text: v })} />
                  </div>
                  <input id={`row-${i}`} className="input" value={r.text} onChange={(e) => setRow(i, { text: e.target.value })} />
                  {meta.rows!.status && (
                    <>
                      <div className="field__top">
                        <label className="field__label field__label--sm" htmlFor={`rows-${i}`}>{meta.rows!.statusLabel}</label>
                        {slide.template === 'loading' && <Ideas list={STATUS_IDEAS} label="status" onPick={(v) => setRow(i, { status: v, strike: /ИЗБРИШ/.test(v) })} />}
                      </div>
                      <input id={`rows-${i}`} className="input" value={r.status ?? ''} onChange={(e) => setRow(i, { status: e.target.value })} />
                      {slide.template === 'loading' && <Toggle label="Cross it out" checked={!!r.strike} onChange={(v) => setRow(i, { strike: v })} />}
                    </>
                  )}
                </div>
                <div className="rowedit__btns">
                  <button className="btn btn--icon" aria-label="Move up" disabled={i === 0} onClick={() => updSlide((s) => { const [x] = s.text.rows.splice(i, 1); s.text.rows.splice(i - 1, 0, x); })}>↑</button>
                  <button className="btn btn--icon" aria-label="Move down" disabled={i === t.rows.length - 1} onClick={() => updSlide((s) => { const [x] = s.text.rows.splice(i, 1); s.text.rows.splice(i + 1, 0, x); })}>↓</button>
                  <button className="btn btn--icon btn--danger-ghost" aria-label="Remove row" disabled={t.rows.length <= meta.rows!.min} onClick={() => updSlide((s) => { s.text.rows.splice(i, 1); })}>✕</button>
                </div>
              </div>
            ))}
          </div>
          {t.rows.length < meta.rows.max && (
            <button className="btn btn--lg" onClick={() => updSlide((s) => { s.text.rows.push({ text: 'НОВ РЕД', status: slide.template === 'loading' ? 'ГОТОВО ✓' : slide.template === 'versus' ? 'СО СИСТЕМ' : undefined }); })}>+ Add a row</button>
          )}
          {post.format === 'square' && t.rows.length > 4 && <p className="field__hint">Square posts show up to 4 rows.</p>}
        </Section>
      )}

      <Section title="Headline size" hint="The headline fits itself to the space. Make it smaller if it feels too loud.">
        <Slider label="Headline size" value={Math.round(slide.headlineScale * 100)} min={60} max={120} step={5} onChange={(v) => updSlide((s) => { s.headlineScale = v / 100; }, 'hs')} format={(v) => `${v}%`} />
      </Section>
    </>
  );
}

/* =================================================================
   3. COLORS
================================================================= */
const PAL_FIELDS: { k: keyof Palette; name: string }[] = [
  { k: 'ground', name: 'Background' },
  { k: 'ink', name: 'Text & lines' },
  { k: 'accent', name: 'Cards & quote marks' },
  { k: 'bar', name: 'Button' },
  { k: 'onBar', name: 'Button text' },
  { k: 'arrow', name: 'Button arrow' },
];

export function ColorsPanel({ slide, updSlide, post, update, slideIdx }: EditorApi) {
  const low = contrast(slide.palette.ink, slide.palette.ground) < 3;
  const lowBar = contrast(slide.palette.onBar, slide.palette.bar) < 3;
  return (
    <>
      <Section title="Color scheme" hint="All schemes use the Velvet Moneo colors.">
        <div className="pal-grid">
          {PALETTES.map((p) => (
            <button key={p.id} className={`pal ${slide.paletteId === p.id ? 'pal--on' : ''}`} onClick={() => updSlide((s) => { s.paletteId = p.id; s.palette = { ...p.palette }; })} aria-pressed={slide.paletteId === p.id}>
              <span className="pal__swatch" style={{ background: p.palette.ground, color: p.palette.ink }}>
                <span className="pal__aa">Aa</span>
                <span className="pal__bar" style={{ background: p.palette.bar }} />
                <span className="pal__card" style={{ background: p.palette.accent }} />
              </span>
              <b>{p.name}</b>
            </button>
          ))}
        </div>
        {post.slides.length > 1 && (
          <button className="btn" onClick={() => update((p) => { p.slides.forEach((s, i) => { if (i !== slideIdx) { s.palette = { ...slide.palette }; s.paletteId = slide.paletteId; } }); })}>
            Use these colors on all {post.slides.length} slides
          </button>
        )}
      </Section>

      <Section title="Fine-tune colors" hint="Change one part at a time. Pick a brand color, or any color with the last box.">
        {PAL_FIELDS.map(({ k, name }) => (
          <div className="colorrow" key={k}>
            <span className="colorrow__name">{name}</span>
            <div className="colorrow__swatches">
              {SWATCHES.map((sw) => (
                <button key={sw.value} className={`sw ${slide.palette[k].toLowerCase() === sw.value ? 'sw--on' : ''}`} style={{ background: sw.value }} title={sw.name} aria-label={`${name}: ${sw.name}`}
                  onClick={() => updSlide((s) => { s.palette[k] = sw.value; s.paletteId = 'custom'; })} />
              ))}
              <label className="sw sw--custom" title="Any color">
                <input type="color" value={slide.palette[k]} onChange={(e) => updSlide((s) => { s.palette[k] = e.target.value; s.paletteId = 'custom'; }, 'color-' + k)} aria-label={`${name}: any color`} />
                <span aria-hidden>+</span>
              </label>
            </div>
          </div>
        ))}
        {low && <p className="warn">⚠ The text color is hard to read on this background. Pick a darker or lighter one.</p>}
        {lowBar && <p className="warn">⚠ The button text is hard to read on the button color.</p>}
        <button className="btn" onClick={() => updSlide((s) => { const p = paletteById(s.paletteId === 'custom' ? 'olive' : s.paletteId); s.palette = { ...p.palette }; s.paletteId = p.id; })}>Reset colors</button>
      </Section>
    </>
  );
}

/* =================================================================
   4. BACKGROUND
================================================================= */
const EMOJIS = ['📊', '📈', '💰', '💼', '🧾', '📂', '🧠', '🚀', '✅', '💚', '🌳', '☕', '🗓️', '🔢', '🏦', '💡', '🌱', '📌', '✏️', '🧮'];

interface SavedPhoto { id: string; src: string; credit?: string; creditUrl?: string; at: number }

export function BackgroundPanel(api: EditorApi) {
  const [tab, setTab] = useState<'pattern' | 'photo'>(api.slide.template === 'photo' || api.slide.bg.photoMode === 'full' ? 'photo' : 'pattern');
  return (
    <>
      <div className="seg seg--tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'pattern'} className={`seg__btn ${tab === 'pattern' ? 'seg__btn--on' : ''}`} onClick={() => setTab('pattern')}><b>Patterns</b><small>$, dots, emoji…</small></button>
        <button role="tab" aria-selected={tab === 'photo'} className={`seg__btn ${tab === 'photo' ? 'seg__btn--on' : ''}`} onClick={() => setTab('photo')}><b>Photo</b><small>Stock or your own</small></button>
      </div>
      {tab === 'pattern' ? <PatternTab {...api} /> : <PhotoTab {...api} />}
    </>
  );
}

function PatternTab({ slide, updSlide }: EditorApi) {
  const bg = slide.bg;
  const set = (fn: (b: typeof bg) => void, g?: string) => updSlide((s) => fn(s.bg), g);
  const photoBlocks = bg.photoMode === 'full' && !!bg.photo;
  return (
    <>
      {photoBlocks && (
        <div className="callout callout--warn">
          <p>A full-background photo is on, so patterns are hidden.</p>
          <button className="btn" onClick={() => set((b) => { b.photoMode = 'none'; })}>Turn photo off</button>
        </div>
      )}
      <Section title="Pattern">
        <div className="pat-grid">
          {PATTERNS.map((p) => (
            <button key={p.id} className={`pat ${bg.pattern === p.id ? 'pat--on' : ''}`} onClick={() => set((b) => { b.pattern = p.id; if (b.opacity < 0.05) b.opacity = 0.12; })} aria-pressed={bg.pattern === p.id}>
              <span className="pat__swatch" style={{ background: slide.palette.ground }}>
                {p.id !== 'none' && <PatternLayer bg={{ ...bg, pattern: p.id as PatternId, opacity: 0.55, size: 0.45, tilt: false, photoMode: 'none' }} ink={slide.palette.ink} w={180} h={110} />}
                {p.id === 'none' && <span className="pat__none">—</span>}
              </span>
              <b>{p.name}</b>
            </button>
          ))}
        </div>
      </Section>
      {bg.pattern === 'emoji' && (
        <Section title="Which emoji?" hint="Pick one or more. Tap again to remove.">
          <div className="emoji-grid">
            {EMOJIS.map((e) => {
              const on = [...new Intl.Segmenter().segment(bg.emoji)].some((s) => s.segment === e);
              return (
                <button key={e} className={`emoji ${on ? 'emoji--on' : ''}`} aria-pressed={on} onClick={() => set((b) => {
                  const cur = [...new Intl.Segmenter().segment(b.emoji)].map((s) => s.segment);
                  const next = on ? cur.filter((x) => x !== e) : [...cur, e];
                  b.emoji = next.join('') || '📊';
                })}>{e}</button>
              );
            })}
          </div>
        </Section>
      )}
      {bg.pattern !== 'none' && (
        <Section title="Adjust the pattern">
          <Slider label="Strength" value={Math.round(bg.opacity * 100)} min={4} max={40} onChange={(v) => set((b) => { b.opacity = v / 100; }, 'op')} format={(v) => `${v}%`} />
          <Slider label="Size" value={Math.round(bg.size * 100)} min={50} max={200} step={10} onChange={(v) => set((b) => { b.size = v / 100; }, 'sz')} format={(v) => `${v}%`} />
          <Toggle label="Tilt the pattern" checked={bg.tilt} onChange={(v) => set((b) => { b.tilt = v; })} />
          <div className="colorrow">
            <span className="colorrow__name">Pattern color</span>
            <div className="colorrow__swatches">
              <button className={`sw sw--text ${!bg.patternColor ? 'sw--on' : ''}`} onClick={() => set((b) => { b.patternColor = ''; })}>Same as text</button>
              {[BRAND.forest, BRAND.olive, BRAND.cream, BRAND.oliveLight, BRAND.paper].map((c) => (
                <button key={c} className={`sw ${bg.patternColor === c ? 'sw--on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => set((b) => { b.patternColor = c; })} />
              ))}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

function PhotoTab({ slide, updSlide }: EditorApi) {
  const config = useConfig();
  const toast = useToast();
  const bg = slide.bg;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState<SavedPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFrame = slide.template === 'photo';

  useEffect(() => { getMisc<SavedPhoto[]>('photos').then((x) => setSaved(x ?? [])); }, []);

  const run = async (query: string, pg = 1) => {
    if (!query.trim()) return;
    setQ(query);
    setLoading('search');
    setErr('');
    try {
      const r = await searchPhotos(query, pg);
      setResults(pg === 1 ? r.photos : [...results, ...r.photos]);
      setMore(r.more);
      setPage(pg);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const remember = async (p: SavedPhoto) => {
    const list = [p, ...saved.filter((x) => x.id !== p.id)].slice(0, 40);
    setSaved(list);
    await setMisc('photos', list);
  };

  const apply = (src: string, credit?: string, creditUrl?: string) => {
    updSlide((s) => {
      s.bg.photo = { src, credit, creditUrl, posX: 50, posY: 50, zoom: 1 };
      if (s.template !== 'photo') {
        s.bg.photoMode = 'full';
        if (s.bg.tint === 'duotone') s.bg.tint = 'dark';
      }
    });
  };

  const pick = async (p: StockPhoto) => {
    setLoading(p.id);
    try {
      const src = await blobToDataUrl(await fetchPhotoBlob(p.src));
      apply(src, p.credit, p.creditUrl);
      remember({ id: 'px-' + p.id, src, credit: p.credit, creditUrl: p.creditUrl, at: Date.now() });
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setLoading(null);
    }
  };

  const upload = async (f: File) => {
    try {
      const src = await blobToDataUrl(f);
      apply(src, 'Own photo');
      remember({ id: 'own-' + uid(), src, credit: 'Own photo', at: Date.now() });
    } catch {
      toast('That file is not an image this browser can open. Try a JPG or PNG.', 'err');
    }
  };

  const set = (fn: (b: typeof bg) => void, g?: string) => updSlide((s) => fn(s.bg), g);

  return (
    <>
      {bg.photo && (
        <Section title="Current photo">
          <div className="curphoto">
            <img src={bg.photo.src} alt="" />
            <div>
              {bg.photo.credit && <p className="muted">{bg.photo.credit}</p>}
              <button className="btn btn--danger-ghost" onClick={() => set((b) => { b.photo = undefined; if (b.photoMode === 'full') b.photoMode = 'none'; })}>Remove photo</button>
            </div>
          </div>
          {!isFrame && (
            <Toggle label="Show the photo behind everything" checked={bg.photoMode === 'full'} onChange={(v) => set((b) => { b.photoMode = v ? 'full' : 'none'; })}
              hint="Text turns light automatically so it stays readable." />
          )}
          <div className="colorrow">
            <span className="colorrow__name">Photo style</span>
            <div className="seg seg--small">
              {([['duotone', 'Olive tint'], ['dark', 'Dark green'], ['light', 'Light cream'], ['none', 'Original']] as const).map(([v, n]) => (
                <button key={v} className={`seg__btn ${bg.tint === v ? 'seg__btn--on' : ''}`} onClick={() => set((b) => { b.tint = v; })}><b>{n}</b></button>
              ))}
            </div>
          </div>
          <Slider label="Zoom" value={Math.round(bg.photo.zoom * 100)} min={100} max={220} step={10} onChange={(v) => set((b) => { b.photo!.zoom = v / 100; }, 'pz')} format={(v) => `${v}%`} />
          <Slider label="Move left / right" value={bg.photo.posX} min={0} max={100} step={5} onChange={(v) => set((b) => { b.photo!.posX = v; }, 'px')} format={(v) => `${v}%`} />
          <Slider label="Move up / down" value={bg.photo.posY} min={0} max={100} step={5} onChange={(v) => set((b) => { b.photo!.posY = v; }, 'py')} format={(v) => `${v}%`} />
        </Section>
      )}

      <Section title="Find a photo" hint={config.photos ? `Free stock photos${config.photoProvider ? ` from ${config.photoProvider}` : ''}. Click one to use it. English search words work best.` : undefined}>
        {config.photos ? (
          <>
            <form className="search" onSubmit={(e) => { e.preventDefault(); run(q); }}>
              <label className="sr-only" htmlFor="ph-q">Search photos (English works best)</label>
              <input id="ph-q" className="input input--lg" placeholder="e.g. office desk, charts, plant" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn btn--primary btn--lg" disabled={loading === 'search'}>Search</button>
            </form>
            <p className="field__hint">Or try one of these:</p>
            <div className="chips">
              {CURATED_PHOTO_SEARCHES.map((c) => (
                <button key={c.q} className={`chip ${q === c.q ? 'chip--on' : ''}`} onClick={() => run(c.q)}>{c.label}</button>
              ))}
            </div>
            {err && <p className="err">{err}</p>}
            {loading === 'search' && results.length === 0 && <p className="muted">Searching…</p>}
            {results.length > 0 && (
              <div className="photo-grid">
                {results.map((p) => (
                  <button key={p.id} className="photo" onClick={() => pick(p)} disabled={!!loading} aria-label={p.alt || 'Photo'}>
                    <img src={p.thumb} alt={p.alt} loading="lazy" />
                    {loading === p.id && <span className="photo__busy">Loading…</span>}
                  </button>
                ))}
              </div>
            )}
            {more && <button className="btn btn--lg" disabled={loading === 'search'} onClick={() => run(q, page + 1)}>Show more photos</button>}
          </>
        ) : (
          <p className="callout callout--warn">Photo search isn’t switched on for this site yet. You can still use your own photos below.</p>
        )}
      </Section>

      <Section title="Your photos" hint="Photos you used before are kept here.">
        <button className="btn btn--lg" onClick={() => fileRef.current?.click()}>📁 Use a photo from this computer</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
        {saved.length > 0 && (
          <div className="photo-grid">
            {saved.map((p) => (
              <div key={p.id} className="photo photo--saved">
                <button className="photo__use" onClick={() => apply(p.src, p.credit, p.creditUrl)} aria-label="Use this photo"><img src={p.src} alt="" loading="lazy" /></button>
                <button className="photo__del" aria-label="Forget this photo" onClick={async () => { const l = saved.filter((x) => x.id !== p.id); setSaved(l); await setMisc('photos', l); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/* =================================================================
   5. EXTRAS
================================================================= */
export function ExtrasPanel({ slide, updSlide, post, update, slideIdx, selSticker, setSelSticker }: EditorApi) {
  const add = (kind: StickerKind) => {
    const def = STICKER_TYPES.find((s) => s.kind === kind)!;
    const id = uid();
    const { w, h } = FORMATS[post.format];
    updSlide((s) => { s.stickers.push({ id, kind, text: def.text, x: w * 0.72, y: h * 0.62, rot: kind === 'tag' ? 4 : kind === 'stamp' ? -10 : 0, scale: 1 }); });
    setSelSticker(id);
  };
  const hasText = (k: StickerKind) => ['tag', 'stamp', 'star', 'note', 'ring', 'emoji'].includes(k);
  const LOGO_KEYS = Object.keys(LOGOS) as LogoVariant[];

  return (
    <>
      <Section title="Add a sticker" hint="It appears on the picture. Drag it where you want.">
        <div className="stk-grid">
          {STICKER_TYPES.map((t) => (
            <button key={t.kind} className="stkbtn" onClick={() => add(t.kind)}>
              <span className="stkbtn__art" style={{ background: slide.palette.ground }}>
                <span className="stkbtn__inner">
                  <StickerArt s={{ id: 'p-' + t.kind, kind: t.kind, text: t.text, x: 0, y: 0, rot: 0, scale: 1 }} pal={slide.palette} />
                </span>
              </span>
              <b>{t.name}</b>
            </button>
          ))}
        </div>
      </Section>

      {slide.stickers.length > 0 && (
        <Section title="Stickers on this slide">
          {slide.stickers.map((s, i) => {
            const def = STICKER_TYPES.find((d) => d.kind === s.kind)!;
            const on = selSticker === s.id;
            const set = (fn: (x: typeof s) => void, g?: string) => updSlide((sl) => { const x = sl.stickers.find((y) => y.id === s.id); if (x) fn(x); }, g);
            return (
              <div key={s.id} className={`stkedit ${on ? 'stkedit--on' : ''}`} onClick={() => setSelSticker(s.id)}>
                <div className="row-between">
                  <b>{i + 1}. {def.name}</b>
                  <button className="btn btn--sm btn--danger-ghost" onClick={(e) => { e.stopPropagation(); updSlide((sl) => { sl.stickers = sl.stickers.filter((x) => x.id !== s.id); }); }}>Remove</button>
                </div>
                {hasText(s.kind) && (
                  s.kind === 'emoji' ? (
                    <div className="emoji-grid emoji-grid--sm">
                      {EMOJIS.map((e) => <button key={e} className={`emoji ${s.text === e ? 'emoji--on' : ''}`} onClick={() => set((x) => { x.text = e; })}>{e}</button>)}
                    </div>
                  ) : (
                    <>
                      <label className="field__label field__label--sm" htmlFor={`st-${s.id}`}>{s.kind === 'ring' ? 'Percent' : 'Text (Enter = new line)'}</label>
                      <textarea id={`st-${s.id}`} className="input" rows={s.kind === 'ring' ? 1 : 2} value={s.text} onChange={(e) => set((x) => { x.text = e.target.value; }, 'st-' + s.id)} />
                    </>
                  )
                )}
                <Slider label="Size" value={Math.round(s.scale * 100)} min={30} max={250} step={10} onChange={(v) => set((x) => { x.scale = v / 100; }, 'ss' + s.id)} format={(v) => `${v}%`} />
                <Slider label="Turn" value={s.rot} min={-45} max={45} step={1} onChange={(v) => set((x) => { x.rot = v; }, 'sr' + s.id)} format={(v) => `${v}°`} />
                {['arrow', 'circle', 'underline', 'stamp', 'chart', 'ring'].includes(s.kind) && (
                  <div className="colorrow">
                    <span className="colorrow__name">Color</span>
                    <div className="colorrow__swatches">
                      <button className={`sw sw--text ${!s.color ? 'sw--on' : ''}`} onClick={() => set((x) => { x.color = undefined; })}>Auto</button>
                      {[BRAND.forest, BRAND.olive, BRAND.cream, BRAND.rust].map((c) => (
                        <button key={c} className={`sw ${s.color === c ? 'sw--on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => set((x) => { x.color = c; })} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      <Section title="Logo">
        <Toggle label="Show the logo" checked={slide.footer.logo} onChange={(v) => updSlide((s) => { s.footer.logo = v; })} />
        {slide.footer.logo && (
          <div className="logo-grid">
            {LOGO_KEYS.map((k) => (
              <button key={k} className={`logo-opt ${slide.footer.logoVariant === k ? 'logo-opt--on' : ''}`} onClick={() => updSlide((s) => { s.footer.logoVariant = k; })} aria-pressed={slide.footer.logoVariant === k}>
                <span style={{ color: slide.palette.ink, background: slide.palette.ground }} dangerouslySetInnerHTML={{ __html: LOGOS[k].replace('<svg ', '<svg style="height:56px;width:auto" ') }} />
                <small>{LOGO_NAMES[k]}</small>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Contact line at the bottom">
        <Toggle label="velvetmoneo.com" checked={slide.footer.site} onChange={(v) => updSlide((s) => { s.footer.site = v; })} />
        <Toggle label="@velvetmoneo" checked={slide.footer.handle} onChange={(v) => updSlide((s) => { s.footer.handle = v; })} />
        <Toggle label="contact@velvetmoneo.com" checked={slide.footer.email} onChange={(v) => updSlide((s) => { s.footer.email = v; })} />
        {post.slides.length > 1 && (
          <button className="btn" onClick={() => update((p) => { p.slides.forEach((s, i) => { if (i !== slideIdx) s.footer = { ...slide.footer }; }); })}>Use this logo & contact line on all slides</button>
        )}
      </Section>
    </>
  );
}

/* =================================================================
   6. CAPTION
================================================================= */
export function CaptionPanel({ post, update }: EditorApi) {
  const config = useConfig();
  const toast = useToast();
  const topic = post.topic;
  const byTopic = <T extends { topic: string }>(l: T[]) => [...l.filter((x) => x.topic === topic), ...l.filter((x) => x.topic === 'any'), ...l.filter((x) => x.topic !== topic && x.topic !== 'any')];
  const [hook, setHook] = useState(0);
  const [body, setBody] = useState(0);
  const [cta, setCta] = useState(0);
  const hooks = byTopic(CAPTION_HOOKS);
  const bodies = byTopic(CAPTION_BODIES);
  const ctas = byTopic(CAPTION_CTAS);
  const [tags, setTags] = useState<string[]>(() => {
    const found = HASHTAGS.filter((h) => post.caption.includes(h));
    return found.length ? found : DEFAULT_HASHTAGS[topic];
  });
  const [wish, setWish] = useState('');
  const [ai, setAi] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [newTag, setNewTag] = useState('');

  const build = () => {
    const cap = `${hooks[hook].text}\n\n${bodies[body].text}\n\n${ctas[cta].text}\n\n${tags.join(' ')}`;
    update((p) => { p.caption = cap; });
    toast('Caption ready. You can still change it above.');
  };

  const setTagsInCaption = (next: string[]) => {
    setTags(next);
    update((p) => {
      const lines = p.caption.trimEnd().split('\n');
      const last = lines[lines.length - 1] ?? '';
      const isTagLine = last.trim().startsWith('#');
      const tagLine = next.join(' ');
      if (isTagLine) lines[lines.length - 1] = tagLine;
      else lines.push('', tagLine);
      p.caption = lines.join('\n').replace(/\n+$/, '');
    }, 'tags');
  };

  const polish = async () => {
    setAiBusy(true);
    setAi(null);
    try {
      setAi(await polishCaption(post.caption, wish));
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setAiBusy(false);
    }
  };

  const Picker = ({ title, list, i, set }: { title: string; list: { text: string }[]; i: number; set: (n: number) => void }) => (
    <div className="picker">
      <div className="picker__head">
        <span className="field__label">{title}</span>
        <div className="picker__nav">
          <button className="btn btn--icon" aria-label={`Previous ${title}`} onClick={() => set((i - 1 + list.length) % list.length)}>‹</button>
          <span className="muted">{i + 1} / {list.length}</span>
          <button className="btn btn--icon" aria-label={`Next ${title}`} onClick={() => set((i + 1) % list.length)}>›</button>
        </div>
      </div>
      <p className="picker__text">{list[i].text}</p>
    </div>
  );

  return (
    <>
      <Section title="Caption" hint="This is the text that goes under the picture on Instagram.">
        <textarea id="cap" className="input caption-edit" rows={12} value={post.caption} onChange={(e) => update((p) => { p.caption = e.target.value; }, 'caption')} aria-label="Caption" />
        <p className={`field__hint ${post.caption.length > 2200 ? 'err' : ''}`}>{post.caption.length} / 2200 characters</p>
      </Section>

      <Section title="Build a new caption from ready parts" hint="Flip through each part with the arrows, then press the button.">
        <Picker title="1. Opening line" list={hooks} i={hook} set={setHook} />
        <Picker title="2. Middle" list={bodies} i={body} set={setBody} />
        <Picker title="3. Call to action" list={ctas} i={cta} set={setCta} />
        <button className="btn btn--primary btn--lg" onClick={build}>Replace caption with these parts</button>
      </Section>

      <Section title="Hashtags" hint="Tap to add or remove. They go on the last line of the caption.">
        <div className="chips">
          {[...new Set([...HASHTAGS, ...tags])].map((h) => (
            <button key={h} className={`chip ${tags.includes(h) ? 'chip--on' : ''}`} aria-pressed={tags.includes(h)} onClick={() => setTagsInCaption(tags.includes(h) ? tags.filter((x) => x !== h) : [...tags, h])}>{h}</button>
          ))}
        </div>
        <form className="search" onSubmit={(e) => { e.preventDefault(); const t = newTag.trim().replace(/^#?/, '#').replace(/\s+/g, ''); if (t.length > 1 && !tags.includes(t)) setTagsInCaption([...tags, t]); setNewTag(''); }}>
          <label className="sr-only" htmlFor="newtag">New hashtag</label>
          <input id="newtag" className="input" placeholder="Add your own #hashtag" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
          <button className="btn">Add</button>
        </form>
      </Section>

      {config.ai && (
        <Section title="✨ Polish with AI" hint="Makes the caption read better in our tone. You decide whether to use it.">
          <label className="field__label field__label--sm" htmlFor="wish">What should change? (optional)</label>
          <input id="wish" className="input" placeholder="e.g. shorter, friendlier, add a question at the end" value={wish} onChange={(e) => setWish(e.target.value)} />
          <button className="btn btn--lg" onClick={polish} disabled={aiBusy || !post.caption.trim()}>{aiBusy ? 'Writing…' : 'Polish my caption'}</button>
          {ai && (
            <div className="ai-result">
              <p className="field__label">Suggestion</p>
              <pre>{ai}</pre>
              <div className="btn-row">
                <button className="btn btn--primary" onClick={() => { update((p) => { p.caption = ai; }); setAi(null); toast('Using the new caption'); }}>Use this</button>
                <button className="btn" onClick={() => setAi(null)}>Keep mine</button>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Theme of this post" hint="Used to suggest captions and to sort your posts.">
        <div className="seg seg--wrap">
          {(Object.keys(TOPIC_NAMES) as Topic[]).map((t) => (
            <button key={t} className={`seg__btn ${post.topic === t ? 'seg__btn--on' : ''}`} onClick={() => update((p) => { p.topic = t; p.tags = [t, ...p.tags.filter((x) => !(Object.keys(TOPIC_NAMES) as string[]).includes(x))]; })}>
              <b>{TOPIC_NAMES[t]}</b>
            </button>
          ))}
        </div>
        <label className="field__label field__label--sm" htmlFor="ptitle">Name of this post (only you see it)</label>
        <input id="ptitle" className="input" value={post.title} onChange={(e) => update((p) => { p.title = e.target.value; }, 'title')} />
      </Section>
    </>
  );
}

