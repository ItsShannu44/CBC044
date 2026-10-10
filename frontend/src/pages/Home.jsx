// Scholarship discovery: every scheme checked against the student's profile,
// searchable, filterable and ranked, with the reason behind each match.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { Chip, Deadline, LoadError, Loading, MatchPill, MiniThread, Monogram, Notice, PageHead, StatusBadge } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { inr } from '../lib/format.js';
import { ruleTags } from '../lib/insights.js';
import { useLoad, useSession } from '../lib/session.jsx';

const RESULT_CHIP = { ELIGIBLE: { tone: 'pass', label: 'You qualify' }, PARTIAL: { tone: 'warn', label: 'Within reach' }, NOT_ELIGIBLE: { tone: 'miss', label: 'Not a match' } };
const PAGE = 6;

function ScholarshipCard({ item, index }) {
  const { scholarship: s, match, application } = item;
  const gaps = match.checks.filter((c) => c.mandatory && c.status !== 'pass');
  const chip = RESULT_CHIP[match.result];
  const canApply = match.canApply && !s.closed && !application;
  return (
    <motion.li layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: (index % PAGE) * 0.04, duration: 0.35 }}
      className={`panel group p-4 transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(6,31,34,.6)] sm:p-5 ${s.closed ? 'opacity-75' : ''}`}>
      <div className="flex flex-wrap items-start gap-4">
        <Monogram text={s.provider} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/scholarships/${s.id}`} className="text-[1.08rem] font-bold leading-snug no-underline group-hover:text-brand">{s.name}</Link>
            <MatchPill score={match.score} result={match.result} />
          </div>
          <p className="flex items-center gap-1.5 text-[0.88rem] text-ink-2"><Icon name="users" className="h-3.5 w-3.5" />{s.provider}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ruleTags(s).map((t) => <span key={t} className="rounded-md bg-wash px-2 py-0.5 text-[0.78rem] font-semibold text-ink-2">{t}</span>)}
            <Chip tone={chip.tone} className="!text-[0.76rem]">{chip.label}</Chip>
            {application && <StatusBadge status={application.status} />}
          </div>
          {match.result === 'PARTIAL' && !s.closed && gaps.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[0.86rem] text-miss">{gaps.map((g, i) => <li key={i} className="flex gap-1.5"><Icon name="circleAlert" className="mt-0.5 h-3.5 w-3.5 flex-none" />{g.reason}</li>)}</ul>
          )}
        </div>
        <div className="flex w-full flex-row items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
          <span className="text-right">
            <span className="block text-[1.15rem] font-extrabold text-brand">{inr(s.amount)}</span>
            <span className="text-[0.8rem]"><Deadline scholarship={s} /></span>
          </span>
          <MiniThread checks={match.checks} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3">
        <span className="text-[0.8rem] text-ink-2">
          {s.rules.length} rule{s.rules.length === 1 ? '' : 's'} checked · {s.requiredDocuments.filter((d) => d.mandatory).length} documents required
        </span>
        <span className="flex gap-2">
          <Link to={`/scholarships/${s.id}`} className="btn btn-quiet btn-small">View details</Link>
          {canApply && <Link to={`/scholarships/${s.id}?tab=documents`} className="btn btn-primary btn-small">Apply now</Link>}
          {application && <Link to={`/scholarships/${s.id}?tab=documents`} className="btn btn-primary btn-small">Continue</Link>}
        </span>
      </div>
    </motion.li>
  );
}

const MATCH_OPTIONS = [['all', 'All'], ['qualify', 'You qualify'], ['partial', 'Within reach'], ['none', 'Not a match'], ['saved', 'Saved for later']];
const DEADLINE_OPTIONS = [['any', 'Anytime'], ['7', 'Within 7 days'], ['30', 'Within 30 days'], ['closed', 'Closed']];
const AMOUNT_OPTIONS = [['0', 'Any amount'], ['25000', '₹25,000+'], ['50000', '₹50,000+'], ['100000', '₹1,00,000+']];

function Select({ label, value, onChange, options }) {
  return (
    <label className="min-w-[9rem] flex-1">
      <span className="mb-1 block text-[0.75rem] font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <select className="input !min-h-[2.35rem] !py-1 text-[0.9rem]" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function Home() {
  const { meta } = useSession();
  const { data, error, loading, reload } = useLoad(() => api('/matches'));
  // Filters live in the address, so Back from a scholarship returns to the same list.
  const [params, setParams] = useSearchParams();
  const pick = (k, allowed, fallback) => (allowed.includes(params.get(k)) ? params.get(k) : fallback);
  const query = (params.get('q') || '').slice(0, 80);
  const matchF = pick('match', MATCH_OPTIONS.map(([v]) => v), 'all');
  const deadlineF = pick('deadline', DEADLINE_OPTIONS.map(([v]) => v), 'any');
  const amountF = pick('amount', AMOUNT_OPTIONS.map(([v]) => v), '0');
  const sort = pick('sort', ['match', 'deadline', 'amount'], 'match');
  const update = (k, v, dflt) => setParams((old) => {
    const next = new URLSearchParams(old);
    if (v === dflt || v === '') next.delete(k); else next.set(k, v);
    return next;
  }, { replace: true });
  const setQuery = (v) => update('q', v, '');
  const setMatchF = (v) => update('match', v, 'all');
  const setDeadlineF = (v) => update('deadline', v, 'any');
  const setAmountF = (v) => update('amount', v, '0');
  const setSort = (v) => update('sort', v, 'match');
  const [shown, setShown] = useState(PAGE);
  const saved = useMemo(() => { try { return JSON.parse(localStorage.getItem('vidyasutra.saved') || '[]'); } catch { return []; } }, []);

  const items = useMemo(() => (data?.items || []).filter((i) => i.match), [data]);

  if (loading && !data) return <Loading variant="list" label="Checking every scholarship against your profile…" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const missing = data.missingProfileFields;
  const q = query.trim().toLowerCase();
  const keep = (i) => {
    const s = i.scholarship;
    if (matchF === 'qualify' && i.match.result !== 'ELIGIBLE') return false;
    if (matchF === 'partial' && i.match.result !== 'PARTIAL') return false;
    if (matchF === 'none' && i.match.result !== 'NOT_ELIGIBLE') return false;
    if (matchF === 'saved' && !saved.includes(String(s.id))) return false;
    if (deadlineF === 'closed' ? !s.closed : deadlineF !== 'any' && (s.closed || s.daysLeft > Number(deadlineF))) return false;
    if (Number(s.amount) < Number(amountF)) return false;
    if (q) {
      const hay = [s.name, s.provider, s.description, ...ruleTags(s, 10)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };
  const sorter = {
    match: (a, b) => Number(a.scholarship.closed) - Number(b.scholarship.closed) || b.match.score - a.match.score || a.scholarship.daysLeft - b.scholarship.daysLeft,
    deadline: (a, b) => Number(a.scholarship.closed) - Number(b.scholarship.closed) || a.scholarship.daysLeft - b.scholarship.daysLeft,
    amount: (a, b) => b.scholarship.amount - a.scholarship.amount,
  }[sort];
  const list = items.filter(keep).sort(sorter);
  const filtered = q || matchF !== 'all' || deadlineF !== 'any' || amountF !== '0';
  const reset = () => { setParams(sort === 'match' ? {} : { sort }, { replace: true }); setShown(PAGE); };
  const eligibleCount = items.filter((i) => i.match.result === 'ELIGIBLE' && !i.scholarship.closed).length;

  return (
    <>
      <PageHead title="Find scholarships" lede="Matched against your profile." />

      <section className="panel p-4 sm:p-5">
        <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border-[1.5px] border-line bg-paper px-3 focus-within:border-brand">
            <Icon name="search" className="h-4 w-4 flex-none text-ink-2" />
            <input className="min-h-[2.6rem] w-full bg-transparent outline-none" placeholder="Search scholarships, e.g. 'engineering', 'merit', 'Karnataka'"
              aria-label="Search scholarships" value={query} maxLength={80} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }} />
          </label>
          <button className="btn btn-primary !px-3.5" aria-label="Search"><Icon name="search" className="h-5 w-5" /></button>
        </form>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select label="Match" value={matchF} onChange={(v) => { setMatchF(v); setShown(PAGE); }} options={MATCH_OPTIONS} />
          <Select label="Deadline" value={deadlineF} onChange={(v) => { setDeadlineF(v); setShown(PAGE); }} options={DEADLINE_OPTIONS} />
          <Select label="Amount" value={amountF} onChange={(v) => { setAmountF(v); setShown(PAGE); }} options={AMOUNT_OPTIONS} />
          <Select label="Sort by" value={sort} onChange={setSort} options={[['match', 'Best match'], ['deadline', 'Closest deadline'], ['amount', 'Highest amount']]} />
          {filtered && <button type="button" onClick={reset} className="btn btn-quiet btn-small !min-h-[2.35rem]"><Icon name="x" className="h-4 w-4" />Clear</button>}
        </div>
      </section>

      {missing.length > 0 && (
        <div className="guide mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-[0.92rem]">
            <strong>Your profile is missing {missing.length} detail{missing.length === 1 ? '' : 's'}:</strong>{' '}
            {missing.map((k) => meta.fields[k].label).join(', ')}. Rules that need them cannot be checked.
          </p>
          <Link to="/profile" className="btn btn-primary btn-small">Complete your profile</Link>
        </div>
      )}

      <div className="mt-6 mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[1.15rem]">{list.length} scholarship{list.length === 1 ? '' : 's'}{filtered ? ' found' : ''}</h2>
        <p className="text-[0.88rem] text-ink-2">You qualify for <strong className="text-pass">{eligibleCount}</strong> open right now</p>
      </div>

      {items.length === 0 ? (
        <Notice>No scholarships have been added yet. You will get an alert when one matches your profile.</Notice>
      ) : list.length === 0 ? (
        <Notice>{matchF === 'saved' && !q ? 'You have not saved any scholarships yet. Open one and tap "Save for later".' : 'Nothing matches that search. Try a different word or filter.'} <button type="button" className="font-semibold text-brand underline" onClick={reset}>Clear filters</button></Notice>
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {list.slice(0, shown).map((i, idx) => <ScholarshipCard key={i.scholarship.id} item={i} index={idx} />)}
            </AnimatePresence>
          </ul>
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-[0.85rem] text-ink-2">Showing {Math.min(shown, list.length)} of {list.length}</p>
            {shown < list.length && <button type="button" className="btn btn-quiet" onClick={() => setShown((n) => n + PAGE)}>Load more<Icon name="chevronDown" className="h-4 w-4" /></button>}
          </div>
        </>
      )}

    </>
  );
}
