import type { Palette } from '../types';

export const BRAND = {
  olive: '#be9f06',
  forest: '#05250e',
  cream: '#f3ecd9',
  paper: '#fbf8ef',
  sage: '#737a66',
  oliveFaded: '#615a0a',
  forestSoft: '#1f4a2a',
  oliveLight: '#dcc65a',
  rust: '#a8431c',
};

export interface PalettePreset {
  id: string;
  name: string;
  palette: Palette;
}

export const PALETTES: PalettePreset[] = [
  { id: 'olive', name: 'Olive', palette: { ground: BRAND.olive, ink: BRAND.forest, accent: BRAND.cream, bar: BRAND.forest, onBar: BRAND.cream, arrow: BRAND.olive } },
  { id: 'cream', name: 'Cream', palette: { ground: BRAND.cream, ink: BRAND.forest, accent: BRAND.olive, bar: BRAND.forest, onBar: BRAND.cream, arrow: BRAND.olive } },
  { id: 'forest', name: 'Forest', palette: { ground: BRAND.forest, ink: BRAND.cream, accent: BRAND.olive, bar: BRAND.olive, onBar: BRAND.forest, arrow: BRAND.forest } },
  { id: 'paper', name: 'Paper', palette: { ground: BRAND.paper, ink: BRAND.forest, accent: BRAND.cream, bar: BRAND.olive, onBar: BRAND.forest, arrow: BRAND.forest } },
  { id: 'moss', name: 'Moss', palette: { ground: BRAND.forestSoft, ink: BRAND.cream, accent: BRAND.cream, bar: BRAND.cream, onBar: BRAND.forest, arrow: BRAND.olive } },
  { id: 'honey', name: 'Honey', palette: { ground: BRAND.oliveLight, ink: BRAND.forest, accent: BRAND.paper, bar: BRAND.forest, onBar: BRAND.oliveLight, arrow: BRAND.oliveLight } },
];

/** Swatches offered for custom colors. Every one is legible against at least one other. */
export const SWATCHES: { name: string; value: string }[] = [
  { name: 'Olive', value: BRAND.olive },
  { name: 'Forest', value: BRAND.forest },
  { name: 'Cream', value: BRAND.cream },
  { name: 'Paper', value: BRAND.paper },
  { name: 'Honey', value: BRAND.oliveLight },
  { name: 'Moss', value: BRAND.forestSoft },
  { name: 'Sage', value: BRAND.sage },
  { name: 'Rust', value: BRAND.rust },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#111111' },
];

export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
    const c = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const l = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
