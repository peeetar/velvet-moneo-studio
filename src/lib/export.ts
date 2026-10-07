import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { toBlob, getFontEmbedCSS } from 'html-to-image';
import { PostCanvas } from '../post/PostCanvas';
import type { Post } from '../types';
import { FORMATS } from './factory';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Render every slide of a post offscreen at full size and return PNG blobs. */
export async function renderPost(post: Post, opts: { pixelRatio?: number; only?: number } = {}): Promise<Blob[]> {
  const { w, h } = FORMATS[post.format];
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-30000px;top:0;width:${w}px;pointer-events:none;`;
  document.body.appendChild(host);
  const slides = opts.only != null ? [post.slides[opts.only]] : post.slides;
  const nodes: HTMLDivElement[] = [];
  const root = createRoot(host);
  try {
    root.render(
      createElement(
        'div',
        null,
        slides.map((s, i) =>
          createElement(PostCanvas, {
            key: s.id,
            slide: s,
            format: post.format,
            slideNo: { n: (opts.only ?? i) + 1, of: post.slides.length },
            ref: (el: HTMLDivElement | null) => {
              if (el) nodes[i] = el;
            },
          }),
        ),
      ),
    );
    await frames();
    await document.fonts.ready;
    // wait for photos
    await Promise.all(
      [...host.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))),
    );
    await frames();
    await wait(120);
    const css = await getFontEmbedCSS(host);
    const out: Blob[] = [];
    for (const n of nodes) {
      const b = await toBlob(n, { width: w, height: h, pixelRatio: opts.pixelRatio ?? 1, fontEmbedCSS: css, cacheBust: false });
      if (!b) throw new Error('Could not create the image.');
      out.push(b);
    }
    return out;
  } finally {
    root.unmount();
    host.remove();
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function fileBase(post: Post) {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const slug = translit(post.title.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `velvet-moneo-${date}-${slug || 'post'}`;
}

const MK: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj',
  м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh',
  ѐ: 'e', ѝ: 'i',
};
const translit = (s: string) => [...s].map((c) => MK[c] ?? c).join('');
