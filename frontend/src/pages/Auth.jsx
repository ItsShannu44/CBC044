// Sign in and create account: a two-panel page. The left panel carries the
// brand scene; the right panel has Login / Sign up tabs and the form.
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink } from 'react-router-dom';
import { BooksCap, Hills, Stars, Wordmark } from '../components/Art.jsx';
import Threads from '../components/bits/Threads.jsx';
import Hero3D from '../components/Hero3D.jsx';
import Icon from '../components/icons.jsx';
import { sessionExpired } from '../components/Guards.jsx';
import { Notice, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';

const EASE = [0.2, 0.7, 0.3, 1];
const POINTS = ['Eligibility, rule by rule', 'Documents checked automatically', 'Deadline alerts'];

function AuthScene() {
  const [failed, setFailed] = useState(() => {
    try { const c = document.createElement('canvas'); return !(c.getContext('webgl2') || c.getContext('webgl')); } catch { return true; }
  });
  if (failed) return <BooksCap className="h-auto w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)]" />;
  return <Hero3D compact className="aspect-square w-full" onFail={() => setFailed(true)} />;
}

function AuthShell({ title, lede, children, footer }) {
  return (
    <div className="grid min-h-screen bg-wash lg:grid-cols-[1fr_1.05fr]">
      <section className="night relative isolate flex flex-col justify-between gap-8 overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9 lg:min-h-screen">
        <Stars className="-z-10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 opacity-70" aria-hidden="true">
          <Threads color={[0.91, 0.71, 0.3]} accentColor={[0.24, 0.78, 0.71]} amplitude={1} distance={0.25} lineCount={28} thickness={0.5} speed={0.35} />
        </div>
        <Link to="/" className="no-underline"><Wordmark /></Link>
        <div className="relative">
          <motion.h1 initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE }}
            className="text-[2rem] leading-tight sm:text-[2.6rem]">
            Welcome to<br /><span className="font-accent text-[1.15em] text-thread">VidyaSutra</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: EASE }}
            className="mt-3 text-[1.08rem] text-white/75">Unlock scholarships. Build your future.</motion.p>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
            className="mx-auto my-2 hidden w-full max-w-[24rem] lg:block">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
              <AuthScene />
            </motion.div>
          </motion.div>
          <ul className="mt-6 space-y-3 lg:mt-0">
            {POINTS.map((p, i) => (
              <motion.li key={p} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: EASE }}
                className="flex items-center gap-3 text-[0.95rem] text-white/90">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-mint/20 text-mint"><Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /></span>
                {p}
              </motion.li>
            ))}
          </ul>
        </div>
        <Hills className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 w-full opacity-70" />
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="w-full max-w-[27rem] rounded-3xl border border-line bg-paper p-6 shadow-[0_30px_60px_-40px_rgba(6,31,34,0.6)] sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-wash p-1" role="tablist" aria-label="Account">
            {[['/login', 'Login'], ['/register', 'Sign up']].map(([to, label]) => (
              <NavLink key={to} to={to} role="tab"
                className={({ isActive }) => `rounded-lg py-2 text-center text-[0.92rem] font-bold no-underline transition-all ${isActive ? 'bg-paper text-brand shadow-sm' : 'text-ink-2 hover:text-ink'}`}>
                {label}
              </NavLink>
            ))}
          </div>
          <h2 className="text-[1.45rem]">{title}</h2>
          <p className="mb-5 mt-1 text-[0.92rem] text-ink-2">{lede}</p>
          {children}
          <p className="mt-6 text-center text-[0.9rem] text-ink-2">{footer}</p>
        </motion.div>
      </section>
    </div>
  );
}

