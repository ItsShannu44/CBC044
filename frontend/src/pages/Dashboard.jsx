// The student's home: where the journey stands, what to apply for next, what
// is closing soon, and the few actions that unlock the most.
import { motion } from 'framer-motion';
import CountUp from '../components/bits/CountUp.jsx';
import SpotlightCard from '../components/bits/SpotlightCard.jsx';
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { DaysLeft, LoadError, Loading, MatchPill, Monogram, ProgressDonut } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatDate, inr } from '../lib/format.js';
import { summarize } from '../lib/insights.js';
import { useLoad, useSession } from '../lib/session.jsx';

const EASE = [0.2, 0.7, 0.3, 1];
const up = { hidden: { opacity: 0, y: 16 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.45, ease: EASE } }) };

export function loadStudentData() {
  return Promise.all([api('/matches'), api('/documents'), api('/applications')])
    .then(([matches, docs, apps]) => ({ matches, documents: docs.documents, applications: apps.applications }));
}

const PRIORITY = {
  high: { tone: 'miss', label: 'High priority' },
  medium: { tone: 'warn', label: 'Medium' },
  low: { tone: 'info', label: 'Low' },
};

export function ActionRow({ a, variants }) {
  const p = PRIORITY[a.priority];
  return (
    <motion.li variants={variants} className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3.5 transition-colors hover:border-brand/40">
      <span className="soft-icon" data-tone={a.priority === 'high' ? 'red' : a.priority === 'medium' ? 'gold' : 'teal'}><Icon name={a.icon} /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold leading-snug">{a.title}</span>
          <span className="chip !py-0 !text-[0.72rem]" data-tone={p.tone}>{p.label}</span>
        </span>
        <span className="mt-0.5 block text-[0.88rem] text-ink-2">{a.detail}</span>
      </span>
      <Link to={a.to} className="btn btn-primary btn-small flex-none !min-h-[2rem] !text-[0.82rem]">{a.cta}</Link>
    </motion.li>
  );
}

