import { Router } from 'express';
import {
  clearBackofficeCookie,
  createBackofficeToken,
  getBackofficeCode,
  readBackofficeToken,
  setBackofficeCookie,
  verifyBackofficeToken,
} from '../middleware/auth.js';

const router = Router();

router.get('/backoffice/config', (_req, res) => {
  res.json({
    defaultCode: getBackofficeCode(),
  });
});

router.post('/backoffice/login', (req, res) => {
  const { code } = req.body ?? {};

  if (!code || code !== getBackofficeCode()) {
    return res.status(401).json({ error: 'Code d\'accès incorrect' });
  }

  const token = createBackofficeToken();
  setBackofficeCookie(res, token);

  return res.json({ ok: true });
});

router.post('/backoffice/logout', (_req, res) => {
  clearBackofficeCookie(res);
  res.json({ ok: true });
});

router.get('/backoffice/me', (req, res) => {
  const token = readBackofficeToken(req);

  if (!token || !verifyBackofficeToken(token)) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true, role: 'backoffice' });
});

export default router;
