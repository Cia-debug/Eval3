import { Router } from 'express';
import {
  listerEmployes,
  obtenirHistoriqueSalaire,
} from '../controllers/frontofficeEmployesController.js';
import {
  creerSalaire,
  genererPaiementsMensuelsMasse,
  genererSalairesMasse,
  genererSalairesMensuelsMasse,
  obtenirRecapRestesMensuels,
  payerSalaireEmploye,
} from '../controllers/frontofficeSalairesController.js';

const router = Router();

router.get('/employees', listerEmployes);
router.get('/employees/:id/salary-history', obtenirHistoriqueSalaire);
router.get('/salaries/monthly-remaining-recap/', obtenirRecapRestesMensuels);
router.post('/salaries/bulk', genererSalairesMasse);
router.post('/salaries/bulk-monthly', genererSalairesMensuelsMasse);
router.post('/payments/bulk-monthly', genererPaiementsMensuelsMasse);
router.post('/salaries', creerSalaire);
router.post('/salaries/:id/payments', payerSalaireEmploye);

export default router;
