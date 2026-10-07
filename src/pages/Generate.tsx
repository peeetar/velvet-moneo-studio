import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Post, Slide } from '../types';
import { getPost, savePost, ls, lsSet, listPosts } from '../lib/store';
import { newPost, uid, FORMATS, firstLine } from '../lib/factory';
import { renderPost, downloadBlob, fileBase } from '../lib/export';
import { PostCanvas } from '../post/PostCanvas';
import { go, useToast, copyText, MiniPost } from '../ui';
import { LayoutPanel, WordsPanel, ColorsPanel, BackgroundPanel, ExtrasPanel, CaptionPanel } from '../editor/panels';

export type Step = 'layout' | 'words' | 'colors' | 'background' | 'extras' | 'caption';
const STEPS: { id: Step; name: string; hint: string }[] = [
  { id: 'layout', name: 'Layout', hint: 'Shape & size' },
  { id: 'words', name: 'Words', hint: 'Text on the image' },
  { id: 'colors', name: 'Colors', hint: 'Color scheme' },
  { id: 'background', name: 'Background', hint: 'Patterns & photos' },
  { id: 'extras', name: 'Extras', hint: 'Stickers, logo' },
  { id: 'caption', name: 'Caption', hint: 'Text for Instagram' },
];

export interface EditorApi {
  post: Post;
  slide: Slide;
  slideIdx: number;
  /** Change the post. `group` merges rapid edits (typing) into one undo step. */
  update: (fn: (p: Post) => void, group?: string) => void;
  updSlide: (fn: (s: Slide) => void, group?: string) => void;
  selSticker: string | null;
  setSelSticker: (id: string | null) => void;
}

