import { useMemo, useState } from 'react';
import type { ArchivePost, Post } from '../types';
import { ARCHIVE } from '../data/archive';
import { usePosts, startPost } from './Home';
import { savePost, deletePost } from '../lib/store';
import { renderPost, downloadBlob, fileBase } from '../lib/export';
import { uid, firstLine, newPost } from '../lib/factory';
import { MiniPost, ArchiveImage, go, fmtDate, useToast, copyText, ConfirmButton } from '../ui';

type Item = { kind: 'own'; post: Post } | { kind: 'archive'; post: ArchivePost };

const TAG_NAMES: Record<string, string> = {
  controlling: 'Controlling', management: 'Management', tips: 'Tips', about: 'About us', promo: 'Old promo',
  services: 'Services', personal: 'Personal', 'about-us': 'About us', 'health-practices': 'Clinics', 'new-business': 'New business',
};

export function Library({ kind, selected }: { kind: 'posted' | 'drafts'; selected?: string }) {
  const posts = usePosts();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');

  const items: Item[] = useMemo(() => {
    const own = (posts ?? []).filter((p) => (kind === 'posted' ? p.status === 'posted' : p.status === 'draft'))
      .map((p) => ({ kind: 'own' as const, post: p }));
    const arc = kind === 'posted' ? ARCHIVE.map((a) => ({ kind: 'archive' as const, post: a })) : [];
    const all: Item[] = [...own, ...arc];
    const date = (i: Item) => (i.kind === 'own' ? (kind === 'posted' ? i.post.postedAt ?? i.post.updatedAt : i.post.updatedAt) : i.post.postedAt);
    return all.sort((a, b) => date(b) - date(a));
  }, [posts, kind]);

  const tags = useMemo(() => [...new Set(items.flatMap((i) => i.post.tags))], [items]);
  const shown = items.filter((i) => {
    if (tag && !i.post.tags.includes(tag)) return false;
    if (!q.trim()) return true;
    const hay = (i.post.title + ' ' + i.post.caption).toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const sel = items.find((i) => i.post.id === selected) ?? shown[0];

  if (!posts) return <div className="boot">Loading…</div>;

  return (
    <div className="cols">
      <section className="col col--left">
        <div className="row-between">
          <h1 className="h1 h1--flush">{kind === 'posted' ? 'Posted' : 'Drafts'}</h1>
          <span className="muted">{items.length} {items.length === 1 ? 'post' : 'posts'}</span>
        </div>
        <p className="lead">
          {kind === 'posted'
            ? 'Everything already on Instagram, newest first. Use it to stay consistent and to reuse good captions.'
            : 'Posts you started. They save automatically while you work.'}
        </p>
        <label className="field__label" htmlFor="lib-q">Search words in the post or caption</label>
        <input id="lib-q" className="input input--lg" placeholder="e.g. контролинг" value={q} onChange={(e) => setQ(e.target.value)} />
        {tags.length > 1 && (
          <div className="chips" role="group" aria-label="Filter by tag">
            <button className={`chip ${!tag ? 'chip--on' : ''}`} onClick={() => setTag('')}>All</button>
            {tags.map((t) => (
              <button key={t} className={`chip ${tag === t ? 'chip--on' : ''}`} onClick={() => setTag(t === tag ? '' : t)}>{TAG_NAMES[t] ?? t}</button>
            ))}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="empty">
            {kind === 'drafts' ? (
              <>
                <p>No drafts. Start a new post and it will appear here.</p>
                <button className="btn btn--primary btn--lg" onClick={() => go('')}>Start a post</button>
              </>
            ) : <p>Nothing matches that search.</p>}
          </div>
        ) : (
          <div className="lib-grid">
            {shown.map((i) => (
              <button
                key={i.post.id}
                className={`lib-item ${sel?.post.id === i.post.id ? 'lib-item--on' : ''}`}
                onClick={() => go(`${kind}/${i.post.id}`)}
              >
                {i.kind === 'own' ? <MiniPost post={i.post} /> : <ArchiveImage post={i.post} />}
                <span className="lib-item__title">{i.post.title}</span>
                <span className="lib-item__date">
                  {i.kind === 'own' ? fmtDate((kind === 'posted' ? i.post.postedAt : i.post.updatedAt) ?? i.post.updatedAt) : fmtDate(i.post.postedAt)}
                  {i.kind === 'own' && i.post.slides.length > 1 && ` · ${i.post.slides.length} slides`}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="col col--right col--sticky">
        {sel ? <Detail item={sel} kind={kind} toast={toast} /> : <div className="empty"><p>Pick a post on the left to see it here.</p></div>}
      </section>
    </div>
  );
}

function Detail({ item, kind, toast }: { item: Item; kind: 'posted' | 'drafts'; toast: (t: string, k?: 'ok' | 'err') => void }) {
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const p = item.post;

  const copyCap = async () => toast((await copyText(p.caption)) ? 'Caption copied' : 'Could not copy. Select the text and copy it.', 'ok');

  const reuseCaption = async () => {
    const np = newPost({});
    np.caption = p.caption.split('\n').filter((l) => !/попуст|денари|ден\.\/|ПРОМО|важи до|ограничено|ограничен број/i.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    np.title = 'From: ' + p.title;
    await startPost(np);
  };

  const duplicate = async (own: Post) => {
    const now = Date.now();
    const copy: Post = { ...structuredClone(own), id: uid(), status: 'draft', createdAt: now, updatedAt: now, postedAt: undefined, title: firstLine(own.title) };
    copy.slides.forEach((s) => (s.id = uid()));
    await startPost(copy);
  };

  const download = async (own: Post) => {
    setBusy(true);
    try {
      const blobs = await renderPost(own);
      const base = fileBase(own);
      for (let i = 0; i < blobs.length; i++) {
        downloadBlob(blobs[i], blobs.length > 1 ? `${base}-${i + 1}.png` : `${base}.png`);
        if (i < blobs.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
      toast(blobs.length > 1 ? `Downloaded ${blobs.length} images` : 'Image downloaded');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="detail">
      <div className="detail__img">
        {item.kind === 'own' ? <MiniPost post={item.post} i={slide} /> : <ArchiveImage post={item.post} />}
      </div>
      {item.kind === 'own' && item.post.slides.length > 1 && (
        <div className="chips">
          {item.post.slides.map((_, i) => (
            <button key={i} className={`chip ${slide === i ? 'chip--on' : ''}`} onClick={() => setSlide(i)}>Slide {i + 1}</button>
          ))}
        </div>
      )}
      <h2 className="h2 h2--flush">{p.title}</h2>
      <p className="muted">
        {item.kind === 'archive'
          ? `Posted ${fmtDate(p.postedAt as number)} · from the Instagram archive`
          : kind === 'posted' ? `Marked as posted ${fmtDate((item.post.postedAt ?? item.post.updatedAt))}` : `Last changed ${fmtDate(item.post.updatedAt)}`}
        {p.tags.includes('promo') && ' · old promo, prices no longer used'}
      </p>

      <div className="btn-row">
        {item.kind === 'own' && kind === 'drafts' && (
          <button className="btn btn--primary btn--lg" onClick={() => go('generate/' + item.post.id)}>Keep editing</button>
        )}
        {item.kind === 'own' && (
          <button className="btn btn--lg" disabled={busy} onClick={() => download(item.post)}>{busy ? 'Preparing…' : 'Download image'}</button>
        )}
        <button className="btn btn--lg" onClick={copyCap}>Copy caption</button>
      </div>

      <label className="field__label" htmlFor="det-cap">Caption</label>
      <textarea id="det-cap" className="input caption-view" readOnly value={p.caption} rows={10} />

      <div className="btn-row">
        {item.kind === 'own' ? (
          <>
            <button className="btn" onClick={() => duplicate(item.post)}>Make a copy to edit</button>
            {kind === 'posted' ? (
              <button className="btn" onClick={async () => { await savePost({ ...item.post, status: 'draft', postedAt: undefined, updatedAt: Date.now() }); toast('Moved back to drafts'); }}>Move back to drafts</button>
            ) : (
              <button className="btn" onClick={async () => { await savePost({ ...item.post, status: 'posted', postedAt: Date.now() }); toast('Marked as posted'); }}>Mark as posted</button>
            )}
            <ConfirmButton label="Delete" confirm="Delete this post for good?" onConfirm={async () => { await deletePost(item.post.id); toast('Deleted'); go(kind); }} />
          </>
        ) : (
          <>
            <button className="btn" onClick={reuseCaption}>New post with this caption</button>
            <a className="btn" href={item.post.link} target="_blank" rel="noreferrer">Open on Instagram ↗</a>
          </>
        )}
      </div>
    </div>
  );
}
