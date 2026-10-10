// Small shared pieces used on most screens.
import { Link } from 'react-router-dom';
import { LogoMark } from './Art.jsx';
import Icon from './icons.jsx';
import BlurText from './bits/BlurText.jsx';
import { deadlineText, formatDate } from '../lib/format.js';
import { useSession } from '../lib/session.jsx';

const ICONS = {
  pass: <path d="M3 8.5l3.2 3L13 4.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  fail: <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  unknown: <path d="M5.6 6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.6M8 12.6v.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
};

export function Bead({ status }) {
  return (
    <span className="bead" data-status={status} aria-hidden="true">
      {ICONS[status] && <svg viewBox="0 0 16 16">{ICONS[status]}</svg>}
    </span>
  );
}

const STATUS_WORD = { pass: 'Met', fail: 'Not met', unknown: 'Cannot check yet' };

// The signature view: every rule of a scholarship as a bead on a thread, each with its reason.
export function RuleThread({ checks }) {
  if (!checks.length) return <p className="hint">This scholarship has no eligibility rules. Anyone can apply.</p>;
  return (
    <ol className="thread">
      {checks.map((c, i) => (
        <li key={i} data-status={c.status}>
          <Bead status={c.status} />
          <p className="font-semibold leading-snug">
            {c.rule}
            {!c.mandatory && <span className="ml-2 font-normal text-ink-2">(preferred, not required)</span>}
          </p>
          <p className={c.status === 'fail' ? 'text-miss' : c.status === 'unknown' ? 'text-wait' : 'text-ink-2'}>
            <span className="sr-only">{STATUS_WORD[c.status]}. </span>
            {c.reason}
          </p>
        </li>
      ))}
    </ol>
  );
}

// A compact version for lists: one small bead per rule.
export function MiniThread({ checks }) {
  if (!checks?.length) return null;
  const met = checks.filter((c) => c.status === 'pass').length;
  return (
    <span className="inline-flex items-center" role="img" aria-label={`${met} of ${checks.length} rules met`}>
      {checks.map((c, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="h-0.5 w-2.5 bg-thread" />}
          <span
            className={
              'h-2.5 w-2.5 rounded-full ' +
              (c.status === 'pass' ? 'bg-pass' : c.status === 'fail' ? 'border-2 border-miss bg-paper' : 'border-2 border-dashed border-wait bg-paper')
            }
          />
        </span>
      ))}
    </span>
  );
}

// ---------- Small pills ----------

export function Chip({ tone = 'plain', icon, className = '', children, ...rest }) {
  return (
    <span className={`chip ${className}`} data-tone={tone} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  DRAFT: 'bg-thread-soft text-thread-deep',
  SUBMITTED: 'bg-paper text-brand-deep ring-1 ring-line',
  UNDER_REVIEW: 'bg-wash text-brand ring-1 ring-brand/40',
  DOCUMENTS_PENDING: 'bg-miss-soft text-miss',
  APPROVED: 'bg-pass-soft text-pass',
  REJECTED: 'bg-miss-soft text-miss',
  EXPIRED: 'bg-paper text-wait ring-1 ring-line',
};

export function StatusBadge({ status }) {
  const { meta } = useSession();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_TONE[status] || 'bg-wash'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta?.statuses[status] || status}
    </span>
  );
}

export function Deadline({ scholarship }) {
  const urgent = !scholarship.closed && scholarship.daysLeft <= 3;
  return (
    <span className={`inline-flex items-center gap-1 ${urgent ? 'font-semibold text-miss' : scholarship.closed ? 'text-wait' : 'text-ink-2'}`}>
      <Icon name="clock" className="h-3.5 w-3.5" />
      {deadlineText(scholarship)}
    </span>
  );
}

// The match score as a donut. Color follows the verdict. `dark` sits on navy panels.
export function ScoreRing({ score, result, className = 'h-16 w-16', dark = false, children }) {
  const color = result === 'ELIGIBLE' ? 'var(--color-pass)' : result === 'PARTIAL' ? 'var(--color-thread)' : result === 'NOT_ELIGIBLE' ? 'var(--color-miss)' : 'var(--color-brand)';
  const C = 2 * Math.PI * 19;
  return (
    <span className={`relative inline-grid place-items-center ${className}`} role="img" aria-label={`Match score ${score}%`}>
      <svg viewBox="0 0 44 44" className="h-full w-full -rotate-90">
        <circle cx="22" cy="22" r="19" fill="none" stroke={dark ? 'rgba(255,255,255,0.18)' : 'var(--color-wash)'} strokeWidth="4.5" />
        <circle cx="22" cy="22" r="19" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, Math.min(100, score)) / 100)}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)' }} />
      </svg>
      <span className={`absolute font-[family-name:var(--font-display)] font-bold ${dark ? 'text-[1.35rem] text-white' : 'text-[0.95rem]'}`}>{score}%</span>
      {children}
    </span>
  );
}

// ---------- OCR verdicts, straight from the backend scan ----------

