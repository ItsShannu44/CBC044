// Demo data. The scholarships below are invented for the demo: before real use,
// replace them with criteria copied from each scheme's official guideline.
import bcrypt from 'bcryptjs';
import { Criterion, Profile, RequiredDocument, Scholarship, User } from './models/index.js';
import { istDate, deadlineFromDate } from './services/dates.js';
import { recomputeForUser } from './services/matching.js';

export const DEMO_ACCOUNTS = {
  admin: { name: 'Scholarship Office', email: 'admin@vidyasutra.test', password: 'Admin@12345', role: 'ADMIN' },
  student: { name: 'Ananya Rao', email: 'student@vidyasutra.test', password: 'Student@12345', role: 'STUDENT' },
};

const inDays = (n) => deadlineFromDate(istDate(new Date(Date.now() + n * 24 * 60 * 60 * 1000)));
const rule = (field, operator, value, mandatory = true, weight = 1) => ({ field, operator, value, mandatory, weight });
const doc = (docType, mandatory = true) => ({ docType, mandatory });

const SCHOLARSHIPS = [
  {
    name: 'Merit Award for Degree Students',
    provider: 'Demo Education Trust',
    description: 'Rewards consistent academic performance in undergraduate and postgraduate courses.',
    amount: 50000,
    deadline: inDays(20),
    rules: [rule('cgpa', 'gte', 7.5, true, 2), rule('level', 'in', ['UG', 'PG']), rule('stream', 'eq', 'Engineering', false)],
    documents: [doc('MARKS_CARD'), doc('ID_PROOF'), doc('BONAFIDE_CERTIFICATE'), doc('RECOMMENDATION_LETTER', false)],
  },
  {
    name: 'Women in Technology Grant',
    provider: 'Demo Tech Foundation',
    description: 'Supports women studying engineering or science.',
    amount: 75000,
    deadline: inDays(3),
    rules: [rule('gender', 'eq', 'Female'), rule('stream', 'in', ['Engineering', 'Science']), rule('cgpa', 'gte', 7)],
    documents: [doc('MARKS_CARD'), doc('ID_PROOF'), doc('BONAFIDE_CERTIFICATE')],
  },
  {
    name: 'Post-Matric Support for Backward Classes',
    provider: 'Demo State Welfare Department',
    description: 'Fee support for students from backward classes studying in Karnataka.',
    amount: 30000,
    deadline: inDays(30),
    rules: [
      rule('category', 'in', ['OBC', 'SC', 'ST']),
      rule('familyIncome', 'lte', 800000),
      rule('state', 'eq', 'Karnataka'),
    ],
    documents: [doc('CASTE_CERTIFICATE'), doc('INCOME_CERTIFICATE'), doc('MARKS_CARD')],
  },
  {
    name: 'Means-Based Study Scholarship',
    provider: 'Demo Community Foundation',
    description: 'For students from lower-income families who keep up their grades.',
    amount: 40000,
    deadline: inDays(12),
    rules: [rule('familyIncome', 'lte', 500000, true, 2), rule('cgpa', 'gte', 6), rule('state', 'eq', 'Karnataka', false)],
    documents: [doc('INCOME_CERTIFICATE'), doc('MARKS_CARD'), doc('ID_PROOF')],
  },
  {
    name: 'Postgraduate Research Fellowship',
    provider: 'Demo Research Council',
    description: 'Monthly support for postgraduate and doctoral researchers.',
    amount: 120000,
    deadline: inDays(45),
    rules: [rule('level', 'in', ['PG', 'PhD']), rule('cgpa', 'gte', 8)],
    documents: [doc('MARKS_CARD'), doc('RECOMMENDATION_LETTER'), doc('ID_PROOF')],
  },
  {
    name: 'Founders Excellence Scholarship',
    provider: 'Demo Alumni Association',
    description: 'For senior students with outstanding grades.',
    amount: 100000,
    deadline: inDays(25),
    rules: [rule('cgpa', 'gte', 9), rule('yearOfStudy', 'gte', 3)],
    documents: [doc('MARKS_CARD'), doc('BONAFIDE_CERTIFICATE')],
  },
  {
    name: 'Support Scholarship for Students with Disabilities',
    provider: 'Demo Inclusion Trust',
    description: 'Covers study costs for students with a certified disability.',
    amount: 60000,
    deadline: inDays(40),
    rules: [rule('disability', 'eq', true), rule('familyIncome', 'lte', 800000, false)],
    documents: [doc('DISABILITY_CERTIFICATE'), doc('ID_PROOF'), doc('INCOME_CERTIFICATE', false)],
  },
  {
    name: 'Early Bird Merit Scholarship',
    provider: 'Demo Education Trust',
    description: 'An earlier round of the merit award. It has already closed.',
    amount: 25000,
    deadline: inDays(-5),
    rules: [rule('cgpa', 'gte', 7)],
    documents: [doc('MARKS_CARD')],
  },
];

export async function seedDemoData() {
  const users = {};
  for (const [key, account] of Object.entries(DEMO_ACCOUNTS)) {
    users[key] = await User.create({
      name: account.name,
      email: account.email,
      role: account.role,
      passwordHash: await bcrypt.hash(account.password, 10),
    });
  }

  await Profile.create({
    userId: users.student.id,
    level: 'UG',
    stream: 'Engineering',
    yearOfStudy: 2,
    cgpa: 8.2,
    familyIncome: 600000,
    category: 'OBC',
    gender: 'Female',
    state: 'Karnataka',
    disability: false,
  });

  for (const s of SCHOLARSHIPS) {
    const { rules, documents, ...fields } = s;
    const created = await Scholarship.create(fields);
    await Criterion.bulkCreate(rules.map((r) => ({ ...r, scholarshipId: created.id })));
    await RequiredDocument.bulkCreate(documents.map((d) => ({ ...d, scholarshipId: created.id })));
  }

  await recomputeForUser(users.student.id);
}
