import { dateToTimestamp, dolibarr } from './dolibarr.js';
import { getEmployeeById, searchEmployees } from './employeeService.js';

function parseAmount(value) {
  if (value == null || value === '') {
    return null;
  }

  const amount = Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(amount) ? null : amount;
}

function parseIsoDate(value) {
  if (!value || !value.trim()) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parts = value.trim().split('/');
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

async function generateSalaryRef() {
  const salaries = await dolibarr.listSalaries({ limit: 500 });
  const numericRefs = salaries
    .map((salary) => Number(salary.ref))
    .filter((value) => Number.isFinite(value));

  const next = numericRefs.length > 0 ? Math.max(...numericRefs) + 1 : 1;
  return String(next);
}

function validateSalaryFields(body) {
  const errors = [];

  if (!body.employee_id) {
    errors.push('Employé obligatoire');
  }

  const amount = parseAmount(body.amount);
  if (amount == null || amount <= 0) {
    errors.push('Montant invalide');
  }

  const dateStart = parseIsoDate(body.date_start);
  const dateEnd = parseIsoDate(body.date_end);

  if (!dateStart) {
    errors.push('Date de début invalide');
  }

  if (!dateEnd) {
    errors.push('Date de fin invalide');
  }

  if (dateStart && dateEnd && dateStart > dateEnd) {
    errors.push('La date de début doit être antérieure à la date de fin');
  }

  return { errors, amount, dateStart, dateEnd };
}

function parsePaymentsInput(body) {
  const raw = Array.isArray(body.payments) ? body.payments : [];
  return raw.filter((payment) => payment.date || payment.amount);
}

function validatePayments(payments, { maxAmount = null, paidTotal = 0 } = {}) {
  const errors = [];
  let paymentsTotal = 0;
  const parsed = [];

  payments.forEach((payment, index) => {
    const paymentAmount = parseAmount(payment.amount);
    const paymentDate = parseIsoDate(payment.date);

    if (paymentAmount == null || paymentAmount <= 0) {
      errors.push(`Paiement ${index + 1} : montant invalide`);
    }

    if (!paymentDate) {
      errors.push(`Paiement ${index + 1} : date invalide`);
    }

    if (paymentAmount != null) {
      paymentsTotal += paymentAmount;
      parsed.push({ amount: paymentAmount, date: paymentDate });
    }
  });

  if (parsed.length === 0) {
    errors.push('Au moins un paiement est requis');
  }

  if (maxAmount != null && paidTotal + paymentsTotal > maxAmount + 0.001) {
    errors.push('La somme des paiements dépasse le montant restant du salaire');
  }

  return { errors, payments: parsed, paymentsTotal };
}

function validatePayload(body) {
  const fields = validateSalaryFields(body);
  const paymentRows = parsePaymentsInput(body);
  const payments = validatePayments(paymentRows, { maxAmount: fields.amount });

  return {
    errors: [...fields.errors, ...payments.errors],
    amount: fields.amount,
    dateStart: fields.dateStart,
    dateEnd: fields.dateEnd,
    payments: payments.payments,
  };
}

export async function createSalaryOnly(body) {
  const parsed = validateSalaryFields(body);

  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employee = await getEmployeeById(body.employee_id);
  if (!employee) {
    return { ok: false, errors: ['Employé introuvable'] };
  }

  const ref = body.ref?.trim() || (await generateSalaryRef());
  const existing = await dolibarr.findSalaryByRef(ref);
  if (existing) {
    return { ok: false, errors: [`Référence salaire ${ref} déjà utilisée`] };
  }

  const salaryPayload = {
    ref,
    fk_user: Number(employee.id),
    label: body.label?.trim() || `Salaire ${ref}`,
    amount: parsed.amount,
    salary: parsed.amount,
    datesp: dateToTimestamp(parsed.dateStart),
    dateep: dateToTimestamp(parsed.dateEnd),
    datep: dateToTimestamp(parsed.dateEnd),
    datev: dateToTimestamp(parsed.dateEnd),
    paye: 0,
  };

  const salaryId = await dolibarr.createSalary(salaryPayload);

  return {
    ok: true,
    salary_id: String(salaryId),
    ref,
    employee,
    amount: parsed.amount,
    payments: [],
  };
}

export async function paySalary(salaryId, body) {
  const salary = await dolibarr.getSalary(salaryId);
  if (!salary) {
    return { ok: false, errors: ['Salaire introuvable'] };
  }

  const paymentRows = parsePaymentsInput(body);
  const existingPayments = await listSalaryPaymentsForSalary(salaryId);
  const paidTotal = existingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const salaryAmount = Number(salary.amount);

  const parsed = validatePayments(paymentRows, { maxAmount: salaryAmount, paidTotal });

  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const paymentsAdded = [];

  for (const payment of parsed.payments) {
    await dolibarr.addSalaryPayment(salaryId, {
      datepaye: dateToTimestamp(payment.date),
      amount: payment.amount,
    });

    paymentsAdded.push({
      date: payment.date,
      amount: payment.amount,
    });
  }

  const newPaidTotal = paidTotal + parsed.paymentsTotal;
  const newRemaining = Math.max(0, salaryAmount - newPaidTotal);

  return {
    ok: true,
    salary_id: String(salaryId),
    ref: salary.ref,
    amount: salaryAmount,
    paid_total: Math.round(newPaidTotal * 100) / 100,
    remaining: Math.round(newRemaining * 100) / 100,
    payments: paymentsAdded,
  };
}

export async function createSalaryWithPayments(body) {
  const parsed = validatePayload(body);

  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employee = await getEmployeeById(body.employee_id);
  if (!employee) {
    return { ok: false, errors: ['Employé introuvable'] };
  }

  const ref = body.ref?.trim() || (await generateSalaryRef());
  const existing = await dolibarr.findSalaryByRef(ref);
  if (existing) {
    return { ok: false, errors: [`Référence salaire ${ref} déjà utilisée`] };
  }

  const salaryPayload = {
    ref,
    fk_user: Number(employee.id),
    label: body.label?.trim() || `Salaire ${ref}`,
    amount: parsed.amount,
    salary: parsed.amount,
    datesp: dateToTimestamp(parsed.dateStart),
    dateep: dateToTimestamp(parsed.dateEnd),
    datep: dateToTimestamp(parsed.dateEnd),
    datev: dateToTimestamp(parsed.dateEnd),
    paye: parsed.payments.length > 0 ? 1 : 0,
  };

  const salaryId = await dolibarr.createSalary(salaryPayload);
  const paymentsAdded = [];

  for (const payment of parsed.payments) {
    await dolibarr.addSalaryPayment(salaryId, {
      datepaye: dateToTimestamp(payment.date),
      amount: payment.amount,
    });

    paymentsAdded.push({
      date: payment.date,
      amount: payment.amount,
    });
  }

  return {
    ok: true,
    salary_id: String(salaryId),
    ref,
    employee,
    amount: parsed.amount,
    payments: paymentsAdded,
  };
}

async function allocateSalaryRefs(count) {
  const salaries = await dolibarr.listSalaries({ limit: 500 });
  const numericRefs = salaries
    .map((salary) => Number(salary.ref))
    .filter((value) => Number.isFinite(value));

  let next = numericRefs.length > 0 ? Math.max(...numericRefs) + 1 : 1;
  return Array.from({ length: count }, (_, index) => String(next + index));
}

function validateBulkPayload(body) {
  const errors = [];
  const amount = parseAmount(body.amount);
  const dateStart = parseIsoDate(body.date_start);
  const dateEnd = parseIsoDate(body.date_end);

  if (amount == null || amount <= 0) {
    errors.push('Montant invalide');
  }

  if (!dateStart) {
    errors.push('Date de début invalide');
  }

  if (!dateEnd) {
    errors.push('Date de fin invalide');
  }

  if (dateStart && dateEnd && dateStart > dateEnd) {
    errors.push('La date de début doit être antérieure à la date de fin');
  }

  return { errors, amount, dateStart, dateEnd };
}

export async function generateBulkSalaries(body) {
  const parsed = validateBulkPayload(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employees = await searchEmployees({
    poste: body.poste,
    genre: body.genre,
    heure_min: body.heure_min,
    heure_max: body.heure_max,
  });

  if (employees.length === 0) {
    return { ok: false, errors: ['Aucun salarié ne correspond aux filtres'] };
  }

  const refs = await allocateSalaryRefs(employees.length);
  const created = [];
  const failed = [];

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];

    try {
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
        label: `Salaire ${ref} - ${employee.lastname}`,
        amount: parsed.amount,
        salary: parsed.amount,
        datesp: dateToTimestamp(parsed.dateStart),
        dateep: dateToTimestamp(parsed.dateEnd),
        datep: dateToTimestamp(parsed.dateEnd),
        datev: dateToTimestamp(parsed.dateEnd),
        paye: 0,
      };

      const salaryId = await dolibarr.createSalary(salaryPayload);

      created.push({
        salary_id: String(salaryId),
        ref,
        employee,
        amount: parsed.amount,
        date_start: parsed.dateStart,
        date_end: parsed.dateEnd,
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
    failed: failed.length,
    success: created,
    failures: failed,
  };
}

export async function listSalaryPaymentsForSalary(salaryId) {
  const payments = await dolibarr.listSalaryPayments({ limit: 500 });
  return payments.filter((payment) => String(payment.fk_salary) === String(salaryId));
}
