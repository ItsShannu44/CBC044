// Derived views over the data the API already returns: dashboard counts,
// document needs, recovery actions and overall progress. Pure functions, no
// network, so every screen that shows them agrees with every other one.

export const ACTIVE_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING'];

const valid = (items = []) => items.filter((i) => i && i.scholarship && i.match);

// Which scholarships ask for each document, split by how relevant they are to this student.
export function documentNeeds(items) {
  const needs = new Map();
  for (const i of valid(items)) {
    if (i.scholarship.closed) continue;
    const relevant = i.match.result !== 'NOT_ELIGIBLE' || Boolean(i.application);
    for (const d of i.scholarship.requiredDocuments || []) {
      if (!d.mandatory) continue;
      const n = needs.get(d.docType) || { docType: d.docType, label: d.label, all: [], relevant: [] };
      n.all.push(i.scholarship);
      if (relevant) n.relevant.push(i.scholarship);
      needs.set(d.docType, n);
    }
  }
  return needs;
}

// How many open scholarships have a rule on a given profile field.
export function fieldUsage(items, field) {
  return valid(items).filter((i) => !i.scholarship.closed && (i.scholarship.rules || []).some((r) => r.field === field)).length;
}

export function summarize({ matches, documents = [], applications = [], meta }) {
  const items = valid(matches?.items);
  const open = items.filter((i) => !i.scholarship.closed);
  const rank = (a, b) => b.match.score - a.match.score || a.scholarship.daysLeft - b.scholarship.daysLeft;
  const eligible = open.filter((i) => i.match.result === 'ELIGIBLE').sort(rank);
  const partial = open.filter((i) => i.match.result === 'PARTIAL').sort(rank);
  const needInfo = open.filter((i) => i.match.checks.some((c) => c.mandatory && c.status === 'unknown'));
  const inProgress = applications.filter((a) => ACTIVE_STATUSES.includes(a.status));

  const vault = new Map(documents.map((d) => [d.docType, d]));
  const needs = documentNeeds(items);
  const relevantNeeds = [...needs.values()].filter((n) => n.relevant.length > 0);
  const missingDocs = relevantNeeds.filter((n) => !vault.has(n.docType)).sort((a, b) => b.relevant.length - a.relevant.length);
  const mismatched = documents.filter((d) => d.ocr?.mismatches > 0);

  const fieldKeys = Object.keys(meta?.fields || {});
  const missingFields = matches?.missingProfileFields || [];
  const profilePct = fieldKeys.length ? Math.round(((fieldKeys.length - missingFields.length) / fieldKeys.length) * 100) : 0;
  const docsPct = relevantNeeds.length ? Math.round(((relevantNeeds.length - missingDocs.length) / relevantNeeds.length) * 100) : 100;
  const applied = eligible.filter((i) => i.application).length;
  const appsPct = eligible.length ? Math.round((applied / eligible.length) * 100) : (applications.length ? 100 : 0);

  // ---------- Recovery actions, most valuable first ----------
  const actions = [];
  for (const n of missingDocs) {
    actions.push({
      id: `doc-${n.docType}`, kind: 'document', priority: 'high', icon: 'upload',
      title: `Upload ${n.label.toLowerCase()}`,
      detail: `Unlocks ${n.relevant.length} scholarship${n.relevant.length === 1 ? '' : 's'}`,
      unlocks: n.relevant.length, to: '/documents', cta: 'Upload now', docType: n.docType,
    });
  }
  for (const d of mismatched) {
    const first = d.ocr.checks?.find((c) => c.status === 'mismatch');
    actions.push({
      id: `mismatch-${d.docType}`, kind: 'mismatch', priority: 'high', icon: 'flag',
      title: `Fix a mismatch on your ${d.label.toLowerCase()}`,
      detail: first?.message || 'A value on this document differs from your profile.',
      unlocks: needs.get(d.docType)?.relevant.length || 0, to: '/documents', cta: 'Review',
    });
  }
  for (const a of applications.filter((x) => x.status === 'DOCUMENTS_PENDING')) {
    actions.push({
      id: `pending-${a.id}`, kind: 'application', priority: 'high', icon: 'refresh',
      title: `Replace documents for ${a.scholarship.name}`,
      detail: 'The reviewer asked for new files before this can move on.',
      unlocks: 1, to: `/scholarships/${a.scholarship.id}`, cta: 'Fix now',
    });
  }
  for (const a of applications.filter((x) => x.status === 'DRAFT' && !x.scholarship.closed)) {
    actions.push({
      id: `draft-${a.id}`, kind: 'application', priority: a.scholarship.daysLeft <= 7 ? 'high' : 'medium', icon: 'send',
      title: `Submit your draft for ${a.scholarship.name}`,
      detail: a.scholarship.daysLeft <= 1 ? 'Closes within a day.' : `${a.scholarship.daysLeft} days until the deadline.`,
      unlocks: 1, to: `/scholarships/${a.scholarship.id}`, cta: 'Open draft',
    });
  }
  for (const f of missingFields) {
    const used = fieldUsage(items, f);
    actions.push({
      id: `field-${f}`, kind: 'profile', priority: used >= 2 ? 'high' : 'medium', icon: 'user',
      title: `Add your ${(meta?.fields?.[f]?.label || f).toLowerCase()}`,
      detail: used ? `Checked by ${used} scholarship${used === 1 ? '' : 's'}` : 'Completes your profile',
      unlocks: used, to: '/profile', cta: 'Complete',
    });
  }
  for (const i of partial) {
    const gaps = i.match.checks.filter((c) => c.mandatory && c.status === 'fail');
    if (!gaps.length) continue;
    actions.push({
      id: `gap-${i.scholarship.id}`, kind: 'eligibility', priority: 'low', icon: 'gauge',
      title: `Close the gap for ${i.scholarship.name}`,
      detail: gaps[0].reason,
      unlocks: 1, to: `/scholarships/${i.scholarship.id}`, cta: 'See gap',
    });
  }
  const weight = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => weight[a.priority] - weight[b.priority] || b.unlocks - a.unlocks);

  const overall = Math.round((profilePct + docsPct + appsPct) / 3);

  return {
    items, open, eligible, partial, needInfo, inProgress,
    missingDocs, mismatched, relevantNeeds, needs, vault,
    actions, profilePct, docsPct, appsPct, overall,
    potential: eligible.reduce((s, i) => s + Number(i.scholarship.amount || 0), 0),
  };
}

// Tags for a scholarship card, taken from the rules themselves (stream, level, state...).
export function ruleTags(scholarship, limit = 3) {
  const tags = [];
  for (const r of scholarship.rules || []) {
    if (!['eq', 'in'].includes(r.operator)) continue;
    const vals = Array.isArray(r.value) ? r.value : [r.value];
    if (typeof vals[0] === 'boolean') { if (vals[0]) tags.push('Disability'); continue; }
    if (vals.length > 3) tags.push(`${vals.length} ${r.field === 'category' ? 'categories' : 'options'}`);
    else tags.push(vals.join(' / '));
  }
  return tags.slice(0, limit);
}

export const initials = (text = '') =>
  text.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'VS';
