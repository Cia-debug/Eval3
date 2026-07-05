import {
  getSqliteDb,
  sqliteAll,
  sqliteGet,
  sqliteRun,
} from '../db/sqlite.js';

function mapRow(row) {
  return {
    id: row.id,
    date: row.date,
    libelle: row.libelle,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseIsoDate(value) {
  if (!value || !String(value).trim()) {
    return null;
  }

  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parts = normalized.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  let year = parts[2];
  if (year.length === 2) {
    year = `20${year}`;
  }

  return `${year}-${month}-${day}`;
}

function validateHolidayInput(input) {
  const errors = [];
  const libelle = input.libelle?.trim() ?? '';
  const date = parseIsoDate(input.date);

  if (!libelle) {
    errors.push('Libellé obligatoire');
  }

  if (!date) {
    errors.push('Date invalide (format AAAA-MM-JJ)');
  }

  return { errors, libelle, date };
}

function isUniqueConstraintError(error) {
  return String(error?.message || error).includes('UNIQUE constraint failed');
}

export function listHolidays() {
  getSqliteDb();
  const rows = sqliteAll(`
    SELECT id, date, libelle, created_at, updated_at
    FROM jours_feries
    ORDER BY date ASC
  `);

  return rows.map(mapRow);
}

export function getHolidayById(id) {
  getSqliteDb();
  const row = sqliteGet(`
    SELECT id, date, libelle, created_at, updated_at
    FROM jours_feries
    WHERE id = ?
  `, [Number(id)]);

  return row ? mapRow(row) : null;
}

export function createHoliday(input) {
  const parsed = validateHolidayInput(input);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  try {
    const insertedId = sqliteRun(
      'INSERT INTO jours_feries (date, libelle) VALUES (?, ?)',
      [parsed.date, parsed.libelle],
    );

    return {
      ok: true,
      holiday: getHolidayById(insertedId),
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, errors: ['Un jour férié existe déjà à cette date'] };
    }

    throw error;
  }
}

export function updateHoliday(id, input) {
  const existing = getHolidayById(id);
  if (!existing) {
    return { ok: false, errors: ['Jour férié introuvable'] };
  }

  const parsed = validateHolidayInput(input);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  try {
    sqliteRun(`
      UPDATE jours_feries
      SET date = ?, libelle = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [parsed.date, parsed.libelle, Number(id)]);

    return {
      ok: true,
      holiday: getHolidayById(id),
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, errors: ['Un jour férié existe déjà à cette date'] };
    }

    throw error;
  }
}

export function deleteHoliday(id) {
  const existing = getHolidayById(id);
  if (!existing) {
    return { ok: false, errors: ['Jour férié introuvable'] };
  }

  sqliteRun('DELETE FROM jours_feries WHERE id = ?', [Number(id)]);

  return { ok: true, deleted: existing };
}
