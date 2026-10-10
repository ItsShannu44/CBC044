import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { HttpError } from '../errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { User } from '../models/index.js';
import { recomputeForUser } from '../services/matching.js';

export const authRouter = Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

authRouter.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name) throw new HttpError(422, 'Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, 'Enter a valid email address.');
  if (password.length < 8) throw new HttpError(422, 'Use a password with at least 8 characters.');
  if (await User.findOne({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  }

  // Everyone who registers is a student. Admin accounts are created by the seed script.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'STUDENT' });
  await recomputeForUser(user.id, { announce: false });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'The email or password is not correct.');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
