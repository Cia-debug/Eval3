import { getDolibarrResetPreview, resetDolibarrData } from '../services/dolibarrReset.js';
import { dolibarr } from '../services/dolibarr.js';
import { getSalaryDashboardStats } from '../services/dashboardStats.js';

const RESET_CONFIRMATION = 'REINITIALISER';

export async function tableauDeBordBackoffice(_req, res) {
  try {
    const [status, stats] = await Promise.all([
      dolibarr.status(),
      getSalaryDashboardStats(),
    ]);

    res.json({
      message: 'Backoffice NewApp',
      dolibarr: status,
      stats,
    });
  } catch (error) {
    res.status(502).json({
      message: 'Backoffice NewApp',
      dolibarr: null,
      stats: null,
      dolibarrError: error.message,
    });
  }
}

export async function apercuReinitialisationDolibarr(_req, res) {
  try {
    const preview = await getDolibarrResetPreview();
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function reinitialiserDolibarr(req, res) {
  const { confirm } = req.body ?? {};
  if (confirm !== RESET_CONFIRMATION) {
    return res.status(400).json({
      error: `Confirmation requise : saisir "${RESET_CONFIRMATION}"`,
    });
  }

  try {
    const result = await resetDolibarrData();
    return res.json({
      ok: true,
      message: 'Données Dolibarr réinitialisées',
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
