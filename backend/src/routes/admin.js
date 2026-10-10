// Everything a scholarship admin or reviewer can do.
import { Router } from 'express';
import { Op } from 'sequelize';
import { evaluate, validateRule } from '../engine/eligibility.js';
import { DOC_TYPES, PROFILE_KEYS } from '../engine/fields.js';
import { HttpError } from '../errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  APPLICATION_STATUSES, Application, ApplicationDocument, Criterion, Document, Match, Profile,
  RequiredDocument, Scholarship, StatusHistory, User, sequelize,
} from '../models/index.js';
import { deadlineFromDate, isClosed } from '../services/dates.js';
import { recomputeForScholarship } from '../services/matching.js';
import { notify } from '../services/notify.js';
import { buildChecklist, scholarshipView } from '../services/views.js';
import { ADMIN_MOVES, STATUS_LABELS, moveApplication } from '../services/workflow.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

const scholarshipIncludes = [
  { model: Criterion, as: 'criteria' },
  { model: RequiredDocument, as: 'requiredDocuments' },
];
const order = [
  [{ model: Criterion, as: 'criteria' }, 'id', 'ASC'],
  [{ model: RequiredDocument, as: 'requiredDocuments' }, 'id', 'ASC'],
];

// ---------- Scholarships and their rules ----------

function readScholarshipForm(body) {
  const errors = [];
  const name = String(body.name || '').trim();
  const provider = String(body.provider || '').trim();
  const description = String(body.description || '').trim();
  const amount = Number(body.amount);
  const deadline = deadlineFromDate(body.deadline);

  if (!name) errors.push('Enter the scholarship name.');
  if (!provider) errors.push('Enter who provides the scholarship.');
  if (!Number.isInteger(amount) || amount < 0) errors.push('Enter the amount in whole rupees.');
  if (!deadline) errors.push('Choose a deadline date.');

  const rules = Array.isArray(body.rules) ? body.rules : [];
  const cleanRules = rules.map((r) => ({
    field: r.field,
    operator: r.operator,
    value: r.value,
    mandatory: r.mandatory !== false,
    weight: Number.isInteger(Number(r.weight)) && Number(r.weight) > 0 ? Number(r.weight) : 1,
  }));
  cleanRules.forEach((rule, i) => {
    const problem = validateRule(rule);
    if (problem) errors.push(`Rule ${i + 1}: ${problem}`);
  });

  const seen = new Set();
  const documents = [];
  for (const d of Array.isArray(body.documents) ? body.documents : []) {
    if (!DOC_TYPES[d.docType]) {
      errors.push('One of the required documents is not a known document type.');
    } else if (!seen.has(d.docType)) {
      seen.add(d.docType);
      documents.push({ docType: d.docType, mandatory: d.mandatory !== false });
    }
  }

  if (errors.length) throw new HttpError(422, errors[0], { errors });
  return { scholarship: { name, provider, description, amount, deadline }, rules: cleanRules, documents };
}

adminRouter.get('/scholarships', async (_req, res) => {
  const scholarships = await Scholarship.findAll({ include: scholarshipIncludes, order: [['deadline', 'ASC'], ...order] });
  const matches = await Match.findAll({ attributes: ['scholarshipId', 'result'] });
  const applications = await Application.findAll({ attributes: ['scholarshipId', 'status'] });

  res.json({
    scholarships: scholarships.map((s) => ({
      ...scholarshipView(s),
      eligibleStudents: matches.filter((m) => m.scholarshipId === s.id && m.result === 'ELIGIBLE').length,
      applications: applications.filter((a) => a.scholarshipId === s.id && a.status !== 'DRAFT').length,
    })),
  });
});

adminRouter.get('/scholarships/:id', async (req, res) => {
  const scholarship = await Scholarship.findByPk(req.params.id, { include: scholarshipIncludes, order });
  if (!scholarship) throw new HttpError(404, 'This scholarship does not exist.');
  res.json({ scholarship: scholarshipView(scholarship) });
});

adminRouter.post('/scholarships', async (req, res) => {
  const form = readScholarshipForm(req.body);
  const scholarship = await sequelize.transaction(async (transaction) => {
    const created = await Scholarship.create(form.scholarship, { transaction });
    await Criterion.bulkCreate(form.rules.map((r) => ({ ...r, scholarshipId: created.id })), { transaction });
    await RequiredDocument.bulkCreate(form.documents.map((d) => ({ ...d, scholarshipId: created.id })), { transaction });
    return created;
  });
  // Auto-Match: a new scholarship is checked against every student, and those who qualify are told.
  await recomputeForScholarship(scholarship.id);
  res.status(201).json({ id: scholarship.id });
});

