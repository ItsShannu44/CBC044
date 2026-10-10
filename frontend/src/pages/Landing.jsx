// The public front door. A night-sky hero with layered parallax (pointer and
// scroll), a live ticker of real schemes, the three-step process, a pinned
// horizontal rail of features, the live scheme list, the story behind the
// name, and the call to action. Numbers and lists come from the database.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform,
} from 'framer-motion';
import Lenis from 'lenis';
import { Link, useNavigate } from 'react-router-dom';
import { BooksCap, Hills, Moon, Ridges, Stars, Wordmark } from '../components/Art.jsx';
import BlurText from '../components/bits/BlurText.jsx';
import CountUp from '../components/bits/CountUp.jsx';
import Magnet from '../components/bits/Magnet.jsx';
import RotatingText from '../components/bits/RotatingText.jsx';
import ShinyText from '../components/bits/ShinyText.jsx';
import SpotlightCard from '../components/bits/SpotlightCard.jsx';
import Threads from '../components/bits/Threads.jsx';
import Hero3D from '../components/Hero3D.jsx';
import { Hamburger } from '../components/Layout.jsx';
import Tilt from '../components/Tilt.jsx';
import Icon from '../components/icons.jsx';
import { Bead } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatDate, inr } from '../lib/format.js';
import { useLoad } from '../lib/session.jsx';

const EASE = [0.2, 0.7, 0.3, 1];
const slideX = (from = -40) => ({
  hidden: { opacity: 0, x: from },
  show: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: 0.08 * i, duration: 0.7, ease: EASE } }),
});

