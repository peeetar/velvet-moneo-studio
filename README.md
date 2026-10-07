# Velvet Moneo Studio

A static post generator for Velvet Moneo's Instagram. Pick a theme or layout, change words, colors,
background and stickers, then download a PNG (or several, for a carousel) plus a ready caption.

- **Home**: start a post by theme, "Surprise me", or by layout; continue the last draft; backup/restore.
- **Generate**: 6 steps (Layout, Words, Colors, Background, Extras, Caption) on the left, live preview on the right.
- **Posted**: the Instagram archive (10 imported posts) plus everything marked as posted, searchable, with captions.
- **Drafts**: everything in progress. Saved automatically.

Everything is stored **per device** in the browser (IndexedDB). Nothing is sent to a server except photo
searches and the optional AI caption polish. Use *Home → Download backup* to move to another computer.

## Formats and layouts

Feed 4:5 (1080×1350), square 1:1 (1080×1080), story 9:16 (1080×1920), and carousels (multiple slides).
Nine layouts: loading bar, numbered cards, big statement, quote, tip, myth vs fact, big number, photo + headline, before/after.

## Deploy (Vercel)

The repo is a Vite + React app with three serverless functions in `api/`. Import it in Vercel (framework: Vite)
and set these environment variables (Project → Settings → Environment Variables), then redeploy:

| Variable | What it does | Where to get it |
| --- | --- | --- |
| `STUDIO_PIN` | PIN asked once per device. Leave empty for no lock. | Pick any number |
| `PEXELS_API_KEY` | Turns on stock photo search | Free at https://www.pexels.com/api/ |
| `ANTHROPIC_API_KEY` | Turns on "✨ Polish with AI" for captions | https://console.anthropic.com |
| `ANTHROPIC_MODEL` | Optional model override | default `claude-haiku-4-5-20251001` |

Without the keys the app still works: photo search shows "not switched on" (own photos still work) and the AI box is hidden.

## Editing content

- Ready-made words, captions and hashtags: `src/data/phrases.ts`
- Colors and palettes: `src/data/palettes.ts` (mirrors `design/tokens.json`)
- Archive of past posts: `src/data/archive.ts` (+ images in `public/archive/`)
- Logos: `src/brand/logo.ts` (from the brand files in `public/brand/`)
- Brand rules: `design/BRAND.md`

## Develop

```bash
npm install
npm run dev     # http://localhost:5173 (the /api functions need `vercel dev`)
npm run build
```
