// Deadline job. Safe to run as often as you like: every step checks before it acts.
//  1. Drafts whose deadline has passed become EXPIRED.
//  2. Students who qualify but have not submitted get a reminder 7, 3 and 1 days before the deadline.

import { Op } from 'sequelize';
import { Application, Match, Scholarship } from '../models/index.js';
import { daysLeft, isClosed } from './dates.js';
import { notify } from './notify.js';
import { moveApplication } from './workflow.js';

export const REMINDER_DAYS = [7, 3, 1];

export async function runDeadlineJob(now = new Date()) {
  const scholarships = await Scholarship.findAll();
  let expired = 0;
  let reminders = 0;

  for (const s of scholarships) {
    const link = `/scholarships/${s.id}`;

    if (isClosed(s.deadline, now)) {
      const drafts = await Application.findAll({ where: { scholarshipId: s.id, status: 'DRAFT' } });
      for (const draft of drafts) {
        await moveApplication(draft, 'EXPIRED', { note: 'The deadline passed before this application was submitted.' });
        await notify(draft.userId, {
          type: 'EXPIRED',
          message: `Your draft for ${s.name} expired because the deadline passed.`,
          link,
        });
        expired += 1;
      }
      continue;
    }

    const left = daysLeft(s.deadline, now);
    if (!REMINDER_DAYS.includes(left)) continue;

    const eligible = await Match.findAll({ where: { scholarshipId: s.id, result: 'ELIGIBLE' } });
    const done = await Application.findAll({
      where: { scholarshipId: s.id, status: { [Op.ne]: 'DRAFT' } },
      attributes: ['userId'],
    });
    const submitted = new Set(done.map((a) => a.userId));

    for (const match of eligible) {
      if (submitted.has(match.userId)) continue;
      const created = await notify(match.userId, {
        type: 'DEADLINE',
        message: `${left} day${left === 1 ? '' : 's'} left to apply for ${s.name}.`,
        link,
        dedupeKey: `deadline:${s.id}:${left}`,
      });
      if (created) reminders += 1;
    }
  }
  return { expired, reminders };
}
