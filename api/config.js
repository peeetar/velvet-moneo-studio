import { pinOk, json } from './_lib/auth.js';

export function GET(request) {
  return json({
    pinRequired: !!process.env.STUDIO_PIN,
    pinOk: pinOk(request),
    photos: !!process.env.PEXELS_API_KEY,
    ai: !!process.env.ANTHROPIC_API_KEY,
  });
}