export function OcrChip({ ocr }) {
  if (!ocr) return null;
  if (ocr.mismatches > 0) return <Chip tone="miss" icon="flag" title={ocr.checks.find((c) => c.status === 'mismatch')?.message}>OCR: {ocr.mismatches} mismatch{ocr.mismatches === 1 ? '' : 'es'}</Chip>;
  if (ocr.status === 'read') return <Chip tone="pass" icon="shieldCheck">OCR: matches profile</Chip>;
  if (ocr.status === 'unreadable') return <Chip tone="warn" icon="alert" title={ocr.note}>OCR: unreadable</Chip>;
  return <Chip tone="plain" icon="info" title={ocr.note}>OCR: manual review</Chip>;
}

const OCR_STATUS = {
  match: { icon: 'circleCheck', cls: 'text-pass' },
  mismatch: { icon: 'circleX', cls: 'text-miss' },
  not_found: { icon: 'circleAlert', cls: 'text-wait' },
  not_checked: { icon: 'info', cls: 'text-brand' },
};

// The full report: what the scanner read on this file and how each value compared.
export function OcrDetails({ ocr }) {
  if (!ocr) return null;
  if (ocr.status !== 'read') {
    return <p className="hint mt-1 flex items-start gap-1.5"><Icon name="info" className="mt-0.5 h-4 w-4 flex-none" />{ocr.note}</p>;
  }
  return (
    <div className="mt-1.5 rounded-lg border border-line bg-wash/60 px-3 py-2 text-sm">
      <p className="mb-1 flex items-center gap-1.5 font-semibold">
        <Icon name="shieldCheck" className="h-4 w-4 text-brand" />
        Automatic check, {formatDate(ocr.checkedAt)}
      </p>
      <ul className="space-y-1">
        {ocr.checks.map((c) => {
          const s = OCR_STATUS[c.status];
          return (
            <li key={c.field} className="flex items-start gap-1.5">
              <Icon name={s.icon} className={`mt-0.5 h-4 w-4 flex-none ${s.cls}`} />
              <span className={c.status === 'mismatch' ? 'text-miss' : 'text-ink-2'}>{c.message}</span>
            </li>
          );
        })}
      </ul>
      {ocr.excerpt && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-ink-2 underline underline-offset-4">What the scanner read</summary>
          <p className="mt-1 break-words font-mono text-xs text-ink-2">{ocr.excerpt}</p>
        </details>
      )}
    </div>
  );
}

// ---------- Notices and page furniture ----------

export function Notice({ tone = 'info', children, className = '' }) {
  const tones = {
    info: 'border-line bg-paper',
    warn: 'border-thread bg-thread-soft',
    error: 'border-miss bg-miss-soft text-miss',
    good: 'border-pass bg-pass-soft text-pass',
  };
  const icon = { info: 'info', warn: 'circleAlert', error: 'circleX', good: 'circleCheck' }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${tones[tone]} ${className}`}>
      <Icon name={icon} className="mt-0.5 h-5 w-5 flex-none" />
      <div>{children}</div>
    </div>
  );
}

export function PageHead({ title, lede, children, back }) {
  return (
    <header className="mb-7">
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand no-underline hover:text-brand-deep">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Back to {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-[1.7rem] sm:text-[2rem]"><BlurText as="span" text={String(title)} delay={60} stepDuration={0.3} /></h1>
          {lede && <p className="mt-1 max-w-[62ch] text-[0.98rem] text-ink-2">{lede}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

// Full-screen brand loader: shown while the app starts and the session is checked.
export function BrandLoader({ label = 'Getting things ready…', inline = false }) {
  return (
    <div className={`grid place-items-center px-6 ${inline ? 'min-h-[65vh]' : 'min-h-screen bg-wash'}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 animate-[fade-in_.4s_ease_both]">
        <LogoMark className="h-20 w-20 drop-shadow-[0_18px_30px_rgba(10,48,52,0.35)]" animated />
        <p className="font-[family-name:var(--font-display)] text-[1.5rem] font-extrabold tracking-tight text-ink">Vidya<span className="text-thread-deep">Sutra</span></p>
        <div className="loader-bar w-44" aria-hidden="true" />
        <p className="text-[0.88rem] text-ink-2">{label}</p>
      </div>
    </div>
  );
}

// Small spinner for buttons and inline waits.
export function Spinner({ className = '' }) {
  return <span className={`spinner ${className}`} aria-hidden="true" />;
}

