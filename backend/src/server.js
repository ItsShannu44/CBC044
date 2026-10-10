import { createApp } from './app.js';
import { config } from './config.js';
import { User, sequelize } from './models/index.js';
import { seedDemoData } from './seed-data.js';
import { runDeadlineJob } from './services/deadlines.js';

const HOUR_MS = 60 * 60 * 1000;

async function start() {
  await sequelize.authenticate();
  // Creates tables that do not exist yet. It never drops or empties a table.
  await sequelize.sync();

  // Databases created before the automatic document check existed get the extra
  // column here. ADD COLUMN IF NOT EXISTS is safe to run on every start.
  try {
    await sequelize.query('ALTER TABLE IF EXISTS "Documents" ADD COLUMN IF NOT EXISTS "ocr" JSONB');
  } catch (err) {
    console.warn('Could not add the Documents.ocr column:', err.message);
  }

  // First start on an empty database: load the demo accounts and scholarships.
  if (config.seedDemo && (await User.count()) === 0) {
    await seedDemoData();
    console.log('Empty database: demo data loaded.');
  }

  // Deadline job: once now, then every hour. Running it at startup also covers hosts that sleep when idle.
  const tick = () => runDeadlineJob().catch((err) => console.error('Deadline job failed:', err));
  await tick();
  setInterval(tick, HOUR_MS).unref();

  createApp().listen(config.port, () => console.log(`VidyaSutra API listening on port ${config.port}`));
}

start().catch((err) => {
  console.error('Could not start the server:', err);
  process.exit(1);
});
