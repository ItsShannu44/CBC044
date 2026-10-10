// The application status workflow. An application has exactly one status, and only these moves are allowed.
//
//   DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED
//                 \____________\______-> DOCUMENTS_PENDING -> UNDER_REVIEW
//   DRAFT -> EXPIRED   (deadline passed before the student submitted)

import { HttpError } from '../errors.js';
import { StatusHistory } from '../models/index.js';

export const TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'EXPIRED'],
  SUBMITTED: ['UNDER_REVIEW', 'DOCUMENTS_PENDING', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'DOCUMENTS_PENDING'],
  DOCUMENTS_PENDING: ['UNDER_REVIEW'],
  APPROVED: [],
  REJECTED: [],
  EXPIRED: [],
};

// The moves a reviewer can make with a button. DOCUMENTS_PENDING happens by rejecting a document.
export const ADMIN_MOVES = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
};

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  DOCUMENTS_PENDING: 'Documents pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

export function canMove(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

// Changes the status and records it in the history. Always go through this function.
export async function moveApplication(application, to, { actorId = null, note = null, transaction } = {}) {
  const from = application.status;
  if (!canMove(from, to)) {
    throw new HttpError(409, `An application that is ${STATUS_LABELS[from]} cannot become ${STATUS_LABELS[to]}.`);
  }
  application.status = to;
  if (to === 'SUBMITTED') application.submittedAt = new Date();
  await application.save({ transaction });
  await StatusHistory.create(
    { applicationId: application.id, fromStatus: from, toStatus: to, note, actorId },
    { transaction },
  );
  return application;
}
