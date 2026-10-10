// Reviewer view of everyone on the platform: search by name or email, filter
// by role, profile, activity, category and state, sort, page through, and open
// any user for their profile, applications and documents. Search, filters,
// page and the open user live in the address, so Back and shared links work.
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import CountUp from '../components/bits/CountUp.jsx';
import SpotlightCard from '../components/bits/SpotlightCard.jsx';
import Icon from '../components/icons.jsx';
import { Chip, LoadError, Loading, Notice, OcrChip, PageHead, Spinner, StatusBadge } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatDate, inr } from '../lib/format.js';
import { initials } from '../lib/insights.js';
import { useLoad, useSession } from '../lib/session.jsx';

const ROLES = [['', 'All roles'], ['STUDENT', 'Students'], ['ADMIN', 'Reviewers']];
const PROFILE = [['', 'Any profile'], ['complete', 'Complete'], ['incomplete', 'Incomplete']];
const ACTIVITY = [['', 'Any activity'], ['applied', 'Has applied'], ['active', 'Application in progress'], ['none', 'No applications'], ['flagged', 'Flagged documents']];
const SORTS = [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['name', 'Name A–Z'], ['applications', 'Most applications'], ['profile', 'Profile completeness']];
const FILTER_KEYS = ['role', 'profile', 'activity', 'category', 'state', 'level'];
const ROLE_LABEL = { STUDENT: 'Student', ADMIN: 'Reviewer' };

