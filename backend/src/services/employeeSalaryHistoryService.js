import { dolibarr } from './dolibarr.js';
import { getEmployeeById , searchEmployees} from './employeeService.js';


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

function mapPayment(payment) {
  return {
    id: String(payment.id),
    amount: roundAmount(payment.amount),
    date: timestampToDateString(payment.datepaye || payment.datep),
  };
}

function mapSalaryWithPayments(salary, paymentsBySalaryId) {
  const payments = paymentsBySalaryId.get(String(salary.id)) || [];
  const amount = roundAmount(salary.amount);
  const paidTotal = roundAmount(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const remainingFromApi = salary.resteapayer != null && salary.resteapayer !== ''
    ? roundAmount(salary.resteapayer)
    : null;
  const remaining = remainingFromApi ?? roundAmount(Math.max(0, amount - paidTotal));

  return {
    id: String(salary.id),
    ref: salary.ref,
    label: salary.label || `Salaire ${salary.ref}`,
    amount,
    date_start: timestampToDateString(salary.datesp),
    date_end: timestampToDateString(salary.dateep),
    paye: salary.paye === '1' || salary.paye === 1,
    payments,
    paid_total: paidTotal,
    remaining,
  };
}

export async function getEmployeeSalaryHistory(employeeId) {
  const employee = await getEmployeeById(employeeId);
  if (!employee) {
    return null;
  }

  const [allSalaries, allPayments] = await Promise.all([
    dolibarr.listSalaries({ limit: 500 }),
    dolibarr.listSalaryPayments({ limit: 500 }),
  ]);

  const paymentsBySalaryId = new Map();
  for (const payment of allPayments) {
    const salaryId = String(payment.fk_salary);
    const list = paymentsBySalaryId.get(salaryId) || [];
    list.push(mapPayment(payment));
    paymentsBySalaryId.set(salaryId, list);
  }

  const salaries = allSalaries
    .filter((salary) => String(salary.fk_user) === String(employeeId))
    .map((salary) => mapSalaryWithPayments(salary, paymentsBySalaryId))
    .sort((a, b) => b.date_start.localeCompare(a.date_start));

  const totals = {
    amount: roundAmount(salaries.reduce((sum, salary) => sum + salary.amount, 0)),
    paid: roundAmount(salaries.reduce((sum, salary) => sum + salary.paid_total, 0)),
    remaining: roundAmount(salaries.reduce((sum, salary) => sum + salary.remaining, 0)),
  };

  return {
    employee,
    salaries,
    totals,
  };
}

export async function obtenirRecapRestesParMois() {
  // const {searchEmployees} = await import ('./employeeService.js');
  const employees = await searchEmployees({});
  const parMois = new Map();

  for(const employee of employees) {
    const history= await getEmployeeSalaryHistory(employee.id);
    if(!history?.salaries?.length) continue;
 
  for(const salary of history.salaries) {
    if(!salary.date_start) continue;
  

  const cleMois = salary.date_start.slice(0,7);
  const [yearStr , monthStr]= cleMois.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  if(!parMois.has(cleMois)) {
    parMois.set(cleMois, {key: cleMois, year , month , cells:{} });
  }

  const ligne = parMois.get(cleMois);
  if(!ligne.cells[employee.id]) {
    ligne.cells[employee.id] = {
      total_amount:0,
      total_paid:0,
      remaining:0,
      salaries:[],
      payments: [],
    };
  }

  const cell= ligne.cells[employee.id];
  cell.total_amount = roundAmount(cell.total_amount + salary.amount);
  cell.total_paid = roundAmount(cell.total_paid + salary.paid_total);
  cell.remaining = roundAmount(cell.remaining + salary.remaining);
  cell.salaries.push({
    ref:salary.ref,
    label: salary.label,
    amount:salary.amount,
    date_start: salary.date_start,
    date_end:salary.date_end,
    paid_total: salary.paid_total,
    remaining: salary.remaining,
  });

  salary.payments.forEach((p) => {
    cell.payments.push({date: p.date, amount: p.amount , salary_ref: salary.ref });
  });
}
}

  return {
    employees: employees.map((e) => ({ id:e.id, lastname: e.lastname })),
    months: [...parMois.values()].sort((a,b) => a.key.localeCompare(b.key)),
  };
}


