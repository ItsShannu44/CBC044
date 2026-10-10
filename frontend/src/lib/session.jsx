// Who is signed in, plus the form definitions the server sends once (fields, document types, status names).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearApiCache, getToken, setToken } from './api.js';

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [m, me] = await Promise.all([
          api('/meta'),
          getToken() ? api('/auth/me').catch(() => null) : null,
        ]);
        if (!live) return;
        setMeta(m);
        setUser(me?.user || null);
      } catch (err) {
        if (live) setProblem(err.message);
      } finally {
        if (live) setReady(true);
      }
    })();
    const onSignedOut = () => setUser(null);
    window.addEventListener('vidyasutra:signed-out', onSignedOut);
    return () => {
      live = false;
      window.removeEventListener('vidyasutra:signed-out', onSignedOut);
    };
  }, []);

  const signIn = useCallback(({ token, user: u }) => {
    clearApiCache();
    setToken(token);
    setUser(u);
  }, []);
  const signOut = useCallback(() => {
    clearApiCache();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, meta, ready, problem, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

// Loads data for a page and reloads it on demand.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    loader()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
