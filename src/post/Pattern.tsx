import type { CSSProperties } from 'react';
import type { Background, PatternId } from '../types';
import { TREE_SVG } from '../brand/logo';

export const PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'dollar', name: '$ signs' },
  { id: 'denar', name: 'ДЕН' },
  { id: 'euro', name: '€ signs' },
  { id: 'percent', name: '% signs' },
  { id: 'dots', name: 'Polka dots' },
  { id: 'bigdots', name: 'Big dots' },
  { id: 'grid', name: 'Graph paper' },
  { id: 'ledger', name: 'Ledger lines' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'plus', name: 'Plus signs' },
  { id: 'checks', name: 'Checkmarks' },
  { id: 'arrows', name: 'Arrows ↗' },
  { id: 'numbers', name: 'Numbers' },
  { id: 'bars', name: 'Mini charts' },
  { id: 'emoji', name: 'Emoji' },
  { id: 'logo', name: 'Tree logo' },
];

const TEXT_PATTERNS: Partial<Record<PatternId, { glyphs: string[]; font: string; size: number }>> = {
  dollar: { glyphs: ['$'], font: '700 {s}px Oswald, sans-serif', size: 64 },
  euro: { glyphs: ['€'], font: '700 {s}px Oswald, sans-serif', size: 64 },
  percent: { glyphs: ['%'], font: '700 {s}px Oswald, sans-serif', size: 60 },
  denar: { glyphs: ['ДЕН'], font: '700 {s}px "Roboto Mono", monospace', size: 30 },
  checks: { glyphs: ['✓'], font: '700 {s}px "Roboto Mono", monospace', size: 52 },
  arrows: { glyphs: ['↗'], font: '700 {s}px "Roboto Mono", monospace', size: 56 },
  numbers: { glyphs: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], font: '700 {s}px "Roboto Mono", monospace', size: 40 },
};

// deterministic pseudo-random so the pattern doesn't jump between renders
const rand = (i: number) => {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export function PatternLayer({ bg, ink, w, h }: { bg: Background; ink: string; w: number; h: number }) {
  if (bg.pattern === 'none' || (bg.photoMode === 'full' && bg.photo)) return null;
  const color = bg.patternColor || ink;
  const k = bg.size;
  const pad = bg.tilt ? 0.35 : 0;
  const W = w * (1 + pad * 2);
  const H = h * (1 + pad * 2);
  const wrap: CSSProperties = {
    position: 'absolute',
    left: -w * pad,
    top: -h * pad,
    width: W,
    height: H,
    opacity: bg.opacity,
    transform: bg.tilt ? 'rotate(-14deg)' : undefined,
    pointerEvents: 'none',
    overflow: 'hidden',
  };

  if (bg.pattern === 'logo') {
    const step = 170 * k;
    const cols = Math.ceil(W / step) + 1;
    const rows = Math.ceil(H / (step * 0.85)) + 1;
    const tree = TREE_SVG.replace('<svg ', `<svg style="width:${Math.round(110 * k)}px;height:auto;display:block" `);
    const cells = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push(
          <span key={`${r}-${c}`} style={{ position: 'absolute', left: c * step + (r % 2 ? step / 2 : 0) - step / 2, top: r * step * 0.85 - step / 2, color }} dangerouslySetInnerHTML={{ __html: tree }} />,
        );
    return <div style={wrap} aria-hidden>{cells}</div>;
  }

  const tp = TEXT_PATTERNS[bg.pattern];
  if (tp || bg.pattern === 'emoji') {
    const step = (bg.pattern === 'emoji' ? 150 : bg.pattern === 'denar' ? 150 : 120) * k;
    const rowStep = step * 0.8;
    const cols = Math.ceil(W / step) + 1;
    const rows = Math.ceil(H / rowStep) + 1;
    const glyphs = bg.pattern === 'emoji' ? [...new Intl.Segmenter().segment(bg.emoji || '📊')].map((s) => s.segment).filter((g) => g.trim()) : tp!.glyphs;
    const font = bg.pattern === 'emoji'
      ? `${Math.round(70 * k)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
      : tp!.font.replace('{s}', String(Math.round(tp!.size * k)));
    const cells = [];
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        n++;
        const g = glyphs[bg.pattern === 'numbers' ? Math.floor(rand(n) * glyphs.length) : n % glyphs.length];
        cells.push(
          <span
            key={n}
            style={{
              position: 'absolute',
              left: c * step + (r % 2 ? step / 2 : 0) - step / 2,
              top: r * rowStep - rowStep / 2,
              width: step,
              textAlign: 'center',
              font,
              lineHeight: 1,
              color,
            }}
          >
            {g}
          </span>,
        );
      }
    }
    return <div style={wrap} aria-hidden>{cells}</div>;
  }

  const s = (v: number) => `${v * k}px`;
  const css: CSSProperties = {};
  switch (bg.pattern) {
    case 'dots':
      css.backgroundImage = `radial-gradient(${color} 22%, transparent 24%)`;
      css.backgroundSize = `${s(48)} ${s(48)}`;
      break;
    case 'bigdots':
      css.backgroundImage = `radial-gradient(${color} 30%, transparent 31%), radial-gradient(${color} 30%, transparent 31%)`;
      css.backgroundSize = `${s(160)} ${s(160)}`;
      css.backgroundPosition = `0 0, ${s(80)} ${s(80)}`;
      break;
    case 'grid':
      css.backgroundImage = `linear-gradient(${color} 2px, transparent 2px), linear-gradient(90deg, ${color} 2px, transparent 2px)`;
      css.backgroundSize = `${s(54)} ${s(54)}`;
      break;
    case 'ledger':
      css.backgroundImage = `linear-gradient(${color} 3px, transparent 3px)`;
      css.backgroundSize = `100% ${s(64)}`;
      break;
    case 'stripes':
      css.backgroundImage = `repeating-linear-gradient(45deg, ${color} 0 ${s(22)}, transparent ${s(22)} ${s(56)})`;
      break;
    case 'plus': {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M40 22v36M22 40h36' stroke='${color}' stroke-width='7' stroke-linecap='square'/></svg>`;
      css.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      css.backgroundSize = `${s(80)} ${s(80)}`;
      break;
    }
    case 'bars': {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='160'><g fill='${color}'><rect x='40' y='92' width='22' height='40'/><rect x='72' y='72' width='22' height='60'/><rect x='104' y='52' width='22' height='80'/><rect x='136' y='28' width='22' height='104'/></g></svg>`;
      css.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      css.backgroundSize = `${s(200)} ${s(160)}`;
      break;
    }
  }
  return <div style={{ ...wrap, ...css }} aria-hidden />;
}
