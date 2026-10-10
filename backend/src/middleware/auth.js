import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { User } from '../models/index.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

// Requires a valid login token. Puts the user on req.user.
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Sign in to continue.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has ended. Sign in again.');
  }
  const user = await User.findByPk(payload.sub);
  if (!user) throw new HttpError(401, 'This account no longer exists.');
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user.role !== role) throw new HttpError(403, 'You do not have access to this page.');
    next();
  };
}
