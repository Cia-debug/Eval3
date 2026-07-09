import { Router } from 'express';
import multer from 'multer';
import { requireBackoffice } from '../middleware/auth.js';
import {
  apercuReinitialisationDolibarr,
  reinitialiserDolibarr,
  tableauDeBordBackoffice,
} from '../controllers/backofficeTableauResetController.js';
import {
  importerEmployes,
  importerImages,
  importerSalaires,
  reparerImages,
} from '../controllers/backofficeImportsController.js';
import {
  creerJourFerie,
  listerJoursFeries,
  modifierJourFerie,
  obtenirJourFerie,
  supprimerJourFerie,
} from '../controllers/joursFeriesController.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      cb(new Error('Seuls les fichiers CSV sont acceptés'));
      return;
    }
    cb(null, true);
  },
});

const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      cb(new Error('Seuls les fichiers ZIP sont acceptés'));
      return;
    }
    cb(null, true);
  },
});

router.use(requireBackoffice);

router.get('/dashboard', tableauDeBordBackoffice);
router.get('/reset/dolibarr/preview', apercuReinitialisationDolibarr);
router.post('/reset/dolibarr', reinitialiserDolibarr);
router.post('/import/employees', upload.single('file'), importerEmployes);
router.post('/import/salaries', upload.single('file'), importerSalaires);
router.post('/import/images', uploadZip.single('file'), importerImages);
router.post('/import/images/repair', reparerImages);
router.get('/holidays', listerJoursFeries);
router.get('/holidays/:id', obtenirJourFerie);
router.post('/holidays', creerJourFerie);
router.put('/holidays/:id', modifierJourFerie);
router.delete('/holidays/:id', supprimerJourFerie);

export default router;
