import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import mysql from 'mysql2/promise';
import { getMysqlConfig } from './mysqlUserFields.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const DEFAULT_PHOTOS_PATH = 'C:/xampp/htdocs/dolibarr/documents/users';

export function getUserPhotosPath() {
  const configured = process.env.DOLIBARR_USER_PHOTOS_PATH?.trim()
    || process.env.DOLIBARR_DOCUMENTS_PATH?.trim();

  if (configured) {
    return path.resolve(configured);
  }

  return path.resolve(DEFAULT_PHOTOS_PATH);
}

/** Ancien mauvais dossier utilisé par erreur (documents/user au lieu de users) */
function getWrongUserPhotosPath() {
  const correct = getUserPhotosPath();
  if (path.basename(correct).toLowerCase() === 'users') {
    return path.join(path.dirname(correct), 'user');
  }
  return path.join(path.dirname(correct), 'user');
}

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function getRefFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename)).trim();
  return base || null;
}

function thumbFilename(filename, suffix) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `${base}${suffix}${ext}`;
}

function getPhotoPaths(userRowid, filename) {
  const photosDir = path.join(getUserPhotosPath(), String(userRowid), 'photos');
  const thumbsDir = path.join(photosDir, 'thumbs');
  const wrongRoot = getWrongUserPhotosPath();

  return {
    photosDir,
    thumbsDir,
    main: path.join(photosDir, filename),
    small: path.join(thumbsDir, thumbFilename(filename, '_small')),
    mini: path.join(thumbsDir, thumbFilename(filename, '_mini')),
    wrongMain: path.join(wrongRoot, String(userRowid), 'photos', filename),
    wrongFlat: path.join(wrongRoot, String(userRowid), filename),
  };
}

async function readFirstExisting(paths) {
  for (const filePath of paths) {
    try {
      return await fs.readFile(filePath);
    } catch {
      // try next
    }
  }
  return null;
}

async function writeUserPhotoFiles(userRowid, filename, buffer) {
  const paths = getPhotoPaths(userRowid, filename);

  await fs.mkdir(paths.thumbsDir, { recursive: true });
  await fs.writeFile(paths.main, buffer);
  await fs.writeFile(paths.small, buffer);
  await fs.writeFile(paths.mini, buffer);

  return paths.main;
}

async function findUserByRefEmployee(connection, refEmployee) {
  const [rows] = await connection.query(
    'SELECT rowid, ref_employee, login, photo FROM llx_user WHERE ref_employee = ? LIMIT 1',
    [String(refEmployee)],
  );

  return rows[0] || null;
}

export async function repairExistingUserPhotos(connection) {
  const [users] = await connection.query(
    "SELECT rowid, photo FROM llx_user WHERE photo IS NOT NULL AND photo != ''",
  );

  const repaired = [];

  for (const user of users) {
    const paths = getPhotoPaths(user.rowid, user.photo);

    try {
      await fs.access(paths.main);
      await fs.access(paths.mini);
      continue;
    } catch {
      // needs repair
    }

    const buffer = await readFirstExisting([
      paths.main,
      paths.wrongMain,
      paths.wrongFlat,
    ]);

    if (!buffer) {
      continue;
    }

    await writeUserPhotoFiles(user.rowid, user.photo, buffer);
    repaired.push({ rowid: user.rowid, photo: user.photo });
  }

  return repaired;
}

export async function repairAllUserPhotos() {
  const connection = await mysql.createConnection(getMysqlConfig());

  try {
    return await repairExistingUserPhotos(connection);
  } finally {
    await connection.end();
  }
}

export async function importImagesFromZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory && isImageFile(entry.entryName));

  if (entries.length === 0) {
    throw new Error('Aucune image trouvée dans le fichier ZIP');
  }

  const connection = await mysql.createConnection(getMysqlConfig());
  const photosPath = getUserPhotosPath();

  const results = {
    total: entries.length,
    imported: 0,
    failed: [],
    success: [],
    photosPath,
    repaired: [],
  };

  try {
    results.repaired = await repairExistingUserPhotos(connection);

    for (const entry of entries) {
      const filename = path.basename(entry.entryName);
      const refEmployee = getRefFromFilename(filename);

      if (!refEmployee) {
        results.failed.push({
          file: filename,
          errors: ['Nom de fichier invalide (attendu: ref_employe.png)'],
        });
        continue;
      }

      try {
        const user = await findUserByRefEmployee(connection, refEmployee);

        if (!user) {
          results.failed.push({
            file: filename,
            ref_employee: refEmployee,
            errors: [`Employé ref_employe=${refEmployee} introuvable`],
          });
          continue;
        }

        const imageBuffer = entry.getData();
        await writeUserPhotoFiles(user.rowid, filename, imageBuffer);

        await connection.query('UPDATE llx_user SET photo = ? WHERE rowid = ?', [
          filename,
          user.rowid,
        ]);

        results.success.push({
          file: filename,
          ref_employee: refEmployee,
          login: user.login,
        });
        results.imported += 1;
      } catch (error) {
        results.failed.push({
          file: filename,
          ref_employee: refEmployee,
          errors: [error.message],
        });
      }
    }

    return results;
  } finally {
    await connection.end();
  }
}