adminRouter.put('/scholarships/:id', async (req, res) => {
  const scholarship = await Scholarship.findByPk(req.params.id);
  if (!scholarship) throw new HttpError(404, 'This scholarship does not exist.');
  const form = readScholarshipForm(req.body);
  await sequelize.transaction(async (transaction) => {
    await scholarship.update(form.scholarship, { transaction });
    await Criterion.destroy({ where: { scholarshipId: scholarship.id }, transaction });
    await RequiredDocument.destroy({ where: { scholarshipId: scholarship.id }, transaction });
    await Criterion.bulkCreate(form.rules.map((r) => ({ ...r, scholarshipId: scholarship.id })), { transaction });
    await RequiredDocument.bulkCreate(form.documents.map((d) => ({ ...d, scholarshipId: scholarship.id })), { transaction });
  });
  await recomputeForScholarship(scholarship.id);
  res.json({ id: scholarship.id });
});

adminRouter.delete('/scholarships/:id', async (req, res) => {
  const scholarship = await Scholarship.findByPk(req.params.id);
  if (!scholarship) throw new HttpError(404, 'This scholarship does not exist.');
  const used = await Application.count({ where: { scholarshipId: scholarship.id } });
  if (used) throw new HttpError(409, 'Students have applications for this scholarship, so it cannot be deleted.');
  await scholarship.destroy();
  res.json({ ok: true });
});

// ---------- Overview dashboard ----------

adminRouter.get('/stats', async (_req, res) => {
  const [students, scholarships, applications, documents, history] = await Promise.all([
    User.count({ where: { role: 'STUDENT' } }),
    Scholarship.findAll({ attributes: ['id', 'deadline'] }),
    Application.findAll({ attributes: ['status'] }),
    Document.findAll({ attributes: ['ocr'] }),
    StatusHistory.findAll({
      order: [['id', 'DESC']],
      limit: 10,
      include: [{
        model: Application,
        as: 'application',
        attributes: ['id'],
        include: [
          { model: User, as: 'student', attributes: ['name'] },
          { model: Scholarship, as: 'scholarship', attributes: ['name'] },
        ],
      }],
    }),
  ]);

  const now = new Date();
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0]));
  for (const a of applications) byStatus[a.status] += 1;

  res.json({
    students,
    scholarships: {
      total: scholarships.length,
      open: scholarships.filter((s) => !isClosed(s.deadline, now)).length,
    },
    applications: {
      total: applications.filter((a) => a.status !== 'DRAFT').length,
      byStatus,
      actionable: byStatus.SUBMITTED + byStatus.UNDER_REVIEW + byStatus.DOCUMENTS_PENDING,
    },
    documents: {
      total: documents.length,
      flagged: documents.filter((d) => (d.ocr?.mismatches || 0) > 0).length,
    },
    recent: history.map((h) => ({
      to: h.toStatus,
      note: h.note,
      at: h.createdAt,
      student: h.application?.student?.name || null,
      scholarship: h.application?.scholarship?.name || null,
    })),
  });
});

// ---------- Reviewing applications ----------

