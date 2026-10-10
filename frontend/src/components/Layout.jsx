// The app shell: a deep-teal rail with the gold thread marking where you are,
// a light top bar with the alerts bell and the account menu, and on phones a
// dark top bar with pill navigation.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom';
import { ErrorBoundary } from './Guards.jsx';
import { BrandLoader } from './ui.jsx';
import { useNavGate } from '../lib/navGate.jsx';
import { Wordmark } from './Art.jsx';
import Icon from './icons.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { initials } from '../lib/insights.js';
import { useSession } from '../lib/session.jsx';

export { Wordmark };

const STUDENT_NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/scholarships', label: 'Scholarships', icon: 'cap', end: true },
  { to: '/applications', label: 'Applications', icon: 'scroll' },
  { to: '/documents', label: 'Documents', icon: 'folder' },
  { to: '/recovery', label: 'Recovery', icon: 'lifebuoy' },
  { to: '/analytics', label: 'Analytics', icon: 'chart' },
];
const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: 'gauge', end: true },
  { to: '/admin/scholarships', label: 'Scholarships', icon: 'cap' },
  { to: '/admin/applications', label: 'Applications', icon: 'scroll' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
];

const ROLE_LABEL = { STUDENT: 'Student', ADMIN: 'Reviewer' };

// The bell shows the latest alerts without leaving the page, and keeps its count live.
function Bell({ dark = false }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const box = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let live = true;
    const pull = () => { if (document.visibilityState !== 'hidden') api('/notifications').then((d) => live && setData(d)).catch(() => {}); };
    pull();
    const timer = setInterval(pull, 25_000);
    // Refresh at once when alerts are read elsewhere, or when the tab comes back.
    window.addEventListener('vidyasutra:alerts-changed', pull);
    document.addEventListener('visibilitychange', pull);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('vidyasutra:alerts-changed', pull);
      document.removeEventListener('visibilitychange', pull);
    };
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    api('/notifications').then((d) => setData(d)).catch(() => {});
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = data?.unread || 0;
  const latest = (data?.notifications || []).slice(0, 4);

  return (
    <div className="relative" ref={box}>
      <button type="button"
        className={`relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${dark ? 'text-white/85 hover:bg-white/10 hover:text-white' : 'text-ink-2 hover:bg-wash hover:text-ink'}`}
        aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="bell" />
        {unread > 0 && (
          <span className="pulse-dot absolute right-0.5 top-0.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-miss px-1 text-[0.68rem] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span className="sr-only">Alerts{unread > 0 ? `, ${unread} unread` : ''}</span>
      </button>
      {open && (
        <div className="animate-pop absolute right-0 top-full z-50 mt-2 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-paper text-ink shadow-[0_24px_50px_-18px_rgba(6,31,34,0.5)]">
          <p className="flex items-center justify-between border-b border-line px-4 py-3 font-bold">
            Alerts
            {unread > 0 && <span className="chip" data-tone="miss">{unread} unread</span>}
          </p>
          {latest.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-2">No alerts yet. You will hear from us when something needs you.</p>
          ) : (
            <ul className="divide-y divide-line">
              {latest.map((n) => (
                <li key={n.id} className={`px-4 py-2.5 text-sm ${n.read ? '' : 'bg-thread-soft/50'}`}>
                  <p className={n.read ? '' : 'font-semibold'}>{n.message}</p>
                  <p className="text-ink-2">{formatDateTime(n.at)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" className="block border-t border-line bg-wash/60 px-4 py-2.5 text-center text-sm font-bold text-brand no-underline hover:text-brand-deep">
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, className = 'h-9 w-9' }) {
  return (
    <span className={`grid flex-none place-items-center rounded-full bg-[linear-gradient(135deg,#3cc7b4,#0f766e)] text-[0.85rem] font-bold text-white ring-2 ring-white ${className}`}>
      {initials(name)}
    </span>
  );
}

// The profile icon: the one way into the profile page (students). Reviewers see their name only.
function ProfileButton({ dark = false, compact = false }) {
  const { user } = useSession();
  const isStudent = user.role === 'STUDENT';
  const body = (
    <>
      <Avatar name={user.name} className={compact ? 'h-9 w-9' : 'h-9 w-9'} />
      {!compact && (
        <span className="text-left">
          <span className={`block text-[0.9rem] font-bold leading-tight ${dark ? 'text-white' : ''}`}>{user.name.split(' ')[0]}</span>
          <span className={`block text-xs ${dark ? 'text-white/60' : 'text-ink-2'}`}>{isStudent ? 'View profile' : ROLE_LABEL[user.role]}</span>
        </span>
      )}
    </>
  );
  const cls = `flex items-center gap-2.5 rounded-xl p-1 pr-2 no-underline transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-wash'}`;
  if (!isStudent) return <span className={cls}>{body}</span>;
  return (
    <NavLink to="/profile" className={({ isActive }) => `${cls} ${isActive ? (dark ? 'bg-white/10' : 'bg-wash') : ''}`} aria-label="Your profile">
      {body}
    </NavLink>
  );
}

function SignOutButton({ dark = false }) {
  const { signOut } = useSession();
  return (
    <button type="button" onClick={signOut}
      className={`flex h-10 items-center gap-2 rounded-xl px-2.5 text-[0.88rem] font-semibold transition-colors ${dark ? 'text-white/85 hover:bg-white/10' : 'text-ink-2 hover:bg-miss-soft hover:text-miss'}`}>
      <Icon name="logout" className="h-[1.1rem] w-[1.1rem]" />
      <span className={dark ? 'sr-only' : 'hidden xl:inline'}>Sign out</span>
    </button>
  );
}

// The three-line menu button: lines of different lengths that fold into an X.
export function Hamburger({ open, onClick, label = 'Menu', className = '' }) {
  const t = { type: 'spring', stiffness: 420, damping: 30 };
  return (
    <button type="button" onClick={onClick} aria-expanded={open} aria-label={open ? `Close ${label.toLowerCase()}` : `Open ${label.toLowerCase()}`}
      className={`relative grid h-10 w-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/10 ${className}`}>
      <span className="relative block h-[14px] w-[22px]" aria-hidden="true">
        <motion.span className="absolute left-0 top-0 h-[2px] rounded-full bg-current" style={{ originX: 0.5, originY: 0.5 }}
          initial={false} animate={open ? { top: 6, width: 22, rotate: 45 } : { top: 0, width: 22, rotate: 0 }} transition={t} />
        <motion.span className="absolute left-0 top-[6px] h-[2px] rounded-full bg-thread"
          initial={false} animate={open ? { width: 0, x: 11, opacity: 0 } : { width: 15, x: 0, opacity: 1 }} transition={t} />
        <motion.span className="absolute left-0 h-[2px] rounded-full bg-current" style={{ originX: 0.5, originY: 0.5 }}
          initial={false} animate={open ? { top: 6, width: 22, rotate: -45 } : { top: 12, width: 10, rotate: 0 }} transition={t} />
      </span>
    </button>
  );
}

// Slide-in menu for phones narrower than 500px.
function MobileDrawer({ open, onClose, nav }) {
  const { user, signOut } = useSession();
  const isStudent = user.role === 'STUDENT';
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  const items = isStudent ? [...nav, { to: '/alerts', label: 'Alerts', icon: 'bell' }] : nav;
  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[1rem] no-underline transition-colors ${isActive ? 'bg-white/[0.12] font-bold text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white'}`;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" className="fixed inset-0 z-[55] bg-deep/60 backdrop-blur-sm xs:hidden" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside key="drawer" role="dialog" aria-modal="true" aria-label="Menu"
            className="fixed inset-y-0 left-0 z-[56] flex w-[82%] max-w-[20rem] flex-col bg-[linear-gradient(180deg,#0d3d40_0%,#0a3034_45%,#061f22_100%)] px-4 pb-6 pt-4 text-white shadow-2xl xs:hidden"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
            <div className="mb-6 flex items-center justify-between">
              <Wordmark />
              <Hamburger open onClick={onClose} />
            </div>
            <motion.nav aria-label="Main" className="flex flex-col gap-1"
              initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}>
              {items.map((n) => (
                <motion.div key={n.to} variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}>
                  <NavLink to={n.to} end={n.end} className={link} onClick={onClose}>
                    <Icon name={n.icon} className="h-5 w-5" />{n.label}
                  </NavLink>
                </motion.div>
              ))}
            </motion.nav>
            <button type="button" onClick={signOut} className="mt-auto flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-white/75 hover:bg-white/[0.06] hover:text-white">
              <Icon name="logout" className="h-5 w-5" />Sign out
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Layout() {
  const { user } = useSession();
  const location = useLocation();
  const outlet = useOutlet();
  const gate = useNavGate();
  const mobileNav = useRef(null);
  // A new page starts at the top, and the active pill scrolls into view on phones.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mobileNav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [location.pathname]);
  const isStudent = user.role === 'STUDENT';
  const nav = isStudent ? STUDENT_NAV : ADMIN_NAV;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  // Close the phone menu if the screen grows past 500px.
  useEffect(() => {
    const m = window.matchMedia('(min-width: 500px)');
    const on = () => { if (m.matches) setMenuOpen(false); };
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const sidebarLink = ({ isActive }) =>
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline text-[0.95rem] transition-all ' +
    (isActive ? 'bg-white/[0.12] font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]' : 'text-white/65 hover:bg-white/[0.06] hover:text-white');
  const pillLink = ({ isActive }) =>
    'flex-none rounded-full px-3.5 py-1.5 text-[0.9rem] no-underline ' +
    (isActive ? 'bg-thread font-bold text-ink' : 'bg-white/10 text-white/80 hover:text-white');

  return (
    <div className="min-h-screen bg-wash">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[80] focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* The rail, on large screens */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15rem] flex-col overflow-hidden bg-[linear-gradient(180deg,#0d3d40_0%,#0a3034_45%,#061f22_100%)] px-3.5 py-5 lg:flex">
        <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-mint/10 blur-3xl" aria-hidden="true" />
        <Link to={isStudent ? '/' : '/admin'} className="relative mb-7 px-2 no-underline"><Wordmark /></Link>
        <nav aria-label="Main" className="relative flex flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={sidebarLink}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute -left-3.5 top-1/2 h-7 w-1.5 -translate-y-1/2 rounded-r-full bg-thread shadow-[0_0_12px_rgba(233,180,76,0.8)]" aria-hidden="true" />}
                  <Icon name={n.icon} className={`h-[1.1rem] w-[1.1rem] ${isActive ? 'text-thread' : ''}`} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="relative mt-auto space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
            <p className="font-deva text-[1.05rem] font-semibold text-thread">विद्या सूत्र</p>
            <p className="mt-0.5 text-[0.8rem] leading-snug text-white/65">No deserving student left searching.</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[15rem]">
        {/* Top bar, on small screens */}
        <div className="sticky top-0 z-40 lg:hidden">
          <div className="flex items-center justify-between gap-2 bg-navy px-3 py-2.5 text-white xs:px-4">
            <span className="flex min-w-0 items-center gap-2">
              <ProfileButton dark compact />
              <Link to={isStudent ? '/' : '/admin'} className="no-underline"><Wordmark /></Link>
            </span>
            <span className="flex items-center gap-1">
              {isStudent && <Bell dark />}
              <span className="hidden xs:block"><SignOutButton dark /></span>
              <Hamburger open={menuOpen} onClick={() => setMenuOpen((o) => !o)} className="xs:hidden" />
            </span>
          </div>
          <nav ref={mobileNav} aria-label="Main" className="no-scrollbar hidden gap-2 overflow-x-auto bg-navy px-4 pb-3 xs:flex">
            {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={pillLink}>{n.label}</NavLink>)}
            {isStudent && <NavLink to="/alerts" className={pillLink}>Alerts</NavLink>}
          </nav>
        </div>

        {/* Top bar, on large screens */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-2 border-b border-line bg-paper/85 px-8 backdrop-blur-md lg:flex">
          <ProfileButton />
          <span className="flex items-center gap-1">
            {isStudent && <Bell />}
            <span className="mx-1 h-7 w-px bg-line" aria-hidden="true" />
            <SignOutButton />
          </span>
        </header>
        <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} nav={nav} />

        <main id="main" className="mx-auto max-w-[76rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={gate.pending ? '__loading' : location.pathname}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {gate.pending ? <BrandLoader inline label="Loading…" /> : <ErrorBoundary resetKey={location.pathname}>{outlet}</ErrorBoundary>}
            </motion.div>
          </AnimatePresence>
          {/* Behind the loader, the next page mounts invisibly so its data is ready when it appears. */}
          {gate.pending && <div hidden aria-hidden="true" inert><ErrorBoundary resetKey={location.pathname}>{outlet}</ErrorBoundary></div>}
        </main>
      </div>
    </div>
  );
}
