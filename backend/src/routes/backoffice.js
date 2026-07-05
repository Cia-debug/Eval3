import { Router } from 'express';
import multer from 'multer';
import { requireBackoffice } from '../middleware/auth.js';
import { importEmployeesFromCsv } from '../services/csvEmployeeImport.js';
import { importSalariesFromCsv } from '../services/csvSalaryImport.js';
import { importImagesFromZip, repairAllUserPhotos } from '../services/zipImagesImport.js';
import { getDolibarrResetPreview, resetDolibarrData } from '../services/dolibarrReset.js';
import { dolibarr } from '../services/dolibarr.js';
import { getSalaryDashboardStats } from '../services/dashboardStats.js';
import {
  createHoliday,
  deleteHoliday,
  getHolidayById,
  listHolidays,
  updateHoliday,
} from '../services/holidayService.js';

const router = Router();
const RESET_CONFIRMATION = 'REINITIALISER';
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

router.get('/dashboard', async (_req, res) => {
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
});

router.get('/reset/dolibarr/preview', async (_req, res) => {
  try {
    const preview = await getDolibarrResetPreview();
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reset/dolibarr', async (req, res) => {
  const { confirm } = req.body ?? {};

  if (confirm !== RESET_CONFIRMATION) {
    return res.status(400).json({
      error: `Confirmation requise : saisir "${RESET_CONFIRMATION}"`,
    });
  }

  try {
    const result = await resetDolibarrData();
    res.json({
      ok: true,
      message: 'Données Dolibarr réinitialisées',
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function decodeUploadBuffer(buffer) {
  if (!buffer?.length) {
    return '';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '');
  }

  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) {
    return utf8.replace(/^\uFEFF/, '');
  }

  return buffer.toString('latin1').replace(/^\uFEFF/, '');
}

router.post('/import/employees', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  try {
    const content = decodeUploadBuffer(req.file.buffer);
    const result = await importEmployeesFromCsv(content);

    res.json({
      ok: result.failed.length === 0,
      message: [
        `${result.created} créé(s), ${result.updated} mis à jour`,
        result.weeklyhoursImported
          ? `${result.weeklyhoursImported} heure(s)/semaine importée(s)`
          : null,
        result.weeklyhoursWarning,
      ]
        .filter(Boolean)
        .join(' — '),
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/import/salaries', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  try {
    const content = req.file.buffer.toString('utf8');
    const result = await importSalariesFromCsv(content);

    res.json({
      ok: result.failed.length === 0,
      message: `${result.created} créé(s), ${result.updated} mis à jour`,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/import/images', uploadZip.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier ZIP requis' });
  }

  try {
    const result = await importImagesFromZip(req.file.buffer);

    res.json({
      ok: result.failed.length === 0,
      message: `${result.imported} image(s) importée(s)`,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/import/images/repair', async (_req, res) => {
  try {
    const repaired = await repairAllUserPhotos();
    res.json({
      ok: true,
      message: `${repaired.length} photo(s) corrigée(s)`,
      repaired,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/holidays', (_req, res) => {
  try {
    const holidays = listHolidays();
    res.json({
      total: holidays.length,
      holidays,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/holidays/:id', (req, res) => {
  try {
    const holiday = getHolidayById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ error: 'Jour férié introuvable' });
    }

    res.json(holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/holidays', (req, res) => {
  try {
    const result = createHoliday(req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    res.status(201).json(result.holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/holidays/:id', (req, res) => {
  try {
    const result = updateHoliday(req.params.id, req.body ?? {});
    if (!result.ok) {
      const status = result.errors[0] === 'Jour férié introuvable' ? 404 : 400;
      return res.status(status).json({ error: result.errors.join(' ; ') });
    }

    res.json(result.holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/holidays/:id', (req, res) => {
  try {
    const result = deleteHoliday(req.params.id);
    if (!result.ok) {
      return res.status(404).json({ error: result.errors.join(' ; ') });
    }

    res.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
