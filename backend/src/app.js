import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { sharedRouter } from './routes/shared.js';
import { studentRouter } from './routes/student.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '200kb' }));

  app.use('/api', sharedRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  // An unknown reviewer route is a 404, not a fall-through into the student routes.
  app.use('/api/admin', () => { throw new HttpError(404, 'Not found.'); });
  app.use('/api', studentRouter);

  app.use('/api', (_req, _res) => {
    throw new HttpError(404, 'Not found.');
  });

  // In production the built React app is served from this same server, so there is one URL and no CORS setup.
  const dist = path.resolve(here, '../../frontend/dist');
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // One place that turns any error into a JSON reply.
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? `The file is too large. The limit is ${config.maxUploadBytes / (1024 * 1024)} MB.`
        : 'The upload did not work. Try again.';
      return res.status(422).json({ error: message });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong on the server. Try again in a moment.' });
  });

  return app;
}
