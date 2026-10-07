import { pinOk, json, denied } from './_lib/auth.js';

// Pexels photo search. Returns small thumbs for the grid and a ~1880px source for the post.
export async function GET(request) {
  if (!pinOk(request)) return denied();
  const key = process.env.PEXELS_API_KEY;
  if (!key) return json({ error: 'Photo search is not set up (missing PEXELS_API_KEY).' }, 503);
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').slice(0, 100).trim();
  const page = Math.max(1, Math.min(20, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  if (!q) return json({ photos: [], more: false });
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}`, {
    headers: { Authorization: key },
  });
  if (!r.ok) return json({ error: r.status === 429 ? 'Too many searches this hour. Try again later.' : 'Photo search failed. Try again.' }, 502);
  const data = await r.json();
  const photos = (data.photos || []).map((p) => ({
    id: String(p.id),
    thumb: p.src.medium,
    src: p.src.large2x,
    w: p.width,
    h: p.height,
    alt: p.alt || '',
    credit: `Photo: ${p.photographer} / Pexels`,
    creditUrl: p.url,
  }));
  return json({ photos, more: !!data.next_page }, 200, { 'cache-control': 'private, max-age=3600' });
}
