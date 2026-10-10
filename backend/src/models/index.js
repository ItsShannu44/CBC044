// Database tables. Sequelize creates any missing table on startup (see server.js).
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const id = { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true };

export const User = sequelize.define('User', {
  id,
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('STUDENT', 'ADMIN'), allowNull: false, defaultValue: 'STUDENT' },
});

// One row per student. Every column here can be used in an eligibility rule (see engine/fields.js).
export const Profile = sequelize.define('Profile', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  level: DataTypes.STRING,
  stream: DataTypes.STRING,
  yearOfStudy: DataTypes.INTEGER,
  cgpa: DataTypes.DOUBLE,
  familyIncome: DataTypes.INTEGER,
  category: DataTypes.STRING,
  gender: DataTypes.STRING,
  state: DataTypes.STRING,
  disability: DataTypes.BOOLEAN,
});

export const Scholarship = sequelize.define('Scholarship', {
  id,
  name: { type: DataTypes.STRING, allowNull: false },
  provider: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  deadline: { type: DataTypes.DATE, allowNull: false },
});

// An eligibility rule stored as data: { field: 'cgpa', operator: 'gte', value: 7.5, mandatory: true }.
// This is why a new scholarship needs no code change.
export const Criterion = sequelize.define('Criterion', {
  id,
  field: { type: DataTypes.STRING, allowNull: false },
  operator: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.JSONB, allowNull: false },
  mandatory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  weight: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
});

export const RequiredDocument = sequelize.define('RequiredDocument', {
  id,
  docType: { type: DataTypes.STRING, allowNull: false },
  mandatory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
});

// The student's document vault: one file per document type, reused across applications.
// The file itself is kept in the database so it survives redeploys on hosts without a persistent disk.
export const Document = sequelize.define(
  'Document',
  {
    id,
    docType: { type: DataTypes.STRING, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    data: { type: DataTypes.BLOB, allowNull: false },
    // What the automatic read (OCR) found in this file: status, excerpt and value checks.
    ocr: DataTypes.JSONB,
  },
  {
    indexes: [{ unique: true, fields: ['userId', 'docType'] }],
    defaultScope: { attributes: { exclude: ['data'] } },
    scopes: { withData: {} },
  },
);

export const APPLICATION_STATUSES = [
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'APPROVED', 'REJECTED', 'EXPIRED',
];

export const Application = sequelize.define(
  'Application',
  {
    id,
    status: { type: DataTypes.ENUM(...APPLICATION_STATUSES), allowNull: false, defaultValue: 'DRAFT' },
    submittedAt: DataTypes.DATE,
  },
  { indexes: [{ unique: true, fields: ['userId', 'scholarshipId'] }] },
);

// The reviewer's verdict on one document of one application.
export const ApplicationDocument = sequelize.define(
  'ApplicationDocument',
  {
    id,
    docType: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('UPLOADED', 'VERIFIED', 'REJECTED'), allowNull: false, defaultValue: 'UPLOADED' },
    reason: DataTypes.STRING,
  },
  { indexes: [{ unique: true, fields: ['applicationId', 'docType'] }] },
);

// Every status change, with who did it and when. This is the timeline the student sees.
export const StatusHistory = sequelize.define('StatusHistory', {
  id,
  fromStatus: DataTypes.STRING,
  toStatus: { type: DataTypes.STRING, allowNull: false },
  note: DataTypes.STRING,
  actorId: DataTypes.INTEGER,
});

// Stored result of the engine for one student and one scholarship, so the dashboard loads instantly.
export const Match = sequelize.define(
  'Match',
  {
    id,
    result: { type: DataTypes.ENUM('ELIGIBLE', 'PARTIAL', 'NOT_ELIGIBLE'), allowNull: false },
    score: { type: DataTypes.INTEGER, allowNull: false },
    details: { type: DataTypes.JSONB, allowNull: false },
  },
  { indexes: [{ unique: true, fields: ['userId', 'scholarshipId'] }] },
);

export const Notification = sequelize.define(
  'Notification',
  {
    id,
    type: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.STRING(500), allowNull: false },
    link: DataTypes.STRING,
    // Stops the same reminder being sent twice.
    dedupeKey: DataTypes.STRING,
    readAt: DataTypes.DATE,
  },
  { indexes: [{ unique: true, fields: ['userId', 'dedupeKey'] }] },
);

const cascade = { onDelete: 'CASCADE' };

User.hasOne(Profile, { foreignKey: 'userId', ...cascade });
Profile.belongsTo(User, { foreignKey: 'userId' });

Scholarship.hasMany(Criterion, { foreignKey: { name: 'scholarshipId', allowNull: false }, as: 'criteria', ...cascade });
Scholarship.hasMany(RequiredDocument, {
  foreignKey: { name: 'scholarshipId', allowNull: false }, as: 'requiredDocuments', ...cascade,
});

User.hasMany(Document, { foreignKey: { name: 'userId', allowNull: false }, ...cascade });

User.hasMany(Application, { foreignKey: { name: 'userId', allowNull: false }, ...cascade });
Application.belongsTo(User, { foreignKey: 'userId', as: 'student' });
Scholarship.hasMany(Application, { foreignKey: { name: 'scholarshipId', allowNull: false } });
Application.belongsTo(Scholarship, { foreignKey: 'scholarshipId', as: 'scholarship' });

Application.hasMany(ApplicationDocument, {
  foreignKey: { name: 'applicationId', allowNull: false }, as: 'reviews', ...cascade,
});
Application.hasMany(StatusHistory, {
  foreignKey: { name: 'applicationId', allowNull: false }, as: 'history', ...cascade,
});
StatusHistory.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

User.hasMany(Match, { foreignKey: { name: 'userId', allowNull: false }, ...cascade });
Scholarship.hasMany(Match, { foreignKey: { name: 'scholarshipId', allowNull: false }, ...cascade });

User.hasMany(Notification, { foreignKey: { name: 'userId', allowNull: false }, ...cascade });

export { sequelize };
