// End-to-end API test against a real PostgreSQL database.
// It WIPES the database it is pointed at, so it only runs when TEST_DATABASE_URL is set:
//   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/vidyasutra_test npm run test:api
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'set TEST_DATABASE_URL to run the API tests';
if (url) process.env.DATABASE_URL = url;

let server, base, models, runDeadlineJob, DEMO;
const tokens = {};

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

async function api(method, path, { as, body, form } = {}) {
  const headers = {};
  if (as) headers.Authorization = `Bearer ${tokens[as]}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
}

function upload(as, docType, buffer = PDF, name = 'file.pdf') {
  const form = new FormData();
  form.append('docType', docType);
  form.append('file', new Blob([buffer]), name);
  return api('POST', '/api/documents', { as, form });
}

const byName = (items, name) => items.find((i) => i.scholarship.name === name);

before(async () => {
  if (skip) return;
  models = await import('../src/models/index.js');
  const { seedDemoData, DEMO_ACCOUNTS } = await import('../src/seed-data.js');
  ({ runDeadlineJob } = await import('../src/services/deadlines.js'));
  const { createApp } = await import('../src/app.js');
  DEMO = DEMO_ACCOUNTS;
  await models.sequelize.sync({ force: true });
  await seedDemoData();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const who of ['admin', 'student']) {
    const r = await api('POST', '/api/auth/login', { body: { email: DEMO[who].email, password: DEMO[who].password } });
    tokens[who] = r.body.token;
  }
});

after(async () => {
  if (skip) return;
  server.close();
  await models.sequelize.close();
});

test('the dashboard sorts every scholarship into the right group, with reasons', { skip }, async () => {
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  assert.equal(body.items.length, 8);
  assert.deepEqual(body.missingProfileFields, []);
  const result = (name) => byName(body.items, name).match.result;
  assert.equal(result('Merit Award for Degree Students'), 'ELIGIBLE');
  assert.equal(result('Women in Technology Grant'), 'ELIGIBLE');
  assert.equal(result('Post-Matric Support for Backward Classes'), 'ELIGIBLE');
  assert.equal(result('Means-Based Study Scholarship'), 'PARTIAL');
  assert.equal(result('Postgraduate Research Fellowship'), 'PARTIAL');
  assert.equal(result('Founders Excellence Scholarship'), 'NOT_ELIGIBLE');
  assert.equal(result('Support Scholarship for Students with Disabilities'), 'NOT_ELIGIBLE');
  assert.equal(byName(body.items, 'Early Bird Merit Scholarship').scholarship.closed, true);

  const income = byName(body.items, 'Means-Based Study Scholarship').match.checks.find((c) => c.field === 'familyIncome');
  assert.match(income.reason, /₹1,00,000 over/);
});

test('edge case: a partial match cannot start an application', { skip }, async () => {
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  const id = byName(body.items, 'Means-Based Study Scholarship').scholarship.id;
  const r = await api('POST', '/api/applications', { as: 'student', body: { scholarshipId: id } });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'NOT_ELIGIBLE');
});

test('edge case: a closed scholarship cannot be applied for', { skip }, async () => {
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  const id = byName(body.items, 'Early Bird Merit Scholarship').scholarship.id;
  const r = await api('POST', '/api/applications', { as: 'student', body: { scholarshipId: id } });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'DEADLINE_PASSED');
});

let meritId, appId;

test('edge case: submission is blocked while a required document is missing', { skip }, async () => {
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  meritId = byName(body.items, 'Merit Award for Degree Students').scholarship.id;
  const started = await api('POST', '/api/applications', { as: 'student', body: { scholarshipId: meritId } });
  assert.equal(started.status, 201);
  appId = started.body.application.id;

  const r = await api('POST', `/api/applications/${appId}/submit`, { as: 'student' });
  assert.equal(r.status, 422);
  assert.equal(r.body.code, 'MISSING_DOCUMENTS');
  assert.deepEqual(r.body.missing.map((m) => m.docType).sort(), ['BONAFIDE_CERTIFICATE', 'ID_PROOF', 'MARKS_CARD']);

  const detail = await api('GET', `/api/scholarships/${meritId}`, { as: 'student' });
  assert.equal(detail.body.application.status, 'DRAFT');
});

test('uploads are checked by content, size and emptiness', { skip }, async () => {
  assert.equal((await upload('student', 'MARKS_CARD', Buffer.from('hello, not a pdf'), 'fake.pdf')).status, 422);
  assert.equal((await upload('student', 'MARKS_CARD', Buffer.alloc(0))).status, 422);
  assert.equal((await upload('student', 'MARKS_CARD', Buffer.concat([PDF, Buffer.alloc(3 * 1024 * 1024)]))).status, 422);
  assert.equal((await upload('student', 'NOT_A_TYPE')).status, 422);
});

test('with every mandatory document uploaded the application is submitted', { skip }, async () => {
  for (const t of ['MARKS_CARD', 'ID_PROOF', 'BONAFIDE_CERTIFICATE']) {
    assert.equal((await upload('student', t)).status, 201);
  }
  const r = await api('POST', `/api/applications/${appId}/submit`, { as: 'student' });
  assert.equal(r.status, 200);
  assert.equal(r.body.application.status, 'SUBMITTED');
  // The optional recommendation letter was not needed.
});

test('review: reject a document, student replaces it, then approve', { skip }, async () => {
  const queue = await api('GET', '/api/admin/applications', { as: 'admin' });
  assert.equal(queue.body.applications.length, 1);

  let r = await api('POST', `/api/admin/applications/${appId}/status`, { as: 'admin', body: { to: 'UNDER_REVIEW' } });
  assert.equal(r.body.status, 'UNDER_REVIEW');

  // Cannot approve before the documents are verified.
  r = await api('POST', `/api/admin/applications/${appId}/status`, { as: 'admin', body: { to: 'APPROVED' } });
  assert.equal(r.status, 409);

  // A rejection needs a reason.
  r = await api('POST', `/api/admin/applications/${appId}/documents/MARKS_CARD`, { as: 'admin', body: { status: 'REJECTED' } });
  assert.equal(r.status, 422);

  r = await api('POST', `/api/admin/applications/${appId}/documents/MARKS_CARD`, {
    as: 'admin', body: { status: 'REJECTED', reason: 'The scan is unreadable.' },
  });
  assert.equal(r.body.status, 'DOCUMENTS_PENDING');

  const notes = await api('GET', '/api/notifications', { as: 'student' });
  assert.ok(notes.body.notifications.some((n) => n.type === 'DOCUMENT_REJECTED' && /unreadable/.test(n.message)));

  // Resubmitting without a new file is refused.
  r = await api('POST', `/api/applications/${appId}/resubmit`, { as: 'student' });
  assert.equal(r.status, 422);

  assert.equal((await upload('student', 'MARKS_CARD')).status, 201);
  r = await api('POST', `/api/applications/${appId}/resubmit`, { as: 'student' });
  assert.equal(r.body.application.status, 'UNDER_REVIEW');

  for (const t of ['MARKS_CARD', 'ID_PROOF', 'BONAFIDE_CERTIFICATE']) {
    r = await api('POST', `/api/admin/applications/${appId}/documents/${t}`, { as: 'admin', body: { status: 'VERIFIED' } });
    assert.equal(r.status, 200);
  }
  r = await api('POST', `/api/admin/applications/${appId}/status`, { as: 'admin', body: { to: 'APPROVED' } });
  assert.equal(r.body.status, 'APPROVED');

  const detail = await api('GET', `/api/scholarships/${meritId}`, { as: 'student' });
  assert.deepEqual(detail.body.application.history.map((h) => h.to), [
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'APPROVED',
  ]);

  // A finished application cannot be moved again.
  r = await api('POST', `/api/admin/applications/${appId}/status`, { as: 'admin', body: { to: 'REJECTED', note: 'x' } });
  assert.equal(r.status, 409);
});

test('deadline reminders go out once, 3 days before, to students who qualify but have not applied', { skip }, async () => {
  const first = await runDeadlineJob();
  assert.equal(first.reminders, 1);
  const second = await runDeadlineJob();
  assert.equal(second.reminders, 0);
  const notes = await api('GET', '/api/notifications', { as: 'student' });
  assert.ok(notes.body.notifications.some((n) => n.type === 'DEADLINE' && /3 days left.*Women in Technology/.test(n.message)));
});

test('edge case: a draft expires when the deadline passes, and late submission is refused', { skip }, async () => {
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  const women = byName(body.items, 'Women in Technology Grant').scholarship;
  const backward = byName(body.items, 'Post-Matric Support for Backward Classes').scholarship;
  const a1 = (await api('POST', '/api/applications', { as: 'student', body: { scholarshipId: women.id } })).body.application.id;
  const a2 = (await api('POST', '/api/applications', { as: 'student', body: { scholarshipId: backward.id } })).body.application.id;

  // Move both deadlines into the past.
  await models.Scholarship.update({ deadline: new Date(Date.now() - 60_000) }, { where: { id: [women.id, backward.id] } });

  // Late submit: refused on the server and the draft is marked expired.
  const late = await api('POST', `/api/applications/${a1}/submit`, { as: 'student' });
  assert.equal(late.status, 409);
  assert.equal(late.body.code, 'DEADLINE_PASSED');
  assert.equal((await models.Application.findByPk(a1)).status, 'EXPIRED');

  // The scheduled job expires the other draft.
  const job = await runDeadlineJob();
  assert.equal(job.expired, 1);
  assert.equal((await models.Application.findByPk(a2)).status, 'EXPIRED');
});

test('Auto-Match: a new scholarship notifies the students who qualify', { skip }, async () => {
  const r = await api('POST', '/api/admin/scholarships', {
    as: 'admin',
    body: {
      name: 'Second Year Engineering Bursary', provider: 'Demo Trust', description: '', amount: 20000,
      deadline: '2099-12-31',
      rules: [{ field: 'yearOfStudy', operator: 'eq', value: 2 }, { field: 'stream', operator: 'eq', value: 'Engineering' }],
      documents: [{ docType: 'MARKS_CARD' }],
    },
  });
  assert.equal(r.status, 201);
  const notes = await api('GET', '/api/notifications', { as: 'student' });
  assert.ok(notes.body.notifications.some((n) => n.type === 'NEW_MATCH' && /Second Year Engineering Bursary/.test(n.message)));
});

test('Auto-Match: saving the profile re-checks everything', { skip }, async () => {
  const r = await api('PUT', '/api/profile', { as: 'student', body: { familyIncome: 400000 } });
  assert.equal(r.status, 200);
  const { body } = await api('GET', '/api/matches', { as: 'student' });
  assert.equal(byName(body.items, 'Means-Based Study Scholarship').match.result, 'ELIGIBLE');
  const notes = await api('GET', '/api/notifications', { as: 'student' });
  assert.ok(notes.body.notifications.some((n) => n.type === 'NEW_MATCH' && /Means-Based/.test(n.message)));
});

test('profile and scholarship forms reject bad input', { skip }, async () => {
  let r = await api('PUT', '/api/profile', { as: 'student', body: { cgpa: 11, category: 'Alien' } });
  assert.equal(r.status, 422);
  assert.ok(r.body.fields.cgpa && r.body.fields.category);
  r = await api('POST', '/api/admin/scholarships', {
    as: 'admin', body: { name: '', provider: 'x', amount: 5, deadline: 'soon', rules: [{ field: 'cgpa', operator: 'in', value: 3 }] },
  });
  assert.equal(r.status, 422);
  assert.ok(r.body.errors.length >= 3);
});

test('access control', { skip }, async () => {
  assert.equal((await api('GET', '/api/matches')).status, 401);
  assert.equal((await api('GET', '/api/admin/applications', { as: 'student' })).status, 403);
  assert.equal((await api('GET', '/api/matches', { as: 'admin' })).status, 403);

  // A second student cannot open the first student's document; the owner and the admin can.
  const reg = await api('POST', '/api/auth/register', { body: { name: 'Other', email: 'other@example.com', password: 'password123' } });
  assert.equal(reg.status, 201);
  tokens.other = reg.body.token;
  const docs = await api('GET', '/api/documents', { as: 'student' });
  const docId = docs.body.documents[0].id;
  assert.equal((await api('GET', `/api/documents/${docId}/file`, { as: 'other' })).status, 403);
  assert.equal((await api('GET', `/api/documents/${docId}/file`, { as: 'student' })).status, 200);
  assert.equal((await api('GET', `/api/documents/${docId}/file`, { as: 'admin' })).status, 200);

  // A new student with no profile sees every scholarship, none of them eligible.
  const fresh = await api('GET', '/api/matches', { as: 'other' });
  assert.ok(fresh.body.items.length >= 8);
  assert.ok(fresh.body.missingProfileFields.length > 0);
  assert.ok(fresh.body.items.every((i) => i.match.result !== 'ELIGIBLE' || i.scholarship.rules.length === 0));

  // Registering twice with one email is refused, and nobody can register as an admin.
  const again = await api('POST', '/api/auth/register', { body: { name: 'Other', email: 'OTHER@example.com', password: 'password123' } });
  assert.equal(again.status, 409);
  const sneaky = await api('POST', '/api/auth/register', { body: { name: 'S', email: 's@example.com', password: 'password123', role: 'ADMIN' } });
  assert.equal(sneaky.body.user.role, 'STUDENT');
});

test('admin users: list, search, filter, details and access', { skip }, async () => {
  assert.equal((await api('GET', '/api/admin/users', { as: 'student' })).status, 403);
  assert.equal((await api('GET', '/api/admin/users')).status, 401);

  const all = await api('GET', '/api/admin/users', { as: 'admin' });
  assert.equal(all.status, 200);
  assert.ok(all.body.totals.students >= 1 && all.body.totals.admins >= 1);
  assert.ok(all.body.users.every((u) => !('passwordHash' in u)));

  // Search matches name or email, case-insensitively; LIKE wildcards match themselves.
  const byEmail = await api('GET', `/api/admin/users?q=${encodeURIComponent(DEMO.student.email.toUpperCase())}`, { as: 'admin' });
  assert.equal(byEmail.body.matched, 1);
  assert.equal((await api('GET', '/api/admin/users?q=%25', { as: 'admin' })).body.matched, 0);

  const admins = await api('GET', '/api/admin/users?role=ADMIN', { as: 'admin' });
  assert.ok(admins.body.users.every((u) => u.role === 'ADMIN'));
  const applied = await api('GET', '/api/admin/users?activity=applied', { as: 'admin' });
  assert.ok(applied.body.users.every((u) => u.applications.total > 0));

  // Paging is clamped to the available pages.
  const paged = await api('GET', '/api/admin/users?pageSize=1&page=999', { as: 'admin' });
  assert.equal(paged.body.page, paged.body.pages);
  assert.equal(paged.body.users.length, 1);

  const id = byEmail.body.users[0].id;
  const one = await api('GET', `/api/admin/users/${id}`, { as: 'admin' });
  assert.equal(one.status, 200);
  assert.equal(one.body.user.email, DEMO.student.email);
  assert.ok(Array.isArray(one.body.applications) && Array.isArray(one.body.documents));
  assert.equal((await api('GET', '/api/admin/users/999999', { as: 'admin' })).status, 404);
  assert.equal((await api('GET', '/api/admin/users/abc', { as: 'admin' })).status, 404);
});