export function Skeleton({ className = '' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

// Page loading state: the thread loader plus a skeleton shaped like the page.
// `variant` picks the shape: dashboard, list, detail, form, or page (generic).
export function Loading({ variant = 'page', label = 'Loading…' }) {
  const head = (
    <div className="mb-6 space-y-2.5">
      <Skeleton className="h-8 w-64 max-w-[70%]" />
      <Skeleton className="h-4 w-96 max-w-[90%]" />
    </div>
  );
  let body;
  if (variant === 'dashboard') {
    body = (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[4.6rem]" />)}</div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </>
    );
  } else if (variant === 'list') {
    body = (
      <>
        <Skeleton className="mb-5 h-28" />
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      </>
    );
  } else if (variant === 'detail') {
    body = (
      <>
        <Skeleton className="h-40" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Skeleton className="h-72" /><Skeleton className="h-44" /></div>
      </>
    );
  } else if (variant === 'form') {
    body = <div className="grid gap-5 lg:grid-cols-[15rem_1fr]"><Skeleton className="h-72" /><Skeleton className="h-96" /></div>;
  } else {
    body = <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <div className="mb-6 flex items-center gap-3 text-[0.9rem] font-semibold text-ink-2">
        <LogoMark className="h-7 w-7" animated />
        {label}
      </div>
      {head}
      {body}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadError({ error, retry, back }) {
  const notFound = error?.status === 404;
  const offline = error?.status === 0;
  return (
    <div className="panel mx-auto my-8 flex max-w-[34rem] flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <span className="soft-icon !h-14 !w-14" data-tone={notFound ? 'gold' : 'red'}>
        <Icon name={notFound ? 'search' : offline ? 'alert' : 'circleX'} className="!h-7 !w-7" />
      </span>
      <p className="text-[1.15rem] font-bold">{notFound ? 'We could not find that' : offline ? 'You seem to be offline' : 'Something went wrong'}</p>
      <p className="text-ink-2">{error?.message}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {retry && !notFound && <button className="btn btn-primary btn-small" onClick={retry}><Icon name="refresh" className="h-4 w-4" />Try again</button>}
        {back && <Link to={back.to} className="btn btn-quiet btn-small"><Icon name="arrowLeft" className="h-4 w-4" />{back.label}</Link>}
      </div>
    </div>
  );
}

// The application timeline: every status change with its date and note.
export function StatusTimeline({ history }) {
  const { meta } = useSession();
  return (
    <ol className="thread">
      {history.map((h, i) => {
        const last = i === history.length - 1;
        const tone = last ? (h.to === 'APPROVED' ? 'pass' : ['REJECTED', 'EXPIRED', 'DOCUMENTS_PENDING'].includes(h.to) ? 'fail' : 'now') : 'step';
        return (
          <li key={i} data-status="step">
            <Bead status={tone} />
            <p className="font-semibold leading-snug">{meta?.statuses[h.to] || h.to}</p>
            <p className="text-ink-2">
              {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
              {h.note ? `. ${h.note}` : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Pieces added with the VidyaSutra redesign ----------

// Match percentage as a coloured pill, like "90% Match".
export function MatchPill({ score, result, className = '' }) {
  const tone = result === 'ELIGIBLE' ? 'pass' : result === 'PARTIAL' ? 'warn' : 'miss';
  return <span className={`chip ${className}`} data-tone={tone}><Icon name="sparkle" />{score}% Match</span>;
}

// Accessible underlined tabs. `tabs` is [{ key, label, count? }].
export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" className="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-wash px-1.5 py-0.5 text-xs text-ink-2">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Multi-segment progress donut. `parts` is [{ value (0-100), color }], drawn as equal arcs.
export function ProgressDonut({ value, parts = [], size = 'h-36 w-36', label = 'Overall progress' }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const seg = parts.length ? C / parts.length : C;
  return (
    <span className={`relative inline-grid place-items-center ${size}`} role="img" aria-label={`${label} ${value}%`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-wash)" strokeWidth="11" />
        {parts.map((p, i) => (
          <circle key={i} cx="50" cy="50" r={R} fill="none" stroke={p.color} strokeWidth="11"
            strokeDasharray={`${Math.max(0, (seg - 2) * (p.value / 100))} ${C}`} strokeDashoffset={-seg * i}
            style={{ transition: 'stroke-dasharray .9s cubic-bezier(.2,.7,.3,1)' }} />
        ))}
      </svg>
      <span className="absolute text-center">
        <span className="block font-[family-name:var(--font-display)] text-[1.7rem] font-extrabold leading-none">{value}%</span>
        <span className="text-xs text-ink-2">complete</span>
      </span>
    </span>
  );
}

// "N days left" countdown pill.
export function DaysLeft({ scholarship }) {
  const d = scholarship.daysLeft;
  if (scholarship.closed) return <span className="chip" data-tone="plain">Closed</span>;
  const tone = d <= 3 ? 'miss' : d <= 14 ? 'warn' : 'pass';
  return <span className="chip" data-tone={tone}>{d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'} left`}</span>;
}

// Monogram badge for a provider or scholarship.
export function Monogram({ text, className = 'h-11 w-11' }) {
  const words = String(text || '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(of|for|the|and|in|demo)$/i.test(w));
  const letters = (words.slice(0, 2).map((w) => w[0]).join('') || 'VS').toUpperCase();
  const hues = ['#0f766e', '#b7791f', '#2f6db5', '#9d4edd', '#c2410c', '#15803d'];
  const hue = hues[[...String(text)].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return (
    <span className={`grid flex-none place-items-center rounded-xl text-[0.95rem] font-extrabold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${hue}, #0a3034)` }} aria-hidden="true">{letters}</span>
  );
}
