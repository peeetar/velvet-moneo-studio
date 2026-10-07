// Shared helpers for the Studio's serverless functions.
// Env vars (set in Vercel → Project → Settings → Environment Variables):
//   STUDIO_PIN         PIN asked once per device. Leave empty to disable the lock.
//   PEXELS_API_KEY     free key from https://www.pexels.com/api/ (photo search)
//   ANTHROPIC_API_KEY  key for the "Polish with AI" caption button
import { timingSafeEqual } from 'node:crypto';

export function pinOk(request) {
  const want = process.env.STUDIO_PIN || '';
  if (!want) return true;
  const got = request.headers.get('x-studio-pin') || '';
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

export const denied = () => json({ error: 'Wrong or missing PIN. Reload the page and enter the PIN again.' }, 401);
