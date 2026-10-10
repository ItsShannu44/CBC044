// The navigation loader: every page reload and every move to a different page
// shows the logo loader for a fixed time before the page mounts, so the page's
// own entrance animations still play in full. Only the path counts: tabs,
// filters (?query) and #anchors do not trigger it, and redirect-only paths pass
// straight through.
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const NAV_LOADER_MS = 2000;

const GateContext = createContext({ showing: false, firstLoad: false, pending: false });
export const useNavGate = () => useContext(GateContext);

export function NavGateProvider({ children, skip = () => false }) {
  const { pathname } = useLocation();
  // `done` is the last path whose loader has finished; null until the first load is over.
  const [done, setDone] = useState(null);
  const bypass = skip(pathname);
  const wait = NAV_LOADER_MS;

  useEffect(() => {
    if (bypass) return undefined;
    const t = setTimeout(() => setDone(pathname), wait);
    return () => clearTimeout(t);
  }, [pathname, bypass, wait]);

  const showing = !bypass && done !== pathname;
  return (
    <GateContext.Provider value={{ showing, firstLoad: done === null, pending: showing || bypass }}>
      {children}
    </GateContext.Provider>
  );
}
