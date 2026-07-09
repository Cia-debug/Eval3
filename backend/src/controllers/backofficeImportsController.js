import { importEmployeesFromCsv } from '../services/csvEmployeeImport.js';
import { importSalariesFromCsv } from '../services/csvSalaryImport.js';
import { importImagesFromZip, repairAllUserPhotos } from '../services/zipImagesImport.js';

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

export async function importerEmployes(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  try {
    const content = decodeUploadBuffer(req.file.buffer);
    const result = await importEmployeesFromCsv(content);
    return res.json({
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
    return res.status(400).json({ error: error.message });
  }
}

export async function importerSalaires(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  try {
    const content = req.file.buffer.toString('utf8');
    const result = await importSalariesFromCsv(content);
    return res.json({
      ok: result.failed.length === 0,
      message: `${result.created} créé(s), ${result.updated} mis à jour`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function importerImages(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier ZIP requis' });
  }

  try {
    const result = await importImagesFromZip(req.file.buffer);
    return res.json({
      ok: result.failed.length === 0,
      message: `${result.imported} image(s) importée(s)`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

export async function reparerImages(_req, res) {
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
}
