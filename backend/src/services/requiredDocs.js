// Makes sure every scholarship in the database requires the always-required
// documents (see ALWAYS_REQUIRED_DOCS), as mandatory. Runs on every start, so
// databases created before the rule existed are brought up to date. Safe to repeat.
import { ALWAYS_REQUIRED_DOCS } from '../engine/fields.js';
import { RequiredDocument, Scholarship, sequelize } from '../models/index.js';

export async function ensureAlwaysRequiredDocuments() {
  const scholarships = await Scholarship.findAll({ attributes: ['id'] });
  let added = 0;
  let madeMandatory = 0;
  await sequelize.transaction(async (transaction) => {
    for (const s of scholarships) {
      for (const docType of ALWAYS_REQUIRED_DOCS) {
        const existing = await RequiredDocument.findOne({ where: { scholarshipId: s.id, docType }, transaction });
        if (!existing) {
          await RequiredDocument.create({ scholarshipId: s.id, docType, mandatory: true }, { transaction });
          added += 1;
        } else if (!existing.mandatory) {
          await existing.update({ mandatory: true }, { transaction });
          madeMandatory += 1;
        }
      }
    }
  });
  return { added, madeMandatory };
}
