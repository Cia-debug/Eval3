import { dolibarr } from './dolibarr.js';
import { setUserWeeklyHours } from './mysqlUserFields.js';
import { normalizeHeader, parseCsvContent, parseCsvLine } from './csvParser.js';

const COLUMN_ALIASES = {
  ref_employe: 'ref_employee',
  ref_employee: 'ref_employee',
  nom: 'lastname',
  lastname: 'lastname',
  genre: 'genre',
  identifiant: 'login',
  login: 'login',
  mdp: 'password',
  password: 'password',
  mot_de_passe: 'password',
  heure_travai: 'weeklyhours',
  heure_travail: 'weeklyhours',
  heures_semaine: 'weeklyhours',
  heure_semaine: 'weeklyhours',
  heures_par_semaine: 'weeklyhours',
  heures_hebdo: 'weeklyhours',
  heures: 'weeklyhours',
  heures_travaillees: 'weeklyhours',
  heures_de_travail: 'weeklyhours',
  heure_de_travail: 'weeklyhours',
  nb_heures: 'weeklyhours',
  nombre_heures: 'weeklyhours',
  hours: 'weeklyhours',
  hrs: 'weeklyhours',
  hrs_semaine: 'weeklyhours',
  weeklyhours: 'weeklyhours',
  weekly_hours: 'weeklyhours',
  poste: 'job',
  job: 'job',
};

const GENRE_MAP = {
  homme: { gender: 'man', civility_code: 'MR' },
  h: { gender: 'man', civility_code: 'MR' },
  man: { gender: 'man', civility_code: 'MR' },
  femme: { gender: 'woman', civility_code: 'MME' },
  f: { gender: 'woman', civility_code: 'MME' },
  woman: { gender: 'woman', civility_code: 'MME' },
};

function mapHeader(header) {
  const normalized = normalizeHeader(header, { replaceSlashes: true });
  if (COLUMN_ALIASES[normalized]) {
    return COLUMN_ALIASES[normalized];
  }

  if (/heure|hour|hrs|h_semaine|hsemaine|nb_h/.test(normalized)) {
    return 'weeklyhours';
  }

  return normalized;
}

export function parseEmployeeCsv(content) {
  const { lines, delimiter, rawHeaders } = parseCsvContent(content);

  const headers = rawHeaders.map((header) => mapHeader(header));
  const hasWeeklyHoursColumn = headers.includes('weeklyhours');

  const required = ['ref_employee', 'lastname', 'login', 'password'];
  for (const field of required) {
    if (!headers.includes(field)) {
      throw new Error(`Colonne manquante dans le CSV : ${field}`);
    }
  }

  const rows = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index], delimiter);
    const row = {};

    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex]?.trim() ?? '';
    });

    if (Object.values(row).every((value) => !value)) {
      continue;
    }

    rows.push({
      line: index + 1,
      ref_employee: row.ref_employee,
      lastname: row.lastname,
      login: row.login,
      password: row.password,
      genre: row.genre || '',
      weeklyhours: parseWeeklyHoursValue(row.weeklyhours),
      job: row.job || '',
    });
  }

  if (rows.length === 0) {
    throw new Error('Aucune ligne de données dans le CSV');
  }

  return { rows, hasWeeklyHoursColumn };
}

function parseWeeklyHoursValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const hours = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(hours) ? hours : null;
}

function mapGenre(genre) {
  const key = genre.trim().toLowerCase();
  return GENRE_MAP[key] || { gender: '', civility_code: '' };
}

function validateRow(row, { isUpdate = false } = {}) {
  const errors = [];

  if (!row.ref_employee) errors.push('ref_employe obligatoire');
  if (!row.lastname) errors.push('nom obligatoire');
  if (!row.login) errors.push('identifiant obligatoire');
  if (!isUpdate && !row.password) errors.push('mdp obligatoire');
  if (!isUpdate && row.password && row.password.length < 12) {
    errors.push('mdp doit contenir au moins 12 caractères (règle Dolibarr)');
  }
  if (row.login === 'admin') errors.push('identifiant admin interdit');

  if (row.weeklyhours != null && Number.isNaN(row.weeklyhours)) {
    errors.push('heure_travail invalide');
  }

  return errors;
}

function buildUserPayload(row, { isUpdate = false } = {}) {
  const { gender, civility_code } = mapGenre(row.genre);

  const payload = {
    login: row.login,
    lastname: row.lastname,
    employee: 1,
    ref_employee: String(row.ref_employee),
    job: row.job,
  };

  if (!isUpdate) {
    payload.pass = row.password;
  }

  if (gender) payload.gender = gender;
  if (civility_code) payload.civility_code = civility_code;
  if (row.weeklyhours != null) payload.weeklyhours = String(row.weeklyhours);

  return payload;
}

async function findExistingUser(row) {
  const byLogin = await dolibarr.findUserByLogin(row.login);
  if (byLogin) {
    return byLogin;
  }

  return dolibarr.findUserByRefEmployee(row.ref_employee);
}

async function saveEmployee(row) {
  const existing = await findExistingUser(row);
  const rowErrors = validateRow(row, { isUpdate: Boolean(existing) });
  if (rowErrors.length > 0) {
    return { ok: false, line: row.line, login: row.login, errors: rowErrors };
  }

  const payload = buildUserPayload(row, { isUpdate: Boolean(existing) });

  let userId;

  if (existing) {
    await dolibarr.updateUser(existing.id, payload);
    userId = existing.id;
  } else {
    userId = await dolibarr.createUser(payload);
  }

  if (row.weeklyhours != null) {
    await setUserWeeklyHours(userId, row.weeklyhours);
    try {
      await dolibarr.updateUser(userId, { weeklyhours: String(row.weeklyhours) });
    } catch (error) {
      console.warn(`weeklyhours API update failed for user ${userId}:`, error.message);
    }
  }

  if (existing) {
    return {
      ok: true,
      line: row.line,
      login: row.login,
      action: 'updated',
      dolibarr_id: userId,
      weeklyhours: row.weeklyhours,
    };
  }

  return {
    ok: true,
    line: row.line,
    login: row.login,
    action: 'created',
    dolibarr_id: userId,
    weeklyhours: row.weeklyhours,
  };
}

export async function importEmployeesFromCsv(content) {
  const { rows, hasWeeklyHoursColumn } = parseEmployeeCsv(content);

  const results = {
    total: rows.length,
    created: 0,
    updated: 0,
    failed: [],
    success: [],
    hasWeeklyHoursColumn,
    weeklyhoursImported: 0,
    weeklyhoursWarning: null,
  };

  for (const row of rows) {
    try {
      const result = await saveEmployee(row);

      if (!result.ok) {
        results.failed.push(result);
        continue;
      }

      results.success.push(result);
      if (result.weeklyhours != null) {
        results.weeklyhoursImported += 1;
      }
      if (result.action === 'created') {
        results.created += 1;
      } else {
        results.updated += 1;
      }
    } catch (error) {
      results.failed.push({
        ok: false,
        line: row.line,
        login: row.login,
        errors: [error.message],
      });
    }
  }

  if (!hasWeeklyHoursColumn) {
    results.weeklyhoursWarning =
      'Colonne heures/semaine introuvable (ex. heure_travai). Les heures ne seront pas importées.';
  } else if (results.weeklyhoursImported === 0 && results.success.length > 0) {
    results.weeklyhoursWarning =
      'Colonne heures détectée mais aucune valeur numérique trouvée dans le CSV.';
  }

  return results;
}
