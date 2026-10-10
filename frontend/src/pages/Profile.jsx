import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { useToast } from '../components/toast.jsx';
import { LoadError, Loading, Notice, PageHead, Spinner } from '../components/ui.jsx';
import { fieldUsage } from '../lib/insights.js';
import { api } from '../lib/api.js';
import { useLoad, useSession } from '../lib/session.jsx';

export function FieldInput({ name, def, value, onChange, error }) {
  const id = `f-${name}`;
  const describedBy = [def.hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  let control;
  if (def.type === 'enum') {
    control = (
      <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-describedby={describedBy}>
        <option value="">Choose…</option>
        {def.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  } else if (def.type === 'boolean') {
    control = (
      <select id={id} className="input" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value === 'true')} aria-describedby={describedBy}>
        <option value="">Choose…</option>
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  } else {
    control = (
      <input id={id} className="input" type="number" inputMode="decimal" min={def.min} max={def.max} step={def.step ?? 'any'}
        value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onWheel={(e) => e.currentTarget.blur()}
        onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
    );
  }
  return (
    <div>
      <label className="label" htmlFor={id}>{def.label}</label>
      {control}
      {def.hint && <p className="hint mt-1" id={`${id}-hint`}>{def.hint}</p>}
      {error && <p className="mt-1 text-miss" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

// The onboarding steps. Fields are placed by name where we know them, and by
// their group otherwise, so a new profile field still shows up somewhere.
const STEP_DEFS = [
  { key: 'academic', title: 'Academic details', icon: 'cap', lede: 'Your course and results, as on your latest marks card.' },
  { key: 'income', title: 'Family & income', icon: 'users', lede: 'Many schemes are means-based or reserved for a category.' },
  { key: 'personal', title: 'Personal information', icon: 'user', lede: 'Used for gender, state and disability-specific schemes.' },
];
const FIELD_STEP = { familyIncome: 'income', category: 'income' };
const stepOf = (name, def) => FIELD_STEP[name] || (def.group === 'Academic' ? 'academic' : def.group === 'Personal' ? 'personal' : def.group);

const isEmpty = (v) => v === null || v === undefined || v === '';

function display(def, v) {
  if (isEmpty(v)) return <span className="text-miss">Not filled</span>;
  if (def.type === 'boolean') return String(v) === 'true' ? 'Yes' : 'No';
  if (def.type === 'currency') return '₹' + Number(v).toLocaleString('en-IN');
  return String(v);
}

// Checks a value before it is sent, so mistakes are caught on the spot.
export function checkField(def, v) {
  if (v === null || v === undefined || v === '') return null;
  if (def.type === 'number' || def.type === 'currency') {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a number.';
    if (def.min !== undefined && n < def.min) return `Must be at least ${def.min}.`;
    if (def.max !== undefined && n > def.max) return `Must be at most ${def.max}.`;
    if (def.step === 1 && !Number.isInteger(n)) return 'Enter a whole number.';
    if (def.type === 'currency' && n > 1e10) return 'That amount looks too large.';
  }
  return null;
}

export default function Profile() {
  const { meta } = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => Promise.all([api('/profile'), api('/matches').catch(() => null)]).then(([p, m]) => ({ ...p, matches: m })));
  const [values, setValues] = useState(null);
  const [saved, setSaved] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [savedAt, setSavedAt] = useState(null);

  // Keep the latest state in a ref so leaving the page can still save it.
  const latest = useRef({ values: null, saved: null });
  latest.current = { values, saved };
  const isDirty = (v, sv) => Boolean(v && sv) && Object.keys(v).some((k) => String(v[k] ?? '') !== String(sv[k] ?? ''));
  const validAll = (v) => Object.entries(meta.fields).every(([k, def]) => !checkField(def, v?.[k]));
  useEffect(() => {
    const warn = (e) => { if (isDirty(latest.current.values, latest.current.saved)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      // Leaving for another page inside the app: save what was typed, if it is valid.
      const { values: v, saved: sv } = latest.current;
      if (isDirty(v, sv) && validAll(v)) api('/profile', { method: 'PUT', body: v }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) {
      const v = Object.fromEntries(Object.keys(meta.fields).map((k) => [k, data.profile?.[k] ?? null]));
      setValues(v);
      setSaved(v);
    }
  }, [data, meta]);

  const steps = useMemo(() => {
    const entries = Object.entries(meta.fields);
    const known = STEP_DEFS.map((d) => ({ ...d, fields: entries.filter(([n, def]) => stepOf(n, def) === d.key).map(([n]) => n) }));
    const extraKeys = [...new Set(entries.map(([n, def]) => stepOf(n, def)))].filter((k) => !STEP_DEFS.some((d) => d.key === k));
    const extra = extraKeys.map((k) => ({ key: k, title: `${k} details`, icon: 'info', lede: '', fields: entries.filter(([n, def]) => stepOf(n, def) === k).map(([n]) => n) }));
    return [...known.filter((d) => d.fields.length), ...extra, { key: 'review', title: 'Review', icon: 'circleCheck', lede: 'Check everything once. Reviewers compare these with your documents.', fields: [] }];
  }, [meta]);

  if (loading && !values) return <Loading variant="form" label="Loading your profile…" />;
  if (error) return <LoadError error={error} retry={reload} />;
  if (!values) return <Loading variant="form" label="Loading your profile…" />;

  const keys = Object.keys(meta.fields);
  const filled = keys.filter((k) => !isEmpty(values[k])).length;
  const completeness = Math.round((filled / keys.length) * 100);
  const dirty = keys.some((k) => String(values[k] ?? '') !== String(saved?.[k] ?? ''));
  const current = steps[step];
  const isReview = current.key === 'review';
  const stepDone = (st) => st.key === 'review' ? completeness === 100 : st.fields.every((k) => !isEmpty(values[k]));

  async function save({ final = false } = {}) {
    if (busy) return false;
    const local = Object.fromEntries(Object.entries(meta.fields).map(([k, def]) => [k, checkField(def, values[k])]).filter(([, e]) => e));
    if (Object.keys(local).length) {
      setFieldErrors(local);
      setMessage({ tone: 'error', text: 'Some details need fixing before they can be saved.' });
      const bad = steps.findIndex((st) => st.fields.some((k) => local[k]));
      if (bad >= 0 && bad !== step) { setDir(bad > step ? 1 : -1); setStep(bad); }
      return false;
    }
    setBusy(true);
    setMessage(null);
    setFieldErrors({});
    try {
      await api('/profile', { method: 'PUT', body: values });
      setSaved(values);
      setSavedAt(new Date());
      if (final) {
        setMessage({ tone: 'good', text: 'Profile saved. Your scholarship matches have been checked again.' });
        toast({ tone: 'good', title: 'Profile saved', message: 'Every scholarship has been checked again.' });
      }
      return true;
    } catch (err) {
      const errs = err.body?.fields || {};
      setFieldErrors(errs);
      setMessage({ tone: 'error', text: err.message });
      const bad = steps.findIndex((st) => st.fields.some((k) => errs[k]));
      if (bad >= 0) { setDir(-1); setStep(bad); }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function go(to) {
    if (to === step) return;
    // Auto-save whenever the student moves between steps.
    if (dirty && !(await save())) return;
    setDir(to > step ? 1 : -1);
    setMessage(null);
    setStep(to);
  }

  return (
    <>
      <PageHead title="Complete your profile" lede="Enter details as they appear on your certificates.">
        <div className="min-w-[13rem]">
          <p className="mb-1.5 flex items-baseline justify-between text-[0.88rem] font-bold">
            <span>{completeness}% complete</span>
            <span className="text-xs font-semibold text-ink-2">{filled} of {keys.length}</span>
          </p>
          <div className="meter" data-tone={completeness === 100 ? '' : completeness >= 50 ? 'warn' : 'miss'} role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
            <i style={{ width: `${completeness}%` }} />
          </div>
        </div>
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[15rem_1fr]">
        {/* Stepper */}
        <nav aria-label="Profile steps" className="panel p-3">
          <ol className="relative space-y-1">
            {steps.map((st, i) => {
              const done = stepDone(st);
              const active = i === step;
              return (
                <li key={st.key}>
                  <button type="button" onClick={() => go(i)} aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-wash' : 'hover:bg-wash/60'}`}>
                    <span className={`grid h-8 w-8 flex-none place-items-center rounded-full text-[0.85rem] font-bold transition-colors ${
                      done ? 'bg-pass text-white' : active ? 'bg-brand text-white shadow-[0_0_0_4px_rgba(15,118,110,0.15)]' : 'border-2 border-line text-ink-2'}`}>
                      {done ? <Icon name="check" className="h-4 w-4" strokeWidth={2.6} /> : i + 1}
                    </span>
                    <span className={`text-[0.9rem] ${active ? 'font-bold text-ink' : 'text-ink-2'}`}>{st.title}</span>
                  </button>
                  {i < steps.length - 1 && <span className={`ml-[1.72rem] block h-3 w-0.5 ${done ? 'bg-pass' : 'bg-line'}`} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 border-t border-line px-3 pt-3 text-[0.78rem] text-ink-2">
            {busy ? 'Saving…' : dirty ? 'Unsaved changes. Saved when you move on.' : savedAt ? `Auto-saved at ${savedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'All changes saved.'}
          </p>
        </nav>

        {/* Step body */}
        <form onSubmit={(e) => { e.preventDefault(); if (isReview) save({ final: true }); else go(step + 1); }} className="panel overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={current.key} custom={dir}
              initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }} className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-[1.25rem]"><Icon name={current.icon} className="h-5 w-5 text-brand" />{current.title}</h2>

              {!isReview ? (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {current.fields.map((name) => {
                    const def = meta.fields[name];
                    const used = fieldUsage(data.matches?.items, name);
                    return (
                      <div key={name}>
                        <FieldInput name={name} def={def} value={values[name]} error={fieldErrors[name]}
                          onChange={(v) => { setValues((old) => ({ ...old, [name]: v })); setFieldErrors((fe) => ({ ...fe, [name]: checkField(def, v) })); }} />
                        {used > 0 && <p className="mt-1 text-[0.76rem] font-semibold text-brand">Checked by {used} scholarship{used === 1 ? '' : 's'}</p>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {steps.filter((st) => st.key !== 'review').map((st) => (
                    <section key={st.key} className="rounded-xl border border-line">
                      <div className="flex items-center justify-between border-b border-line bg-wash/60 px-4 py-2">
                        <h3 className="text-[0.95rem]">{st.title}</h3>
                        <button type="button" className="text-[0.82rem] font-bold text-brand" onClick={() => go(steps.indexOf(st))}>Edit</button>
                      </div>
                      <dl className="grid gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-2">
                        {st.fields.map((k) => (
                          <div key={k} className="flex justify-between gap-3 text-[0.9rem]"><dt className="text-ink-2">{meta.fields[k].label}</dt><dd className="text-right font-semibold">{display(meta.fields[k], values[k])}</dd></div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="border-t border-line px-5 py-4 sm:px-6">
            {message && (
              <Notice tone={message.tone} className="mb-4">
                {message.text}{' '}
                {message.tone === 'good' && <Link to="/scholarships" className="font-semibold underline underline-offset-4">See your matches</Link>}
              </Notice>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="btn btn-quiet" disabled={step === 0 || busy} onClick={() => go(step - 1)}>
                <Icon name="arrowLeft" className="h-4 w-4" />Previous
              </button>
              {isReview ? (
                <button className="btn btn-primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Save profile'}</button>
              ) : (
                <button className="btn btn-primary" disabled={busy}>{busy ? <><Spinner />Saving…</> : 'Next'}<Icon name="arrowRight" className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        </form>
      </div>

    </>
  );
}