// Highlights the part of a name or email that matches the search.
function Highlight({ text, query }) {
  const q = query.trim().toLowerCase();
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="rounded bg-thread-soft px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function UserAvatar({ name, role, className = 'h-10 w-10' }) {
  return (
    <span className={`grid flex-none place-items-center rounded-full text-[0.82rem] font-bold text-white ${className} ${role === 'ADMIN' ? 'bg-[linear-gradient(135deg,#e9b44c,#b7791f)]' : 'bg-[linear-gradient(135deg,#3cc7b4,#0f766e)]'}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="min-w-[9.5rem] flex-1">
      <span className="mb-1 block text-[0.72rem] font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <select className="input !min-h-[2.35rem] !py-1 text-[0.88rem]" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function ProfileMeter({ user }) {
  if (user.role === 'ADMIN') return <span className="text-ink-2">—</span>;
  const pct = user.profile.completeness;
  return (
    <span className="flex min-w-[6rem] items-center gap-2">
      <span className="meter block h-1.5 flex-1" data-tone={pct === 100 ? '' : pct >= 50 ? 'warn' : 'miss'}><i style={{ width: `${pct}%` }} /></span>
      <span className="w-9 text-right text-[0.82rem] font-semibold">{pct}%</span>
    </span>
  );
}

// ---------- Details drawer ----------

function display(def, v) {
  if (v === null || v === undefined || v === '') return <span className="text-ink-2">—</span>;
  if (def?.type === 'boolean') return v ? 'Yes' : 'No';
  if (def?.type === 'currency') return inr(v);
  return String(v);
}

function UserDrawer({ id, onClose }) {
  const { meta } = useSession();
  const { data, error, loading, reload } = useLoad(() => api(`/admin/users/${id}`), [id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const u = data?.user;
  return (
    <>
      <motion.div className="fixed inset-0 z-[60] bg-deep/50 backdrop-blur-[2px]" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside role="dialog" aria-modal="true" aria-label="User details"
        className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[30rem] flex-col bg-paper shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[1.05rem]">User details</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-wash"><Icon name="x" /><span className="sr-only">Close</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <LoadError error={error} retry={reload} />}
          {loading && !data && <div className="grid min-h-[40vh] place-items-center"><Spinner className="h-6 w-6 text-brand" /></div>}
          {u && (
            <div className="space-y-6">
              <div className="flex items-center gap-3.5">
                <UserAvatar name={u.name} role={u.role} className="h-14 w-14 text-[1.05rem]" />
                <div className="min-w-0">
                  <p className="truncate text-[1.15rem] font-bold">{u.name}</p>
                  <a href={`mailto:${u.email}`} className="block truncate text-[0.9rem] text-brand">{u.email}</a>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-2">
                    <Chip tone={u.role === 'ADMIN' ? 'warn' : 'info'}>{ROLE_LABEL[u.role]}</Chip>
                    Joined {formatDate(u.createdAt)}
                  </p>
                </div>
              </div>

              {u.role === 'STUDENT' && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Profile', `${u.profile.completeness}%`], ['Eligible', u.eligible], ['Applied', u.applications.total]].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-wash px-2 py-3"><p className="text-[1.25rem] font-extrabold leading-none">{v}</p><p className="mt-1 text-[0.75rem] text-ink-2">{k}</p></div>
                    ))}
                  </div>

                  <section>
                    <h3 className="mb-2 text-[0.95rem]">Profile</h3>
                    {data.profile ? (
                      <dl className="divide-y divide-line rounded-xl border border-line">
                        {Object.entries(meta.fields).map(([k, def]) => (
                          <div key={k} className="flex justify-between gap-3 px-3.5 py-2 text-[0.88rem]"><dt className="text-ink-2">{def.label}</dt><dd className="text-right font-semibold">{display(def, data.profile[k])}</dd></div>
                        ))}
                      </dl>
                    ) : <p className="text-[0.9rem] text-ink-2">Has not filled in a profile yet.</p>}
                  </section>

                  <section>
                    <h3 className="mb-2 text-[0.95rem]">Applications ({data.applications.length})</h3>
                    {data.applications.length === 0 ? <p className="text-[0.9rem] text-ink-2">No applications yet.</p> : (
                      <ul className="space-y-2">
                        {data.applications.map((a) => (
                          <li key={a.id}>
                            <Link to={`/admin/applications/${a.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 no-underline hover:border-brand/40 hover:bg-wash">
                              <span className="min-w-0">
                                <span className="block truncate text-[0.9rem] font-semibold">{a.scholarship?.name || 'Scholarship removed'}</span>
                                <span className="text-[0.78rem] text-ink-2">Updated {formatDate(a.updatedAt)}</span>
                              </span>
                              <StatusBadge status={a.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-[0.95rem]">Documents ({data.documents.length})</h3>
                    {data.documents.length === 0 ? <p className="text-[0.9rem] text-ink-2">No documents uploaded.</p> : (
                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {data.documents.map((d) => (
                          <li key={d.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.88rem]">
                            <span className="min-w-0"><span className="block font-semibold">{d.label}</span><span className="block truncate text-[0.78rem] text-ink-2">{d.fileName} · {formatDate(d.uploadedAt)}</span></span>
                            <OcrChip ocr={d.ocr && { ...d.ocr, checks: [] }} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
              {u.role === 'ADMIN' && <Notice>Reviewer account. Reviewers manage scholarships and decide applications.</Notice>}
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

// ---------- The page ----------

export default function AdminUsers() {
  const { meta } = useSession();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const sort = SORTS.some(([v]) => v === params.get('sort')) ? params.get('sort') : 'newest';
  const openId = params.get('user');

  // The search box updates the address after a short pause, not on every key.
  const [draft, setDraft] = useState(q);
  useEffect(() => { setDraft(q); }, [q]);
  useEffect(() => {
    if (draft.trim() === q) return undefined;
    const t = setTimeout(() => update({ q: draft.trim(), page: '' }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function update(changes) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      for (const [k, v] of Object.entries(changes)) { if (v === '' || v === null || v === undefined) next.delete(k); else next.set(k, v); }
      return next;
    }, { replace: !changes.user });
  }

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    FILTER_KEYS.forEach((k) => { if (params.get(k)) p.set(k, params.get(k)); });
    p.set('sort', sort);
    p.set('page', String(page));
    p.set('pageSize', '12');
    return p.toString();
  }, [q, sort, page, params]);

  const { data, error, loading, reload } = useLoad(() => api(`/admin/users?${query}`), [query]);
  const filtered = Boolean(q) || FILTER_KEYS.some((k) => params.get(k));
  const reset = () => { setDraft(''); setParams(sort === 'newest' ? {} : { sort }, { replace: true }); };
  const opt = (field, all) => [['', all], ...(meta.fields[field]?.options || []).map((o) => [o, o])];

  if (!data && loading) return <Loading variant="list" label="Loading users…" />;
  if (!data && error) {
    // An API server started before the Users feature was added answers 403 or 404 here.
    const stale = error.status === 403 || error.status === 404;
    return <LoadError retry={reload} error={stale ? { status: 500, message: 'The API server is running an older version without the Users feature. Stop it and start it again (npm run dev:api), then try again.' } : error} />;
  }

  const STATS = [
    { label: 'Total users', value: data.totals.total, icon: 'users', tone: 'teal' },
    { label: 'Students', value: data.totals.students, icon: 'cap', tone: 'blue' },
    { label: 'Reviewers', value: data.totals.admins, icon: 'shieldCheck', tone: 'gold' },
    { label: 'New this week', value: data.totals.newThisWeek, icon: 'sparkle', tone: 'green' },
  ];

  return (
    <>
      <PageHead title="Users" lede="Everyone on the platform." />

      <ul className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <li key={s.label}>
            <SpotlightCard theme="light" spotlightColor="#0f766e" className="!flex h-full items-center gap-3.5 !rounded-2xl border border-line !p-4">
              <span className="soft-icon" data-tone={s.tone}><Icon name={s.icon} /></span>
              <span><span className="block text-[1.5rem] font-extrabold leading-none"><CountUp to={s.value} duration={1} /></span><span className="text-[0.8rem] text-ink-2">{s.label}</span></span>
            </SpotlightCard>
          </li>
        ))}
      </ul>

      <section className="panel mb-5 p-4">
        <form onSubmit={(e) => { e.preventDefault(); update({ q: draft.trim(), page: '' }); }}>
          <label className="flex items-center gap-2 rounded-xl border-[1.5px] border-line bg-paper px-3 focus-within:border-brand">
            <Icon name="search" className="h-4 w-4 flex-none text-ink-2" />
            <input className="min-h-[2.6rem] w-full bg-transparent outline-none" type="search" placeholder="Search by name or email"
              aria-label="Search users" value={draft} maxLength={80} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setDraft(''); }} />
            {loading && <Spinner className="text-brand" />}
          </label>
        </form>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select label="Role" value={params.get('role') || ''} onChange={(v) => update({ role: v, page: '' })} options={ROLES} />
          <Select label="Profile" value={params.get('profile') || ''} onChange={(v) => update({ profile: v, page: '' })} options={PROFILE} />
          <Select label="Activity" value={params.get('activity') || ''} onChange={(v) => update({ activity: v, page: '' })} options={ACTIVITY} />
          <Select label="Category" value={params.get('category') || ''} onChange={(v) => update({ category: v, page: '' })} options={opt('category', 'Any category')} />
          <Select label="State" value={params.get('state') || ''} onChange={(v) => update({ state: v, page: '' })} options={opt('state', 'Any state')} />
          <Select label="Sort by" value={sort} onChange={(v) => update({ sort: v === 'newest' ? '' : v, page: '' })} options={SORTS} />
          {filtered && <button type="button" onClick={reset} className="btn btn-quiet btn-small !min-h-[2.35rem]"><Icon name="x" className="h-4 w-4" />Clear</button>}
        </div>
      </section>

      {error && <LoadError error={error} retry={reload} />}

      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[1.05rem]">{data.matched} user{data.matched === 1 ? '' : 's'}{filtered ? ' found' : ''}</h2>
        {data.pages > 1 && <p className="text-[0.85rem] text-ink-2">Page {data.page} of {data.pages}</p>}
      </div>

      {data.users.length === 0 ? (
        <Notice>No users match. <button type="button" className="font-semibold text-brand underline" onClick={reset}>Clear search and filters</button></Notice>
      ) : (
        <div className={`panel overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <table className="hidden w-full text-left text-[0.9rem] md:table">
            <thead className="border-b border-line bg-wash/60 text-[0.75rem] uppercase tracking-wide text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-bold">User</th>
                <th className="px-3 py-2.5 font-bold">Role</th>
                <th className="px-3 py-2.5 font-bold">Profile</th>
                <th className="px-3 py-2.5 font-bold">Applications</th>
                <th className="px-3 py-2.5 font-bold">Documents</th>
                <th className="px-4 py-2.5 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.users.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                  onClick={() => update({ user: String(u.id) })} onKeyDown={(e) => { if (e.key === 'Enter') update({ user: String(u.id) }); }}
                  tabIndex={0} className="cursor-pointer transition-colors hover:bg-wash focus:bg-wash focus:outline-none">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <UserAvatar name={u.name} role={u.role} />
                      <span className="min-w-0">
                        <span className="block max-w-[16rem] truncate font-semibold"><Highlight text={u.name} query={q} /></span>
                        <span className="block max-w-[16rem] truncate text-[0.8rem] text-ink-2"><Highlight text={u.email} query={q} /></span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3"><Chip tone={u.role === 'ADMIN' ? 'warn' : 'info'}>{ROLE_LABEL[u.role]}</Chip></td>
                  <td className="px-3 py-3"><ProfileMeter user={u} /></td>
                  <td className="px-3 py-3">{u.role === 'ADMIN' ? <span className="text-ink-2">—</span> : <><strong>{u.applications.total}</strong>{u.applications.active > 0 && <span className="text-ink-2"> · {u.applications.active} active</span>}</>}</td>
                  <td className="px-3 py-3">{u.role === 'ADMIN' ? <span className="text-ink-2">—</span> : (
                    <span className="flex items-center gap-2"><strong>{u.documents.total}</strong>{u.documents.flagged > 0 && <Chip tone="miss" icon="flag">{u.documents.flagged}</Chip>}</span>
                  )}</td>
                  <td className="px-4 py-3 text-ink-2">{formatDate(u.createdAt)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line md:hidden">
            {data.users.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => update({ user: String(u.id) })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wash">
                  <UserAvatar name={u.name} role={u.role} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold"><Highlight text={u.name} query={q} /></span>
                    <span className="block truncate text-[0.8rem] text-ink-2"><Highlight text={u.email} query={q} /></span>
                    {u.role === 'STUDENT' && <span className="mt-1 block text-[0.78rem] text-ink-2">Profile {u.profile.completeness}% · {u.applications.total} applied{u.documents.flagged ? ` · ${u.documents.flagged} flagged` : ''}</span>}
                  </span>
                  <Chip tone={u.role === 'ADMIN' ? 'warn' : 'info'}>{ROLE_LABEL[u.role]}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          <button type="button" className="btn btn-quiet btn-small" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}><Icon name="arrowLeft" className="h-4 w-4" />Prev</button>
          {Array.from({ length: data.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === data.pages || Math.abs(n - data.page) <= 1).map((n, i, arr) => (
            <span key={n} className="flex items-center gap-1.5">
              {i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-ink-2">…</span>}
              <button type="button" aria-current={n === data.page ? 'page' : undefined} onClick={() => update({ page: n === 1 ? '' : String(n) })}
                className={`h-9 min-w-9 rounded-lg px-2 text-[0.88rem] font-semibold ${n === data.page ? 'bg-brand text-white' : 'border border-line bg-paper hover:border-brand'}`}>{n}</button>
            </span>
          ))}
          <button type="button" className="btn btn-quiet btn-small" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) })}>Next<Icon name="arrowRight" className="h-4 w-4" /></button>
        </nav>
      )}

      <AnimatePresence>
        {openId && <UserDrawer key={openId} id={openId} onClose={() => update({ user: '' })} />}
      </AnimatePresence>
    </>
  );
}
