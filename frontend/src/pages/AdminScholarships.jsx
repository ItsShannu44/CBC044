import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/icons.jsx';
import { useToast } from '../components/toast.jsx';
import { Deadline, LoadError, Loading, Notice, PageHead } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { inr, istDateInput } from '../lib/format.js';
import { useLoad, useSession } from '../lib/session.jsx';

export function AdminScholarships() {
  const { data, error, loading, reload } = useLoad(() => api('/admin/scholarships'));
  if (loading && !data) return <Loading variant="list" />;
  if (error) return <LoadError error={error} retry={reload} />;

  return (
    <>
      <PageHead title="Scholarships" lede="Schemes, rules and applicants.">
        <Link to="/admin/scholarships/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Add scholarship</Link>
      </PageHead>
      {data.scholarships.length === 0 ? (
        <Notice>No scholarships yet. Add the first one, and every student is checked against it straight away.</Notice>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-[0.95rem]">
            <thead className="border-b border-line bg-wash/60 text-xs uppercase tracking-wide text-ink-2">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-5">Scholarship</th>
                <th className="px-3 py-3 font-semibold">Deadline</th>
                <th className="px-3 py-3 text-right font-semibold">Rules</th>
                <th className="px-3 py-3 text-right font-semibold">Students who qualify</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">Applications</th>
              </tr>
            </thead>
            <tbody>
              {data.scholarships.map((s) => (
                <tr key={s.id} className="border-t border-line transition-colors first:border-t-0 hover:bg-wash/50">
                  <td className="px-4 py-3.5 sm:px-5">
                    <Link to={`/admin/scholarships/${s.id}`} className="font-semibold text-brand-deep hover:text-brand">{s.name}</Link>
                    <span className="block text-ink-2">{s.provider}, {inr(s.amount)}</span>
                  </td>
                  <td className="px-3 py-3.5"><Deadline scholarship={s} /></td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-ink-2">{s.rules.length}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-pass">{s.eligibleStudents}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-ink-2 sm:px-5">{s.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------- Add or edit a scholarship, with the rule builder ----------

function defaultValue(def, operator) {
  if (def.type === 'boolean') return true;
  if (def.type === 'enum') return operator === 'in' ? [] : def.options[0];
  return '';
}

function operatorsFor(meta, def) {
  return Object.entries(meta.operators).filter(([, op]) => op.types.includes(def.type));
}

function ruleSentence(meta, rule) {
  const def = meta.fields[rule.field];
  if (def.type === 'boolean') return `${def.label}: ${rule.value ? 'Yes' : 'No'}`;
  let shown = rule.value;
  if (Array.isArray(shown)) shown = shown.length ? shown.join(', ') : '…';
  else if (shown === '' || shown === null) shown = '…';
  else if (def.type === 'currency') shown = inr(shown);
  return `${def.label} ${meta.operators[rule.operator].label} ${shown}`;
}

function RuleRow({ rule, index, meta, onChange, onRemove }) {
  const def = meta.fields[rule.field];
  const ops = operatorsFor(meta, def);
  const set = (patch) => onChange({ ...rule, ...patch });
  const n = index + 1;

  let valueInput;
  if (def.type === 'boolean') {
    valueInput = (
      <select className="input" aria-label={`Rule ${n} value`} value={String(rule.value)} onChange={(e) => set({ value: e.target.value === 'true' })}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  } else if (def.type === 'enum' && rule.operator === 'in') {
    valueInput = (
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">Rule {n} accepted values</legend>
        {def.options.map((o) => (
          <label key={o} className="inline-flex items-center gap-1.5">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-ink)]" checked={rule.value.includes(o)}
              onChange={(e) => set({ value: e.target.checked ? [...rule.value, o] : rule.value.filter((v) => v !== o) })} />
            {o}
          </label>
        ))}
      </fieldset>
    );
  } else if (def.type === 'enum') {
    valueInput = (
      <select className="input" aria-label={`Rule ${n} value`} value={rule.value} onChange={(e) => set({ value: e.target.value })}>
        {def.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  } else {
    valueInput = (
      <input className="input" type="number" aria-label={`Rule ${n} value`} min={def.min} max={def.max} step={def.step ?? 'any'}
        value={rule.value} onChange={(e) => set({ value: e.target.value })} placeholder={def.type === 'currency' ? 'Amount in rupees' : 'Number'} />
    );
  }

  return (
    <li className="relative rounded-xl border border-line bg-paper p-3.5 transition-colors hover:border-brand/50">
      <span className="absolute -left-2 top-4 grid h-6 w-6 place-items-center rounded-full bg-thread text-[0.8rem] font-bold text-ink" aria-hidden="true">{n}</span>
      <div className="grid gap-3 pl-3 sm:grid-cols-[1fr_0.8fr_1.3fr]">
        <select className="input" aria-label={`Rule ${n} profile field`} value={rule.field}
          onChange={(e) => {
            const nextDef = meta.fields[e.target.value];
            const operator = operatorsFor(meta, nextDef)[0][0];
            set({ field: e.target.value, operator, value: defaultValue(nextDef, operator) });
          }}>
          {Object.entries(meta.fields).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
        </select>
        {def.type === 'boolean' ? <span className="self-center text-ink-2">must be</span> : (
          <select className="input" aria-label={`Rule ${n} comparison`} value={rule.operator}
            onChange={(e) => {
              const operator = e.target.value;
              const wasList = Array.isArray(rule.value);
              const value = operator === 'in' ? (wasList ? rule.value : []) : wasList ? defaultValue(def, operator) : rule.value;
              set({ operator, value });
            }}>
            {ops.map(([key, op]) => <option key={key} value={key}>{op.label}</option>)}
          </select>
        )}
        <div className="self-center">{valueInput}</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-3">
        <p className="text-ink-2">Reads as: <span className="font-semibold text-ink">{ruleSentence(meta, rule)}</span></p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-ink)]" checked={rule.mandatory} onChange={(e) => set({ mandatory: e.target.checked })} />
            Mandatory
          </label>
          <label className="inline-flex items-center gap-1.5">
            Weight
            <input className="input !min-h-0 !w-16 !py-1" type="number" min="1" max="5" value={rule.weight} onChange={(e) => set({ weight: e.target.value })} />
          </label>
          <button type="button" className="btn btn-quiet btn-small" onClick={onRemove}>
            <Icon name="x" className="h-3.5 w-3.5" /> Remove<span className="sr-only"> rule {n}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export function ScholarshipForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { meta } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading } = useLoad(() => (editing ? api(`/admin/scholarships/${id}`) : Promise.resolve(null)), [id]);
  const always = meta.alwaysRequiredDocs || [];
  const withAlways = (docs) => [...docs.filter((d) => !always.includes(d.docType)), ...always.map((docType) => ({ docType, mandatory: true }))];
  const [form, setForm] = useState({ name: '', provider: '', description: '', amount: '', deadline: '', rules: [], documents: withAlways([]) });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const s = data.scholarship;
    setForm({
      name: s.name, provider: s.provider, description: s.description, amount: s.amount, deadline: istDateInput(s.deadline),
      rules: s.rules.map(({ field, operator, value, mandatory, weight }) => ({ field, operator, value, mandatory, weight })),
      documents: withAlways(s.requiredDocuments.map(({ docType, mandatory }) => ({ docType, mandatory }))),
    });
  }, [data]);

  if (editing && loading && !data) return <Loading />;
  if (error) return <LoadError error={error} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setRule = (i, rule) => set({ rules: form.rules.map((r, j) => (j === i ? rule : r)) });
  const docOf = (docType) => form.documents.find((d) => d.docType === docType);

  function addRule() {
    const field = Object.keys(meta.fields).find((k) => !form.rules.some((r) => r.field === k)) || 'cgpa';
    const def = meta.fields[field];
    const operator = operatorsFor(meta, def)[0][0];
    set({ rules: [...form.rules, { field, operator, value: defaultValue(def, operator), mandatory: true, weight: 1 }] });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    const body = {
      ...form,
      amount: Number(form.amount),
      rules: form.rules.map((r) => {
        const def = meta.fields[r.field];
        const numeric = def.type === 'number' || def.type === 'currency';
        return { ...r, value: numeric ? (r.value === '' ? null : Number(r.value)) : r.value, weight: Number(r.weight) || 1 };
      }),
    };
    try {
      await api(editing ? `/admin/scholarships/${id}` : '/admin/scholarships', { method: editing ? 'PUT' : 'POST', body });
      toast({ tone: 'good', title: editing ? 'Scholarship updated' : 'Scholarship added', message: 'Every student has been checked against it straight away.' });
      navigate('/admin/scholarships');
    } catch (err) {
      setErrors(err.body.errors || [err.message]);
      window.scrollTo({ top: 0 });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/scholarships/${id}`, { method: 'DELETE' });
      toast({ tone: 'info', title: 'Scholarship deleted' });
      navigate('/admin/scholarships');
    } catch (err) {
      setErrors([err.message]);
      window.scrollTo({ top: 0 });
    }
  }

  return (
    <>
      <PageHead title={editing ? 'Edit scholarship' : 'Add scholarship'} back={{ to: '/admin/scholarships', label: 'scholarships' }} />
      <form onSubmit={save} className="max-w-[52rem] space-y-6">
        {errors.length > 0 && (
          <Notice tone="error">
            <p className="font-semibold">Fix {errors.length === 1 ? 'this' : 'these'} before saving:</p>
            <ul className="list-disc pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </Notice>
        )}

        <section className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6" aria-labelledby="basics-h">
          <div className="mb-1 flex items-center gap-3 sm:col-span-2">
            <span className="tile" data-tone="blue"><Icon name="cap" /></span>
            <h2 id="basics-h" className="text-[1.45rem]">The basics</h2>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Scholarship name</label>
            <input id="name" className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="provider">Provided by</label>
            <input id="provider" className="input" value={form.provider} onChange={(e) => set({ provider: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="amount">Amount in rupees</label>
            <input id="amount" className="input" type="number" min="0" step="1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="deadline">Deadline</label>
            <input id="deadline" className="input" type="date" value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} required aria-describedby="deadline-hint" />
            <p className="hint mt-1" id="deadline-hint">Applications close at the end of this day, India time.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" className="input" rows="2" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
        </section>

        <section className="panel p-5 sm:p-6" aria-labelledby="rules-h">
          <div className="mb-1 flex items-center gap-3">
            <span className="tile" data-tone="teal"><Icon name="sliders" /></span>
            <h2 id="rules-h" className="text-[1.45rem]">Eligibility rules</h2>
          </div>
          <p className="hint mb-4 mt-1 max-w-[62ch]">
            A student qualifies when every mandatory rule is met. Rules that are not mandatory only raise the match
            score. Each student sees these rules with a reason for every one.
          </p>
          {form.rules.length === 0 && <p className="mb-3 text-ink-2">No rules yet, so every student qualifies.</p>}
          <ul className="space-y-3">
            {form.rules.map((rule, i) => (
              <RuleRow key={i} rule={rule} index={i} meta={meta} onChange={(r) => setRule(i, r)}
                onRemove={() => set({ rules: form.rules.filter((_, j) => j !== i) })} />
            ))}
          </ul>
          <button type="button" className="btn btn-quiet mt-4" onClick={addRule}><Icon name="plus" className="h-4 w-4" /> Add a rule</button>
        </section>

        <section className="panel p-5 sm:p-6" aria-labelledby="docs-h">
          <div className="mb-1 flex items-center gap-3">
            <span className="tile" data-tone="orange"><Icon name="folder" /></span>
            <h2 id="docs-h" className="text-[1.45rem]">Required documents</h2>
          </div>
          <p className="hint mb-3 mt-1">Students cannot submit until every mandatory document is uploaded.</p>
          <ul className="divide-y divide-line">
            {Object.entries(meta.docTypes).map(([docType, label]) => {
              const chosen = docOf(docType);
              const locked = always.includes(docType);
              return (
                <li key={docType} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--color-ink)]" checked={Boolean(chosen) || locked} disabled={locked}
                      onChange={(e) => set({
                        documents: e.target.checked ? [...form.documents, { docType, mandatory: true }] : form.documents.filter((d) => d.docType !== docType),
                      })} />
                    {label}
                    {locked && <span className="chip !py-0 !text-[0.72rem]" data-tone="info">Required for every scholarship</span>}
                  </label>
                  {chosen && (
                    <select className="input !w-auto" aria-label={`${label} is`} value={locked ? 'true' : String(chosen.mandatory)} disabled={locked}
                      onChange={(e) => set({ documents: form.documents.map((d) => (d.docType === docType ? { ...d, mandatory: e.target.value === 'true' } : d)) })}>
                      <option value="true">Mandatory</option>
                      <option value="false">Optional</option>
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" disabled={busy}>
            <Icon name="check" className="h-4 w-4" />
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Add scholarship'}
          </button>
          <Link to="/admin/scholarships" className="btn btn-quiet">Cancel</Link>
          {editing && <button type="button" className="btn btn-danger ml-auto" onClick={remove}>Delete scholarship</button>}
        </div>
      </form>
    </>
  );
}