function useMedia(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [ok, setOk] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setOk(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return ok;
}

// ---------- Nav ----------

const NAV = [
  { href: '#scholarships', label: 'Scholarships' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
];

function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid || open ? 'border-b border-white/10 bg-[#072528]/85 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-[4.2rem] max-w-[76rem] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="no-underline"><Wordmark /></Link>
        <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}
              className="group relative rounded-lg px-3 py-2 text-[0.92rem] font-semibold text-white/75 no-underline transition-colors hover:text-white">
              {n.label}
              <span className="absolute inset-x-3 bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-thread transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <span className="flex items-center gap-2">
          <Link to="/login" className="btn btn-ghost-light btn-small hidden !min-h-[2.4rem] !px-4 sm:inline-flex">Login</Link>
          <Link to="/register" className="btn btn-mint btn-small !min-h-[2.4rem] !px-4">Get started</Link>
          <Hamburger open={open} onClick={() => setOpen((o) => !o)} className="md:hidden" />
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4 md:hidden" aria-label="Landing mobile">
            <div className="flex flex-col gap-1 pb-4">
              {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 font-semibold text-white/85 no-underline hover:bg-white/10">{n.label}</a>)}
              <Link to="/login" className="rounded-lg px-3 py-2.5 font-semibold text-white/85 no-underline hover:bg-white/10">Login</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ---------- Hero ----------

function HeroSearch({ scholarships }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return (scholarships || []).filter(
      (s) => s.name.toLowerCase().includes(needle) || s.provider.toLowerCase().includes(needle),
    ).slice(0, 5);
  }, [q, scholarships]);

  useEffect(() => {
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = () => navigate(q.trim() ? '/login' : '/register');

  return (
    <div ref={box} className="relative w-full max-w-[32rem]">
      <form onSubmit={(e) => { e.preventDefault(); go(); }}
        className="flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/20 transition-shadow focus-within:ring-4 focus-within:ring-mint/40">
        <Icon name="search" className="h-5 w-5 flex-none text-ink-2" />
        <input
          type="search" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Search scholarships, e.g. 'Engineering', 'Merit'"
          aria-label="Search scholarships"
          className="min-h-[2.6rem] w-full bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-ink-2/70"
        />
        <button type="submit" className="btn btn-primary !min-h-[2.6rem] !rounded-xl !px-3.5" aria-label="Search">
          <Icon name="search" className="h-5 w-5" />
        </button>
      </form>

      <AnimatePresence>
        {open && q.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }} transition={{ duration: 0.18, ease: EASE }}
            className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-paper text-ink shadow-[0_24px_50px_-18px_rgba(0,0,0,0.55)]">
            {results.length === 0 ? (
              <p className="px-4 py-4 text-[0.95rem] text-ink-2">
                Nothing matches that search yet. Create an account and we will keep looking for you.
              </p>
            ) : results.map((s) => (
              <button key={s.id} type="button" onClick={() => navigate('/login')}
                className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-wash">
                <span>
                  <span className="block font-bold leading-snug">{s.name}</span>
                  <span className="block text-sm text-ink-2">{s.provider}</span>
                </span>
                <span className="flex-none text-right">
                  <span className="block font-bold text-brand">{inr(s.amount)}</span>
                  <span className={`block text-sm ${s.open ? 'text-pass' : 'text-wait'}`}>
                    {s.open ? `Closes ${formatDate(s.deadline)}` : `Closed ${formatDate(s.deadline)}`}
                  </span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// A glass card floating in front of the 3D scene.
function FloatCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, rotateY: -25 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ delay, duration: 0.9, ease: EASE }}
      className={`absolute rounded-2xl border border-white/15 bg-white/[0.08] px-3.5 py-2.5 text-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md ${className}`}>
      {children}
    </motion.div>
  );
}

// WebGL check, so the flat picture can stand in when 3D is unavailable.
const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};

function Scene3D() {
  const [failed, setFailed] = useState(() => !hasWebGL());
  if (failed) return <BooksCap className="h-full w-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]" />;
  return <Hero3D className="h-full w-full" onFail={() => setFailed(true)} />;
}

function Hero({ data }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const stats = data?.stats;
  const first = data?.scholarships?.find((s) => s.open);

  // Pointer parallax: -0.5..0.5 across the hero, smoothed.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const onMove = (e) => {
    if (reduce) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  // Scroll parallax: each layer drifts at its own depth as the hero leaves.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const depth = (d) => ({
    x: useTransform(sx, (v) => (reduce ? 0 : v * d * 46)),
    y: useTransform([sy, scrollYProgress], ([a, b]) => (reduce ? 0 : a * d * 26 + b * d * 220)),
  });
  /* eslint-disable react-hooks/rules-of-hooks */
  const L = { stars: depth(0.15), moon: depth(0.3), ridge: depth(0.45), hills: depth(0.7), cards: depth(1.3) };
  /* eslint-enable react-hooks/rules-of-hooks */
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const STATS = [
    { value: stats?.scholarships, label: 'Scholarships', suffix: '+' },
    { value: stats?.open, label: 'Open now' },
    { text: '3', label: 'Steps to apply' },
  ];

  return (
    <section ref={ref} onMouseMove={onMove} onMouseLeave={() => { px.set(0); py.set(0); }}
      className="night relative isolate min-h-[100svh] overflow-hidden pb-28 pt-28 text-white sm:pt-32 lg:pb-36">
      {/* Parallax layers, back to front */}
      <motion.div style={L.stars} className="absolute inset-0 -z-20"><Stars /></motion.div>
      <motion.div style={L.moon} className="absolute right-[6%] top-[9%] -z-20 h-44 w-44 sm:h-56 sm:w-56"><Moon className="h-full w-full" /></motion.div>
      <motion.div style={L.ridge} className="absolute inset-x-[-5%] bottom-[14%] -z-20 h-[34%]"><Ridges className="h-full w-full" /></motion.div>
      {/* React Bits Threads: the golden threads flowing through the night */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[75%] opacity-80" aria-hidden="true">
        <Threads color={[0.91, 0.71, 0.3]} accentColor={[0.24, 0.78, 0.71]} amplitude={1.1} distance={0.25} lineCount={36}
          thickness={0.5} speed={0.35} fade={0.4} enableMouseInteraction paused={reduce} />
      </div>

      <div className="relative mx-auto grid max-w-[76rem] items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <motion.div style={{ y: textY, opacity: textOpacity }}>
          <motion.p variants={slideX(-30)} custom={0} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-thread/40 bg-thread/10 px-3.5 py-1 text-[0.78rem] font-bold uppercase tracking-[0.14em]">
            <span className="h-1.5 w-1.5 rounded-full bg-thread" />
            <ShinyText text="FluxWave · PS-029" color="#e9b44c" shineColor="#fff6dc" speed={3} />
          </motion.p>

          <h1 className="mt-5 text-[2.4rem] leading-[1.06] tracking-tight sm:text-[3.4rem] lg:text-[3.7rem]">
            <BlurText text="The Thread Connecting Students to the" delay={90} animateBy="words" direction="top" className="!inline" />
            <motion.span className="relative inline-block" initial={{ opacity: 0, x: 60, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} transition={{ delay: 0.75, duration: 0.8, ease: EASE }}>
              <span className="font-accent bg-gradient-to-r from-[#f6d58a] to-[#e9a93a] bg-clip-text pr-1 text-transparent">Right Scholarships</span>
              <svg viewBox="0 0 300 16" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full" aria-hidden="true">
                <motion.path d="M2 10 C 70 2, 150 16, 298 5" fill="none" stroke="#e9b44c" strokeWidth="3" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.4, duration: 0.9, ease: EASE }} />
              </svg>
            </motion.span>
          </h1>

          <motion.p variants={slideX(-40)} custom={6} initial="hidden" animate="show" className="mt-6 flex flex-wrap items-center gap-x-2 text-[1.12rem] text-white/80">
            One profile. Every scheme checked for
            <RotatingText texts={['eligibility', 'documents', 'deadlines']} rotationInterval={2200} staggerDuration={0.02} animatePresenceMode="popLayout"
              mainClassName="overflow-hidden rounded-lg bg-mint/15 px-2.5 py-0.5 font-bold text-mint" splitLevelClassName="overflow-hidden" />
          </motion.p>

          <motion.div variants={slideX(-40)} custom={7} initial="hidden" animate="show" className="mt-7">
            <HeroSearch scholarships={data?.scholarships} />
          </motion.div>

          <motion.div variants={slideX(-40)} custom={8} initial="hidden" animate="show" className="mt-5 flex flex-wrap items-center gap-3">
            <Magnet padding={60} magnetStrength={4}>
              <Link to="/register" className="btn btn-cta !min-h-[3rem] !px-6"><Icon name="sparkle" className="h-5 w-5" />Get started</Link>
            </Magnet>
            <Link to="/login" className="btn btn-ghost-light !min-h-[3rem] !px-6">Login</Link>
          </motion.div>

          <ul className="mt-10 flex max-w-[30rem] gap-3">
            {STATS.map((t, i) => (
              <motion.li key={t.label} variants={slideX(70)} custom={9 + i} initial="hidden" animate="show"
                className="flex-1 rounded-2xl border border-white/10 bg-[#0b3437]/80 px-4 py-3 backdrop-blur-sm">
                <span className="block text-[1.6rem] font-extrabold leading-none">
                  {t.text ?? (t.value === undefined ? '—' : <><CountUp to={t.value} duration={1.4} />{t.suffix}</>)}
                </span>
                <span className="mt-1 block text-[0.78rem] text-white/60">{t.label}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* The 3D scene */}
        <div className="relative mx-auto aspect-square w-full max-w-[36rem] [perspective:1000px]">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: EASE }} className="absolute inset-0">
            <Scene3D />
          </motion.div>
          {/*<motion.div style={L.cards} className="pointer-events-none absolute inset-0 hidden sm:block">
            <FloatCard className="right-[0%] top-[16%]" delay={2.2}>
              <p className="text-[0.7rem] uppercase tracking-wide text-white/60">Your match</p>
              <p className="text-[1.5rem] font-extrabold leading-none text-mint">92%</p>
              <p className="max-w-[9rem] truncate text-[0.72rem] text-white/75">{first?.name || 'Merit Award'}</p>
            </FloatCard>
            <FloatCard className="bottom-[14%] left-[0%]" delay={2.5}>
              <p className="flex items-center gap-2 text-[0.8rem] font-bold"><span className="grid h-5 w-5 place-items-center rounded-full bg-pass"><Icon name="check" className="h-3 w-3" strokeWidth={3} /></span>Income certificate</p>
              <p className="mt-0.5 pl-7 text-[0.7rem] text-mint">Matches your profile</p>
            </FloatCard>
          </motion.div>*/}
        </div>
      </div>

      <motion.div style={L.hills} className="pointer-events-none absolute inset-x-[-6%] bottom-[-2px] h-[20%] min-h-[100px]"><Hills className="h-full w-full" /></motion.div>
    </section>
  );
}

