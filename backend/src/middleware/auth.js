import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'newapp_backoffice';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function getBackofficeCode() {
  return process.env.BACKOFFICE_ACCESS_CODE || 'NEWAPP2026';
}

export function createBackofficeToken() {
  return jwt.sign({ role: 'backoffice' }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function verifyBackofficeToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload?.role === 'backoffice';
  } catch {
    return false;
  }
}

export function setBackofficeCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export function clearBackofficeCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function readBackofficeToken(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

export function requireBackoffice(req, res, next) {
  const token = readBackofficeToken(req);

  if (!token || !verifyBackofficeToken(token)) {
    return res.status(401).json({ error: 'Accès backoffice refusé' });
  }

  next();
}

export { COOKIE_NAME };