adminRouter.get('/applications', async (req, res) => {
  const where = {};
  if (APPLICATION_STATUSES.includes(req.query.status)) where.status = req.query.status;
  const applications = await Application.findAll({
    where,
    include: [
      { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
      { model: Scholarship, as: 'scholarship', attributes: ['id', 'name', 'deadline'] },
    ],
    order: [['updatedAt', 'DESC']],
  });
  res.json({
    applications: applications
      .filter((a) => req.query.status || a.status !== 'DRAFT')
      .map((a) => ({
        id: a.id,
        status: a.status,
        submittedAt: a.submittedAt,
        updatedAt: a.updatedAt,
        student: a.student,
        scholarship: a.scholarship,
      })),
  });
});

async function loadApplication(id) {
  const application = await Application.findByPk(id, {
    include: [
      { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
      { model: Scholarship, as: 'scholarship', include: scholarshipIncludes },
      { model: ApplicationDocument, as: 'reviews' },
      { model: StatusHistory, as: 'history' },
    ],
    order: [
      [{ model: StatusHistory, as: 'history' }, 'id', 'ASC'],
      [{ model: Scholarship, as: 'scholarship' }, { model: Criterion, as: 'criteria' }, 'id', 'ASC'],
      [{ model: Scholarship, as: 'scholarship' }, { model: RequiredDocument, as: 'requiredDocuments' }, 'id', 'ASC'],
    ],
  });
  if (!application) throw new HttpError(404, 'This application does not exist.');
  return application;
}

adminRouter.get('/applications/:id', async (req, res) => {
  const application = await loadApplication(req.params.id);
  const profile = await Profile.findByPk(application.userId);
  const plainProfile = profile ? profile.get({ plain: true }) : null;
  const rules = application.scholarship.criteria.map((c) => c.get({ plain: true }));

  res.json({
    application: {
      id: application.id,
      status: application.status,
      submittedAt: application.submittedAt,
      history: application.history.map((h) => ({ from: h.fromStatus, to: h.toStatus, note: h.note, at: h.createdAt })),
      allowedMoves: ADMIN_MOVES[application.status] || [],
    },
    student: application.student,
    profile: plainProfile,
    scholarship: scholarshipView(application.scholarship),
    // Checked again right now, so the reviewer sees the current position, not a stored one.
    match: evaluate(plainProfile, rules),
    checklist: await buildChecklist(application.scholarship, application.userId, application),
  });
});

adminRouter.post('/applications/:id/status', async (req, res) => {
  const application = await loadApplication(req.params.id);
  const to = String(req.body.to || '');
  const note = String(req.body.note || '').trim().slice(0, 250) || null;

  if (!(ADMIN_MOVES[application.status] || []).includes(to)) {
    throw new HttpError(409, `An application that is ${STATUS_LABELS[application.status]} cannot be moved there.`);
  }
  if (to === 'REJECTED' && !note) throw new HttpError(422, 'Give the student a reason for the rejection.');
  if (to === 'APPROVED') {
    const checklist = await buildChecklist(application.scholarship, application.userId, application);
    const unverified = checklist.filter((i) => i.mandatory && i.review?.status !== 'VERIFIED');
    if (unverified.length) {
      throw new HttpError(409, `Verify these documents before you approve: ${unverified.map((i) => i.label).join(', ')}.`);
    }
  }

  await moveApplication(application, to, { actorId: req.user.id, note });
  await notify(application.userId, {
    type: 'STATUS',
    message: `Your application for ${application.scholarship.name} is now ${STATUS_LABELS[to]}.${note ? ` Note: ${note}` : ''}`,
    link: `/scholarships/${application.scholarshipId}`,
  });
  res.json({ status: application.status });
});

// Verify or reject one document. A rejection sends the application back to the student.
adminRouter.post('/applications/:id/documents/:docType', async (req, res) => {
  const application = await loadApplication(req.params.id);
  const { docType } = req.params;
  const verdict = String(req.body.status || '');
  const reason = String(req.body.reason || '').trim().slice(0, 250);

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(application.status)) {
    throw new HttpError(409, 'Documents can only be reviewed while the application is submitted or under review.');
  }
  if (!['VERIFIED', 'REJECTED'].includes(verdict)) throw new HttpError(422, 'Choose verify or reject.');
  if (verdict === 'REJECTED' && !reason) throw new HttpError(422, 'Tell the student what is wrong with the document.');

  const review = application.reviews.find((r) => r.docType === docType);
  if (!review) throw new HttpError(404, 'This document is not part of the application.');

  await sequelize.transaction(async (transaction) => {
    await review.update({ status: verdict, reason: verdict === 'REJECTED' ? reason : null }, { transaction });
    if (verdict === 'REJECTED') {
      const label = DOC_TYPES[docType] || docType;
      await moveApplication(application, 'DOCUMENTS_PENDING', {
        actorId: req.user.id, note: `${label} was not accepted: ${reason}`, transaction,
      });
    }
  });

  if (verdict === 'REJECTED') {
    await notify(application.userId, {
      type: 'DOCUMENT_REJECTED',
      message: `${DOC_TYPES[docType] || docType} for ${application.scholarship.name} was not accepted: ${reason} Upload a new file to continue.`,
      link: `/scholarships/${application.scholarshipId}`,
    });
  }
  res.json({ status: application.status });
});

// ---------- Users ----------
// Everyone registered on the platform, with a short summary of where each
// student stands. Read-only: the password hash is never sent.

const USER_SORTS = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  name: (a, b) => a.name.localeCompare(b.name),
  applications: (a, b) => b.applications.total - a.applications.total || a.name.localeCompare(b.name),
  profile: (a, b) => b.profile.completeness - a.profile.completeness || a.name.localeCompare(b.name),
};
const ACTIVE = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING'];

