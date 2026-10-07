import { createContext, useContext, useEffect, useState } from 'react';
import { ToastHost, useHashRoute, go } from './ui';
import { getConfig, type ApiConfig } from './lib/api';
import { ls, lsSet, persistStorage } from './lib/store';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Library } from './pages/Library';
import { Logo } from './post/Logo';

const ConfigCtx = createContext<ApiConfig>({ available: false, pinRequired: false, pinOk: true, photos: false, ai: false });
export const useConfig = () => useContext(ConfigCtx);

const TABS = [
  { id: '', name: 'Home' },
  { id: 'generate', name: 'Generate' },
  { id: 'posted', name: 'Posted' },
  { id: 'drafts', name: 'Drafts' },
];

function PinGate({ onOk }: { onOk: (c: ApiConfig) => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const c = await getConfig(pin.trim());
    setBusy(false);
    if (c.pinOk) {
      lsSet('pin', pin.trim());
      onOk(c);
    } else setErr('That PIN is not right. Check it and try again.');
  };
  return (
    <div className="gate">
      <form className="gate__card" onSubmit={submit}>
        <Logo color="#05250e" h={70} />
        <h1>Velvet Moneo Studio</h1>
        <p>Enter the PIN to start. This computer will remember it.</p>
        <label htmlFor="pin" className="field__label">PIN</label>
        <input id="pin" className="input input--xl" type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => { setPin(e.target.value); setErr(''); }} />
        {err && <p className="err">{err}</p>}
        <button className="btn btn--primary btn--xl" disabled={busy || !pin.trim()}>{busy ? 'Checking…' : 'Open the studio'}</button>
      </form>
    </div>
  );
}

export function App() {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const parts = useHashRoute();
  const page = parts[0] || '';

  useEffect(() => {
    getConfig().then(setConfig);
    persistStorage();
  }, []);

  useEffect(() => {
    if (page) lsSet('lastPage', page);
  }, [page]);

  if (!config) return <div className="boot">Loading…</div>;
  if (config.pinRequired && !config.pinOk) return <PinGate onOk={setConfig} />;

  return (
    <ConfigCtx.Provider value={config}>
      <ToastHost>
        <header className="topbar">
          <a className="topbar__brand" href="#/" aria-label="Velvet Moneo Studio home">
            <Logo color="#05250e" h={44} />
          </a>
          <nav className="tabs" aria-label="Main">
            {TABS.map((t) => (
              <a key={t.id} href={`#/${t.id}`} className={`tab ${page === t.id ? 'tab--on' : ''}`} aria-current={page === t.id ? 'page' : undefined}>
                {t.name}
              </a>
            ))}
          </nav>
          <div className="topbar__end">
            {config.pinRequired && (
              <button className="btn btn--ghost btn--sm" onClick={() => { lsSet('pin', ''); location.reload(); }}>Lock</button>
            )}
          </div>
        </header>
        <main className="main">
          {page === '' && <Home />}
          {page === 'generate' && <Generate id={parts[1]} />}
          {page === 'posted' && <Library kind="posted" selected={parts[1]} />}
          {page === 'drafts' && <Library kind="drafts" selected={parts[1]} />}
          {!['', 'generate', 'posted', 'drafts'].includes(page) && (
            <div className="empty"><p>This page doesn’t exist.</p><button className="btn btn--primary" onClick={() => go('')}>Go home</button></div>
          )}
        </main>
      </ToastHost>
    </ConfigCtx.Provider>
  );
}

export { ls };
