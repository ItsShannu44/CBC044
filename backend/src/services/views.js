// Shapes database rows into what the screens need.
import { describeRule } from '../engine/eligibility.js';
import { DOC_TYPES } from '../engine/fields.js';
import { Document } from '../models/index.js';
import { daysLeft, isClosed } from './dates.js';

export function scholarshipView(s, now = new Date()) {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    description: s.description,
    amount: s.amount,
    deadline: s.deadline,
    closed: isClosed(s.deadline, now),
    daysLeft: daysLeft(s.deadline, now),
    rules: (s.criteria || []).map((c) => ({
      id: c.id,
      field: c.field,
      operator: c.operator,
      value: c.value,
      mandatory: c.mandatory,
      weight: c.weight,
      text: describeRule(c),
    })),
    requiredDocuments: (s.requiredDocuments || []).map((d) => ({
      docType: d.docType,
      label: DOC_TYPES[d.docType] || d.docType,
      mandatory: d.mandatory,
    })),
  };
}

export function documentView(d) {
  return {
    id: d.id,
    docType: d.docType,
    label: DOC_TYPES[d.docType] || d.docType,
    fileName: d.fileName,
    mimeType: d.mimeType,
    size: d.size,
    uploadedAt: d.updatedAt,
    ocr: d.ocr || null,
  };
}

// The document checklist for one student and one scholarship:
// what is required, what is already in the vault, and what the reviewer said.
export async function buildChecklist(scholarship, userId, application = null) {
  const vault = await Document.findAll({ where: { userId } });
  const byType = new Map(vault.map((d) => [d.docType, d]));
  const reviews = new Map((application?.reviews || []).map((r) => [r.docType, r]));

  return scholarship.requiredDocuments.map((req) => {
    const doc = byType.get(req.docType);
    const review = reviews.get(req.docType);
    return {
      docType: req.docType,
      label: DOC_TYPES[req.docType] || req.docType,
      mandatory: req.mandatory,
      document: doc ? documentView(doc) : null,
      review: review ? { status: review.status, reason: review.reason } : null,
    };
  });
}

export function missingMandatory(checklist) {
  return checklist.filter((item) => item.mandatory && !item.document);
}
