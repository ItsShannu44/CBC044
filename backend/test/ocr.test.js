// Tests for the mismatch detection logic. Everything here is pure: no database,
// no OCR engine, no network. The finders accept the formats real Indian
// certificates print, and the comparison never guesses.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareDocument, findCgpas, findCategory, findGender, findIncomes, findState, readText,
} from '../src/services/ocr.js';

const profile = {
  cgpa: 8.2, familyIncome: 600000, category: 'OBC', gender: 'Female', state: 'Karnataka',
};

test('Indian income formats are all understood', () => {
  assert.deepEqual(findIncomes('Annual income: Rs. 6,00,000/-'), [600000]);
  assert.deepEqual(findIncomes('Family income ₹600000 per annum'), [600000]);
  assert.deepEqual(findIncomes('Total income 6 lakhs per year'), [600000]);
  assert.ok(findIncomes('Income: 5,50,000 (Rupees Five Lakh Fifty Thousand only)').includes(550000));
});

test('CGPA numbers are picked out of marks card text', () => {
  assert.deepEqual(findCgpas('Semester IV result CGPA 8.2/10'), [8.2]);
  assert.deepEqual(findCgpas('CGPA obtained: 8.20'), [8.2]);
  assert.deepEqual(findCgpas('Reg No 2024 SGPA 9.1'), [9.1]);
  assert.deepEqual(findCgpas('VTU result sheet, no decimal score'), []);
});

test('a marks card that disagrees with the profile is flagged with both values', () => {
  const r = compareDocument('MARKS_CARD', 'B.E. semester result, CGPA 6.4 out of 10', profile);
  const c = r.checks[0];
  assert.equal(c.status, 'mismatch');
  assert.equal(r.mismatches, 1);
  assert.match(c.message, /6\.4/);
  assert.match(c.message, /8\.2/);
});

test('a marks card that agrees passes quietly', () => {
  const r = compareDocument('MARKS_CARD', 'CGPA obtained: 8.2', profile);
  assert.equal(r.mismatches, 0);
  assert.equal(r.checks[0].status, 'match');
});

test('gender, category and state are read from words', () => {
  assert.equal(findGender('Name: ANANYA RAO  Female'), 'Female');
  assert.equal(findGender('Sex: MALE'), 'Male');
  assert.equal(findCategory('belongs to Other Backward Classes'), 'OBC');
  assert.equal(findCategory('Category: Scheduled Caste'), 'SC');
  assert.equal(findState('Domiciled in the State of Karnataka'), 'Karnataka');
});

test('an income certificate that disagrees is flagged with rupee amounts', () => {
  const r = compareDocument('INCOME_CERTIFICATE', 'certified annual income of Rs. 4,50,000/-', profile);
  const c = r.checks[0];
  assert.equal(c.status, 'mismatch');
  assert.match(c.message, /₹4,50,000/);
  assert.match(c.message, /₹6,00,000/);
});

test('ID proof and caste certificate mismatches are found', () => {
  const id = compareDocument('ID_PROOF', 'AADHAAR Male Karnataka', profile);
  assert.equal(id.checks[0].status, 'mismatch');
  const caste = compareDocument('CASTE_CERTIFICATE', 'belongs to Scheduled Caste community', profile);
  assert.equal(caste.checks[0].status, 'mismatch');
});

test('a value that cannot be read is reported honestly, never guessed', () => {
  const r = compareDocument('INCOME_CERTIFICATE', 'income certificate government of india', profile);
  assert.equal(r.checks[0].status, 'not_found');
  assert.equal(r.mismatches, 0);
});

test('documents with nothing to compare carry no checks', () => {
  const r = compareDocument('BANK_PASSBOOK', 'State Bank of India savings account', profile);
  assert.deepEqual(r.checks, []);
  assert.equal(r.mismatches, 0);
});

test('a missing profile value is reported, not guessed', () => {
  const r = compareDocument('MARKS_CARD', 'CGPA 8.2', { ...profile, cgpa: null });
  assert.equal(r.checks[0].status, 'not_checked');
});

test('unsupported files are skipped by the automatic read without any OCR engine', async () => {
  assert.equal((await readText(Buffer.from('%PDF-1.4 fake'), 'application/pdf')).status, 'skipped');
  assert.equal((await readText(Buffer.from('hello'), 'text/plain')).status, 'skipped');
});
