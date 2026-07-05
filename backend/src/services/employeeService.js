import { dolibarr } from './dolibarr.js';
import { getWeeklyHoursByUserIds } from './mysqlUserFields.js';

const GENDER_LABELS = {
  man: 'Homme',
  woman: 'Femme',
};

function isEmployee(user) {
  return user.employee === '1' || Boolean(user.ref_employee);
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseWeeklyHours(value) {
  if (value == null || value === '') {
    return null;
  }

  const hours = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(hours) ? hours : null;
}

function mapEmployee(user) {
  return {
    id: String(user.id),
    ref_employee: user.ref_employee || '',
    lastname: user.lastname || '',
    login: user.login || '',
    gender: user.gender || '',
    gender_label: GENDER_LABELS[user.gender] || '',
    job: user.job || '',
    weeklyhours: parseWeeklyHours(user.weeklyhours),
  };
}

function matchesGenre(employee, genreFilter) {
  if (!genreFilter) {
    return true;
  }

  const key = normalize(genreFilter);
  const genderMap = {
    homme: 'man',
    h: 'man',
    man: 'man',
    femme: 'woman',
    f: 'woman',
    woman: 'woman',
  };

  const expected = genderMap[key];
  if (!expected) {
    return true;
  }

  return employee.gender === expected;
}

function parseHours(value) {
  if (value == null || value === '') {
    return null;
  }

  const hours = Number(String(value).trim().replace(',', '.'));
  return Number.isNaN(hours) ? null : hours;
}

function matchesWeeklyHours(employee, minHours, maxHours) {
  if (minHours == null && maxHours == null) {
    return true;
  }

  if (employee.weeklyhours == null) {
    return false;
  }

  if (minHours != null && employee.weeklyhours < minHours) {
    return false;
  }

  if (maxHours != null && employee.weeklyhours > maxHours) {
    return false;
  }

  return true;
}

export async function searchEmployees(filters = {}) {
  const users = await dolibarr.listUsers({ limit: 500 });
  let employees = users.filter(isEmployee).map(mapEmployee);

  const hoursByUserId = await getWeeklyHoursByUserIds(employees.map((e) => e.id));
  employees = employees.map((employee) => {
    const fromMysql = hoursByUserId.get(employee.id);
    const weeklyhours = fromMysql ?? employee.weeklyhours;
    return weeklyhours != null ? { ...employee, weeklyhours } : employee;
  });

  const refFilter = normalize(filters.ref_employee);
  const nameFilter = normalize(filters.nom);
  const loginFilter = normalize(filters.login);
  const jobFilter = normalize(filters.poste);
  const minHours = parseHours(filters.heure_min);
  const maxHours = parseHours(filters.heure_max);

  return employees.filter((employee) => {
    if (refFilter && !normalize(employee.ref_employee).includes(refFilter)) {
      return false;
    }

    if (nameFilter && !normalize(employee.lastname).includes(nameFilter)) {
      return false;
    }

    if (loginFilter && !normalize(employee.login).includes(loginFilter)) {
      return false;
    }

    if (jobFilter && !normalize(employee.job).includes(jobFilter)) {
      return false;
    }

    if (!matchesGenre(employee, filters.genre)) {
      return false;
    }

    if (!matchesWeeklyHours(employee, minHours, maxHours)) {
      return false;
    }

    return true;
  });
}

export async function getEmployeeById(id) {
  const employees = await searchEmployees({});
  return employees.find((employee) => employee.id === String(id)) || null;
}
