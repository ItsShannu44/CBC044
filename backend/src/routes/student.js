// Everything a signed-in student can do.
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { validateProfile } from '../engine/profile.js';
import { DOC_TYPES, PROFILE_KEYS } from '../engine/fields.js';
import { HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  Application, ApplicationDocument, Criterion, Document, Match, Notification, Profile, RequiredDocument,
  Scholarship, StatusHistory, sequelize,
} from '../models/index.js';
import { isClosed, istDate } from '../services/dates.js';
import { recomputeForUser } from '../services/matching.js';
import { notify } from '../services/notify.js';
import { checkDocument } from '../services/ocr.js';
import { buildChecklist, documentView, missingMandatory, scholarshipView } from '../services/views.js';
import { moveApplication } from '../services/workflow.js';
import { sniffFileType } from '../services/files.js';

export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole('STUDENT'));

const scholarshipIncludes = [
  { model: Criterion, as: 'criteria' },
  { model: RequiredDocument, as: 'requiredDocuments' },
];
const order = [
  [{ model: Criterion, as: 'criteria' }, 'id', 'ASC'],
  [{ model: RequiredDocument, as: 'requiredDocuments' }, 'id', 'ASC'],
];

// ---------- Profile ----------

studentRouter.get('/profile', async (req, res) => {
  const profile = await Profile.findByPk(req.user.id);
  res.json({ profile: profile ? profile.get({ plain: true }) : null });
});

studentRouter.put('/profile', async (req, res) => {
  const { values, errors } = validateProfile(req.body);
  if (Object.keys(errors).length) throw new HttpError(422, 'Some details need fixing.', { fields: errors });

  const [profile] = await Profile.findOrCreate({ where: { userId: req.user.id } });
  await profile.update(values);
  // Auto-Match: saving the profile re-checks every scholarship.
  await recomputeForUser(req.user.id);
  res.json({ profile: profile.get({ plain: true }) });
});

// ---------- Matches (the dashboard) ----------

studentRouter.get('/matches', async (req, res) => {
  const userId = req.user.id;
  const scholarships = await Scholarship.findAll({ include: scholarshipIncludes, order: [['deadline', 'ASC'], ...order] });
  let matches = await Match.findAll({ where: { userId } });
  if (matches.length < scholarships.length) {
    await recomputeForUser(userId, { announce: false });
    matches = await Match.findAll({ where: { userId } });
  }
  const matchBy = new Map(matches.map((m) => [m.scholarshipId, m]));
  const applications = await Application.findAll({ where: { userId } });
  const appBy = new Map(applications.map((a) => [a.scholarshipId, a]));

  const profile = await Profile.findByPk(userId);
  const missing = PROFILE_KEYS.filter((k) => profile === null || profile[k] === null || profile[k] === undefined);

  res.json({
    missingProfileFields: missing,
    items: scholarships.map((s) => {
      const app = appBy.get(s.id);
      return {
        scholarship: scholarshipView(s),
        match: matchBy.get(s.id)?.details || null,
        application: app ? { id: app.id, status: app.status } : null,
      };
    }),
  });
});

// One scholarship: the rules with a reason each, the document checklist and the application.
studentRouter.get('/scholarships/:id', async (req, res) => {
  const scholarship = await Scholarship.findByPk(req.params.id, { include: scholarshipIncludes, order });
  if (!scholarship) throw new HttpError(404, 'This scholarship does not exist.');

  let match = await Match.findOne({ where: { userId: req.user.id, scholarshipId: scholarship.id } });
  if (!match) {
    await recomputeForUser(req.user.id, { announce: false });
    match = await Match.findOne({ where: { userId: req.user.id, scholarshipId: scholarship.id } });
  }
  const application = await Application.findOne({
    where: { userId: req.user.id, scholarshipId: scholarship.id },
    include: [{ model: ApplicationDocument, as: 'reviews' }, { model: StatusHistory, as: 'history' }],
    order: [[{ model: StatusHistory, as: 'history' }, 'id', 'ASC']],
  });
  const checklist = await buildChecklist(scholarship, req.user.id, application);

  res.json({
    scholarship: scholarshipView(scholarship),
    match: match.details,
    checklist,
    application: application
      ? {
          id: application.id,
          status: application.status,
          submittedAt: application.submittedAt,
          history: application.history.map((h) => ({
            from: h.fromStatus, to: h.toStatus, note: h.note, at: h.createdAt,
          })),
        }
      : null,
  });
});

