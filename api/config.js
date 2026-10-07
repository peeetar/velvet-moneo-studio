import { pinOk, json } from './_lib/auth.js';

export function GET(request) {
  return json({
    pinRequired: !!process.env.STUDIO_PIN,
    pinOk: pinOk(request),
    photos: true, // Openverse works without a key
    photoProvider: process.env.PEXELS_API_KEY ? 'Pexels' : process.env.PIXABAY_API_KEY ? 'Pixabay' : 'Openverse',
    ai: !!process.env.ANTHROPIC_API_KEY,
  });
}
