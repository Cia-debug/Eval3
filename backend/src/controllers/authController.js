import {
  clearBackofficeCookie,
  createBackofficeToken,
  getBackofficeCode,
  readBackofficeToken,
  setBackofficeCookie,
  verifyBackofficeToken,
} from '../middleware/auth.js';

export function configBackoffice(_req, res) {
  res.json({ defaultCode: getBackofficeCode() });
}

export function loginBackoffice(req, res) {
  const { code } = req.body ?? {};
  if (!code || code !== getBackofficeCode()) {
    return res.status(401).json({ error: 'Code d\'accès incorrect' });
  }

  const token = createBackofficeToken();
  setBackofficeCookie(res, token);
  return res.json({ ok: true });
}

export function logoutBackoffice(_req, res) {
  clearBackofficeCookie(res);
  res.json({ ok: true });
}

export function sessionBackoffice(req, res) {
  const token = readBackofficeToken(req);
  if (!token || !verifyBackofficeToken(token)) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, role: 'backoffice' });
}
