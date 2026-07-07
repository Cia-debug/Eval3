import { Router } from 'express';
import { searchEmployees } from '../services/employeeService.js';
import { getEmployeeSalaryHistory } from '../services/employeeSalaryHistoryService.js';
import { createSalaryOnly, generateBulkSalaries, paySalary } from '../services/salaryService.js';
import { generateMonthlyBulkSalaries } from '../services/monthlyBulkSalaryService.js';
import { generateMonthlyBulkPayment } from '../services/monthlyBulkPaymentService.js';

const router = Router();

router.get('/employees', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const employees = await searchEmployees({
      ref_employee: req.query.ref_employee,
      nom: req.query.nom,
      login: req.query.login,
      genre: req.query.genre,
      poste: req.query.poste,
      heure_min: req.query.heure_min,
      heure_max: req.query.heure_max,
    });

    res.json({
      total: employees.length,
      employees,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.get('/employees/:id/salary-history', async (req, res) => {
  try {
    const history = await getEmployeeSalaryHistory(req.params.id);
    if (!history) {
      return res.status(404).json({ error: 'Salarié introuvable' });
    }

    res.json(history);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/salaries/bulk', async (req, res) => {
  try {
    const result = await generateBulkSalaries(req.body ?? {});

    if (!result.total && result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    res.status(201).json({
      ok: result.ok,
      message: `${result.created} salaire(s) généré(s) sur ${result.total}`,
      ...result,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/salaries/bulk-monthly', async (req, res) => {
  try {
    const result = await generateMonthlyBulkSalaries(req.body ?? {});

    if (result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    const parts = [`${result.created} salaire(s) généré(s) sur ${result.total}`];
    if (result.skipped > 0) {
      parts.push(`${result.skipped} ignoré(s) (mois déjà couvert)`);
    }

    res.status(201).json({
      ok: result.ok,
      message: parts.join(' — '),
      ...result,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/payments/bulk-monthly', async (req, res) => {
  try {
    const result = await generateMonthlyBulkPayment(req.body ?? {});

    if (result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    res.status(201).json({
      ok: result.ok,
      message: result.warning
        || `${result.created} paiement(s) généré(s) — total ${result.total_paid} € — reste ${result.budget_remaining} €`,
      ...result,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/salaries', async (req, res) => {
  try {
    const result = await createSalaryOnly(req.body ?? {});

    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    res.status(201).json({
      ok: true,
      message: 'Salaire créé',
      ...result,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.post('/salaries/:id/payments', async (req, res) => {
  try {
    const result = await paySalary(req.params.id, req.body ?? {});

    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    res.status(201).json({
      ok: true,
      message: `${result.payments.length} paiement(s) enregistré(s)`,
      ...result,
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

export default router;
