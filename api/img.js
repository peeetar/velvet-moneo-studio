import { pinOk, denied } from './_lib/auth.js';

// Same-origin proxy so stock photos can be drawn into the exported PNG.
const ALLOWED = new Set(['images.pexels.com']);

export async function GET(request) {
  if (!pinOk(request)) return denied();
  const u = new URL(request.url).searchParams.get('u') || '';
  let target;
  try {
    target = new URL(u);
  } catch {
    return new Response('Bad url', { status: 400 });
  }
  if (target.protocol !== 'https:' || !ALLOWED.has(target.hostname)) return new Response('Host not allowed', { status: 400 });
  const r = await fetch(target, { redirect: 'follow' });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/')) return new Response('Not an image', { status: 502 });
  return new Response(r.body, { headers: { 'content-type': type, 'cache-control': 'private, max-age=86400' } });
}