export function Generate({ id }: { id?: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [step, setStep] = useState<Step>(() => ls<Step>('step', 'layout'));
  const [selSticker, setSelSticker] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [justDownloaded, setJustDownloaded] = useState(false);
  const toast = useToast();
  const past = useRef<Post[]>([]);
  const future = useRef<Post[]>([]);
  const lastGroup = useRef<{ g: string; t: number } | null>(null);
  const [, force] = useState(0);

  // Load: explicit id → that post; otherwise the last one edited; otherwise a new one.
  useEffect(() => {
    let alive = true;
    (async () => {
      let p: Post | undefined;
      if (id) p = await getPost(id);
      if (!p && !id) {
        const lastId = ls<string>('currentId', '');
        if (lastId) p = await getPost(lastId);
        if (!p || p.status !== 'draft') p = (await listPosts()).find((x) => x.status === 'draft');
      }
      if (!p) {
        p = newPost({});
        await savePost(p);
      }
      if (!alive) return;
      if (p.id !== id) history.replaceState(null, '', '#/generate/' + p.id);
      past.current = [];
      future.current = [];
      setPost(p);
      setSlideIdx(0);
      lsSet('currentId', p.id);
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => lsSet('step', step), [step]);

  // Autosave (debounced).
  useEffect(() => {
    if (!post) return;
    const t = setTimeout(async () => {
      try {
        await savePost(post);
        setSavedAt(Date.now());
      } catch {
        toast('Could not save on this computer. Download a backup from Home.', 'err');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [post, toast]);

  const update = useCallback((fn: (p: Post) => void, group?: string) => {
    setPost((cur) => {
      if (!cur) return cur;
      const now = Date.now();
      const merge = group && lastGroup.current && lastGroup.current.g === group && now - lastGroup.current.t < 1200;
      if (!merge) {
        past.current.push(cur);
        if (past.current.length > 60) past.current.shift();
      }
      lastGroup.current = group ? { g: group, t: now } : null;
      future.current = [];
      const next = structuredClone(cur);
      fn(next);
      next.updatedAt = now;
      if (!next.title || next.title === 'Untitled post' || (group === 'text-headline' && slideIdx === 0)) {
        next.title = firstLine(next.slides[0].text.headline);
      }
      return next;
    });
  }, [slideIdx]);

  const undo = () => {
    const prev = past.current.pop();
    if (!prev || !post) return;
    future.current.push(post);
    lastGroup.current = null;
    setPost(prev);
    setSlideIdx((i) => Math.min(i, prev.slides.length - 1));
    force((x) => x + 1);
  };
  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt || !post) return;
    past.current.push(post);
    setPost(nxt);
    force((x) => x + 1);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selSticker && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        update((p) => { p.slides[slideIdx].stickers = p.slides[slideIdx].stickers.filter((s) => s.id !== selSticker); });
        setSelSticker(null);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const updSlide = useCallback((fn: (s: Slide) => void, group?: string) => update((p) => fn(p.slides[slideIdx]), group), [update, slideIdx]);

  if (!post) return <div className="boot">Loading…</div>;
  const slide = post.slides[slideIdx] ?? post.slides[0];
  const api: EditorApi = { post, slide, slideIdx, update, updSlide, selSticker, setSelSticker };

  const download = async () => {
    setBusy('download');
    try {
      const blobs = await renderPost(post);
      const base = fileBase(post);
      for (let i = 0; i < blobs.length; i++) {
        downloadBlob(blobs[i], blobs.length > 1 ? `${base}-${i + 1}.png` : `${base}.png`);
        if (i < blobs.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
      toast(blobs.length > 1 ? `Downloaded ${blobs.length} images (in order)` : 'Image downloaded to your Downloads folder');
      setJustDownloaded(true);
    } catch (e) {
      toast('Could not make the image: ' + (e as Error).message, 'err');
    } finally {
      setBusy(null);
    }
  };

  const markPosted = async () => {
    const p = { ...post, status: 'posted' as const, postedAt: Date.now(), updatedAt: Date.now() };
    await savePost(p);
    lsSet('currentId', '');
    toast('Moved to Posted. Nice work!');
    go('posted/' + p.id);
  };

  const addSlide = (copy: boolean) => {
    update((p) => {
      const base = p.slides[slideIdx];
      const s: Slide = structuredClone(base);
      s.id = uid();
      s.stickers = copy ? s.stickers.map((x) => ({ ...x, id: uid() })) : [];
      p.slides.splice(slideIdx + 1, 0, s);
    });
    setSlideIdx(slideIdx + 1);
    setStep('words');
  };

  return (
    <div className="cols cols--gen">
      <section className="col col--left col--editor">
        <nav className="steps" aria-label="Editing steps">
          {STEPS.map((s, i) => (
            <button key={s.id} className={`step ${step === s.id ? 'step--on' : ''}`} onClick={() => setStep(s.id)} aria-current={step === s.id ? 'step' : undefined}>
              <span className="step__no">{i + 1}</span>
              <span className="step__text"><b>{s.name}</b><small>{s.hint}</small></span>
            </button>
          ))}
        </nav>
        <div className="panel">
          {step === 'layout' && <LayoutPanel {...api} />}
          {step === 'words' && <WordsPanel {...api} />}
          {step === 'colors' && <ColorsPanel {...api} />}
          {step === 'background' && <BackgroundPanel {...api} />}
          {step === 'extras' && <ExtrasPanel {...api} />}
          {step === 'caption' && <CaptionPanel {...api} />}
          <div className="panel__nav">
            {STEPS.findIndex((s) => s.id === step) > 0 && (
              <button className="btn btn--lg" onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) - 1].id)}>← Back</button>
            )}
            {STEPS.findIndex((s) => s.id === step) < STEPS.length - 1 && (
              <button className="btn btn--primary btn--lg" onClick={() => setStep(STEPS[STEPS.findIndex((s) => s.id === step) + 1].id)}>
                Next: {STEPS[STEPS.findIndex((s) => s.id === step) + 1].name} →
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="col col--right col--sticky col--preview">
        <div className="pv-head">
          <div className="pv-history">
            <button className="btn btn--sm" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)">↶ Undo</button>
            <button className="btn btn--sm" onClick={redo} disabled={!future.current.length} title="Redo">↷ Redo</button>
          </div>
          <span className="muted pv-saved">{savedAt ? '✓ Saved on this computer' : ' '}</span>
        </div>

        <Preview post={post} slideIdx={slideIdx} selSticker={selSticker} setSelSticker={setSelSticker}
          onMove={(sid, x, y) => update((p) => { const st = p.slides[slideIdx].stickers.find((s) => s.id === sid); if (st) { st.x = x; st.y = y; } }, 'move-' + sid)} />

        <div className="slides-strip" aria-label="Slides">
          {post.slides.map((s, i) => (
            <button key={s.id} className={`slide-thumb ${i === slideIdx ? 'slide-thumb--on' : ''}`} onClick={() => { setSlideIdx(i); setSelSticker(null); }} aria-label={`Slide ${i + 1}`}>
              <MiniPost post={post} i={i} />
              <span>{i + 1}</span>
            </button>
          ))}
          <div className="slides-strip__add">
            <button className="btn btn--sm" onClick={() => addSlide(true)}>+ Add slide</button>
            {post.slides.length > 1 && (
              <>
                <button className="btn btn--sm" disabled={slideIdx === 0} onClick={() => { update((p) => { const [s] = p.slides.splice(slideIdx, 1); p.slides.splice(slideIdx - 1, 0, s); }); setSlideIdx(slideIdx - 1); }}>← Move</button>
                <button className="btn btn--sm" disabled={slideIdx === post.slides.length - 1} onClick={() => { update((p) => { const [s] = p.slides.splice(slideIdx, 1); p.slides.splice(slideIdx + 1, 0, s); }); setSlideIdx(slideIdx + 1); }}>Move →</button>
                <button className="btn btn--sm btn--danger-ghost" onClick={() => { update((p) => { p.slides.splice(slideIdx, 1); }); setSlideIdx(Math.max(0, slideIdx - 1)); }}>Remove slide {slideIdx + 1}</button>
              </>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="btn btn--primary btn--xl" onClick={download} disabled={!!busy}>
            {busy === 'download' ? 'Preparing image…' : post.slides.length > 1 ? `⬇ Download ${post.slides.length} images` : '⬇ Download image (PNG)'}
          </button>
          <button className="btn btn--xl" onClick={async () => toast((await copyText(post.caption)) ? 'Caption copied. Paste it in Instagram.' : 'Could not copy', 'ok')}>
            📋 Copy caption
          </button>
        </div>
        {justDownloaded ? (
          <div className="posted-ask">
            <span>Posted it on Instagram?</span>
            <button className="btn btn--primary" onClick={markPosted}>Yes, move to Posted</button>
            <button className="btn" onClick={() => setJustDownloaded(false)}>Not yet</button>
          </div>
        ) : (
          <div className="btn-row btn-row--center">
            <button className="btn" onClick={markPosted}>Mark as posted</button>
            <button className="btn" onClick={() => go('drafts/' + post.id)}>Keep as draft</button>
            <button className="btn" onClick={async () => { const p = newPost({ format: post.format }); await savePost(p); go('generate/' + p.id); }}>Start a new post</button>
          </div>
        )}
        <p className="muted pv-format">{FORMATS[post.format].name} · {FORMATS[post.format].w}×{FORMATS[post.format].h}px</p>
      </section>
    </div>
  );
}

function Preview({ post, slideIdx, selSticker, setSelSticker, onMove }: {
  post: Post; slideIdx: number; selSticker: string | null; setSelSticker: (id: string | null) => void; onMove: (id: string, x: number, y: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.4);
  const { w, h } = FORMATS[post.format];
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const maxH = Math.max(320, window.innerHeight - 380);
      setK(Math.min(el.clientWidth / w, maxH / h));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [w, h]);
  const slide = post.slides[slideIdx] ?? post.slides[0];
  return (
    <div ref={box} className="pv">
      <div className="pv__frame" style={{ width: w * k, height: h * k }}>
        <div style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: w, height: h }}>
          <PostCanvas slide={slide} format={post.format} scale={k} selectedSticker={selSticker} onSelectSticker={setSelSticker} onMoveSticker={onMove}
            slideNo={{ n: slideIdx + 1, of: post.slides.length }} />
        </div>
      </div>
      {slide.stickers.length > 0 && <p className="muted pv-tip">Tip: drag stickers on the picture to move them.</p>}
    </div>
  );
}
