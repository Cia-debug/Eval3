import { dateToTimestamp, dolibarr } from './dolibarr.js';
import { searchEmployees } from './employeeService.js';
import { listHolidaysInMonth } from './holidayService.js';
import {
  calculateMonthlySalaryAmount,
  getPaidDaysInMonth,
} from './monthlySalaryCalculator.js';

const TIMEZONE = process.env.DOLIBARR_TIMEZONE || 'Europe/Berlin';

function roundAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

function timestampToDateString(timestamp) {
  if (!timestamp) {
    return '';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Number(timestamp) * 1000));
}

function parseAmount(value) {
  if (value == null || value === '') {
    return null;
  }

  const amount = Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(amount) ? null : amount;
}

function parseMonthYear(body) {
  const errors = [];
  const month = Number(body.month);
  const year = Number(body.year);
  const salaryPerDay = parseAmount(body.salary_per_day);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    errors.push('Mois invalide (1 à 12)');
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    errors.push('Année invalide');
  }

  if (salaryPerDay == null || salaryPerDay <= 0) {
    errors.push('Salaire par jour invalide');
  }

  return { errors, month, year, salaryPerDay };
}

async function allocateSalaryRefs(count) {
  const salaries = await dolibarr.listSalaries({ limit: 500 });
  const numericRefs = salaries
    .map((salary) => Number(salary.ref))
    .filter((value) => Number.isFinite(value));

  let next = numericRefs.length > 0 ? Math.max(...numericRefs) + 1 : 1;
  return Array.from({ length: count }, (_, index) => String(next + index));
}

function mapSalaryPeriod(salary) {
  return {
    id: String(salary.id),
    ref: salary.ref,
    date_start: timestampToDateString(salary.datesp),
    date_end: timestampToDateString(salary.dateep),
  };
}

async function loadSalariesByEmployeeId() {
  const allSalaries = await dolibarr.listSalaries({ limit: 500 });
  const byEmployeeId = new Map();

  for (const salary of allSalaries) {
    const employeeId = String(salary.fk_user);
    const list = byEmployeeId.get(employeeId) || [];
    list.push(mapSalaryPeriod(salary));
    byEmployeeId.set(employeeId, list);
  }

  return byEmployeeId;
}

async function resolveEmployees(body) {
  if (Array.isArray(body.employee_ids) && body.employee_ids.length > 0) {
    const allEmployees = await searchEmployees({});
    const idSet = new Set(body.employee_ids.map(String));
    return allEmployees.filter((employee) => idSet.has(employee.id));
  }

  return searchEmployees({
    poste: body.poste,
    genre: body.genre,
    heure_min: body.heure_min,
    heure_max: body.heure_max,
  });
}

export function previewMonthlySalaryForEmployee({
  employeeSalaries,
  year,
  month,
  salaryPerDay,
  holidayDates,
}) {
  const paidDays = getPaidDaysInMonth(employeeSalaries, year, month);

  return calculateMonthlySalaryAmount({
    year,
    month,
    salaryPerDay,
    holidayDates,
    paidDays,
  });
}

export async function generateMonthlyBulkSalaries(body) {
  const parsed = parseMonthYear(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employees = await resolveEmployees(body);
  if (employees.length === 0) {
    return { ok: false, errors: ['Aucun employé sélectionné'] };
  }

  const holidays = listHolidaysInMonth(parsed.year, parsed.month);
  const holidayDates = holidays.map((holiday) => holiday.date);
  const salariesByEmployeeId = await loadSalariesByEmployeeId();

  const refs = await allocateSalaryRefs(employees.length);
  const created = [];
  const skipped = [];
  const failed = [];

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const employeeSalaries = salariesByEmployeeId.get(employee.id) || [];

    try {
      const calculation = previewMonthlySalaryForEmployee({
        employeeSalaries,
        year: parsed.year,
        month: parsed.month,
        salaryPerDay: parsed.salaryPerDay,
        holidayDates,
      });

      if (calculation.unpaidDayCount === 0) {
        skipped.push({
          employee,
          reason: 'Tous les jours du mois sont déjà rémunérés',
          calculation,
        });
        continue;
      }

      const ref = refs[index];
      const existing = await dolibarr.findSalaryByRef(ref);
      if (existing) {
        failed.push({
          employee,
          errors: [`Référence salaire ${ref} déjà utilisée`],
        });
        continue;
      }

      const salaryPayload = {
        ref,
        fk_user: Number(employee.id),
        label: `Salaire ${parsed.month}/${parsed.year} - ${employee.lastname}`,
        amount: calculation.amount,
        salary: calculation.amount,
        datesp: dateToTimestamp(calculation.date_start),
        dateep: dateToTimestamp(calculation.date_end),
        datep: dateToTimestamp(calculation.date_end),
        datev: dateToTimestamp(calculation.date_end),
        paye: 0,
      };

      const salaryId = await dolibarr.createSalary(salaryPayload);

      created.push({
        salary_id: String(salaryId),
        ref,
        employee,
        amount: calculation.amount,
        date_start: calculation.date_start,
        date_end: calculation.date_end,
        unpaid_day_count: calculation.unpaidDayCount,
        paid_day_count: calculation.paidDayCount,
        holiday_bonus_days: calculation.holidayBonusDays,
        holidays: holidays.filter((holiday) => calculation.unpaidDays.includes(holiday.date)),
      });
    } catch (error) {
      failed.push({
        employee,
        errors: [error.message],
      });
    }
  }

  return {
    ok: failed.length === 0,
    total: employees.length,
    created: created.length,
    skipped: skipped.length,
    failed: failed.length,
    month: parsed.month,
    year: parsed.year,
    salary_per_day: parsed.salaryPerDay,
    holidays_in_month: holidays,
    success: created,
    skipped_items: skipped,
    failures: failed,
  };
}

export async function previewMonthlyBulkSalaries(body) {
  const parsed = parseMonthYear(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employees = await resolveEmployees(body);
  const holidays = listHolidaysInMonth(parsed.year, parsed.month);
  const holidayDates = holidays.map((holiday) => holiday.date);
  const salariesByEmployeeId = await loadSalariesByEmployeeId();

  const previews = employees.map((employee) => {
    const calculation = previewMonthlySalaryForEmployee({
      employeeSalaries: salariesByEmployeeId.get(employee.id) || [],
      year: parsed.year,
      month: parsed.month,
      salaryPerDay: parsed.salaryPerDay,
      holidayDates,
    });

    return {
      employee,
      ...calculation,
      can_generate: calculation.unpaidDayCount > 0,
    };
  });

  return {
    ok: true,
    month: parsed.month,
    year: parsed.year,
    salary_per_day: parsed.salaryPerDay,
    holidays_in_month: holidays,
    previews,
  };
}
