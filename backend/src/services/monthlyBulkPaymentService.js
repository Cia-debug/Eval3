import { dolibarr } from './dolibarr.js';
import { searchEmployees } from './employeeService.js';
import { paySalary } from './salaryService.js';
import { getMonthBounds } from './monthlySalaryCalculator.js';

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

function salaryOverlapsMonth(dateStart, dateEnd, year, month) {
  if (!dateStart) {
    return false;
  }

  const { start: monthStart, end: monthEnd } = getMonthBounds(year, month);
  const end = dateEnd || dateStart;

  return dateStart <= monthEnd && end >= monthStart;
}

function parsePaymentInput(body) {
  const errors = [];
  const month = Number(body.month);
  const year = Number(body.year);
  const budget = parseAmount(body.budget);
  const priorityJob = String(body.priority_job ?? '').trim();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    errors.push('Mois invalide (1 à 12)');
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    errors.push('Année invalide');
  }

  if (budget == null || budget <= 0) {
    errors.push('Montant budget invalide');
  }

  if (!priorityJob) {
    errors.push('Poste prioritaire obligatoire');
  }

  return { errors, month, year, budget, priorityJob };
}

function sortSalariesForPayment(entries, priorityJob) {
  return [...entries].sort((left, right) => {
    const leftIsPriority = left.employee.job === priorityJob ? 0 : 1;
    const rightIsPriority = right.employee.job === priorityJob ? 0 : 1;

    if (leftIsPriority !== rightIsPriority) {
      return leftIsPriority - rightIsPriority;
    }

    return left.date_start.localeCompare(right.date_start);
  });
}

async function loadSalariesWithRemaining(employeesById) {
  const [allSalaries, allPayments] = await Promise.all([
    dolibarr.listSalaries({ limit: 500 }),
    dolibarr.listSalaryPayments({ limit: 500 }),
  ]);

  const paymentsBySalaryId = new Map();

  for (const payment of allPayments) {
    const salaryId = String(payment.fk_salary);
    const list = paymentsBySalaryId.get(salaryId) || [];
    list.push(payment);
    paymentsBySalaryId.set(salaryId, list);
  }

  const entries = [];

  for (const salary of allSalaries) {
    const employeeId = String(salary.fk_user);
    const employee = employeesById.get(employeeId);

    if (!employee) {
      continue;
    }

    const payments = paymentsBySalaryId.get(String(salary.id)) || [];
    const amount = roundAmount(salary.amount);
    const paidTotal = roundAmount(
      payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    );

    const remainingFromApi = salary.resteapayer != null && salary.resteapayer !== ''
      ? roundAmount(salary.resteapayer)
      : null;
    const remaining = remainingFromApi ?? roundAmount(Math.max(0, amount - paidTotal));

    if (remaining <= 0) {
      continue;
    }

    entries.push({
      salary_id: String(salary.id),
      ref: salary.ref,
      date_start: timestampToDateString(salary.datesp),
      date_end: timestampToDateString(salary.dateep),
      remaining,
      employee,
    });
  }

  return entries;
}

export async function generateMonthlyBulkPayment(body) {
  const parsed = parsePaymentInput(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const allEmployees = await searchEmployees({});
  const employeesById = new Map(allEmployees.map((employee) => [employee.id, employee]));

  const salariesInMonth = (await loadSalariesWithRemaining(employeesById)).filter((entry) =>
    salaryOverlapsMonth(entry.date_start, entry.date_end, parsed.year, parsed.month),
  );

  const sortedSalaries = sortSalariesForPayment(salariesInMonth, parsed.priorityJob);
  const { end: paymentDate } = getMonthBounds(parsed.year, parsed.month);

  if (sortedSalaries.length === 0) {
    return {
      ok: true,
      month: parsed.month,
      year: parsed.year,
      budget: parsed.budget,
      budget_remaining: parsed.budget,
      total_paid: 0,
      priority_job: parsed.priorityJob,
      created: 0,
      failed: 0,
      eligible_count: 0,
      payments: [],
      failures: [],
      warning:
        `Aucun salaire avec reste à payer trouvé pour ${String(parsed.month).padStart(2, '0')}/${parsed.year}. ` +
        'Choisissez le mois/année correspondant à une période de salaire existante (ex. février 2024).',
    };
  }

  let budgetRemaining = parsed.budget;
  const payments = [];
  const failures = [];

  for (const entry of sortedSalaries) {
    if (budgetRemaining <= 0) {
      break;
    }

    const paymentAmount = roundAmount(Math.min(entry.remaining, budgetRemaining));

    if (paymentAmount <= 0) {
      continue;
    }

    try {
      const payResult = await paySalary(entry.salary_id, {
        payments: [{ date: paymentDate, amount: paymentAmount }],
      });

      if (!payResult.ok) {
        failures.push({
          employee: entry.employee,
          salary_id: entry.salary_id,
          errors: payResult.errors,
        });
        continue;
      }

      budgetRemaining = roundAmount(budgetRemaining - paymentAmount);

      payments.push({
        date: paymentDate,
        employee: entry.employee,
        job: entry.employee.job || '—',
        amount: paymentAmount,
        salary_id: entry.salary_id,
        salary_ref: entry.ref,
        remaining_after: payResult.remaining,
      });
    } catch (error) {
      failures.push({
        employee: entry.employee,
        salary_id: entry.salary_id,
        errors: [error.message],
      });
    }
  }

  const totalPaid = roundAmount(parsed.budget - budgetRemaining);

  return {
    ok: failures.length === 0,
    month: parsed.month,
    year: parsed.year,
    budget: parsed.budget,
    budget_remaining: budgetRemaining,
    total_paid: totalPaid,
    priority_job: parsed.priorityJob,
    created: payments.length,
    failed: failures.length,
    eligible_count: sortedSalaries.length,
    payments,
    failures,
  };
}
