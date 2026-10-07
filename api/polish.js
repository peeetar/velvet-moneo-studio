import { pinOk, json, denied } from './_lib/auth.js';

const SYSTEM = `You edit Instagram captions for Velvet Moneo, an accounting, controlling and management firm in Skopje run by M-r Dushanka Velkovska.
Rules:
- Write in Macedonian (Cyrillic). Keep informal "ти" unless the caption already uses "Вие".
- Voice: short, clear lines; problem → system contrast; the firm is "ние", the reader owns the idea and the growth.
- The firm is more than accounting: numbers, processes, control and growth in one place.
- Keep emoji only as line bullets (📊 📂 🧠 🚀 ✅ ❌ 👉 🌳 💚), never mid-sentence. Keep the existing hashtag line at the end.
- Never add prices, discounts, deadlines, statistics or promises that are not already in the caption.
- End with one clear call to action (DM, message, or comment keyword).
- Under 1200 characters.
Return only the caption text, nothing else.`;

export async function POST(request) {
  if (!pinOk(request)) return denied();
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: 'The AI helper is not set up (missing ANTHROPIC_API_KEY).' }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const caption = String(body.caption || '').slice(0, 4000);
  const wish = String(body.wish || '').slice(0, 300);
  if (!caption.trim()) return json({ error: 'Write or build a caption first.' }, 400);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Caption:\n"""\n${caption}\n"""\n\n${wish ? `What to change: ${wish}` : 'Polish it: clearer, warmer, same length or shorter.'}` }],
    }),
  });
  if (!r.ok) return json({ error: 'The AI helper did not answer. Try again in a minute.' }, 502);
  const data = await r.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  return json({ caption: text });
}
