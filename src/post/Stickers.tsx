import type { CSSProperties, PointerEvent as RPointerEvent } from 'react';
import type { Palette, Sticker, StickerKind } from '../types';
import { BRAND } from '../data/palettes';

export const STICKER_TYPES: { kind: StickerKind; name: string; text: string; hint: string }[] = [
  { kind: 'tag', name: 'Label tag', text: '10+ ГОДИНИ ИСКУСТВО', hint: 'Tilted dark tag with text' },
  { kind: 'stamp', name: 'Round stamp', text: '10+\nГОД.', hint: 'Circle stamp' },
  { kind: 'star', name: 'Star badge', text: 'НОВО', hint: 'Burst badge' },
  { kind: 'note', name: 'Sticky note', text: 'НЕ ЗАБОРАВАЈ:\nФАКТУРИТЕ!', hint: 'Paper note with tape' },
  { kind: 'arrow', name: 'Arrow', text: '', hint: 'Hand-drawn arrow' },
  { kind: 'circle', name: 'Circle marker', text: '', hint: 'Circle a word' },
  { kind: 'underline', name: 'Underline', text: '', hint: 'Scribble under a word' },
  { kind: 'chart', name: 'Growth chart', text: '', hint: 'Rising bars' },
  { kind: 'ring', name: 'Progress ring', text: '87%', hint: 'Circle with a percent' },
  { kind: 'emoji', name: 'Emoji', text: '📊', hint: 'Any emoji, big' },
];

export function StickerArt({ s, pal }: { s: Sticker; pal: Palette }) {
  const color = s.color || pal.ink;
  const lines = s.text.split('\n');
  switch (s.kind) {
    case 'tag':
      return (
        <div className="stk-tag" style={{ background: pal.bar, color: pal.bar === BRAND.forest ? BRAND.olive : pal.onBar }}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      );
    case 'note':
      return (
        <div className="stk-note" style={{ background: BRAND.paper, color: BRAND.forest }}>
          <div className="stk-note__tape" style={{ background: BRAND.oliveLight }} />
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      );
    case 'stamp': {
      const ring = 'ВЕЛВЕТ МОНЕО • СМЕТКОВОДСТВО • КОНТРОЛИНГ • ';
      return (
        <svg width="320" height="320" viewBox="0 0 320 320" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <path id={`ring-${s.id}`} d="M160,160 m-118,0 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0" />
          </defs>
          <circle cx="160" cy="160" r="152" fill={pal.ground} stroke={color} strokeWidth="6" />
          <circle cx="160" cy="160" r="96" fill="none" stroke={color} strokeWidth="3" />
          <text fill={color} style={{ font: '700 22px "Roboto Mono", monospace', letterSpacing: '2px' }}>
            <textPath href={`#ring-${s.id}`}>{ring}</textPath>
          </text>
          <text x="160" y={160 - (lines.length - 1) * 26} textAnchor="middle" dominantBaseline="central" fill={color} style={{ font: '700 52px Oswald, sans-serif' }}>
            {lines.map((l, i) => <tspan key={i} x="160" dy={i ? 52 : 0}>{l}</tspan>)}
          </text>
        </svg>
      );
    }
    case 'star': {
      const pts: string[] = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const rr = i % 2 ? 128 : 150;
        pts.push(`${160 + Math.cos(a) * rr},${160 + Math.sin(a) * rr}`);
      }
      return (
        <svg width="320" height="320" viewBox="0 0 320 320" style={{ display: 'block' }}>
          <polygon points={pts.join(' ')} fill={pal.bar} />
          <text x="160" y={160 - (lines.length - 1) * 24} textAnchor="middle" dominantBaseline="central" fill={pal.bar === BRAND.forest ? BRAND.cream : pal.onBar} style={{ font: '700 50px Oswald, sans-serif' }}>
            {lines.map((l, i) => <tspan key={i} x="160" dy={i ? 50 : 0}>{l}</tspan>)}
          </text>
        </svg>
      );
    }
    case 'arrow':
      return (
        <svg width="300" height="180" viewBox="0 0 300 180" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M12 150 C 70 40, 170 30, 270 70" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
          <path d="M228 34 L 274 72 L 220 96" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'circle':
      return (
        <svg width="460" height="200" viewBox="0 0 460 200" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M60 40 C 180 0, 420 10, 440 90 C 460 170, 220 200, 90 170 C 0 150, 10 70, 120 40 C 170 28, 230 24, 270 26" fill="none" stroke={s.color || BRAND.rust} strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    case 'underline':
      return (
        <svg width="480" height="70" viewBox="0 0 480 70" style={{ display: 'block', overflow: 'visible' }}>
          <path d="M10 40 C 120 18, 260 16, 470 30 M60 56 C 180 40, 320 42, 430 50" fill="none" stroke={s.color || BRAND.rust} strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg width="300" height="240" viewBox="0 0 300 240" style={{ display: 'block' }}>
          <g fill={color}>
            <rect x="20" y="150" width="46" height="70" />
            <rect x="86" y="115" width="46" height="105" />
            <rect x="152" y="80" width="46" height="140" />
            <rect x="218" y="40" width="46" height="180" />
          </g>
          <path d="M20 120 L 100 80 L 160 96 L 270 14" fill="none" stroke={pal.accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M236 10 L 272 12 L 268 48" fill="none" stroke={pal.accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ring': {
      const pct = Math.max(0, Math.min(100, parseFloat(s.text) || 0));
      const C = 2 * Math.PI * 120;
      return (
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ display: 'block' }}>
          <circle cx="150" cy="150" r="120" fill="none" stroke={color} strokeOpacity="0.2" strokeWidth="26" />
          <circle cx="150" cy="150" r="120" fill="none" stroke={color} strokeWidth="26" strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 150 150)" />
          <text x="150" y="152" textAnchor="middle" dominantBaseline="central" fill={color} style={{ font: '700 76px Oswald, sans-serif' }}>{s.text}</text>
        </svg>
      );
    }
    case 'emoji':
      return <div style={{ fontSize: 180, lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{s.text || '📊'}</div>;
  }
}

export function StickerLayer({
  stickers,
  pal,
  selectedId,
  scale,
  onSelect,
  onMove,
}: {
  stickers: Sticker[];
  pal: Palette;
  selectedId?: string | null;
  scale?: number;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const interactive = !!onMove;
  const down = (e: RPointerEvent<HTMLDivElement>, s: Sticker) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(s.id);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, ox = s.x, oy = s.y;
    const k = scale || 1;
    const move = (ev: PointerEvent) => onMove!(s.id, Math.round(ox + (ev.clientX - sx) / k), Math.round(oy + (ev.clientY - sy) / k));
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  return (
    <>
      {stickers.map((s) => {
        const st: CSSProperties = {
          position: 'absolute',
          left: s.x,
          top: s.y,
          transform: `translate(-50%, -50%) rotate(${s.rot}deg) scale(${s.scale})`,
          cursor: interactive ? 'grab' : undefined,
          touchAction: 'none',
          zIndex: 20,
        };
        return (
          <div key={s.id} style={st} onPointerDown={(e) => down(e, s)} className={interactive && selectedId === s.id ? 'stk stk--selected' : 'stk'}>
            <StickerArt s={s} pal={pal} />
          </div>
        );
      })}
    </>
  );
}
