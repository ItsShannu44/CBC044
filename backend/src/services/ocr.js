// Mismatch detection: reads an uploaded document with OCR and compares the values
// printed on it with the student's profile, so mistakes are caught at upload time
// instead of during review. Everything here fails safe: an unreadable or
// unsupported file is reported honestly and never blocks the upload.
import { createWorker } from 'tesseract.js';
import { DOC_TYPES, FIELDS, STATES } from '../engine/fields.js';
import { formatValue } from '../engine/eligibility.js';

const READ_TIMEOUT_MS = 25_000;
const OCR_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

// ---------- Reading the file ----------

export async function readText(buffer, mimeType) {
  if (!OCR_MIME_TYPES.has(mimeType)) {
    return {
      status: 'skipped',
      note: mimeType === 'application/pdf'
        ? 'Automatic reading works on photographs and scans (JPG or PNG). A PDF is checked by the reviewer.'
        : 'This file type cannot be read automatically.',
    };
  }
  try {
    const text = await recognize(buffer, READ_TIMEOUT_MS);
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 8) {
      return { status: 'unreadable', note: 'The picture does not contain readable text. Take a clearer photo and try again.' };
    }
    return { status: 'read', text: clean };
  } catch (err) {
    console.warn('OCR could not finish:', err.message);
    return {
      status: 'skipped',
      note: 'The automatic read did not finish. The reviewer will check this document manually.',
    };
  }
}

async function recognize(buffer, timeoutMs) {
  const worker = await createWorker('eng');
  try {
    const timedOut = new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('Reading the document took too long.')), timeoutMs);
    });
    const { data } = await Promise.race([worker.recognize(buffer), timedOut]);
    return data.text;
  } finally {
    worker.terminate().catch(() => {});
  }
}

// ---------- Pulling values out of the text ----------
// Certificates mix formats freely, so every finder accepts the common Indian variants.

const unique = (values) => [...new Set(values)];
const round2 = (n) => Number(n.toFixed(2));

export function findCgpas(text) {
  // Prefer the number printed next to the word CGPA/SGPA.
  const afterWord = text.match(/(?:cgpa|sgpa)[^0-9]{0,12}(\d{1,2}(?:\.\d{1,3})?)/gi) || [];
  const labelled = afterWord
    .map((m) => Number(m.match(/(\d{1,2}(?:\.\d{1,3})?)$/i)[1]))
    .filter((v) => v >= 0 && v <= 10);
  if (labelled.length) return unique(labelled).map(round2);

  const any = text.match(/\b\d{1,2}\.\d{1,3}\b/g) || [];
  return unique(any.map(Number).filter((v) => v > 0 && v <= 10)).map(round2);
}

export function findIncomes(text) {
  const t = text.toLowerCase();
  const values = new Set();
  const add = (n) => {
    if (Number.isFinite(n) && n >= 1000 && n <= 10_000_000_000) values.add(Math.round(n));
  };

  // Plain digits: "600000", and Indian or Western comma groups like "6,00,000".
  for (const m of t.match(/\d{1,3}(?:,\d{2,3})+|\d{4,9}/g) || []) add(Number(m.replace(/,/g, '')));
  // Words: "6 lakhs", "2.5 lakh", "1 crore".
  for (const m of t.match(/\d+(?:\.\d+)?\s*(?:lakhs?|lacs?)/g) || []) add(Number(m.match(/[\d.]+/)[0]) * 100_000);
  for (const m of t.match(/\d+(?:\.\d+)?\s*crores?/g) || []) add(Number(m.match(/[\d.]+/)[0]) * 10_000_000);

  return [...values].sort((a, b) => a - b);
}

export function findGender(text) {
  const t = text.toLowerCase();
  if (t.includes('female')) return 'Female';
  if (t.includes('male')) return 'Male';
  return null;
}

export function findCategory(text) {
  const t = text.toLowerCase();
  if (/other backward|\bobc\b/.test(t)) return 'OBC';
  if (/scheduled caste|(?<![a-z.])sc(?![a-z])/.test(t)) return 'SC';
  if (/scheduled tribe|(?<![a-z.])st(?![a-z])/.test(t)) return 'ST';
  if (/economically weaker|\bews\b/.test(t)) return 'EWS';
  if (/general|unreserved/.test(t)) return 'General';
  return null;
}

export function findState(text) {
  const t = text.toLowerCase();
  return STATES.find((s) => t.includes(s.toLowerCase())) || null;
}

// ---------- Comparing the document with the profile ----------

const CHECKS_BY_TYPE = {
  MARKS_CARD: [{ field: 'cgpa', find: (text) => findCgpas(text), numeric: true }],
  INCOME_CERTIFICATE: [{ field: 'familyIncome', find: (text) => findIncomes(text), numeric: true }],
  ID_PROOF: [{ field: 'gender', find: (text) => [findGender(text)].filter(Boolean) }],
  CASTE_CERTIFICATE: [{ field: 'category', find: (text) => [findCategory(text)].filter(Boolean) }],
  DOMICILE_CERTIFICATE: [{ field: 'state', find: (text) => [findState(text)].filter(Boolean) }],
};

// Pure and database-free: given what the document says and what the profile says,
// produce one honest verdict per comparable value.
export function compareDocument(docType, text, profile) {
  const checks = (CHECKS_BY_TYPE[docType] || []).map((def) => {
    const label = FIELDS[def.field].label;
    const expected = profile ? profile[def.field] : null;
    const found = def.find(text);

    if (expected === null || expected === undefined) {
      return {
        field: def.field, label, status: 'not_checked',
        message: `Add ${label.toLowerCase()} to your profile so this document can be checked against it.`,
      };
    }
    if (!found.length) {
      return {
        field: def.field, label, status: 'not_found',
        message: `No ${label.toLowerCase()} could be read from this document. The reviewer will confirm it manually.`,
      };
    }

    const matches = def.numeric
      ? found.some((v) => Math.abs(v - Number(expected)) <= 0.01)
      : found.map(String).includes(String(expected));
    if (matches) {
      return {
        field: def.field, label, status: 'match',
        message: `${label} on the document matches your profile (${formatValue(def.field, expected)}).`,
      };
    }

    // Report the value closest to the profile, which is the one that matters.
    const closest = def.numeric
      ? found.reduce((best, v) => (Math.abs(v - Number(expected)) < Math.abs(best - Number(expected)) ? v : best))
      : found[0];
    return {
      field: def.field, label, status: 'mismatch',
      docValue: formatValue(def.field, closest),
      profileValue: formatValue(def.field, expected),
      message: `The document shows ${formatValue(def.field, closest)}, but your profile says ` +
        `${formatValue(def.field, expected)}. Correct the profile or re-upload the right document.`,
    };
  });

  return { checks, mismatches: checks.filter((c) => c.status === 'mismatch').length };
}

// The whole check for one uploaded file. Never throws.
export async function checkDocument({ docType, buffer, mimeType, profile }) {
  const read = await readText(buffer, mimeType);
  const result = {
    label: DOC_TYPES[docType] || docType,
    status: read.status,
    checkedAt: new Date().toISOString(),
    checks: [],
    mismatches: 0,
  };
  if (read.status === 'read') {
    result.excerpt = read.text.slice(0, 300);
    Object.assign(result, compareDocument(docType, read.text, profile));
  } else {
    result.note = read.note;
  }
  return result;
}