async function summarizeUsers(users) {
  const ids = users.map((u) => u.id);
  if (!ids.length) return [];
  const [profiles, applications, documents, matches] = await Promise.all([
    Profile.findAll({ where: { userId: ids } }),
    Application.findAll({ where: { userId: ids }, attributes: ['id', 'userId', 'status'] }),
    Document.findAll({ where: { userId: ids }, attributes: ['id', 'userId', 'ocr'] }),
    Match.findAll({ where: { userId: ids }, attributes: ['userId', 'result'] }),
  ]);
  const group = (rows) => rows.reduce((m, r) => m.set(r.userId, [...(m.get(r.userId) || []), r]), new Map());
  const profileBy = new Map(profiles.map((p) => [p.userId, p]));
  const appsBy = group(applications);
  const docsBy = group(documents);
  const matchBy = group(matches);

  return users.map((u) => {
    const p = profileBy.get(u.id);
    const filled = PROFILE_KEYS.filter((k) => p && p[k] !== null && p[k] !== undefined).length;
    const apps = appsBy.get(u.id) || [];
    const docs = docsBy.get(u.id) || [];
    const byStatus = apps.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      profile: {
        completeness: Math.round((filled / PROFILE_KEYS.length) * 100),
        level: p?.level ?? null,
        stream: p?.stream ?? null,
        category: p?.category ?? null,
        state: p?.state ?? null,
      },
      applications: {
        total: apps.length,
        active: apps.filter((a) => ACTIVE.includes(a.status)).length,
        approved: byStatus.APPROVED || 0,
        byStatus,
      },
      documents: { total: docs.length, flagged: docs.filter((d) => d.ocr?.mismatches > 0).length },
      eligible: (matchBy.get(u.id) || []).filter((m) => m.result === 'ELIGIBLE').length,
    };
  });
}

adminRouter.get('/users', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const role = ['STUDENT', 'ADMIN'].includes(req.query.role) ? req.query.role : null;
  const where = {};
  if (role) where.role = role;
  if (q) {
    // % and _ are wildcards in LIKE; escape them so they match themselves.
    const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    where[Op.or] = [{ name: { [Op.iLike]: like } }, { email: { [Op.iLike]: like } }];
  }

  const users = await User.findAll({ where, attributes: ['id', 'name', 'email', 'role', 'createdAt'] });
  let list = await summarizeUsers(users);

  // Filters that depend on the summary.
  const { profile, activity, category, state, level } = req.query;
  if (profile === 'complete') list = list.filter((u) => u.profile.completeness === 100);
  if (profile === 'incomplete') list = list.filter((u) => u.profile.completeness < 100);
  if (activity === 'applied') list = list.filter((u) => u.applications.total > 0);
  if (activity === 'active') list = list.filter((u) => u.applications.active > 0);
  if (activity === 'none') list = list.filter((u) => u.applications.total === 0);
  if (activity === 'flagged') list = list.filter((u) => u.documents.flagged > 0);
  if (category) list = list.filter((u) => u.profile.category === category);
  if (state) list = list.filter((u) => u.profile.state === state);
  if (level) list = list.filter((u) => u.profile.level === level);

  list.sort(USER_SORTS[req.query.sort] || USER_SORTS.newest);

  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(req.query.page, 10) || 1));

  // Totals for the header ignore the filters, so they always describe the whole platform.
  const [total, students, admins, newThisWeek] = await Promise.all([
    User.count(),
    User.count({ where: { role: 'STUDENT' } }),
    User.count({ where: { role: 'ADMIN' } }),
    User.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);

  res.json({
    totals: { total, students, admins, newThisWeek },
    matched: list.length,
    page,
    pages,
    pageSize,
    users: list.slice((page - 1) * pageSize, page * pageSize),
  });
});

adminRouter.get('/users/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const user = Number.isInteger(id) ? await User.findByPk(id, { attributes: ['id', 'name', 'email', 'role', 'createdAt'] }) : null;
  if (!user) throw new HttpError(404, 'This user does not exist.');
  const [summary] = await summarizeUsers([user]);
  const [profile, applications, documents] = await Promise.all([
    Profile.findByPk(user.id),
    Application.findAll({
      where: { userId: user.id },
      include: [{ model: Scholarship, as: 'scholarship', attributes: ['id', 'name', 'amount', 'deadline'] }],
      order: [['updatedAt', 'DESC']],
    }),
    Document.findAll({ where: { userId: user.id }, order: [['docType', 'ASC']] }),
  ]);
  res.json({
    user: summary,
    profile: profile ? Object.fromEntries(PROFILE_KEYS.map((k) => [k, profile[k] ?? null])) : null,
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      statusLabel: STATUS_LABELS[a.status] || a.status,
      updatedAt: a.updatedAt,
      scholarship: a.scholarship ? { id: a.scholarship.id, name: a.scholarship.name, amount: a.scholarship.amount } : null,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      docType: d.docType,
      label: DOC_TYPES[d.docType] || d.docType,
      fileName: d.fileName,
      uploadedAt: d.updatedAt,
      ocr: d.ocr ? { status: d.ocr.status, mismatches: d.ocr.mismatches || 0 } : null,
    })),
  });
});
