import { useEffect, useRef, useState } from 'react';
import type { Post, Topic, TemplateId } from '../types';
import { listPosts, savePost, exportBackup, importBackup } from '../lib/store';
import { newPost, surprisePost, TEMPLATES } from '../lib/factory';
import { downloadBlob } from '../lib/export';
import { TOPIC_NAMES } from '../data/phrases';
import { ARCHIVE } from '../data/archive';
import { MiniPost, go, fmtDate, useToast, ArchiveImage } from '../ui';

const TOPIC_BLURB: Record<Topic, string> = {
  controlling: 'Numbers, profit, decisions from data',
  management: 'Processes, order, less chaos',
  tips: 'A useful tip for business owners',
  about: 'Who we are, more than accounting',
};

export function usePosts() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => {
    const load = () => listPosts().then(setPosts);
    load();
    window.addEventListener('vm-posts-changed', load);
    return () => window.removeEventListener('vm-posts-changed', load);
  }, []);
  return posts;
}

export async function startPost(p: Post) {
  await savePost(p);
  go('generate/' + p.id);
}

export function Home() {
  const posts = usePosts();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const drafts = (posts ?? []).filter((p) => p.status === 'draft');
  const posted = (posts ?? []).filter((p) => p.status === 'posted').sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
  const last = drafts[0];

  // Which topic has gone longest without a post (own posts + archive)?
  const lastByTopic = (['controlling', 'management', 'tips', 'about'] as Topic[]).map((t) => {
    const own = posted.filter((p) => p.topic === t).map((p) => p.postedAt ?? 0);
    const arc = ARCHIVE.filter((a) => a.tags.includes(t === 'about' ? 'services' : t)).map((a) => a.postedAt);
    return { t, at: Math.max(0, ...own, ...arc) };
  });
  const overdue = lastByTopic.sort((a, b) => a.at - b.at)[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = posted.filter((p) => (p.postedAt ?? 0) >= monthStart).length;

  return (
    <div className="cols">
      <section className="col col--left">
        <h1 className="h1">What do you want to post today?</h1>
        <p className="lead">Pick a theme. You’ll get a ready post that you can change any way you like.</p>
        <div className="topic-grid">
          {(Object.keys(TOPIC_NAMES) as Topic[]).map((t) => (
            <button key={t} className={`topic topic--${t}`} onClick={() => startPost(newPost({ topic: t }))}>
              <span className="topic__name">{TOPIC_NAMES[t]}</span>
              <span className="topic__blurb">{TOPIC_BLURB[t]}</span>
            </button>
          ))}
        </div>
        <button className="btn btn--primary btn--xl btn--wide" onClick={() => startPost(surprisePost())}>
          🎲 Surprise me with a post
        </button>

        <h2 className="h2">Or start from a layout</h2>
        <div className="layout-grid">
          {TEMPLATES.map((t) => (
            <LayoutCard key={t.id} id={t.id} name={t.name} hint={t.hint} />
          ))}
        </div>
      </section>

      <section className="col col--right">
        {last ? (
          <div className="card">
            <h2 className="h2 h2--flush">Continue where you left off</h2>
            <div className="continue">
              <button className="continue__img" onClick={() => go('generate/' + last.id)} aria-label={`Open ${last.title}`}>
                <MiniPost post={last} />
              </button>
              <div className="continue__meta">
                <p className="continue__title">{last.title}</p>
                <p className="muted">Last changed {fmtDate(last.updatedAt)}</p>
                <button className="btn btn--primary btn--lg" onClick={() => go('generate/' + last.id)}>Keep editing</button>
                {drafts.length > 1 && <button className="btn btn--lg" onClick={() => go('drafts')}>See all {drafts.length} drafts</button>}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <h2 className="h2 h2--flush">No drafts yet</h2>
            <p>Everything you make is saved on this computer automatically, even if you close the page.</p>
          </div>
        )}

        <div className="card">
          <h2 className="h2 h2--flush">Posting rhythm</h2>
          <p className="big-stat"><b>{thisMonth}</b> {thisMonth === 1 ? 'post' : 'posts'} marked as posted this month.</p>
          {overdue && (
            <p>
              It’s been a while since a <b>{TOPIC_NAMES[overdue.t]}</b> post{overdue.at ? ` (last one ${fmtDate(overdue.at)})` : ''}.{' '}
              <button className="link" onClick={() => startPost(newPost({ topic: overdue.t }))}>Make one now</button>
            </p>
          )}
        </div>

        <div className="card">
          <div className="row-between">
            <h2 className="h2 h2--flush">Recently posted</h2>
            <button className="link" onClick={() => go('posted')}>See all</button>
          </div>
          <div className="recent">
            {posted.slice(0, 3).map((p) => (
              <button key={p.id} className="recent__item" onClick={() => go('posted/' + p.id)}>
                <MiniPost post={p} />
              </button>
            ))}
            {ARCHIVE.slice(0, Math.max(0, 3 - posted.length)).map((a) => (
              <button key={a.id} className="recent__item" onClick={() => go('posted/' + a.id)}>
                <ArchiveImage post={a} />
              </button>
            ))}
          </div>
        </div>

        <div className="card card--quiet">
          <h2 className="h3">Backup</h2>
          <p className="muted">Posts live only in this browser. Download a backup now and then, or to move to another computer.</p>
          <div className="btn-row">
            <button className="btn" onClick={async () => downloadBlob(await exportBackup(), `velvet-moneo-backup-${new Date().toISOString().slice(0, 10)}.json`)}>Download backup</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Restore from backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const n = await importBackup(f);
                toast(`Restored ${n} posts`);
              } catch (err) {
                toast((err as Error).message, 'err');
              }
            }} />
          </div>
        </div>
      </section>
    </div>
  );
}

function LayoutCard({ id, name, hint }: { id: TemplateId; name: string; hint: string }) {
  const [sample] = useState(() => newPost({ template: id }));
  return (
    <button className="layout-card" onClick={() => startPost(newPost({ template: id }))}>
      <MiniPost post={sample} />
      <span className="layout-card__name">{name}</span>
      <span className="layout-card__hint">{hint}</span>
    </button>
  );
}
