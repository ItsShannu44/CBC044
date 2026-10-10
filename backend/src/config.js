import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vidyasutra';

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl,
  // Hosted databases reached over the internet need SSL. Render's internal URL does not.
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  seedDemo: process.env.SEED_DEMO !== 'false',
  isProduction: process.env.NODE_ENV === 'production',
  maxUploadBytes: 2 * 1024 * 1024,
  // Email alerts. Without a host the app works as before; notifications simply stay in-app.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'VidyaSutra <no-reply@vidyasutra.app>',
  },
};

if (config.isProduction && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production.');
}
