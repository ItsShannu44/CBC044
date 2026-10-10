import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, checkRule, describeRule, validateRule } from '../src/engine/eligibility.js';

const profile = {
  level: 'UG', stream: 'Engineering', yearOfStudy: 2, cgpa: 8.2, familyIncome: 600000,
  category: 'OBC', gender: 'Female', state: 'Karnataka', disability: false,
};

test('all mandatory rules pass -> ELIGIBLE and can apply', () => {
  const r = evaluate(profile, [
    { field: 'cgpa', operator: 'gte', value: 7.5, mandatory: true },
    { field: 'level', operator: 'in', value: ['UG', 'PG'], mandatory: true },
  ]);
  assert.equal(r.result, 'ELIGIBLE');
  assert.equal(r.canApply, true);
  assert.equal(r.score, 100);
});

test('failed preferred rule keeps ELIGIBLE but lowers the score', () => {
  const r = evaluate(profile, [
    { field: 'cgpa', operator: 'gte', value: 7.5, mandatory: true },
    { field: 'state', operator: 'eq', value: 'Kerala', mandatory: false },
  ]);
  assert.equal(r.result, 'ELIGIBLE');
  assert.equal(r.score, 50);
});

test('edge case: student partially meets criteria -> PARTIAL with the gap explained', () => {
  const r = evaluate(profile, [
    { field: 'familyIncome', operator: 'lte', value: 500000, mandatory: true },
    { field: 'cgpa', operator: 'gte', value: 6, mandatory: true },
  ]);
  assert.equal(r.result, 'PARTIAL');
  assert.equal(r.canApply, false);
  const income = r.checks.find((c) => c.field === 'familyIncome');
  assert.equal(income.status, 'fail');
  assert.match(income.reason, /₹6,00,000/);
  assert.match(income.reason, /₹1,00,000 over/);
});

test('fewer than half of the mandatory rules pass -> NOT_ELIGIBLE', () => {
  const r = evaluate(profile, [
    { field: 'cgpa', operator: 'gte', value: 9, mandatory: true },
    { field: 'yearOfStudy', operator: 'gte', value: 3, mandatory: true },
    { field: 'gender', operator: 'eq', value: 'Female', mandatory: true },
  ]);
  assert.equal(r.result, 'NOT_ELIGIBLE');
});

test('missing profile field is reported as unknown, never as a pass', () => {
  const r = evaluate({ ...profile, familyIncome: null }, [
    { field: 'familyIncome', operator: 'lte', value: 500000, mandatory: true },
  ]);
  assert.equal(r.checks[0].status, 'unknown');
  assert.equal(r.canApply, false);
  assert.deepEqual(r.missingFields, ['familyIncome']);
});

test('a profile that does not exist yet fails safely', () => {
  const r = evaluate(null, [{ field: 'cgpa', operator: 'gte', value: 7, mandatory: true }]);
  assert.equal(r.result, 'NOT_ELIGIBLE');
});

test('boundary values count as a pass', () => {
  assert.equal(checkRule(profile, { field: 'cgpa', operator: 'gte', value: 8.2 }).status, 'pass');
  assert.equal(checkRule(profile, { field: 'familyIncome', operator: 'lte', value: 600000 }).status, 'pass');
});

test('shortfall is rounded sensibly', () => {
  const c = checkRule({ cgpa: 7.1 }, { field: 'cgpa', operator: 'gte', value: 7.5 });
  assert.match(c.reason, /0\.4 short/);
});

test('boolean and enum rules', () => {
  assert.equal(checkRule(profile, { field: 'disability', operator: 'eq', value: true }).status, 'fail');
  assert.equal(checkRule(profile, { field: 'category', operator: 'in', value: ['SC', 'ST', 'OBC'] }).status, 'pass');
  assert.equal(checkRule(profile, { field: 'category', operator: 'neq', value: 'General' }).status, 'pass');
});

test('a scholarship with no rules is open to everyone', () => {
  const r = evaluate(profile, []);
  assert.equal(r.result, 'ELIGIBLE');
  assert.equal(r.score, 100);
});

test('rules read as plain sentences', () => {
  assert.equal(describeRule({ field: 'cgpa', operator: 'gte', value: 7.5 }), 'CGPA is at least 7.5');
  assert.equal(
    describeRule({ field: 'familyIncome', operator: 'lte', value: 500000 }),
    'Annual family income is at most ₹5,00,000',
  );
  assert.equal(describeRule({ field: 'category', operator: 'in', value: ['SC', 'ST'] }), 'Category is one of SC, ST');
});

test('admin rule validation', () => {
  assert.equal(validateRule({ field: 'cgpa', operator: 'gte', value: 7 }), null);
  assert.ok(validateRule({ field: 'cgpa', operator: 'in', value: [7] }));
  assert.ok(validateRule({ field: 'category', operator: 'in', value: [] }));
  assert.ok(validateRule({ field: 'category', operator: 'eq', value: 'Alien' }));
  assert.ok(validateRule({ field: 'shoeSize', operator: 'eq', value: 9 }));
});