// ---------- Live ticker (horizontal marquee) ----------

function Ticker({ scholarships }) {
  const list = scholarships || [];
  if (!list.length) return null;
  const row = [...list, ...list];
  return (
    <section id="ticker" aria-label="Live scholarships" className="relative overflow-hidden bg-deep py-4">
      <div className="fade-x overflow-hidden">
        <div className="marquee gap-3" style={{ '--marquee-speed': `${Math.max(28, list.length * 6)}s` }}>
          {row.map((s, i) => (
            <span key={i} className="flex flex-none items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-4 text-[0.88rem] text-white/85">
              <span className={`rounded-full px-2 py-0.5 text-[0.68rem] font-bold ${s.open ? 'bg-mint/20 text-mint' : 'bg-white/10 text-white/50'}`}>{s.open ? 'OPEN' : 'CLOSED'}</span>
              <span className="font-semibold">{s.name}</span>
              <span className="font-bold text-thread">{inr(s.amount)}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Process ----------

const STEPS = [
  { icon: 'user', title: 'Create profile', text: 'Enter your details once.' },
  { icon: 'sparkle', title: 'Get matched', text: 'See every rule you pass or miss.' },
  { icon: 'send', title: 'Apply', text: 'Upload, submit and track.' },
];

function SectionHead({ eyebrow, children, center = false }) {
  return (
    <div className={center ? 'text-center' : ''}>
      <p className="text-[0.78rem] font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-[2rem] sm:text-[2.6rem]">{children}</h2>
    </div>
  );
}

function Process() {
  return (
    <section id="process" className="relative mx-auto max-w-[76rem] scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24">
      <SectionHead eyebrow="How it works" center>Three steps to <span className="font-accent text-brand">submitted</span></SectionHead>
      <div className="relative mt-14">
        <motion.div aria-hidden="true" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 1.4, ease: EASE }}
          className="absolute left-[16%] right-[16%] top-[2rem] hidden h-[3px] origin-left rounded-full bg-[repeating-linear-gradient(90deg,var(--color-thread)_0_12px,transparent_12px_20px)] lg:block" />
        <ol className="grid gap-6 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, y: 40, rotateX: -35 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.15, duration: 0.8, ease: EASE }}
              className="relative text-center [transform-origin:50%_0%] [transform-style:preserve-3d]">
              <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(135deg,#12857b,#0b4a4c)] text-white shadow-[0_0_0_8px_var(--color-wash),0_16px_30px_-12px_rgba(11,74,76,0.7)]">
                <Icon name={s.icon} className="h-7 w-7" />
                <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-thread text-[0.85rem] font-extrabold text-ink">{i + 1}</span>
              </span>
              <h3 className="mt-5 text-[1.2rem]">{s.title}</h3>
              <p className="mt-1 text-ink-2">{s.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------- Features: a pinned horizontal rail of 3D tilt cards ----------

function MiniRules() {
  return (
    <ol className="thread rounded-xl bg-wash p-4">
      {[['pass', 'CGPA ≥ 7.5'], ['pass', 'Category OBC / SC / ST'], ['fail', 'Income ≤ ₹5,00,000']].map(([st, r]) => (
        <li key={r} data-status={st} className="!pb-3 last:!pb-0">
          <Bead status={st} />
          <p className={`text-[0.88rem] font-bold leading-snug ${st === 'fail' ? 'text-miss' : ''}`}>{r}</p>
        </li>
      ))}
    </ol>
  );
}
function MiniList({ rows }) {
  return (
    <ul className="space-y-2 rounded-xl bg-wash p-4 text-[0.85rem]">
      {rows.map(([icon, l, t, s]) => (
        <li key={l} className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 font-semibold"><Icon name={icon} className="h-4 w-4 flex-none text-brand" /><span className="truncate">{l}</span></span>
          <span className="chip !text-[0.7rem]" data-tone={t}>{s}</span>
        </li>
      ))}
    </ul>
  );
}
function MiniMatch() {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-wash p-4">
      <span className="relative grid h-20 w-20 flex-none place-items-center">
        <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90"><circle cx="22" cy="22" r="18" fill="none" stroke="#d6e4e1" strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-pass)" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="14" /></svg>
        <span className="absolute font-extrabold">88%</span>
      </span>
      <p className="text-[0.88rem] font-semibold">New match found</p>
    </div>
  );
}
function MiniReview() {
  return (
    <ol className="grid grid-cols-4 gap-1.5 rounded-xl bg-wash p-4 text-[0.72rem]">
      {['Draft', 'Submitted', 'Review', 'Approved'].map((s, i) => (
        <li key={s}><span className={`block h-1.5 rounded-full ${i < 3 ? 'bg-brand' : 'bg-pass'}`} /><span className="mt-1 block font-bold">{s}</span></li>
      ))}
    </ol>
  );
}

const FEATURES = [
  { icon: 'shieldCheck', tone: 'teal', title: 'Explainable eligibility', text: 'Every rule, with a reason.', art: MiniRules },
  { icon: 'folder', tone: 'blue', title: 'Document readiness', text: 'Upload once. OCR checks it.',
    art: () => <MiniList rows={[['file', 'Income certificate', 'pass', 'Matched'], ['file', 'Marks card', 'warn', 'Review'], ['file', 'Caste certificate', 'miss', 'Missing']]} /> },
  { icon: 'bell', tone: 'yellow', title: 'Deadline alerts', text: '7, 3 and 1 days before.',
    art: () => <MiniList rows={[['calendar', 'Women in Tech', 'miss', '3 days'], ['calendar', 'Merit Award', 'warn', '12 days'], ['calendar', 'Post-Matric', 'pass', '30 days']]} /> },
  { icon: 'lifebuoy', tone: 'orange', title: 'Recovery', text: 'Fix what unlocks the most.',
    art: () => <MiniList rows={[['upload', 'Income certificate', 'miss', '+3'], ['user', 'Category', 'warn', '+2']]} /> },
  { icon: 'sparkle', tone: 'navy', title: 'Auto-match', text: 'New schemes find you.', art: MiniMatch },
  { icon: 'scroll', tone: 'teal', title: 'Transparent review', text: 'A dated timeline.', art: MiniReview },
];

function FeatureCard({ f, i }) {
  const Art = f.art;
  return (
    <article className="w-[18rem] flex-none snap-center sm:w-[20rem]">
      <Tilt className="rounded-3xl" max={9}>
        <div className="flex h-full flex-col rounded-3xl border border-line bg-paper p-6 shadow-[0_30px_60px_-40px_rgba(6,31,34,0.6)]">
          <div className="flex items-center justify-between [transform:translateZ(30px)]">
            <span className="tile" data-tone={f.tone}><Icon name={f.icon} /></span>
            <span className="font-accent text-[2rem] leading-none text-line">0{i + 1}</span>
          </div>
          <h3 className="mt-4 text-[1.2rem] [transform:translateZ(24px)]">{f.title}</h3>
          <p className="mt-1 text-[0.92rem] text-ink-2">{f.text}</p>
          <div className="mt-5 [transform:translateZ(16px)]"><Art /></div>
        </div>
      </Tilt>
    </article>
  );
}

function Features() {
  const wrap = useRef(null);
  const track = useRef(null);
  const desktop = useMedia('(min-width: 1024px)');
  const reduce = useReducedMotion();
  const pinned = desktop && !reduce;
  const [dist, setDist] = useState(0);

  useLayoutEffect(() => {
    const measure = () => { if (track.current) setDist(Math.max(0, track.current.scrollWidth - window.innerWidth)); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned]);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -dist]);
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const head = (
    <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
      <SectionHead eyebrow="Features">Built so nobody gets <span className="font-accent text-brand">lost</span></SectionHead>
    </div>
  );

  if (!pinned) {
    return (
      <section id="features" className="scroll-mt-20 bg-[linear-gradient(180deg,var(--color-wash),#e4efec)] py-20">
        {head}
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-6 pt-2 sm:px-6">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
        </div>
      </section>
    );
  }
  return (
    <section id="features" ref={wrap} className="relative bg-[linear-gradient(180deg,var(--color-wash),#e4efec)]" style={{ height: `calc(100vh + ${dist}px)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {head}
        <motion.div ref={track} style={{ x }} className="mt-10 flex w-max gap-6 py-4 pl-[max(1.5rem,calc((100vw-76rem)/2+1.5rem))] pr-[10vw]">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} i={i} />)}
        </motion.div>
        <div className="mx-auto mt-8 h-1 w-full max-w-[76rem] px-6">
          <div className="h-full overflow-hidden rounded-full bg-line"><motion.div style={{ width: bar }} className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand),var(--color-thread))]" /></div>
        </div>
      </div>
    </section>
  );
}

// ---------- Live scheme list ----------

function SchemeList({ data, loading, error }) {
  const list = data?.scholarships || [];
  return (
    <section id="scholarships" className="mx-auto max-w-[76rem] scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24">
      <SectionHead eyebrow="Live now">Open scholarships</SectionHead>
      {error && <p className="mt-6 text-miss">{error.message}</p>}
      {!loading && !error && list.length === 0 && <p className="mt-6 text-ink-2">No scholarships listed yet.</p>}
      <ul className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(loading ? Array.from({ length: 6 }) : list).map((s, i) => (
          <motion.li key={s?.id ?? i} initial={{ opacity: 0, y: 30, rotateX: -20 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.08, duration: 0.6, ease: EASE }} className="[perspective:900px]">
            {s ? (
              <SpotlightCard theme="light" spotlightColor="#0f766e" className="!rounded-2xl !p-5 h-full border border-line">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[1.05rem]">{s.name}</h3>
                    <p className="text-[0.85rem] text-ink-2">{s.provider}</p>
                  </div>
                  {s.open ? <span className="chip" data-tone="pass">Open</span> : <span className="chip" data-tone="plain">Closed</span>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-line pt-3">
                  <span className="text-[1.2rem] font-extrabold text-brand">{inr(s.amount)}</span>
                  <span className="text-[0.82rem] text-ink-2">{formatDate(s.deadline)}</span>
                </div>
              </SpotlightCard>
            ) : <div className="skeleton h-32" />}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

// ---------- About: the name is the idea ----------

function About() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const slow = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 60, reduce ? 0 : -60]);
  const fast = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : -140, reduce ? 0 : 140]);
  return (
    <section id="about" ref={ref} className="night relative scroll-mt-16 overflow-hidden py-24 text-white">
      <Stars className="opacity-60" />
      <motion.p style={{ x: fast }} aria-hidden="true" className="font-deva pointer-events-none absolute left-0 top-6 whitespace-nowrap text-[7rem] font-semibold leading-none text-white/[0.04] sm:text-[11rem]">
        विद्या सूत्र विद्या सूत्र विद्या सूत्र
      </motion.p>
      <motion.div style={{ y: slow }} className="relative mx-auto max-w-[52rem] px-4 text-center sm:px-6">
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.18em] text-thread">Why the name</p>
        <h2 className="mt-4 text-[2.2rem] leading-tight sm:text-[3rem]">
          <span className="font-deva text-thread">विद्या</span> is knowledge.<br />
          <span className="font-deva text-thread">सूत्र</span> is the thread.
        </h2>
        <p className="mt-6 font-accent text-[1.5rem] text-white/85">No deserving student left searching.</p>
      </motion.div>
    </section>
  );
}

// ---------- CTA + footer ----------

function Cta() {
  return (
    <section className="mx-auto max-w-[76rem] px-4 py-20 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 40, rotateX: -12 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.9, ease: EASE }}
        className="relative isolate flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(120deg,#061f22_0%,#0a3034_50%,#0f4c4d_100%)] px-6 py-12 text-white sm:px-12">
        <div className="absolute inset-0 -z-10 opacity-60" aria-hidden="true">
          <Threads color={[0.91, 0.71, 0.3]} amplitude={0.8} distance={0.2} lineCount={22} thickness={0.45} speed={0.3} />
        </div>
        <div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem]">Start your journey today</h2>
          <p className="mt-2 text-[1.05rem] text-white/75">Smarter guidance. Clearer path. <span className="font-accent text-thread">Brighter future.</span></p>
        </div>
        <Magnet padding={80} magnetStrength={3}>
          <Link to="/register" className="btn btn-cta !min-h-[3.1rem] !px-8">Create free account<Icon name="arrowRight" className="h-5 w-5" /></Link>
        </Magnet>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 bg-deep px-4 py-10 text-white/70 sm:px-6">
      <div className="mx-auto flex max-w-[76rem] flex-col items-center justify-between gap-6 sm:flex-row">
        <Wordmark />
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5 text-[0.9rem]">
          {NAV.slice(0, 3).map((n) => <a key={n.href} href={n.href} className="no-underline hover:text-thread">{n.label}</a>)}
          <Link to="/login" className="no-underline hover:text-thread">Login</Link>
        </nav>
        <p className="text-[0.85rem]">Team FluxWave · CBC044</p>
      </div>
      <p className="mx-auto mt-8 max-w-[76rem] border-t border-white/10 pt-5 text-center text-[0.78rem] text-white/40">© {new Date().getFullYear()} VidyaSutra</p>
    </footer>
  );
}

// Momentum scrolling for the landing page, so the parallax glides. It uses the
// native scroll position, so sticky sections and scroll-linked motion still work.
function useSmoothScroll() {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return undefined;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - (1 - t) ** 4, anchors: { offset: -70 } });
    let raf = requestAnimationFrame(function loop(time) { lenis.raf(time); raf = requestAnimationFrame(loop); });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [reduce]);
}

export default function Landing() {
  const { data, loading, error } = useLoad(() => api('/landing'));
  useSmoothScroll();

  return (
    <div className="min-h-screen overflow-x-clip bg-wash">
      <Nav />
      <main>
        <Hero data={data} />
        <Ticker scholarships={data?.scholarships} />
        <Process />
        <Features />
        <SchemeList data={data} loading={loading} error={error} />
        <About />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
