// Safety nets for the unhappy paths: a crash screen, a 404 page, a start-up
// failure screen, an offline banner, and returning to the right page after a
// session expires.
import { Component, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { LogoMark } from './Art.jsx';
import Icon from './icons.jsx';

const RETURN_KEY = 'vidyasutra.returnTo';
const EXPIRED_KEY = 'vidyasutra.expired';
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del: (k) => { try { sessionStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

// Called when the server rejects an expired login: remember where the student was.
export function rememberExpiredSession() {
  const here = window.location.pathname + window.location.search;
  if (!['/', '/login', '/register'].includes(window.location.pathname)) store.set(RETURN_KEY, here);
  store.set(EXPIRED_KEY, '1');
}
export const sessionExpired = () => store.get(EXPIRED_KEY) === '1';
export const clearExpired = () => store.del(EXPIRED_KEY);

// Logged-out catch-all: an expired session goes to sign-in, anything else to the landing page.
export function LoggedOutFallback() {
  return <Navigate to={sessionExpired() ? '/login' : '/'} replace />;
}

// After signing in, return to the page the student was on before the session expired.
export function AfterSignIn({ home }) {
  // Read once, clear after the redirect has rendered (safe under React's double render).
  const [back] = useState(() => store.get(RETURN_KEY));
  useEffect(() => { store.del(RETURN_KEY); clearExpired(); }, []);
  const safe = back && back.startsWith('/') && !back.startsWith('//') ? back : home;
  return <Navigate to={safe} replace />;
}

function Centered({ icon, tone = 'red', title, children, actions }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }}
        className="panel flex max-w-[30rem] flex-col items-center gap-3 px-8 py-10 text-center">
        {icon ? <span className="soft-icon !h-14 !w-14" data-tone={tone}><Icon name={icon} className="!h-7 !w-7" /></span> : <LogoMark className="h-14 w-14" />}
        <h1 className="text-[1.5rem]">{title}</h1>
        <div className="text-ink-2">{children}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>
      </motion.div>
    </div>
  );
}

export function NotFound({ home = '/' }) {
  return (
    <Centered icon="search" tone="gold" title="This page does not exist"
      actions={<Link to={home} className="btn btn-primary"><Icon name="arrowLeft" className="h-4 w-4" />Go to your dashboard</Link>}>
      The link may be old, or the page may have moved.
    </Centered>
  );
}

export function StartupProblem({ message }) {
  return (
    <div className="min-h-screen bg-wash">
      <Centered icon="alert" title="VidyaSutra could not start"
        actions={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}><Icon name="refresh" className="h-4 w-4" />Try again</button>}>
        <p>{message}</p>
        <p className="mt-2 text-[0.88rem]">If you are running it locally, check that the API server is running and connected to the database.</p>
      </Centered>
    </div>
  );
}

// Catches a rendering crash in one screen so the rest of the app keeps working.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Screen crashed:', error, info?.componentStack); }
  componentDidUpdate(prev) {
    // Moving to another page clears the crash.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Centered icon="circleX" title="This screen hit a problem"
        actions={<>
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}><Icon name="refresh" className="h-4 w-4" />Try again</button>
          <a href="/" className="btn btn-quiet">Go home</a>
        </>}>
        Your data is safe. Try again, or go back to the dashboard.
      </Centered>
    );
  }
}

// A slim banner while the browser has no connection.
export function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  const [back, setBack] = useState(false);
  useEffect(() => {
    let t;
    const off = () => { setOffline(true); setBack(false); };
    const on = () => { setOffline(false); setBack(true); clearTimeout(t); t = setTimeout(() => setBack(false), 2500); };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); clearTimeout(t); };
  }, []);
  return (
    <AnimatePresence>
      {(offline || back) && (
        <motion.div role="status" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
          className={`fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 px-4 py-2 text-[0.88rem] font-semibold text-white ${offline ? 'bg-miss' : 'bg-pass'}`}>
          <Icon name={offline ? 'alert' : 'circleCheck'} className="h-4 w-4" />
          {offline ? 'You are offline. Changes will not be saved until you reconnect.' : 'Back online.'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
