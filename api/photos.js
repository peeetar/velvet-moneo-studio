import { pinOk, json, denied } from './_lib/auth.js';
import { hostAllowed } from './_lib/hosts.js';

// Stock photo search. Uses the first provider that is configured:
//   PEXELS_API_KEY  → Pexels
//   PIXABAY_API_KEY → Pixabay (free key at pixabay.com/api/docs)
//   neither         → Openverse, public-domain/CC0 images only (no key needed)
// Every result: { id, thumb, src, w, h, alt, credit, creditUrl }

async function pexels(q, page, key) {
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}`, { headers: { Authorization: key } });
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many searches this hour. Try again later.' : 'Photo search failed. Try again.');
  const d = await r.json();
  return {
    provider: 'Pexels',
    more: !!d.next_page,
    photos: (d.photos || []).map((p) => ({ id: 'px' + p.id, thumb: p.src.medium, src: p.src.large2x, w: p.width, h: p.height, alt: p.alt || '', credit: `Photo: ${p.photographer} / Pexels`, creditUrl: p.url })),
  };
}

async function pixabay(q, page, key) {
  const r = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&image_type=photo&safesearch=true&per_page=24&page=${page}`);
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many searches right now. Wait a minute.' : 'Photo search failed. Try again.');
  const d = await r.json();
  return {
    provider: 'Pixabay',
    more: page * 24 < (d.totalHits || 0),
    photos: (d.hits || []).map((p) => ({ id: 'pb' + p.id, thumb: p.webformatURL || p.previewURL, src: p.largeImageURL || p.webformatURL, w: p.imageWidth, h: p.imageHeight, alt: p.tags || '', credit: `Image: ${p.user} / Pixabay`, creditUrl: p.pageURL })),
  };
}

async function openverse(q, page) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=20&page=${page}&mature=false`;
  const r = await fetch(url, { headers: { 'User-Agent': 'velvet-moneo-studio/1.0', Accept: 'application/json' } });
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many searches right now. Wait a minute.' : 'Photo search failed. Try again.');
  const d = await r.json();
  const photos = (d.results || [])
    .filter((p) => { try { return hostAllowed(new URL(p.url).hostname); } catch { return false; } })
    .map((p) => ({ id: 'ov' + p.id, thumb: p.thumbnail || p.url, src: p.url, w: p.width, h: p.height, alt: p.title || '', credit: `Public domain / ${p.source || p.provider || 'Openverse'}`, creditUrl: p.foreign_landing_url }));
  return { provider: 'Openverse (public domain)', more: page < (d.page_count || 1), photos };
}

export async function GET(request) {
  if (!pinOk(request)) return denied();
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').slice(0, 100).trim();
  const page = Math.max(1, Math.min(20, parseInt(url.searchParams.get('page') || '1', 10) || 1));
  if (!q) return json({ photos: [], more: false, provider: '' });
  try {
    const res = process.env.PEXELS_API_KEY
      ? await pexels(q, page, process.env.PEXELS_API_KEY)
      : process.env.PIXABAY_API_KEY
        ? await pixabay(q, page, process.env.PIXABAY_API_KEY)
        : await openverse(q, page);
    return json(res, 200, { 'cache-control': 'private, max-age=3600' });
  } catch (e) {
    return json({ error: e.message || 'Photo search failed. Try again.' }, 502);
  }
}
