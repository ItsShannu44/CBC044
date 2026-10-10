import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import UploadButton from '../components/UploadButton.jsx';
import { useToast } from '../components/toast.jsx';
import { Bead, Chip, Spinner, DaysLeft, Deadline, LoadError, Loading, Monogram, Notice, OcrChip, OcrDetails, StatusBadge, StatusTimeline, Tabs } from '../components/ui.jsx';
import { api, openDocument } from '../lib/api.js';
import { formatDate, formatDateTime, inr } from '../lib/format.js';
import { ruleTags } from '../lib/insights.js';
import { useLoad, useSession } from '../lib/session.jsx';

const RESULT_TEXT = {
  ELIGIBLE: { title: 'You qualify', tone: 'text-pass', chip: { tone: 'pass', label: 'Eligible' } },
  PARTIAL: { title: 'You are close, but not eligible yet', tone: 'text-thread-deep', chip: { tone: 'warn', label: 'Partially eligible' } },
  NOT_ELIGIBLE: { title: 'This one is not a match', tone: 'text-miss', chip: { tone: 'miss', label: 'Not eligible' } },
};

const TAB_KEYS = ['overview', 'eligibility', 'documents', 'dates'];
const SAVED_KEY = 'vidyasutra.saved';

// Bookmarks are a per-browser convenience, so they live in local storage.
function useSaved(id) {
  const read = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; } };
  const [list, setList] = useState(read);
  const saved = list.includes(String(id));
  const toggle = () => {
    const next = saved ? list.filter((x) => x !== String(id)) : [...list, String(id)];
    setList(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  return [saved, toggle];
}

export function ocrToast(toast, ocr, label) {
  if (!ocr) return;
  if (ocr.mismatches > 0) {
    const first = ocr.checks.find((c) => c.status === 'mismatch');
    toast({ tone: 'warn', title: `${label}: a value does not match`, message: first?.message });
  } else if (ocr.status === 'read') {
    toast({ tone: 'good', title: `${label} uploaded`, message: 'The document was read automatically and its values match your profile.' });
  } else {
    toast({ tone: 'info', title: `${label} uploaded`, message: ocr.note });
  }
}

export function Checklist({ checklist, canUpload, onChange }) {
  const toast = useToast();
  const [error, setError] = useState(null);
  const mandatory = checklist.filter((c) => c.mandatory);
  const ready = mandatory.filter((c) => c.document && c.review?.status !== 'REJECTED').length;
  return (
    <>
      <p className="mb-3 text-ink-2">
        {mandatory.length === 0 ? 'No documents are required.' : `${ready} of ${mandatory.length} required documents ready.`}
      </p>
      {mandatory.length > 0 && (
        <div className="meter mb-4" data-tone={ready === mandatory.length ? '' : 'warn'} role="progressbar" aria-valuenow={ready} aria-valuemin={0} aria-valuemax={mandatory.length} aria-label="Required documents ready">
          <i style={{ width: `${(ready / mandatory.length) * 100}%` }} />
        </div>
      )}
      {error && <Notice tone="error" className="mb-3">{error}</Notice>}
      <ul className="divide-y divide-line">
        {checklist.map((item) => {
          const rejected = item.review?.status === 'REJECTED';
          return (
            <li key={item.docType} className="py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold leading-snug">
                    {item.label}
                    {!item.mandatory && <span className="font-normal text-ink-2">(optional)</span>}
                    {item.document && <OcrChip ocr={item.document.ocr} />}
                  </p>
                  {item.document ? (
                    <p className="text-ink-2">
                      <button type="button" className="underline underline-offset-4 hover:text-ink" onClick={() => openDocument(item.document.id).catch((e) => setError(e.message))}>
                        {item.document.fileName}
                      </button>
                      , uploaded {formatDate(item.document.uploadedAt)}
                    </p>
                  ) : (
                    <p className={item.mandatory ? 'text-miss' : 'text-ink-2'}>{item.mandatory ? 'Missing' : 'Not uploaded'}</p>
                  )}
                  {rejected && <p className="text-miss">Not accepted: {item.review.reason}</p>}
                  {item.review?.status === 'VERIFIED' && <p className="text-pass">Verified by the reviewer</p>}
                </div>
                {canUpload && item.review?.status !== 'VERIFIED' && (
                  <UploadButton docType={item.docType} label={item.label} replace={Boolean(item.document) && !rejected}
                    onDone={(res) => { ocrToast(toast, res?.document?.ocr, item.label); onChange(); }} />
                )}
              </div>
              {item.document && <OcrDetails ocr={item.document.ocr} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function ScholarshipDetail() {
  const { id } = useParams();
  const { meta } = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = (t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const [saved, toggleSaved] = useSaved(id);
  const { data, error, loading, reload } = useLoad(() => api(`/scholarships/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (loading && !data) return <Loading variant="detail" />;
  if (error) return <LoadError error={error} retry={reload} back={{ to: '/scholarships', label: 'Back to scholarships' }} />;

  const { scholarship: s, match, checklist, application } = data;
  const status = application?.status;
  const missingDocs = checklist.filter((c) => c.mandatory && !c.document);
  const rejectedDocs = checklist.filter((c) => c.review?.status === 'REJECTED');
  const failed = match.checks.filter((c) => c.mandatory && c.status !== 'pass');
  const verdict = RESULT_TEXT[match.result];

  async function act(path, body, done) {
    setBusy(true);
    setActionError(null);
    try {
      await api(path, { method: 'POST', body });
      done?.();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
      reload();
    }
  }

  // What the student can do next, and if nothing, the reason in plain words.
  let action = null;
  if (!application) {
    if (s.closed) action = <Notice>The deadline passed on {formatDate(s.deadline)}. Applications are closed.</Notice>;
    else if (!match.canApply) {
      action = (
        <Notice tone="warn">
          You can apply once you meet {failed.length === 1 ? 'this rule' : 'these rules'}:
          <ul className="mt-1 list-disc pl-5">{failed.map((f, i) => <li key={i}>{f.rule}</li>)}</ul>
          {match.missingFields.length > 0 && <Link to="/profile" className="btn btn-quiet btn-small mt-2">Complete your profile</Link>}
        </Notice>
      );
    } else {
      action = (
        <button className="btn btn-primary" disabled={busy}
          onClick={() => act('/applications', { scholarshipId: s.id }, () => toast({ tone: 'good', title: 'Application started', message: 'Upload the required documents, then submit.' }))}>
          {busy ? <Spinner /> : <Icon name="plus" className="h-4 w-4" />}
          Start application
        </button>
      );
    }
  } else if (status === 'DRAFT') {
    action = (
      <>
        <button className="btn btn-primary" disabled={busy || missingDocs.length > 0}
          onClick={() => act(`/applications/${application.id}/submit`, undefined, () => toast({ tone: 'good', title: 'Application submitted', message: 'A reviewer will look at it and you will be alerted.' }))}>
          {busy ? <Spinner /> : <Icon name="send" className="h-4 w-4" />}
          Submit application
        </button>
        {missingDocs.length > 0 && (
          <p className="mt-2 text-miss">
            Still needed before you can submit: {missingDocs.map((d) => d.label).join(', ')}.
          </p>
        )}
      </>
    );
  } else if (status === 'DOCUMENTS_PENDING') {
    action = (
      <>
        <button className="btn btn-primary" disabled={busy || rejectedDocs.length > 0 || missingDocs.length > 0}
          onClick={() => act(`/applications/${application.id}/resubmit`, undefined, () => toast({ tone: 'good', title: 'Sent back for review', message: 'The reviewer will take another look.' }))}>
          {busy ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />}
          Send back for review
        </button>
        {rejectedDocs.length > 0 && (
          <p className="mt-2 text-miss">Upload a new file for: {rejectedDocs.map((d) => d.label).join(', ')}.</p>
        )}
      </>
    );
  }

  const canUpload = !application ? !s.closed : ['DRAFT', 'DOCUMENTS_PENDING'].includes(status);

  const passCount = match.checks.filter((c) => c.status === 'pass').length;
  const docsReady = checklist.filter((c) => c.mandatory && c.document && c.review?.status !== 'REJECTED').length;
  const docsNeeded = checklist.filter((c) => c.mandatory).length;
  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'eligibility', label: 'Eligibility criteria', count: `${passCount}/${match.checks.length}` },
    { key: 'documents', label: 'Required documents', count: `${docsReady}/${docsNeeded}` },
    { key: 'dates', label: 'Important dates' },
  ];
  const scoreTone = match.result === 'ELIGIBLE' ? 'text-pass bg-pass-soft border-pass/30' : match.result === 'PARTIAL' ? 'text-thread-deep bg-thread-soft border-thread/40' : 'text-miss bg-miss-soft border-miss/30';

  const nextStep = (
    <section className="panel p-5">
      <h3 className="mb-2 text-[1.02rem]">Your next step</h3>
      {actionError && <Notice tone="error" className="mb-3">{actionError}</Notice>}
      {action || (
        <p className="flex items-center gap-2 text-[0.92rem] text-ink-2"><Icon name="circleClock" className="h-4 w-4 text-brand" />Nothing to do right now. You will get an alert when the status changes.</p>
      )}
      {application && tab !== 'documents' && (
        <button type="button" className="mt-3 text-[0.88rem] font-bold text-brand hover:text-brand-deep" onClick={() => setTab('documents')}>Go to documents →</button>
      )}
    </section>
  );

  return (
    <>
      <Link to="/scholarships" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand no-underline hover:text-brand-deep">
        <Icon name="arrowLeft" className="h-4 w-4" />Back to results
      </Link>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-5 sm:p-6">
          <Monogram text={s.provider} className="h-14 w-14 text-[1.1rem]" />
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.5rem] sm:text-[1.8rem]">{s.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.92rem] text-ink-2">
              {s.provider}
              <Chip tone={verdict.chip.tone} icon={verdict.chip.tone === 'pass' ? 'circleCheck' : verdict.chip.tone === 'warn' ? 'circleAlert' : 'circleX'}>{verdict.chip.label}</Chip>
              {application && <StatusBadge status={status} />}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="text-[1.25rem] font-extrabold text-brand">{inr(s.amount)}</span>
              <span className="text-[0.92rem]"><Deadline scholarship={s} /></span>
            </p>
          </div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className={`rounded-2xl border px-5 py-3 text-center ${scoreTone}`}>
            <span className="block text-[2rem] font-extrabold leading-none">{match.score}%</span>
            <span className="text-[0.8rem] font-bold">Your match</span>
          </motion.div>
        </div>
        <div className="px-3 sm:px-4"><Tabs tabs={TABS} value={tab} onChange={setTab} label="Scholarship sections" /></div>
      </section>

      <motion.div key={tab} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
        className={`mt-5 grid grid-cols-1 items-start gap-5 ${tab === 'documents' && !application ? '' : 'lg:grid-cols-[1.5fr_1fr]'}`}>
        {tab === 'overview' && (
          <>
            <section className="panel p-5 sm:p-6">
              <h2 className={`text-[1.2rem] ${verdict.tone}`}>{verdict.title}</h2>
              <p className="mt-1 text-ink-2">
                {match.mandatoryTotal === 0 ? 'There are no mandatory rules.' : `You meet ${match.mandatoryPassed} of ${match.mandatoryTotal} mandatory rules.`}
              </p>
              {s.description && <p className="mt-4">{s.description}</p>}
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ['Award amount', inr(s.amount)],
                  ['Deadline', formatDate(s.deadline)],
                  ['Documents', `${docsNeeded} required`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-wash px-3.5 py-2.5"><dt className="text-[0.78rem] font-bold uppercase tracking-wide text-ink-2">{k}</dt><dd className="font-bold">{v}</dd></div>
                ))}
              </dl>
              {ruleTags(s, 6).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">{ruleTags(s, 6).map((t) => <span key={t} className="rounded-md bg-wash px-2 py-0.5 text-[0.8rem] font-semibold text-ink-2">{t}</span>)}</div>
              )}
              <button type="button" onClick={() => setTab('eligibility')} className="mt-5 text-[0.9rem] font-bold text-brand hover:text-brand-deep">See every rule and why →</button>
            </section>
            <div className="space-y-5">{nextStep}</div>
          </>
        )}

        {tab === 'eligibility' && (
          <>
            <section className="panel overflow-hidden" aria-labelledby="why">
              <div className="px-5 pt-5 sm:px-6">
                <h2 id="why" className="text-[1.15rem]">Eligibility criteria</h2>
                <p className="mt-0.5 text-[0.9rem] text-ink-2">Each rule is checked against your profile and explained.</p>
              </div>
              {match.checks.length === 0 ? <p className="hint p-5">This scholarship has no eligibility rules. Anyone can apply.</p> : (
                <ul className="mt-3 divide-y divide-line">
                  {match.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                      <span className="relative mt-0.5 h-[1.32rem] w-[1.32rem] flex-none"><Bead status={c.status} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-snug">{c.rule}{!c.mandatory && <span className="ml-2 text-[0.82rem] font-normal text-ink-2">(preferred)</span>}</span>
                        <span className={`block text-[0.88rem] ${c.status === 'fail' ? 'text-miss' : 'text-ink-2'}`}>{c.reason}</span>
                      </span>
                      <span className="chip" data-tone={c.status === 'pass' ? 'pass' : c.status === 'fail' ? 'miss' : 'warn'}>
                        {c.status === 'pass' ? 'Pass' : c.status === 'fail' ? 'Fail' : 'Unknown'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="space-y-5">
              {match.missingFields.length > 0 && (
                <div className="guide p-4 text-[0.9rem]">
                  <p className="font-bold">Some rules cannot be checked yet</p>
                  <p className="mt-1">Add your {match.missingFields.map((f) => meta.fields[f]?.label.toLowerCase() || f).join(', ')} to your profile.</p>
                  <Link to="/profile" className="btn btn-primary btn-small mt-2">Complete profile</Link>
                </div>
              )}
              {nextStep}
            </div>
          </>
        )}

        {tab === 'documents' && (
          <>
            <section className="panel p-5 sm:p-6" aria-labelledby="docs">
              <h2 id="docs" className="mb-2 text-[1.15rem]">Required documents</h2>
              <Checklist checklist={checklist} canUpload={canUpload} onChange={reload} />
              <div className="mt-4 border-t border-line pt-4">
                {actionError && <Notice tone="error" className="mb-3">{actionError}</Notice>}
                {action}
              </div>
            </section>
            <div className="space-y-5">
              {application && (
                <section className="panel p-5">
                  <h3 className="mb-4 text-[1.02rem]">Application status</h3>
                  <StatusTimeline history={application.history} />
                </section>
              )}
            </div>
          </>
        )}

        {tab === 'dates' && (
          <>
            <section className="panel p-5 sm:p-6">
              <h2 className="mb-4 text-[1.15rem]">Important dates</h2>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 rounded-xl bg-wash px-4 py-3">
                  <span className="soft-icon" data-tone={s.closed ? 'red' : 'gold'}><Icon name="calendar" /></span>
                  <span className="flex-1"><span className="block font-bold">Application deadline</span><span className="text-[0.88rem] text-ink-2">{formatDate(s.deadline)} (India time)</span></span>
                  <DaysLeft scholarship={s} />
                </li>
                {application?.submittedAt && (
                  <li className="flex items-center gap-3 rounded-xl bg-wash px-4 py-3">
                    <span className="soft-icon" data-tone="teal"><Icon name="send" /></span>
                    <span className="flex-1"><span className="block font-bold">You submitted</span><span className="text-[0.88rem] text-ink-2">{formatDateTime(application.submittedAt)}</span></span>
                  </li>
                )}
                {!s.closed && (
                  <li className="flex items-center gap-3 rounded-xl bg-wash px-4 py-3">
                    <span className="soft-icon" data-tone="blue"><Icon name="bell" /></span>
                    <span className="flex-1"><span className="block font-bold">Reminders</span><span className="text-[0.88rem] text-ink-2">You will be alerted 7, 3 and 1 days before the deadline.</span></span>
                  </li>
                )}
              </ul>
            </section>
            <div className="space-y-5">
              {application ? (
                <section className="panel p-5"><h3 className="mb-4 text-[1.02rem]">Application timeline</h3><StatusTimeline history={application.history} /></section>
              ) : nextStep}
            </div>
          </>
        )}
      </motion.div>

      <div className="sticky bottom-3 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper/90 py-3 pl-4 pr-4 xs:pr-20 shadow-[0_18px_40px_-24px_rgba(6,31,34,.6)] backdrop-blur-md">
        <span />
        <span className="flex gap-2">
          <button type="button" className="btn btn-quiet btn-small" onClick={toggleSaved} aria-pressed={saved}>
            <Icon name="bookmark" className={`h-4 w-4 ${saved ? 'fill-current text-thread' : ''}`} />{saved ? 'Saved' : 'Save for later'}
          </button>
          {tab !== 'documents' && (canUpload || application) && (
            <button type="button" className="btn btn-primary btn-small" onClick={() => setTab('documents')}>
              {application ? 'Continue application' : match.canApply ? 'Apply now' : 'View documents'}
            </button>
          )}
        </span>
      </div>
    </>
  );
}