// ---------- Document vault ----------

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadBytes, files: 1 } });

studentRouter.get('/documents', async (req, res) => {
  const docs = await Document.findAll({ where: { userId: req.user.id }, order: [['docType', 'ASC']] });
  res.json({ documents: docs.map(documentView) });
});

studentRouter.post('/documents', upload.single('file'), async (req, res) => {
  const docType = String(req.body.docType || '');
  if (!DOC_TYPES[docType]) throw new HttpError(422, 'Choose which document this is.');
  if (!req.file || req.file.size === 0) throw new HttpError(422, 'The file is empty. Choose a different file.');

  // Trust the file's contents, not its name: a renamed .exe is not a PDF.
  const mimeType = sniffFileType(req.file.buffer);
  if (!mimeType) throw new HttpError(422, 'Upload a PDF, JPG or PNG file.');

  const values = {
    fileName: req.file.originalname.slice(0, 200), mimeType, size: req.file.size, data: req.file.buffer,
  };
  let doc = await Document.findOne({ where: { userId: req.user.id, docType } });
  if (doc) await doc.update(values);
  else doc = await Document.create({ userId: req.user.id, docType, ...values });

  // A fresh upload clears the reviewer's rejection of the old file.
  const pending = await Application.findAll({ where: { userId: req.user.id, status: 'DOCUMENTS_PENDING' } });
  if (pending.length) {
    await ApplicationDocument.update(
      { status: 'UPLOADED', reason: null },
      { where: { applicationId: pending.map((a) => a.id), docType, status: 'REJECTED' } },
    );
  }

  // Mismatch detection: read the file and compare it with the profile, right at upload.
  const profile = await Profile.findByPk(req.user.id);
  const ocr = await checkDocument({
    docType, buffer: req.file.buffer, mimeType, profile: profile ? profile.get({ plain: true }) : null,
  });
  await doc.update({ ocr });

  if (ocr.mismatches > 0) {
    const first = ocr.checks.find((c) => c.status === 'mismatch');
    await notify(req.user.id, {
      type: 'DOCUMENT_MISMATCH',
      message: `${DOC_TYPES[docType] || docType}: ${first.message}`,
      link: '/documents',
      dedupeKey: `ocr:${docType}:${istDate(new Date())}`,
    });
  }

  res.status(201).json({ document: documentView(doc) });
});

// ---------- Applications ----------

studentRouter.get('/applications', async (req, res) => {
  const applications = await Application.findAll({
    where: { userId: req.user.id },
    include: [{ model: Scholarship, as: 'scholarship' }],
    order: [['updatedAt', 'DESC']],
  });
  res.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      submittedAt: a.submittedAt,
      updatedAt: a.updatedAt,
      scholarship: scholarshipView(a.scholarship),
    })),
  });
});

async function loadOwnApplication(req) {
  const application = await Application.findOne({
    where: { id: req.params.id, userId: req.user.id },
    include: [
      { model: Scholarship, as: 'scholarship', include: scholarshipIncludes },
      { model: ApplicationDocument, as: 'reviews' },
    ],
  });
  if (!application) throw new HttpError(404, 'This application does not exist.');
  return application;
}

// Start an application. It stays a draft until every check passes at submission.
studentRouter.post('/applications', async (req, res) => {
  const scholarship = await Scholarship.findByPk(req.body.scholarshipId);
  if (!scholarship) throw new HttpError(404, 'This scholarship does not exist.');
  if (isClosed(scholarship.deadline)) {
    throw new HttpError(409, 'The deadline for this scholarship has passed.', { code: 'DEADLINE_PASSED' });
  }

  await recomputeForUser(req.user.id, { announce: false });
  const match = await Match.findOne({ where: { userId: req.user.id, scholarshipId: scholarship.id } });
  if (!match.details.canApply) {
    throw new HttpError(409, 'You do not meet every mandatory rule for this scholarship yet.', { code: 'NOT_ELIGIBLE' });
  }

  const existing = await Application.findOne({ where: { userId: req.user.id, scholarshipId: scholarship.id } });
  if (existing) throw new HttpError(409, 'You have already started this application.');

  const application = await sequelize.transaction(async (transaction) => {
    const created = await Application.create(
      { userId: req.user.id, scholarshipId: scholarship.id, status: 'DRAFT' },
      { transaction },
    );
    await StatusHistory.create(
      { applicationId: created.id, fromStatus: null, toStatus: 'DRAFT', actorId: req.user.id, note: 'Application started.' },
      { transaction },
    );
    return created;
  });
  res.status(201).json({ application: { id: application.id, status: application.status } });
});