function useAuthForm(path) {
  const { signIn } = useSession();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit(body) {
    setBusy(true);
    setError(null);
    try {
      signIn(await api(path, { method: 'POST', body }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, submit };
}

// Password field with a show/hide eye. Clicking the eye keeps the cursor in the field.
function PasswordInput({ id, value, onChange, autoComplete, placeholder, describedBy, invalid }) {
  const [show, setShow] = useState(false);
  const label = show ? 'Hide password' : 'Show password';
  return (
    <div className="relative">
      <input className="input !pr-12" id={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} required placeholder={placeholder}
        value={value} onChange={onChange} aria-describedby={describedBy} aria-invalid={invalid || undefined}
        spellCheck={false} autoCapitalize="none" />
      <button type="button" onClick={() => setShow((s) => !s)} onMouseDown={(e) => e.preventDefault()}
        aria-label={label} aria-pressed={show} aria-controls={id} title={label}
        className={`absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg transition-colors ${show ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:bg-wash hover:text-brand'}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={show ? 'off' : 'on'} className="grid place-items-center"
            initial={{ opacity: 0, scale: 0.6, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6, rotate: 30 }}
            transition={{ duration: 0.16 }}>
            <Icon name={show ? 'eyeOff' : 'eye'} className="h-5 w-5" />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

// The seeded demo accounts, one tap to fill the form.
const DEMO = [
  { label: 'Student demo', icon: 'cap', email: 'student@vidyasutra.test', password: 'Student@12345' },
  { label: 'Reviewer demo', icon: 'shieldCheck', email: 'admin@vidyasutra.test', password: 'Admin@12345' },
];

export function Login() {
  const { error, busy, submit } = useAuthForm('/auth/login');
  const [values, setValues] = useState({ email: '', password: '' });
  const [expired] = useState(sessionExpired);
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <AuthShell title="Welcome back" lede=""
      footer={<>New here? <Link className="font-bold text-brand hover:text-brand-deep" to="/register">Create an account</Link></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (!busy) submit({ email: values.email.trim().toLowerCase(), password: values.password }); }} className="space-y-4">
        {!error && expired && <Notice tone="warn">Your session expired. Sign in again to continue where you left off.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label className="label text-[0.9rem]" htmlFor="email">Email</label>
          <input className="input" id="email" type="email" autoComplete="email" required placeholder="Enter your email" value={values.email} onChange={set('email')} />
        </div>
        <div>
          <label className="label text-[0.9rem]" htmlFor="password">Password</label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="Enter your password" value={values.password} onChange={set('password')} />
        </div>
        <button className="btn btn-primary w-full !min-h-[2.9rem]" disabled={busy}>{busy ? <><Spinner />Signing in…</> : 'Sign in'}</button>
      </form>
      <div className="mt-5 rounded-xl border border-dashed border-line bg-wash/60 p-3.5">
        <p className="mb-2 flex items-center gap-1.5 text-[0.82rem] font-bold text-ink-2"><Icon name="info" className="h-4 w-4" />Try the built-in demo accounts</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" className="btn btn-quiet btn-small"
              onClick={() => setValues({ email: d.email, password: d.password })}>
              <Icon name={d.icon} className="h-4 w-4" />{d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}

// A simple strength score: length plus variety of character kinds.
function strength(pw) {
  if (!pw) return { score: 0, label: '', tone: '' };
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (pw.length >= 12) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  if (pw.length < 8) s = Math.min(s, 1);
  const levels = [
    { label: 'Too short', tone: 'miss' }, { label: 'Weak', tone: 'miss' }, { label: 'Fair', tone: 'warn' },
    { label: 'Good', tone: 'warn' }, { label: 'Strong', tone: 'pass' }, { label: 'Very strong', tone: 'pass' },
  ];
  return { score: s, ...levels[s] };
}
const TONE_BG = { miss: 'bg-miss', warn: 'bg-thread', pass: 'bg-pass' };

export function Register() {
  const { error, busy, submit } = useAuthForm('/auth/register');
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState({});
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const pw = useMemo(() => strength(values.password), [values.password]);

  const problems = {
    name: !values.name.trim() ? 'Enter your full name.' : values.name.trim().length < 2 ? 'Enter at least 2 characters.' : values.name.length > 80 ? 'Keep your name under 80 characters.' : null,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ? 'Enter a valid email address.' : null,
    password: values.password.length < 8 ? 'Use at least 8 characters.' : values.password.length > 72 ? 'Use at most 72 characters.' : null,
    confirm: values.confirm !== values.password ? 'Passwords do not match.' : null,
    agree: !agree ? 'Please accept the terms to continue.' : null,
  };
  const show = (k) => touched[k] && problems[k];

  function onSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true, agree: true });
    if (busy || Object.values(problems).some(Boolean)) return;
    submit({ name: values.name.trim().replace(/\s+/g, ' '), email: values.email.trim().toLowerCase(), password: values.password });
  }

  return (
    <AuthShell title="Create your account" lede=""
      footer={<>Already have an account? <Link className="font-bold text-brand hover:text-brand-deep" to="/login">Login</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-3.5">
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label className="label text-[0.9rem]" htmlFor="name">Full name</label>
          <input className="input" id="name" autoComplete="name" placeholder="Enter your full name" value={values.name} onChange={set('name')} onBlur={touch('name')} aria-invalid={Boolean(show('name')) || undefined} />
          {show('name') && <p className="mt-1 text-[0.82rem] text-miss">{problems.name}</p>}
        </div>
        <div>
          <label className="label text-[0.9rem]" htmlFor="email">Email</label>
          <input className="input" id="email" type="email" autoComplete="email" placeholder="Enter your email" value={values.email} onChange={set('email')} onBlur={touch('email')} aria-invalid={Boolean(show('email')) || undefined} />
          {show('email') && <p className="mt-1 text-[0.82rem] text-miss">{problems.email}</p>}
        </div>
        <div>
          <label className="label text-[0.9rem]" htmlFor="password">Password</label>
          <div onBlur={touch('password')}>
            <PasswordInput id="password" autoComplete="new-password" placeholder="Create a strong password" value={values.password} onChange={set('password')} describedBy="pw-strength" invalid={Boolean(show('password'))} />
          </div>
          <div id="pw-strength" className="mt-1.5" aria-live="polite">
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-1.5 rounded-full transition-colors ${pw.score >= n ? TONE_BG[pw.tone] : 'bg-line'}`} />)}
            </div>
            <p className="mt-1 flex justify-between text-[0.78rem] text-ink-2">
              <span>At least 8 characters. Mix cases, numbers and symbols.</span>
              {pw.label && <span className={`whitespace-nowrap pl-2 font-bold ${pw.tone === 'pass' ? 'text-pass' : pw.tone === 'warn' ? 'text-thread-deep' : 'text-miss'}`}>{pw.label}</span>}
            </p>
          </div>
        </div>
        <div>
          <label className="label text-[0.9rem]" htmlFor="confirm">Confirm password</label>
          <div onBlur={touch('confirm')}>
            <PasswordInput id="confirm" autoComplete="new-password" placeholder="Confirm your password" value={values.confirm} onChange={set('confirm')} invalid={Boolean(show('confirm'))} />
          </div>
          {show('confirm') && <p className="mt-1 text-[0.82rem] text-miss">{problems.confirm}</p>}
          {!problems.confirm && values.confirm && <p className="mt-1 flex items-center gap-1 text-[0.82rem] text-pass"><Icon name="check" className="h-3.5 w-3.5" />Passwords match</p>}
        </div>
        <fieldset>
          <legend className="label text-[0.9rem]">Role</legend>
          <div className="flex flex-wrap gap-4 text-[0.92rem]">
            <label className="flex items-center gap-2"><input type="radio" name="role" defaultChecked className="accent-[var(--color-brand)]" />Student</label>
            <label className="flex items-center gap-2 text-ink-2" title="Reviewer accounts are issued by the platform team">
              <input type="radio" name="role" disabled />Admin <span className="text-[0.75rem]">(issued by the platform)</span>
            </label>
          </div>
        </fieldset>
        <div>
          <label className="flex items-start gap-2 text-[0.88rem]">
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTouched((t) => ({ ...t, agree: true })); }} className="mt-1 accent-[var(--color-brand)]" />
            <span>I agree to the terms &amp; conditions and confirm my details are accurate.</span>
          </label>
          {show('agree') && <p className="mt-1 text-[0.82rem] text-miss">{problems.agree}</p>}
        </div>
        <button className="btn btn-primary w-full !min-h-[2.9rem]" disabled={busy}>{busy ? <><Spinner />Creating account…</> : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
