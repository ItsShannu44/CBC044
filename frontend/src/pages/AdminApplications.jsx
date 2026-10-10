import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { useToast } from '../components/toast.jsx';
import {
  LoadError, Loading, Notice, OcrChip, OcrDetails, PageHead, RuleThread, ScoreRing, StatusBadge, StatusTimeline,
} from '../components/ui.jsx';
import { api, openDocument } from '../lib/api.js';
import { formatDate, formatDateTime, inr } from '../lib/format.js';
import { useLoad, useSession } from '../lib/session.jsx';

const FILTERS = ['', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'APPROVED', 'REJECTED'];

export function AdminApplications() {
  const { meta } = useSession();
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useLoad(() => api(`/admin/applications${status ? `?status=${status}` : ''}`), [status]);

  return (
    <>
      <PageHead title="Applications" lede="Verify documents and decide." />
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter applications by stage">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setStatus(f)} aria-pressed={status === f}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${status === f ? 'bg-brand text-white' : 'bg-wash text-ink-2 hover:text-ink'}`}>
            {f ? meta?.statuses[f] || f : 'All'}
          </button>
        ))}
      </div>
      {error && <LoadError error={error} retry={reload} />}
      {loading && !data && <Loading variant="list" />}
      {data && (data.applications.length === 0 ? (
        <Notice>No applications here yet.</Notice>
      ) : (
        <ul className="panel overflow-hidden">
          {data.applications.map((a) => (
            <li key={a.id} className="border-t border-line first:border-t-0">
              <Link to={`/admin/applications/${a.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 no-underline hover:bg-wash sm:px-5">
                <span className="flex items-center gap-3.5">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-wash text-brand">
                    <Icon name="user" className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-[1.1rem] font-semibold">{a.student.name}</span>
                    <span className="text-ink-2">
                      {a.scholarship.name}{a.submittedAt ? ` · submitted ${formatDate(a.submittedAt)}` : ''}
                    </span>
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </>
  );
}

const MOVE_LABEL = { UNDER_REVIEW: 'Start review', APPROVED: 'Approve', REJECTED: 'Reject' };
const MOVE_ICON = { UNDER_REVIEW: 'eye', APPROVED: 'circleCheck', REJECTED: 'circleX' };
const MOVE_TOAST = {
  UNDER_REVIEW: { tone: 'info', title: 'Review started' },
  APPROVED: { tone: 'good', title: 'Application approved', message: 'The student has been told the good news.' },
  REJECTED: { tone: 'warn', title: 'Application rejected', message: 'The student has been told why.' },
};

export function AdminReview() {
  const { id } = useParams();
  const { meta } = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api(`/admin/applications/${id}`), [id]);
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(null); // docType being rejected
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading variant="list" />;
  if (error) return <LoadError error={error} retry={reload} />;
  const { application, student, profile, scholarship, match, checklist } = data;
  const reviewable = ['SUBMITTED', 'UNDER_REVIEW'].includes(application.status);

  async function post(path, body, after) {
    setBusy(true);
    setProblem(null);
    try {
      await api(path, { method: 'POST', body });
      after?.();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(false);
      reload();
    }
  }

  return (
    <>
      <PageHead title={student.name} back={{ to: '/admin/applications', label: 'the queue' }}>
        <StatusBadge status={application.status} />
      </PageHead>

      <div className="hero mb-7 flex flex-wrap items-center justify-between gap-x-10 gap-y-5 p-6 sm:p-8">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight text-white">{scholarship.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-white/75">
            <span className="font-semibold text-thread">{inr(scholarship.amount)}</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="mail" className="h-4 w-4" />{student.email}</span>
            {application.submittedAt && <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4" />Submitted {formatDateTime(application.submittedAt)}</span>}
          </p>
          <p className="mt-2 text-sm text-white/60">
            Eligibility checked just now: {match.mandatoryPassed} of {match.mandatoryTotal} mandatory rules met.
          </p>
        </div>
        <ScoreRing score={match.score} result={match.result} className="h-24 w-24 flex-none" dark />
      </div>

      {problem && <Notice tone="error" className="mb-5">{problem}</Notice>}

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="rules-h">
            <div className="mb-4 flex items-center gap-3">
              <span className="tile" data-tone="teal"><Icon name="sliders" /></span>
              <h2 id="rules-h" className="text-[1.45rem]">Eligibility, checked just now</h2>
            </div>
            <RuleThread checks={match.checks.map((c) => ({ ...c, reason: c.reason.replace(/^Your /, 'Their ').replace(' so you are ', ' so they are ') }))} />
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="profile-h">
            <div className="mb-3 flex items-center gap-3">
              <span className="tile" data-tone="navy"><Icon name="user" /></span>
              <h2 id="profile-h" className="text-[1.45rem]">Profile as entered</h2>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
              {Object.entries(meta.fields).map(([key, def]) => {
                const v = profile?.[key];
                const shown = v === null || v === undefined ? 'Not given' : def.type === 'currency' ? inr(v) : def.type === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
                return (
                  <div key={key} className="contents">
                    <dt className="text-ink-2">{def.label}</dt>
                    <dd className={`font-semibold ${shown === 'Not given' ? 'font-normal text-wait' : ''}`}>{shown}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="docs-h">
            <div className="mb-2 flex items-center gap-3">
              <span className="tile" data-tone="orange"><Icon name="folder" /></span>
              <h2 id="docs-h" className="text-[1.45rem]">Documents</h2>
            </div>
            <ul className="divide-y divide-line">
              {checklist.map((item) => (
                <li key={item.docType} className="py-3.5 first:pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold leading-snug">
                        {item.label}
                        {!item.mandatory && <span className="font-normal text-ink-2">(optional)</span>}
                        {item.document && <OcrChip ocr={item.document.ocr} />}
                      </p>
                      {item.document ? (
                        <button type="button" className="mt-0.5 text-ink-2 underline underline-offset-4 hover:text-ink" onClick={() => openDocument(item.document.id).catch((e) => setProblem(e.message))}>
                          Open {item.document.fileName}
                        </button>
                      ) : (
                        <p className="mt-0.5 text-ink-2">Not uploaded</p>
                      )}
                      {item.review?.status === 'VERIFIED' && (
                        <p className="mt-1 flex items-center gap-1 text-pass"><Icon name="circleCheck" className="h-4 w-4" />Verified</p>
                      )}
                      {item.review?.status === 'REJECTED' && (
                        <p className="mt-1 flex items-center gap-1 text-miss"><Icon name="circleX" className="h-4 w-4" />Rejected: {item.review.reason}</p>
                      )}
                    </div>
                    {reviewable && item.review && item.review.status !== 'VERIFIED' && rejecting !== item.docType && (
                      <span className="flex gap-2">
                        <button className="btn btn-quiet btn-small" disabled={busy}
                          onClick={() => post(`/admin/applications/${id}/documents/${item.docType}`, { status: 'VERIFIED' },
                            () => toast({ tone: 'good', title: `${item.label} verified` }))}>
                          Verify<span className="sr-only"> {item.label}</span>
                        </button>
                        <button className="btn btn-danger btn-small" disabled={busy} onClick={() => { setRejecting(item.docType); setReason(''); }}>
                          Reject<span className="sr-only"> {item.label}</span>
                        </button>
                      </span>
                    )}
                  </div>
                  {item.document && <OcrDetails ocr={item.document.ocr} />}
                  {rejecting === item.docType && (
                    <form className="mt-3 rounded-lg border border-miss/40 bg-miss-soft/50 p-3" onSubmit={(e) => { e.preventDefault(); post(`/admin/applications/${id}/documents/${item.docType}`, { status: 'REJECTED', reason }, () => { setRejecting(null); toast({ tone: 'warn', title: `${item.label} sent back`, message: 'The student has been asked to upload a new file.' }); }); }}>
                      <label className="label" htmlFor="reason">What is wrong with this document?</label>
                      <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={250} autoFocus />
                      <p className="hint mt-1">The student sees this and is asked to upload a new file.</p>
                      <div className="mt-2 flex gap-2">
                        <button className="btn btn-danger btn-small" disabled={busy}>Reject and send back</button>
                        <button type="button" className="btn btn-quiet btn-small" onClick={() => setRejecting(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {application.allowedMoves.length > 0 && (
            <section className="panel p-5 sm:p-6" aria-labelledby="decide-h">
              <div className="mb-3 flex items-center gap-3">
                <span className="tile" data-tone="blue"><Icon name="send" /></span>
                <h2 id="decide-h" className="text-[1.45rem]">Decision</h2>
              </div>
              <label className="label" htmlFor="note">Note to the student</label>
              <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} aria-describedby="note-hint" />
              <p className="hint mt-1" id="note-hint">Required when you reject.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {application.allowedMoves.map((to) => (
                  <button key={to} className={`btn ${to === 'REJECTED' ? 'btn-danger' : 'btn-primary'}`} disabled={busy}
                    onClick={() => post(`/admin/applications/${id}/status`, { to, note }, () => { setNote(''); toast(MOVE_TOAST[to]); })}>
                    <Icon name={MOVE_ICON[to]} className="h-4 w-4" />
                    {MOVE_LABEL[to]}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="panel p-5 sm:p-6" aria-labelledby="history-h">
            <div className="mb-4 flex items-center gap-3">
              <span className="tile" data-tone="yellow"><Icon name="clock" /></span>
              <h2 id="history-h" className="text-[1.45rem]">History</h2>
            </div>
            <StatusTimeline history={application.history} />
          </section>
        </div>
      </div>
    </>
  );
}
