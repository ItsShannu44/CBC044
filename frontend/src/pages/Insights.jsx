// Recovery (everything standing between the student and more scholarships)
// and Analytics (the student's own numbers), both derived from live data.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { LoadError, Loading, PageHead, RuleThread, StatusBadge } from '../components/ui.jsx';
import { inr } from '../lib/format.js';
import { summarize } from '../lib/insights.js';
import { useLoad, useSession } from '../lib/session.jsx';
import { ActionRow, loadStudentData } from './Dashboard.jsx';

const KINDS = [
  { key: 'all', label: 'All' },
  { key: 'document', label: 'Documents' },
  { key: 'profile', label: 'Profile' },
  { key: 'application', label: 'Applications' },
  { key: 'mismatch', label: 'Mismatches' },
  { key: 'eligibility', label: 'Eligibility gaps' },
];

export function Recovery() {
  const { meta } = useSession();
  const { data, error, loading, reload } = useLoad(loadStudentData);
  const [kind, setKind] = useState('all');
  if (loading && !data) return <Loading variant="dashboard" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const x = summarize({ ...data, meta });
  const list = x.actions.filter((a) => kind === 'all' || a.kind === kind);
  const count = (p) => x.actions.filter((a) => a.priority === p).length;
  const unlocks = x.actions.filter((a) => a.kind === 'document' || a.kind === 'profile').reduce((s, a) => Math.max(s, a.unlocks), 0);

  return (
    <>
      <PageHead title="Recovery" lede="Fix these to unlock more scholarships." />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { tone: 'red', icon: 'alert', value: count('high'), label: 'High priority' },
          { tone: 'gold', icon: 'circleAlert', value: count('medium'), label: 'Medium priority' },
          { tone: 'teal', icon: 'trending', value: unlocks, label: 'Most unlocked by one fix' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="soft-icon" data-tone={s.tone}><Icon name={s.icon} /></span>
            <span><span className="block text-[1.5rem] font-extrabold leading-none">{s.value}</span><span className="text-[0.85rem] text-ink-2">{s.label}</span></span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[1.1rem]">Action plan</h2>
            <div className="seg" role="group" aria-label="Filter actions">
              {KINDS.map((k) => (
                <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-pass"><Icon name="circleCheck" />Nothing to fix here.</p>
          ) : (
            <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-2.5">
              {list.map((a) => (
                <ActionRow key={a.id} a={a} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }} />
              ))}
            </motion.ul>
          )}
        </section>

        <aside className="space-y-5">
          {x.partial.length > 0 && (
            <section className="panel p-5">
              <h2 className="mb-1 text-[1.1rem]">Almost there</h2>
              <p className="mb-4 text-[0.88rem] text-ink-2">You meet most rules for these. Here is exactly what is missing.</p>
              <div className="space-y-5">
                {x.partial.map((i) => (
                  <div key={i.scholarship.id}>
                    <Link to={`/scholarships/${i.scholarship.id}`} className="mb-2 flex items-center justify-between gap-2 font-bold no-underline hover:text-brand">
                      {i.scholarship.name}<span className="chip" data-tone="warn">{i.match.score}%</span>
                    </Link>
                    <RuleThread checks={i.match.checks.filter((c) => c.mandatory)} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

const RESULT_COLOR = { ELIGIBLE: 'var(--color-pass)', PARTIAL: 'var(--color-thread)', NOT_ELIGIBLE: 'var(--color-miss)' };

export function Analytics() {
  const { meta } = useSession();
  const { data, error, loading, reload } = useLoad(loadStudentData);
  if (loading && !data) return <Loading variant="dashboard" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const x = summarize({ ...data, meta });
  const scored = [...x.items].sort((a, b) => b.match.score - a.match.score);
  const avg = x.items.length ? Math.round(x.items.reduce((s, i) => s + i.match.score, 0) / x.items.length) : 0;
  const closed = x.items.length - x.open.length;
  const notEligible = x.open.length - x.eligible.length - x.partial.length;
  const dist = [
    { label: 'Eligible', value: x.eligible.length, color: 'var(--color-pass)' },
    { label: 'Within reach', value: x.partial.length, color: 'var(--color-thread)' },
    { label: 'Not a match', value: notEligible, color: 'var(--color-miss)' },
    { label: 'Closed', value: closed, color: 'var(--color-wait)' },
  ];
  const total = dist.reduce((s, d) => s + d.value, 0) || 1;
  const byStatus = data.applications.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});

  return (
    <>
      <PageHead title="Analytics" lede="" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: 'star', tone: 'gold', value: inr(x.potential), label: 'You qualify for (open)' },
          { icon: 'sparkle', tone: 'teal', value: `${avg}%`, label: 'Average match score' },
          { icon: 'cap', tone: 'blue', value: x.open.length, label: 'Open scholarships' },
          { icon: 'send', tone: 'green', value: data.applications.filter((a) => a.status !== 'DRAFT').length, label: 'Applications submitted' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="soft-icon" data-tone={s.tone}><Icon name={s.icon} /></span>
            <span className="min-w-0"><span className="block truncate text-[1.35rem] font-extrabold leading-none">{s.value}</span><span className="text-[0.82rem] text-ink-2">{s.label}</span></span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-1 text-[1.1rem]">Match score by scholarship</h2>
          <p className="mb-4 text-[0.85rem] text-ink-2">Weight of the rules you meet, out of all rules.</p>
          <ul className="space-y-3">
            {scored.map(({ scholarship: s, match }, idx) => (
              <li key={s.id}>
                <Link to={`/scholarships/${s.id}`} className="mb-1 flex items-center justify-between gap-3 text-[0.88rem] no-underline hover:text-brand">
                  <span className={`truncate font-semibold ${s.closed ? 'text-wait line-through' : ''}`}>{s.name}</span>
                  <span className="font-bold">{match.score}%</span>
                </Link>
                <span className="block h-2.5 overflow-hidden rounded-full bg-wash">
                  <motion.i className="block h-full rounded-full" style={{ background: s.closed ? 'var(--color-wait)' : RESULT_COLOR[match.result] }}
                    initial={{ width: 0 }} animate={{ width: `${match.score}%` }} transition={{ delay: idx * 0.05, duration: 0.7, ease: [0.2, 0.7, 0.3, 1] }} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-4 text-[1.1rem]">Where you stand</h2>
            <div className="flex h-4 overflow-hidden rounded-full" role="img" aria-label={dist.map((d) => `${d.label} ${d.value}`).join(', ')}>
              {dist.filter((d) => d.value).map((d) => <span key={d.label} style={{ width: `${(d.value / total) * 100}%`, background: d.color }} />)}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-[0.88rem]">
              {dist.map((d) => (
                <li key={d.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.label}<strong className="ml-auto">{d.value}</strong></li>
              ))}
            </ul>
          </section>
          <section className="panel p-5">
            <h2 className="mb-3 text-[1.1rem]">Applications by status</h2>
            {data.applications.length === 0 ? <p className="text-ink-2">No applications yet. <Link to="/scholarships" className="font-semibold text-brand">Find one to start</Link>.</p> : (
              <ul className="space-y-2">
                {Object.entries(byStatus).map(([st, n]) => (
                  <li key={st} className="flex items-center justify-between"><StatusBadge status={st} /><strong>{n}</strong></li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
