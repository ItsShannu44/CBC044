// The three simpler student screens: applications, document vault and alerts.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import UploadButton from '../components/UploadButton.jsx';
import { useToast } from '../components/toast.jsx';
import { Chip, Deadline, LoadError, Loading, Monogram, Notice, OcrChip, PageHead, StatusBadge } from '../components/ui.jsx';
import { documentNeeds } from '../lib/insights.js';
import { ocrToast } from './ScholarshipDetail.jsx';
import { api, documentUrl, openDocument } from '../lib/api.js';
import { fileSize, formatDate, formatDateTime, inr } from '../lib/format.js';
import { useLoad, useSession } from '../lib/session.jsx';

const FLOW = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];
const FLOW_LABEL = ['Draft', 'Submitted', 'Under review', 'Decision'];

function Flow({ status }) {
  const at = status === 'DOCUMENTS_PENDING' ? 2 : ['APPROVED', 'REJECTED'].includes(status) ? 3 : Math.max(0, FLOW.indexOf(status));
  const bad = ['REJECTED', 'EXPIRED', 'DOCUMENTS_PENDING'].includes(status);
  return (
    <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Progress">
      {FLOW_LABEL.map((l, i) => (
        <li key={l}>
          <span className={`block h-1.5 rounded-full ${i < at ? 'bg-brand' : i === at ? (bad ? 'bg-miss' : status === 'APPROVED' ? 'bg-pass' : 'bg-thread') : 'bg-wash'}`} />
          <span className={`mt-1 block text-[0.7rem] ${i <= at ? 'font-bold text-ink' : 'text-ink-2'}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function Applications() {
  const { data, error, loading, reload } = useLoad(() => api('/applications'));
  const [filter, setFilter] = useState('all');
  if (loading && !data) return <Loading variant="list" />;
  if (error) return <LoadError error={error} retry={reload} />;
  const apps = data.applications;
  const isActive = (a) => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING'].includes(a.status);
  const moving = apps.filter(isActive).length;
  const shown = apps.filter((a) => filter === 'all' || (filter === 'active' ? isActive(a) : !isActive(a)));

  return (
    <>
      <PageHead title="Applications" lede="">
        {apps.length > 0 && (
          <div className="seg" role="group" aria-label="Filter applications">
            {[['all', `All (${apps.length})`], ['active', `In progress (${moving})`], ['done', `Finished (${apps.length - moving})`]].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        )}
      </PageHead>
      {apps.length === 0 ? (
        <div className="panel grid place-items-center gap-3 px-6 py-12 text-center">
          <span className="soft-icon !h-14 !w-14" data-tone="teal"><Icon name="scroll" className="!h-7 !w-7" /></span>
          <p className="text-[1.1rem] font-bold">You have not started an application yet</p>
          <p className="text-ink-2">Find a scholarship you qualify for and start in one click.</p>
          <Link to="/scholarships" className="btn btn-primary">See the scholarships you qualify for</Link>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((a, i) => (
            <motion.li key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/scholarships/${a.scholarship.id}?tab=documents`} className="panel block p-4 no-underline transition-shadow hover:shadow-[0_20px_40px_-28px_rgba(6,31,34,.6)] sm:p-5">
                <span className="flex items-start gap-3">
                  <Monogram text={a.scholarship.provider} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-snug">{a.scholarship.name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-[0.85rem] text-ink-2">
                      <span className="font-bold text-brand">{inr(a.scholarship.amount)}</span>
                      {a.status === 'DRAFT' ? <Deadline scholarship={a.scholarship} /> : <span>Updated {formatDate(a.updatedAt)}</span>}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <StatusBadge status={a.status} />
                    {a.status === 'DOCUMENTS_PENDING' && <Chip tone="miss" icon="alert">Action needed</Chip>}
                  </span>
                </span>
                <Flow status={a.status} />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Document centre ----------

function docState(doc, need) {
  if (!doc) return need ? { tone: 'miss', label: 'Missing' } : { tone: 'plain', label: 'Not required' };
  if (doc.ocr?.mismatches > 0) return { tone: 'miss', label: 'Mismatch' };
  if (doc.ocr?.status === 'read') return { tone: 'pass', label: 'OCR matched' };
  if (doc.ocr?.status === 'unreadable') return { tone: 'warn', label: 'Unreadable' };
  return { tone: 'warn', label: 'Pending review' };
}

function Modal({ title, onClose, children, wide = false }) {
  const box = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-deep/60 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.97 }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
        className={`max-h-[92vh] w-full overflow-auto rounded-2xl bg-paper shadow-2xl outline-none ${wide ? 'max-w-[62rem]' : 'max-w-[28rem]'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-3.5">
          <h2 className="text-[1.1rem]">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-wash"><Icon name="x" /><span className="sr-only">Close</span></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const OCR_ROW = {
  match: { icon: 'circleCheck', cls: 'text-pass', label: 'Matches profile' },
  mismatch: { icon: 'circleX', cls: 'text-miss', label: 'Possible mismatch' },
  not_found: { icon: 'circleAlert', cls: 'text-wait', label: 'Not found on document' },
  not_checked: { icon: 'info', cls: 'text-brand', label: 'Not checked' },
};

// Side-by-side review of one document: the file itself and what the scanner extracted.
function ReviewDocument({ doc, onClose, onReplaced }) {
  const toast = useToast();
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    let live = true;
    let made = null;
    documentUrl(doc.id).then((u) => { made = u; if (live) setUrl(u); else URL.revokeObjectURL(u); }).catch((e) => live && setFailed(e.message));
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [doc.id]);
  const ocr = doc.ocr;
  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <Modal title="Review extracted information" onClose={onClose} wide>
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.1fr]">
        <section>
          <h3 className="mb-2 text-[0.95rem]">Uploaded document</h3>
          <div className="grid aspect-[3/4] place-items-center overflow-hidden rounded-xl border border-line bg-wash">
            {failed ? <p className="p-4 text-center text-miss">{failed}</p> : !url ? <span className="spin h-6 w-6 rounded-full border-[3px] border-line border-t-brand" /> :
              isPdf ? <iframe title={doc.fileName} src={url} className="h-full w-full" /> : <img src={url} alt={doc.label} className="h-full w-full object-contain" />}
          </div>
          <p className="mt-2 truncate text-[0.82rem] text-ink-2">{doc.fileName} · {fileSize(doc.size)} · uploaded {formatDate(doc.uploadedAt)}</p>
        </section>
        <section className="flex flex-col">
          <h3 className="mb-2 flex items-center justify-between gap-2 text-[0.95rem]">Extracted information (OCR) <OcrChip ocr={ocr} /></h3>
          {!ocr || ocr.status !== 'read' ? (
            <div className="guide p-4 text-[0.9rem]">
              <p className="font-bold">{ocr?.status === 'unreadable' ? 'The scanner could not read this file' : 'Checked manually'}</p>
              <p className="mt-1">{ocr?.note || 'This document type is confirmed by the reviewer by hand.'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {ocr.checks.length === 0 && <li className="p-4 text-ink-2">Nothing on this document type is compared automatically.</li>}
              {ocr.checks.map((c) => {
                const r = OCR_ROW[c.status] || OCR_ROW.not_checked;
                return (
                  <li key={c.field} className={`flex items-start gap-3 px-4 py-3 ${c.status === 'mismatch' ? 'bg-miss-soft/60' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.78rem] font-bold uppercase tracking-wide text-ink-2">{c.label}</span>
                      {c.status === 'mismatch' ? (
                        <span className="mt-0.5 grid grid-cols-2 gap-2 text-[0.9rem]">
                          <span><span className="block text-[0.72rem] text-ink-2">On document</span><strong className="text-miss">{c.docValue}</strong></span>
                          <span><span className="block text-[0.72rem] text-ink-2">In your profile</span><strong>{c.profileValue}</strong></span>
                        </span>
                      ) : <span className="block text-[0.9rem]">{c.message}</span>}
                      <span className={`mt-0.5 block text-[0.75rem] font-semibold ${r.cls}`}>{r.label}</span>
                    </span>
                    <Icon name={r.icon} className={`mt-1 h-5 w-5 flex-none ${r.cls}`} />
                  </li>
                );
              })}
            </ul>
          )}
          {ocr?.excerpt && (
            <details className="mt-3 text-[0.85rem]">
              <summary className="cursor-pointer font-semibold text-ink-2">What the scanner read</summary>
              <p className="mt-1 max-h-32 overflow-auto break-words rounded-lg bg-wash p-2 font-mono text-xs text-ink-2">{ocr.excerpt}</p>
            </details>
          )}
          <p className="mt-3 text-[0.82rem] text-ink-2">
            {ocr?.mismatches > 0 ? 'If your profile is wrong, correct it. If the file is wrong, upload the right one.' : 'Please verify the extracted information. Edit your profile if anything is wrong.'}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-4">
            <Link to="/profile" className="btn btn-quiet btn-small"><Icon name="pencil" className="h-4 w-4" />Edit profile</Link>
            <UploadButton docType={doc.docType} label={doc.label} replace
              onDone={(res) => { ocrToast(toast, res?.document?.ocr, doc.label); onReplaced(); }} />
            <button type="button" className="btn btn-primary btn-small" onClick={() => { toast({ tone: 'good', title: `${doc.label} confirmed` }); onClose(); }}>
              <Icon name="check" className="h-4 w-4" />Confirm
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

