import { dateToTimestamp, dolibarr } from './dolibarr.js';
import { searchEmployees } from './employeeService.js';

export const FUSEAU_HORAIRE = process.env.DOLIBARR_TIMEZONE || 'Europe/Berlin';
export const arrondirMontant = (v) => Math.round(Number(v) * 100) / 100;

export const parserMontant = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

export const parserBooleen = (v) => {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string') return ['true', 'on', 'yes'].includes(v.trim().toLowerCase());
  return false;
};

export const parserDate = (v) => {
  if (!v || !String(v).trim()) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [j, m, a] = s.split('/');
  if (!a) return null;
  return `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
};

export const parserDateIsoStricte = (iso) =>
  iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : null;

export const horodatageVersDate = (ts, fuseau = FUSEAU_HORAIRE) =>
  ts ? new Intl.DateTimeFormat('en-CA', { timeZone: fuseau, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(Number(ts) * 1000)) : '';

export const parserMoisAnnee = (body) => {
  const erreurs = [];
  const month = Number(body.month);
  const year = Number(body.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) erreurs.push('Mois invalide (1 à 12)');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) erreurs.push('Année invalide');
  return {
    errors: erreurs,
    month,
    year,
    workedSaturday: parserBooleen(body.worked_saturday),
    workedSunday: parserBooleen(body.worked_sunday),
  };
};

export const parserPeriodeSalaire = (body, { requireEmployee = false } = {}) => {
  const erreurs = [];
  if (requireEmployee && !body.employee_id) erreurs.push('Employé obligatoire');
  const amount = parserMontant(body.amount);
  const dateStart = parserDate(body.date_start);
  const dateEnd = parserDate(body.date_end);
  if (amount == null || amount <= 0) erreurs.push('Montant invalide');
  if (!dateStart) erreurs.push('Date de début invalide');
  if (!dateEnd) erreurs.push('Date de fin invalide');
  if (dateStart && dateEnd && dateStart > dateEnd) erreurs.push('La date de début doit être antérieure à la date de fin');
  return { errors: erreurs, amount, dateStart, dateEnd };
};

export const resultatMasse = ({ total, created, skipped = [], failed = [], ...extra }) => ({
  ok: !failed.length, total, created: created.length, skipped: skipped.length, failed: failed.length,
  success: created, skipped_items: skipped, failures: failed, ...extra,
});

export const erreurValidation = (errors) => ({ ok: false, errors });

export async function prochainesRefsSalaire(nombre = 1) {
  const salaries = await dolibarr.listSalaries({ limit: 500 });
  const debut = Math.max(0, ...salaries.map((s) => Number(s.ref)).filter(Number.isFinite)) + 1;
  const refs = Array.from({ length: nombre }, (_, i) => String(debut + i));
  return nombre === 1 ? refs[0] : refs;
}

export const construirePayloadSalaire = ({ ref, employeeId, label, amount, dateStart, dateEnd, paye = 0 }) => {
  const fin = dateToTimestamp(dateEnd);
  return {
    ref, fk_user: Number(employeeId), label, amount, salary: amount,
    datesp: dateToTimestamp(dateStart), dateep: fin, datep: fin, datev: fin, paye,
  };
};

export async function verifierRefUnique(ref) {
  if (await dolibarr.findSalaryByRef(ref)) throw new Error(`Référence salaire ${ref} déjà utilisée`);
}

const mapperPeriodeSalaire = (salaire) => ({
  id: String(salaire.id), ref: salaire.ref,
  date_start: horodatageVersDate(salaire.datesp),
  date_end: horodatageVersDate(salaire.dateep),
});

export async function chargerSalairesParEmploye() {
  const map = new Map();
  for (const salaire of await dolibarr.listSalaries({ limit: 500 })) {
    const id = String(salaire.fk_user);
    (map.get(id) || map.set(id, []).get(id)).push(mapperPeriodeSalaire(salaire));
  }
  return map;
}

export async function resoudreEmployes(body) {
  if (Array.isArray(body.employee_ids) && body.employee_ids.length) {
    const ids = new Set(body.employee_ids.map(String));
    return (await searchEmployees({})).filter((e) => ids.has(e.id));
  }
  return searchEmployees({ poste: body.poste, genre: body.genre, heure_min: body.heure_min, heure_max: body.heure_max });
}

export const creerEnregistrementSalaire = (payload) => dolibarr.createSalary(payload);

export async function executerMasseEmployes(employes, refs, traitement) {
  const created = [], skipped = [], failed = [];
  for (let i = 0; i < employes.length; i += 1) {
    try {
      const resultat = await traitement(employes[i], refs[i], i);
      if (resultat?.skip) skipped.push(resultat.skip);
      else if (resultat) created.push(resultat);
    } catch (error) {
      failed.push({ employee: employes[i], errors: [error.message] });
    }
  }
  return { created, skipped, failed };
}
