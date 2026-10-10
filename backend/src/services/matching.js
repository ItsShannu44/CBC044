// Auto-Match: runs the engine by itself whenever a profile or a scholarship changes,
// stores the result, and tells the student when something new opens up for them.

import { Op } from 'sequelize';
import { evaluate } from '../engine/eligibility.js';
import { Application, Criterion, Match, Profile, Scholarship, User } from '../models/index.js';
import { isClosed, istDate } from './dates.js';
import { notify } from './notify.js';

const ACTIVE = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING'];
// Rules are always checked and shown in the order the admin entered them.
const RULE_ORDER = [[{ model: Criterion, as: 'criteria' }, 'id', 'ASC']];

function plainRules(scholarship) {
  return scholarship.criteria.map((c) => c.get({ plain: true }));
}

async function storeMatch(userId, scholarship, profile, { announce }) {
  const outcome = evaluate(profile, plainRules(scholarship));
  const existing = await Match.findOne({ where: { userId, scholarshipId: scholarship.id } });
  const before = existing ? existing.result : null;

  if (existing) {
    await existing.update({ result: outcome.result, score: outcome.score, details: outcome });
  } else {
    await Match.create({
      userId, scholarshipId: scholarship.id, result: outcome.result, score: outcome.score, details: outcome,
    });
  }

  const open = !isClosed(scholarship.deadline);
  const link = `/scholarships/${scholarship.id}`;

  // Newly eligible for an open scholarship: tell the student without being asked.
  if (announce && open && outcome.result === 'ELIGIBLE' && before !== 'ELIGIBLE') {
    await notify(userId, {
      type: 'NEW_MATCH',
      message: `You qualify for ${scholarship.name}. Apply by ${formatDeadline(scholarship.deadline)}.`,
      link,
      dedupeKey: `match:${scholarship.id}:${istDate(new Date())}`,
    });
  }

  // No longer eligible while an application is in progress: warn straight away.
  if (before === 'ELIGIBLE' && outcome.result !== 'ELIGIBLE') {
    const active = await Application.findOne({
      where: { userId, scholarshipId: scholarship.id, status: { [Op.in]: ACTIVE } },
    });
    if (active) {
      await notify(userId, {
        type: 'ELIGIBILITY_LOST',
        message: `After a recent change you no longer meet every rule for ${scholarship.name}. Open it to see what changed.`,
        link,
      });
    }
  }
  return outcome;
}

export function formatDeadline(deadline) {
  return new Date(deadline).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

// Trigger 1: a student saved their profile (or just registered).
export async function recomputeForUser(userId, { announce = true } = {}) {
  const profile = await Profile.findByPk(userId);
  const scholarships = await Scholarship.findAll({ include: [{ model: Criterion, as: 'criteria' }], order: RULE_ORDER });
  const plain = profile ? profile.get({ plain: true }) : null;
  for (const s of scholarships) {
    await storeMatch(userId, s, plain, { announce });
  }
}

// Trigger 2: an admin added or changed a scholarship.
export async function recomputeForScholarship(scholarshipId, { announce = true } = {}) {
  const scholarship = await Scholarship.findByPk(scholarshipId, {
    include: [{ model: Criterion, as: 'criteria' }], order: RULE_ORDER,
  });
  if (!scholarship) return;
  const students = await User.findAll({ where: { role: 'STUDENT' }, include: [Profile] });
  for (const student of students) {
    const plain = student.Profile ? student.Profile.get({ plain: true }) : null;
    await storeMatch(student.id, scholarship, plain, { announce });
  }
}
