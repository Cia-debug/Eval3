import { Router } from 'express';
import {
  configBackoffice,
  loginBackoffice,
  logoutBackoffice,
  sessionBackoffice,
} from '../controllers/authController.js';

const router = Router();

router.get('/backoffice/config', configBackoffice);
router.post('/backoffice/login', loginBackoffice);
router.post('/backoffice/logout', logoutBackoffice);
router.get('/backoffice/me', sessionBackoffice);

export default router;
