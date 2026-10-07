import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PostCanvas } from './post/PostCanvas';
import { FORMATS } from './lib/factory';
import type { Post, ArchivePost } from './types';

/* ---------------- toasts ---------------- */
type Toast = { id: number; text: string; kind?: 'ok' | 'err' };
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, text, kind }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), kind === 'err' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>{t.kind === 'err' ? '⚠ ' : '✓ '}{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- routing (hash) ---------------- */
export function useHashRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || '').split('/');
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => setParts(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}
export const go = (path: string) => {
  location.hash = '#/' + path;
};

/* ---------------- controls ---------------- */
export function Slider({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const id = 'sl-' + label.replace(/\W+/g, '-').toLowerCase();
  return (
    <div className="slider">
      <label htmlFor={id}>{label}<span className="slider__val">{format ? format(value) : value}</span></label>
      <div className="slider__row">
        <button type="button" className="btn btn--icon" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))}>−</button>
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
        <button type="button" className="btn btn--icon" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(3)))}>+</button>
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className={`toggle ${checked ? 'toggle--on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__box" aria-hidden>{checked ? '✓' : ''}</span>
      <span className="toggle__text">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="sec">
      <h3 className="sec__title">{title}</h3>
      {hint && <p className="sec__hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Inline two-step confirm (no browser dialogs). */
export function ConfirmButton({ label, confirm, onConfirm, className = 'btn btn--danger' }: { label: string; confirm: string; onConfirm: () => void; className?: string }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={className} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <span className="confirm">
      <span>{confirm}</span>
      <button type="button" className="btn btn--danger" onClick={() => { setAsk(false); onConfirm(); }}>Yes</button>
      <button type="button" className="btn" onClick={() => setAsk(false)}>No</button>
    </span>
  );
}

/* ---------------- post previews ---------------- */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** A scaled, non-interactive render of slide `i` of a post, filling its parent's width. */
export function MiniPost({ post, i = 0 }: { post: Post; i?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const { w: W, h: H } = FORMATS[post.format];
  const k = w / W;
  const slide = post.slides[i] ?? post.slides[0];
  return (
    <div ref={ref} className="mini" style={{ aspectRatio: `${W} / ${H}` }}>
      {w > 0 && (
        <div style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: W, height: H }}>
          <PostCanvas slide={slide} format={post.format} />
        </div>
      )}
    </div>
  );
}

export function ArchiveImage({ post }: { post: ArchivePost }) {
  if (!post.image) {
    return (
      <div className="mini mini--missing" style={{ aspectRatio: '4 / 5' }}>
        <span>Image not saved<br />(caption only)</span>
      </div>
    );
  }
  return <img className="mini mini--img" src={post.image} alt={post.title} loading="lazy" />;
}

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
