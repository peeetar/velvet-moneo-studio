import { createStore, get, set, del, entries, setMany } from 'idb-keyval';
import type { Post } from '../types';

/* Everything lives in this browser (IndexedDB), per device. */
const posts = createStore('vm-studio-posts', 'posts');
const misc = createStore('vm-studio-misc', 'misc');

export async function listPosts(): Promise<Post[]> {
  try {
    const all = await entries<string, Post>(posts);
    return all.map(([, p]) => p).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getPost(id: string) {
  try {
    return await get<Post>(id, posts);
  } catch {
    return undefined;
  }
}

export async function savePost(p: Post) {
  try {
    await set(p.id, p, posts);
    window.dispatchEvent(new CustomEvent('vm-posts-changed'));
  } catch (e) {
    console.error('save failed', e);
    throw e;
  }
}

export async function deletePost(id: string) {
  await del(id, posts);
  window.dispatchEvent(new CustomEvent('vm-posts-changed'));
}

export async function getMisc<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key, misc);
  } catch {
    return undefined;
  }
}
export async function setMisc<T>(key: string, v: T) {
  try {
    await set(key, v, misc);
  } catch {
    /* storage blocked */
  }
}

/* -------- small settings in localStorage -------- */
export function ls<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem('vm:' + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export function lsSet(key: string, v: unknown) {
  try {
    localStorage.setItem('vm:' + key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

/* -------- backup -------- */
export async function exportBackup(): Promise<Blob> {
  const all = await listPosts();
  const favs = (await getMisc('photos')) ?? [];
  return new Blob([JSON.stringify({ app: 'velvet-moneo-studio', v: 1, at: new Date().toISOString(), posts: all, photos: favs })], { type: 'application/json' });
}

export async function importBackup(file: File): Promise<number> {
  const data = JSON.parse(await file.text());
  if (data?.app !== 'velvet-moneo-studio' || !Array.isArray(data.posts)) throw new Error('This file is not a Velvet Moneo Studio backup.');
  await setMany(data.posts.map((p: Post) => [p.id, p] as [string, Post]), posts);
  if (Array.isArray(data.photos)) {
    const cur = ((await getMisc<unknown[]>('photos')) ?? []) as { id: string }[];
    const ids = new Set(cur.map((x) => x.id));
    await setMisc('photos', [...cur, ...data.photos.filter((x: { id: string }) => !ids.has(x.id))]);
  }
  window.dispatchEvent(new CustomEvent('vm-posts-changed'));
  return data.posts.length;
}

/** Ask the browser not to clear our data when space is low. */
export async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}