function Recommended({ item, vault }) {
  const { scholarship: s, match, application } = item;
  const missing = (s.requiredDocuments || []).filter((d) => d.mandatory && !vault.has(d.docType));
  const state = application
    ? { tone: 'info', label: 'Application started' }
    : match.result === 'ELIGIBLE'
      ? (missing.length ? { tone: 'warn', label: 'Needs documents' } : { tone: 'pass', label: 'Eligible' })
      : { tone: 'warn', label: 'Within reach' };
  return (
    <li className="rounded-xl border border-line p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-24px_rgba(6,31,34,.6)]">
      <div className="flex items-start gap-3">
        <Monogram text={s.provider} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Link to={`/scholarships/${s.id}`} className="font-bold leading-snug no-underline hover:text-brand">{s.name}</Link>
            <MatchPill score={match.score} result={match.result} />
          </div>
          <p className="text-[0.85rem] text-ink-2">{s.provider}</p>
          <p className="mt-1 text-[0.9rem] font-bold text-brand">Up to {inr(s.amount)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3">
        <span className="flex flex-wrap items-center gap-2 text-[0.82rem]">
          <span className="chip" data-tone={state.tone}>{state.label}</span>
          <span className="font-semibold text-miss">Deadline: {formatDate(s.deadline)}</span>
        </span>
        <Link to={`/scholarships/${s.id}`} className={`btn btn-small !min-h-[2rem] !text-[0.82rem] ${match.result === 'ELIGIBLE' && !application ? 'btn-primary' : 'btn-quiet'}`}>
          {match.result === 'ELIGIBLE' && !application ? 'Apply now' : 'View details'}
        </Link>
      </div>
    </li>
  );
}

function Card({ title, link, children, className = '', i = 0 }) {
  return (
    <motion.section variants={up} custom={i} initial="hidden" animate="show" className={`panel min-w-0 p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[1.08rem]">{title}</h2>
        {link && <Link to={link.to} className="text-[0.85rem] font-bold text-brand no-underline hover:text-brand-deep">{link.label}</Link>}
      </div>
      {children}
    </motion.section>
  );
}

export default function Dashboard() {
  const { user, meta } = useSession();
  const { data, error, loading, reload } = useLoad(loadStudentData);
  if (loading && !data) return <Loading variant="dashboard" label="Loading your dashboard…" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const x = summarize({ ...data, meta });
  const first = user.name.split(' ')[0];
  const recommended = [...x.eligible, ...x.partial].sort((a, b) => b.match.score - a.match.score).slice(0, 3);
  const deadlines = [...x.open].sort((a, b) => a.scholarship.daysLeft - b.scholarship.daysLeft).slice(0, 4);
  const moreInfo = new Set([...x.partial, ...x.needInfo].map((i) => i.scholarship.id)).size;

  const STATS = [
    { icon: 'cap', tone: 'teal', value: x.eligible.length, label: 'Matched scholarships', to: '/scholarships' },
    { icon: 'circleAlert', tone: 'gold', value: moreInfo, label: 'Need more information', to: '/recovery' },
    { icon: 'scroll', tone: 'blue', value: x.inProgress.length, label: 'In-progress applications', to: '/applications' },
    { icon: 'file', tone: 'red', value: x.missingDocs.length, label: 'Missing documents', to: '/documents' },
  ];
  const PARTS = [
    { label: 'Profile', value: x.profilePct, color: '#0f766e' },
    { label: 'Documents', value: x.docsPct, color: '#3cc7b4' },
    { label: 'Applications', value: x.appsPct, color: '#e9b44c' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] sm:text-[2rem]">Welcome back, {first}! <span className="inline-block origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1]">👋</span></h1>
        </div>
        <Link to="/profile" className="flex items-center gap-3 rounded-2xl border border-mint/40 bg-[#e6f7f3] px-4 py-2.5 no-underline transition-colors hover:border-brand">
          <span className="soft-icon !h-9 !w-9 bg-paper" data-tone="teal"><Icon name="user" /></span>
          <span>
            <span className="block text-[0.9rem] font-bold">Profile {x.profilePct}% complete</span>
            <span className="text-[0.8rem] font-semibold text-brand">{x.profilePct < 100 ? 'Complete now →' : 'Review profile →'}</span>
          </span>
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.li key={s.label} variants={up} custom={i} initial="hidden" animate="show">
            <Link to={s.to} className="block h-full rounded-2xl no-underline transition-transform duration-300 hover:-translate-y-1">
              <SpotlightCard theme="light" spotlightColor="#0f766e" className="!flex h-full items-center gap-3.5 !rounded-2xl border border-line !p-4">
                <span className="soft-icon" data-tone={s.tone}><Icon name={s.icon} /></span>
                <span>
                  <span className="block text-[1.6rem] font-extrabold leading-none"><CountUp to={s.value} duration={1} /></span>
                  <span className="text-[0.82rem] text-ink-2">{s.label}</span>
                </span>
              </SpotlightCard>
            </Link>
          </motion.li>
        ))}
      </ul>

      {x.items.length > 0 && x.profilePct === 0 && (
        <div className="guide mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p><strong>Start with your profile.</strong> Every scholarship is checked against it, rule by rule.</p>
          <Link to="/profile" className="btn btn-primary btn-small">Complete profile</Link>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Card title="Recommended for you" link={{ to: '/scholarships', label: 'View all' }} i={1}>
          {recommended.length === 0 ? (
            <p className="text-ink-2">No matches yet. Complete your profile and new matches will show up here.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{recommended.map((r) => <Recommended key={r.scholarship.id} item={r} vault={x.vault} />)}</ul>
          )}
        </Card>

        <Card title="Upcoming deadlines" link={{ to: '/scholarships', label: 'View all' }} i={2}>
          {deadlines.length === 0 ? <p className="text-ink-2">Nothing is open right now.</p> : (
            <ul className="space-y-1">
              {deadlines.map(({ scholarship: s, match }) => (
                <li key={s.id}>
                  <Link to={`/scholarships/${s.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 no-underline transition-colors hover:bg-wash">
                    <span className="soft-icon !h-9 !w-9" data-tone={s.daysLeft <= 3 ? 'red' : match.result === 'ELIGIBLE' ? 'green' : 'gold'}>
                      <Icon name="calendar" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.92rem] font-bold">{s.name}</span>
                      <span className="text-[0.8rem] text-ink-2">{formatDate(s.deadline)}</span>
                    </span>
                    <DaysLeft scholarship={s} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recovery actions (top priority)" link={{ to: '/recovery', label: 'View all' }} i={3}>
          {x.actions.length === 0 ? (
            <p className="flex items-center gap-2 text-pass"><Icon name="circleCheck" />Nothing is blocking you. Great work!</p>
          ) : (
            <ul className="space-y-2.5">{x.actions.slice(0, 3).map((a) => <ActionRow key={a.id} a={a} />)}</ul>
          )}
        </Card>

        <Card title="Your progress" link={{ to: '/analytics', label: 'Insights' }} i={4}>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <ProgressDonut value={x.overall} parts={PARTS} />
            <ul className="min-w-[10rem] flex-1 space-y-2.5 text-[0.88rem]">
              {PARTS.map((p) => (
                <li key={p.label}>
                  <span className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>
                    <span className="font-bold">{p.value}%</span>
                  </span>
                  <span className="meter block !h-1.5"><i style={{ width: `${p.value}%`, background: p.color }} /></span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-2 border-t border-line pt-2">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-miss" />Recovery tasks</span>
                <span className="font-bold">{x.actions.length} open</span>
              </li>
            </ul>
          </div>
          {x.potential > 0 && (
            <p className="mt-4 rounded-xl bg-thread-soft px-3 py-2 text-[0.88rem] text-thread-deep">
              <Icon name="star" className="mr-1 inline h-4 w-4" />You qualify for up to <strong>{inr(x.potential)}</strong> in open scholarships.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