// Submit. The three edge cases from the problem statement are all enforced here, on the server.
studentRouter.post('/applications/:id/submit', async (req, res) => {
  const application = await loadOwnApplication(req);
  const { scholarship } = application;
  if (application.status !== 'DRAFT') throw new HttpError(409, 'This application has already been submitted.');

  // Edge case 3: the deadline has passed.
  if (isClosed(scholarship.deadline)) {
    await moveApplication(application, 'EXPIRED', { note: 'The deadline passed before this application was submitted.' });
    throw new HttpError(409, 'The deadline has passed, so this application can no longer be submitted.', {
      code: 'DEADLINE_PASSED',
    });
  }

  // Edge case 1: the student no longer meets every mandatory rule.
  await recomputeForUser(req.user.id, { announce: false });
  const match = await Match.findOne({ where: { userId: req.user.id, scholarshipId: scholarship.id } });
  if (!match.details.canApply) {
    throw new HttpError(409, 'Your profile no longer meets every mandatory rule for this scholarship.', {
      code: 'NOT_ELIGIBLE',
      failed: match.details.checks.filter((c) => c.mandatory && c.status !== 'pass'),
    });
  }

  // Edge case 2: a required document is missing.
  const checklist = await buildChecklist(scholarship, req.user.id, application);
  const missing = missingMandatory(checklist);
  if (missing.length) {
    const names = missing.map((m) => m.label).join(', ');
    throw new HttpError(422, `Upload these documents before you submit: ${names}.`, {
      code: 'MISSING_DOCUMENTS',
      missing: missing.map((m) => ({ docType: m.docType, label: m.label })),
    });
  }

  await sequelize.transaction(async (transaction) => {
    for (const item of checklist.filter((i) => i.document)) {
      await ApplicationDocument.findOrCreate({
        where: { applicationId: application.id, docType: item.docType },
        defaults: { status: 'UPLOADED' },
        transaction,
      });
    }
    await moveApplication(application, 'SUBMITTED', { actorId: req.user.id, note: 'Submitted by the student.', transaction });
  });
  res.json({ application: { id: application.id, status: application.status } });
});

// Send the application back to the reviewer after replacing a rejected document.
studentRouter.post('/applications/:id/resubmit', async (req, res) => {
  const application = await loadOwnApplication(req);
  if (application.status !== 'DOCUMENTS_PENDING') {
    throw new HttpError(409, 'This application is not waiting for documents.');
  }
  const checklist = await buildChecklist(application.scholarship, req.user.id, application);
  const stillRejected = checklist.filter((i) => i.review?.status === 'REJECTED');
  const missing = missingMandatory(checklist);
  if (stillRejected.length || missing.length) {
    const names = [...stillRejected, ...missing].map((m) => m.label).join(', ');
    throw new HttpError(422, `Replace these documents first: ${names}.`, { code: 'MISSING_DOCUMENTS' });
  }
  await moveApplication(application, 'UNDER_REVIEW', { actorId: req.user.id, note: 'Documents replaced by the student.' });
  res.json({ application: { id: application.id, status: application.status } });
});

// ---------- Notifications ----------

studentRouter.get('/notifications', async (req, res) => {
  const items = await Notification.findAll({ where: { userId: req.user.id }, order: [['id', 'DESC']], limit: 30 });
  res.json({
    unread: items.filter((n) => !n.readAt).length,
    notifications: items.map((n) => ({
      id: n.id, type: n.type, message: n.message, link: n.link, read: Boolean(n.readAt), at: n.createdAt,
    })),
  });
});

studentRouter.post('/notifications/read', async (req, res) => {
  await Notification.update({ readAt: new Date() }, { where: { userId: req.user.id, readAt: null } });
  res.json({ ok: true });
});
