import { dateToTimestamp, dolibarr } from './dolibarr.js';
import { normalizeHeader, parseCsvContent, parseCsvLine } from './csvParser.js';

const COLUMN_ALIASES = {
  ref_salaire: 'ref_salary',
  ref_salary: 'ref_salary',
  ref_employe: 'ref_employee',
  ref_employee: 'ref_employee',
  date_debut: 'date_start',
  date_fin: 'date_end',
  montant: 'amount',
  amount: 'amount',
  paiement: 'payments',
  payments: 'payments',
};

function parseAmount(value) {
  if (value == null || value === '') {
    return null;
  }

  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isNaN(amount) ? null : amount;
}

function parseDate(value) {
  if (!value || !value.trim()) {
    return null;
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

export function parsePayments(value) {
  if (!value || !value.trim()) {
    return [];
  }

  const matches = [
    ...value.matchAll(/\[\s*"?(?<date>[^"\],]+)"?\s*,\s*(?<amount>[0-9]+(?:[.,][0-9]+)?)\s*\]/g),
  ];

  return matches
    .map((match) => ({
      date: parseDate(match.groups.date),
      amount: parseAmount(match.groups.amount),
    }))
    .filter((payment) => payment.date && payment.amount != null);
}

export function parseSalaryCsv(content) {
  const { lines, delimiter, rawHeaders } = parseCsvContent(content);

  const headers = rawHeaders.map((header) => {
    const normalized = normalizeHeader(header);
    return COLUMN_ALIASES[normalized] || normalized;
  });

  const required = ['ref_salary', 'ref_employee', 'date_start', 'date_end', 'amount'];
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
      ref_salary: row.ref_salary,
      ref_employee: row.ref_employee,
      date_start: parseDate(row.date_start),
      date_end: parseDate(row.date_end),
      amount: parseAmount(row.amount),
      payments: parsePayments(row.payments || ''),
    });
  }

  if (rows.length === 0) {
    throw new Error('Aucune ligne de données dans le CSV');
  }

  return rows;
}

function validateRow(row) {
  const errors = [];

  if (!row.ref_salary) errors.push('ref_salaire obligatoire');
  if (!row.ref_employee) errors.push('ref_employe obligatoire');
  if (!row.date_start) errors.push('date_debut invalide');
  if (!row.date_end) errors.push('date_fin invalide');
  if (row.amount == null) errors.push('montant invalide');

  return errors;
}

function buildSalaryPayload(row, userId) {
  return {
    ref: String(row.ref_salary),
    fk_user: Number(userId),
    label: `Salaire ${row.ref_salary}`,
    amount: row.amount,
    salary: row.amount,
    datesp: dateToTimestamp(row.date_start),
    dateep: dateToTimestamp(row.date_end),
    datep: dateToTimestamp(row.date_end),
    datev: dateToTimestamp(row.date_end),
    paye: row.payments.length > 0 ? 1 : 0,
  };
}

async function saveSalary(row) {
  const rowErrors = validateRow(row);
  if (rowErrors.length > 0) {
    return { ok: false, line: row.line, ref_salary: row.ref_salary, errors: rowErrors };
  }

  const user = await dolibarr.findUserByRefEmployee(row.ref_employee);
  if (!user) {
    return {
      ok: false,
      line: row.line,
      ref_salary: row.ref_salary,
      errors: [`Employé ref_employe=${row.ref_employee} introuvable dans Dolibarr`],
    };
  }

  const payload = buildSalaryPayload(row, user.id);
  const existing = await dolibarr.findSalaryByRef(row.ref_salary);

  let salaryId;
  let action;

  if (existing) {
    await dolibarr.updateSalary(existing.id, payload);
    salaryId = existing.id;
    action = 'updated';
  } else {
    salaryId = await dolibarr.createSalary(payload);
    action = 'created';
  }

  let paymentsAdded = 0;

  if (action === 'created') {
    for (const payment of row.payments) {
      await dolibarr.addSalaryPayment(salaryId, {
        datepaye: dateToTimestamp(payment.date),
        amount: payment.amount,
      });
      paymentsAdded += 1;
    }
  }

  return {
    ok: true,
    line: row.line,
    ref_salary: row.ref_salary,
    login: user.login,
    action,
    payments: paymentsAdded,
    dolibarr_id: salaryId,
  };
}

export async function importSalariesFromCsv(content) {
  const rows = parseSalaryCsv(content);

  const results = {
    total: rows.length,
    created: 0,
    updated: 0,
    failed: [],
    success: [],
  };

  for (const row of rows) {
    try {
      const result = await saveSalary(row);

      if (!result.ok) {
        results.failed.push(result);
        continue;
      }

      results.success.push(result);
      if (result.action === 'created') {
        results.created += 1;
      } else {
        results.updated += 1;
      }
    } catch (error) {
      results.failed.push({
        ok: false,
        line: row.line,
        ref_salary: row.ref_salary,
        errors: [error.message],
      });
    }
  }

  return results;
}
