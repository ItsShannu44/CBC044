import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITIONS, canMove } from '../src/services/workflow.js';
import { daysLeft, deadlineFromDate, isClosed, istDate } from '../src/services/dates.js';
import { sniffFileType } from '../src/services/files.js';

test('only the allowed status moves are possible', () => {
  assert.ok(canMove('DRAFT', 'SUBMITTED'));
  assert.ok(canMove('SUBMITTED', 'UNDER_REVIEW'));
  assert.ok(canMove('UNDER_REVIEW', 'DOCUMENTS_PENDING'));
  assert.ok(canMove('DOCUMENTS_PENDING', 'UNDER_REVIEW'));
  assert.ok(!canMove('DRAFT', 'APPROVED'));
  assert.ok(!canMove('SUBMITTED', 'APPROVED'));
  assert.ok(!canMove('SUBMITTED', 'DRAFT'));
  for (const final of ['APPROVED', 'REJECTED', 'EXPIRED']) assert.deepEqual(TRANSITIONS[final], []);
});

test('a deadline date lasts until the end of that day in India', () => {
  const deadline = deadlineFromDate('2026-11-10');
  assert.equal(deadline.toISOString(), '2026-11-10T18:29:59.000Z');
  assert.equal(isClosed(deadline, new Date('2026-11-10T18:00:00Z')), false); // 11:30 pm IST
  assert.equal(isClosed(deadline, new Date('2026-11-10T18:30:00Z')), true); // midnight IST
  assert.equal(deadlineFromDate('tomorrow'), null);
});

test('days left are counted in calendar days, India time', () => {
  const deadline = deadlineFromDate('2026-11-10');
  assert.equal(daysLeft(deadline, new Date('2026-11-07T04:00:00Z')), 3);
  assert.equal(daysLeft(deadline, new Date('2026-11-10T04:00:00Z')), 0);
  assert.equal(daysLeft(deadline, new Date('2026-11-09T19:00:00Z')), 0); // already the 10th in India
  assert.equal(istDate(new Date('2026-11-09T19:00:00Z')), '2026-11-10');
});

test('file type is read from the file contents', () => {
  assert.equal(sniffFileType(Buffer.from('%PDF-1.7 ...')), 'application/pdf');
  assert.equal(sniffFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d])), 'image/png');
  assert.equal(sniffFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffFileType(Buffer.from('MZ executable')), null);
  assert.equal(sniffFileType(Buffer.alloc(0)), null);
});
