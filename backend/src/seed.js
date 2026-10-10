// `npm run seed` – wipes the database and loads the demo data again.
// This deletes everything, so it refuses to run in production unless you pass --force.
import { config } from './config.js';
import { sequelize } from './models/index.js';
import { DEMO_ACCOUNTS, seedDemoData } from './seed-data.js';

if (config.isProduction && !process.argv.includes('--force')) {
  console.error('Refusing to wipe a production database. Pass --force if you really mean it.');
  process.exit(1);
}

await sequelize.sync({ force: true });
await seedDemoData();
console.log('Demo data loaded.');
for (const a of Object.values(DEMO_ACCOUNTS)) console.log(`  ${a.role.padEnd(7)} ${a.email}  /  ${a.password}`);
await sequelize.close();
