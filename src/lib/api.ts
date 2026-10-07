import { ls } from './store';

export interface ApiConfig {
  available: boolean; // false when the /api functions aren't reachable (local dev)
  pinRequired: boolean;
  pinOk: boolean;
  photos: boolean;
  ai: boolean;
}

const headers = () => ({ 'x-studio-pin': ls<string>('pin', '') });

export async function getConfig(pin?: string): Promise<ApiConfig> {
  try {
    const r = await fetch('/api/config', { headers: { 'x-studio-pin': pin ?? ls<string>('pin', '') } });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error();
    return { available: true, ...(await r.json()) };
  } catch {
    return { available: false, pinRequired: false, pinOk: true, photos: false, ai: false };
  }
}

export interface StockPhoto {
  id: string;
  thumb: string;
  src: string;
  w: number;
  h: number;
  alt: string;
  credit: string;
  creditUrl: string;
}

export async function searchPhotos(q: string, page = 1): Promise<{ photos: StockPhoto[]; more: boolean }> {
  const r = await fetch(`/api/photos?q=${encodeURIComponent(q)}&page=${page}`, { headers: headers() });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'Photo search failed. Try again in a minute.');
  return r.json();
}

/** Fetch a stock photo through our proxy so it can be drawn into the PNG. */
export async function fetchPhotoBlob(url: string): Promise<Blob> {
  const r = await fetch(`/api/img?u=${encodeURIComponent(url)}`, { headers: headers() });
  if (!r.ok) throw new Error('Could not load that photo. Try another one.');
  return r.blob();
}

export async function polishCaption(caption: string, wish: string): Promise<string> {
  const r = await fetch('/api/polish', {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ caption, wish }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error || 'The AI helper is not available right now.');
  return data.caption as string;
}
