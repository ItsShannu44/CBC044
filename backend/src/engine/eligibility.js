// The eligibility engine. Pure functions only: no database, no HTTP.
// Given a student profile and a scholarship's rules, it says whether the student qualifies
// and gives a reason for every single rule. That reason list is the "and why" of the product.

import { FIELDS, OPERATORS } from './fields.js';

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const num = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function formatValue(field, value) {
  const def = FIELDS[field];
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.join(', ');
  if (!def) return String(value);
  if (def.type === 'currency') return inr(value);
  if (def.type === 'number') return num(value);
  if (def.type === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// "CGPA is at least 7.5" – the rule in plain words, shown to students and admins.
export function describeRule(rule) {
  const def = FIELDS[rule.field];
  const op = OPERATORS[rule.operator];
  if (!def || !op) return 'Unknown rule';
  if (def.type === 'boolean') return `${def.label}: ${rule.value ? 'Yes' : 'No'}`;
  return `${def.label} ${op.label} ${formatValue(rule.field, rule.value)}`;
}

function isMissing(v) {
  return v === null || v === undefined || v === '';
}

// Checks one rule against the profile. Returns { status: 'pass' | 'fail' | 'unknown', reason }.
export function checkRule(profile, rule) {
  const def = FIELDS[rule.field];
  const op = OPERATORS[rule.operator];
  if (!def || !op || !op.types.includes(def.type)) {
    return { status: 'unknown', reason: 'This rule is not set up correctly. Please tell the scholarship admin.' };
  }

  const actualRaw = profile ? profile[rule.field] : undefined;
  if (isMissing(actualRaw)) {
    return {
      status: 'unknown',
      reason: `${def.label} is missing from your profile. Add it to check this rule.`,
    };
  }

  const shown = formatValue(rule.field, actualRaw);
  const yours = `Your ${lower(def.label)} is ${shown}.`;

  if (def.type === 'number' || def.type === 'currency') {
    const actual = Number(actualRaw);
    const expected = Number(rule.value);
    const fmt = (n) => (def.type === 'currency' ? inr(n) : num(n));
    const gap = fmt(Math.round(Math.abs(actual - expected) * 100) / 100);
    if (rule.operator === 'gte') {
      return actual >= expected
        ? { status: 'pass', reason: `${yours} The minimum is ${fmt(expected)}.` }
        : { status: 'fail', reason: `${yours} The minimum is ${fmt(expected)}, so you are ${gap} short.` };
    }
    if (rule.operator === 'lte') {
      return actual <= expected
        ? { status: 'pass', reason: `${yours} The limit is ${fmt(expected)}.` }
        : { status: 'fail', reason: `${yours} The limit is ${fmt(expected)}, so you are ${gap} over.` };
    }
    return actual === expected
      ? { status: 'pass', reason: `${yours} Required: ${fmt(expected)}.` }
      : { status: 'fail', reason: `${yours} Required: ${fmt(expected)}.` };
  }

  if (def.type === 'boolean') {
    const actual = actualRaw === true || actualRaw === 'true';
    const expected = rule.value === true || rule.value === 'true';
    const line = `${def.label}: ${actual ? 'Yes' : 'No'}. Required: ${expected ? 'Yes' : 'No'}.`;
    return { status: actual === expected ? 'pass' : 'fail', reason: line };
  }

  // enum
  const actual = String(actualRaw);
  if (rule.operator === 'in') {
    const list = Array.isArray(rule.value) ? rule.value.map(String) : [String(rule.value)];
    return { status: list.includes(actual) ? 'pass' : 'fail', reason: `${yours} Accepted: ${list.join(', ')}.` };
  }
  if (rule.operator === 'neq') {
    return { status: actual !== String(rule.value) ? 'pass' : 'fail', reason: `${yours} Not accepted: ${rule.value}.` };
  }
  return { status: actual === String(rule.value) ? 'pass' : 'fail', reason: `${yours} Required: ${rule.value}.` };
}

function lower(label) {
  // Keep acronyms such as CGPA as they are.
  return /^[A-Z]{2,}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

// Evaluates every rule of one scholarship.
//
// result:
//   ELIGIBLE      every mandatory rule passes (preferred rules only change the score)
//   PARTIAL       at least half of the mandatory rules pass, but not all
//   NOT_ELIGIBLE  fewer than half of the mandatory rules pass
// score: weight of passed rules / total weight, 0 to 100. Used for ranking.
export function evaluate(profile, rules) {
  const checks = rules.map((rule) => {
    const { status, reason } = checkRule(profile, rule);
    return {
      field: rule.field,
      rule: describeRule(rule),
      mandatory: rule.mandatory !== false,
      weight: Number(rule.weight) > 0 ? Number(rule.weight) : 1,
      status,
      reason,
    };
  });

  const mandatory = checks.filter((c) => c.mandatory);
  const mandatoryPassed = mandatory.filter((c) => c.status === 'pass').length;
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const passedWeight = checks.filter((c) => c.status === 'pass').reduce((s, c) => s + c.weight, 0);

  let result;
  if (mandatoryPassed === mandatory.length) result = 'ELIGIBLE';
  else if (mandatoryPassed * 2 >= mandatory.length) result = 'PARTIAL';
  else result = 'NOT_ELIGIBLE';

  return {
    result,
    canApply: result === 'ELIGIBLE',
    score: totalWeight === 0 ? 100 : Math.round((passedWeight / totalWeight) * 100),
    mandatoryPassed,
    mandatoryTotal: mandatory.length,
    missingFields: [...new Set(checks.filter((c) => c.status === 'unknown').map((c) => c.field))],
    checks,
  };
}

// Validates a rule coming from the admin form. Returns an error message, or null when it is fine.
export function validateRule(rule) {
  const def = FIELDS[rule.field];
  if (!def) return `Unknown profile field "${rule.field}".`;
  const op = OPERATORS[rule.operator];
  if (!op || !op.types.includes(def.type)) return `"${rule.operator}" cannot be used with ${def.label}.`;
  if (def.type === 'number' || def.type === 'currency') {
    if (isMissing(rule.value) || Number.isNaN(Number(rule.value))) return `${def.label} needs a number.`;
  } else if (def.type === 'boolean') {
    if (typeof rule.value !== 'boolean') return `${def.label} needs Yes or No.`;
  } else if (rule.operator === 'in') {
    if (!Array.isArray(rule.value) || rule.value.length === 0) return `Pick at least one value for ${def.label}.`;
    if (rule.value.some((v) => !def.options.includes(v))) return `${def.label} has a value that is not allowed.`;
  } else if (!def.options.includes(rule.value)) {
    return `Pick a value for ${def.label}.`;
  }
  return null;
}
