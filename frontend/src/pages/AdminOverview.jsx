// The admin dashboard: a live pulse of students, scholarships, applications and documents.
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { Chip, LoadError, Loading, Notice, PageHead } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { useLoad, useSession } from '../lib/session.jsx';

const STAGES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'];

const STAGE_ICON = {
  DRAFT: 'scroll',
  SUBMITTED: 'send',
  UNDER_REVIEW: 'eye',
  DOCUMENTS_PENDING: 'circleAlert',
  APPROVED: 'circleCheck',
  REJECTED: 'circleX',
  EXPIRED: 'clock',
};

const STAGE_CLS = {
  DRAFT: 'bg-wash text-ink-2',
  SUBMITTED: 'bg-wash text-brand',
  UNDER_REVIEW: 'bg-wash/70 text-brand',
  DOCUMENTS_PENDING: 'bg-thread-soft text-thread-deep',
  APPROVED: 'bg-pass-soft text-pass',
  REJECTED: 'bg-miss-soft text-miss',
  EXPIRED: 'bg-wash text-wait',
};

// The meter color follows the stage: ember for rejections, marigold for documents pending.
const STAGE_METER = { REJECTED: 'miss', DOCUMENTS_PENDING: 'warn', APPROVED: 'pass' };

function StatTile({ icon, tone, value, label, hint, to }) {
  const body = (
    <>
      <span className="tile" data-tone={tone}><Icon name={icon} /></span>
      <span className="min-w-0">
        <span className="block font-[family-name:var(--font-display)] text-[2.1rem] font-semibold leading-none text-white">{value}</span>
        <span className="block text-sm font-semibold text-white/90">{label}</span>
        <span className="block truncate text-xs text-white/55">{hint}</span>
      </span>
    </>
  );
  const cls = 'flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm transition-colors';
  return to
    ? <Link to={to} className={`${cls} no-underline hover:bg-white/[0.13]`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

export default function AdminOverview() {
  const { meta } = useSession();
  const { data, error, loading, reload } = useLoad(() => api('/admin/stats'));
  if (loading && !data) return <Loading variant="dashboard" label="Loading your dashboard…" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const byStatus = data.applications.byStatus;
  const stages = STAGES.filter((s) => (byStatus[s] || 0) > 0);
  const totalAll = stages.reduce((sum, s) => sum + byStatus[s], 0);

  return (
    <>
      <PageHead title="Overview" lede="What needs you next.">
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/scholarships/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Add scholarship</Link>
          <Link to="/admin/applications" className="btn btn-quiet"><Icon name="eye" className="h-4 w-4" /> Review queue</Link>
        </div>
      </PageHead>

      <div className="hero mb-8 grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <StatTile icon="users" tone="teal" value={data.students} label="Students registered"
          hint="Auto-matched against every scheme" />
        <StatTile icon="cap" tone="blue" value={data.scholarships.open} label="Open scholarships"
          hint={`${data.scholarships.total} in total`} to="/admin/scholarships" />
        <StatTile icon="hourglass" tone="orange" value={data.applications.actionable} label="Waiting on review"
          hint="Submitted, in review or returned" to="/admin/applications" />
        <StatTile icon="flag" tone="yellow" value={data.documents.flagged} label="Flagged by auto-check"
          hint={`${data.documents.total} document${data.documents.total === 1 ? '' : 's'} in vaults`} to="/admin/applications" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="panel p-5 sm:p-6" aria-labelledby="stages-h">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="stages-h" className="text-[1.45rem]">Applications by stage</h2>
              <p className="mt-0.5 text-ink-2">{data.applications.total} submitted in total.</p>
            </div>
            {data.applications.actionable > 0 && (
              <Chip tone="warn" icon="hourglass">{data.applications.actionable} need you</Chip>
            )}
          </div>
          {stages.length === 0 ? (
            <Notice>No applications yet. They appear here the moment a student submits one.</Notice>
          ) : (
            <ul className="space-y-3.5">
              {stages.map((s) => (
                <li key={s} className="grid grid-cols-[minmax(9rem,auto)_1fr_2.25rem] items-center gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name={STAGE_ICON[s]} className="h-4 w-4 flex-none text-ink-2" />
                    {meta?.statuses[s] || s}
                  </span>
                  <span className="meter" data-tone={STAGE_METER[s] || ''}>
                    <i style={{ width: `${Math.round((byStatus[s] / totalAll) * 100)}%` }} />
                  </span>
                  <span className="text-right text-sm tabular-nums text-ink-2">{byStatus[s]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5 sm:p-6" aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-4 text-[1.45rem]">Recent activity</h2>
          {data.recent.length === 0 ? (
            <Notice>Nothing has happened yet. Status changes appear here as they occur.</Notice>
          ) : (
            <ul className="divide-y divide-line">
              {data.recent.map((r, i) => (
                <li key={i} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0">
                  <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${STAGE_CLS[r.to] || 'bg-wash text-ink-2'}`}>
                    <Icon name={STAGE_ICON[r.to] || 'bell'} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">
                      {r.student || 'A student'}
                      <span className="font-normal text-ink-2"> · {r.scholarship || 'a scholarship'}</span>
                    </p>
                    <p className="text-sm leading-snug text-ink-2">
                      {meta?.statuses[r.to] || r.to}{r.note ? ` — ${r.note}` : ''}
                    </p>
                    <p className="text-xs text-ink-2">{formatDateTime(r.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