export function Documents() {
  const { meta } = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => Promise.all([api('/documents'), api('/matches').catch(() => null)]).then(([d, m]) => ({ ...d, matches: m })));
  const [openError, setOpenError] = useState(null);
  const [tab, setTab] = useState('all');
  const [reviewing, setReviewing] = useState(null);
  const [picking, setPicking] = useState(false);
  const [pickType, setPickType] = useState('');
  if (loading && !data) return <Loading variant="list" />;
  if (error) return <LoadError error={error} retry={reload} />;

  const byType = new Map(data.documents.map((d) => [d.docType, d]));
  const needs = documentNeeds(data.matches?.items || []);
  const types = Object.entries(meta.docTypes);
  const uploaded = types.filter(([t]) => byType.has(t)).length;
  const pct = types.length ? Math.round((uploaded / types.length) * 100) : 0;
  const required = types.filter(([t]) => needs.get(t)?.relevant.length);
  const attention = types.filter(([t]) => { const d = byType.get(t); return d && (d.ocr?.mismatches > 0 || d.ocr?.status !== 'read'); });
  const missingRequired = required.filter(([t]) => !byType.has(t));
  const TABS = [
    ['all', `All documents (${types.length})`],
    ['required', `Required (${required.length})`],
    ['uploaded', `Uploaded (${uploaded})`],
    ['attention', `Pending (${attention.length})`],
  ];
  const list = { all: types, required, uploaded: types.filter(([t]) => byType.has(t)), attention }[tab];
  const reviewDoc = reviewing && byType.get(reviewing);

  return (
    <>
      <PageHead title="My documents" lede="Upload once, reused everywhere.">
        <button type="button" className="btn btn-primary" onClick={() => { setPickType(missingRequired[0]?.[0] || types[0]?.[0] || ''); setPicking(true); }}>
          <Icon name="plus" className="h-4 w-4" />Upload document
        </button>
      </PageHead>

      {openError && <Notice tone="error" className="mb-4">{openError}</Notice>}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_19rem]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="seg" role="group" aria-label="Filter documents">
              {TABS.map(([k, l]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
            </div>
          </div>

          {list.length === 0 ? (
            <Notice>{tab === 'attention' ? 'Nothing needs your attention. Every uploaded file matched your profile.' : 'Nothing here yet.'}</Notice>
          ) : (
            <ul className="panel divide-y divide-line">
              {list.map(([docType, label], i) => {
                const doc = byType.get(docType);
                const need = needs.get(docType);
                const st = docState(doc, need?.relevant.length);
                return (
                  <motion.li key={docType} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="soft-icon" data-tone={st.tone === 'pass' ? 'green' : st.tone === 'miss' ? 'red' : st.tone === 'warn' ? 'gold' : 'teal'}><Icon name="file" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-snug">{label}</p>
                        <p className="text-[0.82rem] text-ink-2">
                          {need?.relevant.length ? `Needed by ${need.relevant.length} scholarship${need.relevant.length === 1 ? '' : 's'}` : 'Optional'}
                          {doc && <> · <button type="button" className="max-w-[12rem] truncate align-bottom underline underline-offset-2 hover:text-ink" title={`${doc.fileName}, ${fileSize(doc.size)}`} onClick={() => openDocument(doc.id).catch((e) => setOpenError(e.message))}>{doc.fileName}</button></>}
                        </p>
                      </div>
                      <span className="chip" data-tone={st.tone}>{st.label}</span>
                      <span className="flex gap-2">
                        {doc && <button type="button" className="btn btn-quiet btn-small" onClick={() => setReviewing(docType)}><Icon name="eye" className="h-4 w-4" />Review</button>}
                        <UploadButton docType={docType} label={label} replace={Boolean(doc)}
                          onDone={(res) => { ocrToast(toast, res?.document?.ocr, label); reload(); }} />
                      </span>
                    </div>
                    {doc?.ocr?.mismatches > 0 && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-miss-soft px-3 py-2 text-[0.85rem] text-miss">
                        <Icon name="flag" className="mt-0.5 h-4 w-4 flex-none" />{doc.ocr.checks.find((c) => c.status === 'mismatch')?.message}
                      </p>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <p className="text-[0.85rem] font-bold text-ink-2">Your vault</p>
            <p className="mt-1 text-[2rem] font-extrabold leading-none">{uploaded}<span className="text-[1.1rem] text-ink-2"> / {types.length}</span></p>
            <span className="meter mt-3 block" data-tone={pct < 50 ? 'warn' : ''}><i style={{ width: `${pct}%` }} /></span>
            <p className="mt-3 text-[0.85rem]">
              {missingRequired.length === 0
                ? <span className="font-semibold text-pass">Every document your matches need is uploaded.</span>
                : <span className="font-semibold text-miss">{missingRequired.length} required document{missingRequired.length === 1 ? '' : 's'} missing.</span>}
            </p>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {picking && (
          <Modal title="Upload a document" onClose={() => setPicking(false)}>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="label">Document type</span>
                <select className="input" value={pickType} onChange={(e) => setPickType(e.target.value)}>
                  {types.map(([t, l]) => <option key={t} value={t}>{l}{byType.has(t) ? ' (replace)' : needs.get(t)?.relevant.length ? ' (required)' : ''}</option>)}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="hint">PDF, JPG or PNG, up to 2 MB.</p>
                {pickType && <UploadButton key={pickType} docType={pickType} label={meta.docTypes[pickType]} replace={byType.has(pickType)}
                  onDone={(res) => { ocrToast(toast, res?.document?.ocr, meta.docTypes[pickType]); setPicking(false); reload(); }} />}
              </div>
            </div>
          </Modal>
        )}
        {reviewDoc && <ReviewDocument key={reviewDoc.id + reviewDoc.uploadedAt} doc={reviewDoc} onClose={() => setReviewing(null)} onReplaced={reload} />}
      </AnimatePresence>
    </>
  );
}

const ALERT_META = {
  NEW_MATCH: { icon: 'star', cls: 'bg-thread-soft text-thread-deep' },
  ELIGIBILITY_LOST: { icon: 'circleAlert', cls: 'bg-miss-soft text-miss' },
  DEADLINE: { icon: 'clock', cls: 'bg-thread-soft text-thread-deep' },
  EXPIRED: { icon: 'hourglass', cls: 'bg-wash text-wait' },
  DOCUMENT_MISMATCH: { icon: 'flag', cls: 'bg-miss-soft text-miss' },
  DOCUMENT_REJECTED: { icon: 'circleX', cls: 'bg-miss-soft text-miss' },
  STATUS: { icon: 'send', cls: 'bg-[#dff4f0] text-brand' },
};

export function Alerts() {
  const { data, error, loading, reload } = useLoad(() => api('/notifications'));
  // Opening this page marks everything as read.
  useEffect(() => {
    if (data?.unread) {
      api('/notifications/read', { method: 'POST' })
        .then(() => window.dispatchEvent(new Event('vidyasutra:alerts-changed')))
        .catch(() => {});
    }
  }, [data]);
  if (loading && !data) return <Loading variant="list" />;
  if (error) return <LoadError error={error} retry={reload} />;

  return (
    <>
      <PageHead title="Alerts" lede="" />
      {data.notifications.length === 0 ? (
        <Notice>No alerts yet. You will hear from us when a scholarship matches your profile or a deadline is close.</Notice>
      ) : (
        <ul className="panel max-w-[52rem] divide-y divide-line overflow-hidden">
          {data.notifications.map((n) => {
            const m = ALERT_META[n.type] || { icon: 'bell', cls: 'bg-wash text-ink-2' };
            return (
              <li key={n.id} className={`flex items-start gap-3.5 px-4 py-4 sm:px-5 ${n.read ? '' : 'bg-thread-soft/50'}`}>
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${m.cls}`}>
                  <Icon name={m.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={`leading-snug ${n.read ? '' : 'font-semibold'}`}>{n.message}</p>
                  <p className="mt-0.5 text-sm text-ink-2">
                    {formatDateTime(n.at)}
                    {n.link && (
                      <> · <Link to={n.link} className="font-semibold text-brand hover:text-brand-deep">Open</Link></>
                    )}
                  </p>
                </div>
                {!n.read && <span className="ml-auto mt-1.5 h-2 w-2 flex-none rounded-full bg-thread" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
