// Routes used by both students and admins.
import { Router } from 'express';
import { ALWAYS_REQUIRED_DOCS, DOC_TYPES, FIELDS, OPERATORS } from '../engine/fields.js';
import { HttpError } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { Application, Document, Scholarship, User } from '../models/index.js';
import { STATUS_LABELS } from '../services/workflow.js';

export const sharedRouter = Router();

sharedRouter.get('/health', (_req, res) => res.json({ ok: true }));

// The public landing page: live counts and the schemes anybody can browse,
// without rules or student data. No login needed.
sharedRouter.get('/landing', async (_req, res) => {
  const [scholarships, students, applications, documents] = await Promise.all([
    Scholarship.findAll({ attributes: ['id', 'name', 'provider', 'amount', 'deadline'], order: [['deadline', 'ASC']] }),
    User.count({ where: { role: 'STUDENT' } }),
    Application.count({ where: { status: 'APPROVED' } }),
    Document.count(),
  ]);
  const now = Date.now();
  res.json({
    stats: {
      scholarships: scholarships.length,
      open: scholarships.filter((s) => new Date(s.deadline).getTime() >= now).length,
      students,
      approved: applications,
      documents,
    },
    scholarships: scholarships.map((s) => ({
      id: s.id, name: s.name, provider: s.provider, amount: s.amount, deadline: s.deadline,
      open: new Date(s.deadline).getTime() >= now,
    })),
  });
});

// The form definitions: profile fields, rule operators, document types, status names.
sharedRouter.get('/meta', (_req, res) => {
  res.json({ fields: FIELDS, operators: OPERATORS, docTypes: DOC_TYPES, statuses: STATUS_LABELS, alwaysRequiredDocs: ALWAYS_REQUIRED_DOCS });
});

// Download a document. Only its owner and admins may open it.
sharedRouter.get('/documents/:id/file', requireAuth, async (req, res) => {
  const doc = await Document.scope('withData').findByPk(req.params.id);
  if (!doc) throw new HttpError(404, 'This document does not exist.');
  if (req.user.role !== 'ADMIN' && doc.userId !== req.user.id) {
    throw new HttpError(403, 'You do not have access to this document.');
  }
  res.set({
    'Content-Type': doc.mimeType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(doc.data);
});
