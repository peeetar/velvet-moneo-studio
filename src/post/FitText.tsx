import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';

/**
 * Fills its parent box with text: the largest font size (≤ max) at which
 * the text fits the box's width and height. Box must have a definite size
 * (e.g. flex: 1 with min-height: 0).
 */
export function FitText({
  children,
  max,
  min = 24,
  style,
  className,
  align = 'start',
  deps = [],
}: {
  children: ReactNode;
  max: number;
  min?: number;
  style?: CSSProperties;
  className?: string;
  align?: 'start' | 'center' | 'end';
  deps?: unknown[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const b = box.current;
    const t = inner.current;
    if (!b || !t) return;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      const W = b.clientWidth;
      const H = b.clientHeight;
      if (!W || !H) return;
      const fits = () => t.scrollWidth <= W + 1 && t.offsetHeight <= H + 1;
      const search = (ws: string) => {
        t.style.whiteSpace = ws;
        t.style.fontSize = max + 'px';
        if (fits()) return max;
        let lo = min;
        let hi = max;
        for (let i = 0; i < 14; i++) {
          const mid = (lo + hi) / 2;
          t.style.fontSize = mid + 'px';
          if (fits()) lo = mid;
          else hi = mid;
        }
        return Math.floor(lo);
      };
      // Keep the lines the person typed intact; only wrap if that would make text tiny.
      let size = search('pre');
      if (size < max * 0.55) size = search('pre-line');
      t.style.fontSize = size + 'px';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    document.fonts?.ready.then(fit);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, min, ...deps]);

  return (
    <div
      ref={box}
      className="fit-box"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center', minHeight: 0, minWidth: 0, flex: '1 1 0', overflow: 'hidden' }}
    >
      <div ref={inner} className={className} style={{ ...style, fontSize: max }}>
        {children}
      </div>
    </div>
  );
}
