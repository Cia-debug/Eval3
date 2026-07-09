import 'dotenv/config';
import mysql from 'mysql2/promise';
import { initSqliteDb } from '../src/db/sqlite.js';
import { searchEmployees } from '../src/services/employeeService.js';
import { genererPaiementsMensuelsEnMasse } from '../src/services/servicePaiementsMensuelsMasse.js';
import { bornesMois } from '../src/services/calculateurSalaireMensuel.js';

await initSqliteDb();

const c = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dolibarr',
});

const [salaries] = await c.query(`
  SELECT s.rowid, s.ref, s.amount, s.paye, s.datesp, s.dateep, u.lastname, u.job,
    DATE_FORMAT(s.datesp,'%Y-%m-%d') as debut,
    DATE_FORMAT(s.dateep,'%Y-%m-%d') as fin
  FROM llx_salary s
  JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1
  ORDER BY s.rowid DESC
  LIMIT 20
`);

console.log('=== Salaires récents ===');
for (const s of salaries) {
  console.log({
    name: s.lastname,
    job: s.job,
    amount: Number(s.amount),
    paye: s.paye,
    debut: s.debut,
    fin: s.fin,
  });
}

const [payments] = await c.query(`
  SELECT p.fk_salary, p.amount, DATE_FORMAT(FROM_UNIXTIME(p.datep),'%Y-%m-%d') as datep
  FROM llx_payment_salary p
  ORDER BY p.rowid DESC LIMIT 10
`);
console.log('\n=== Paiements récents ===', payments);

await c.end();

const emps = await searchEmployees({ poste: 'Technicien' });
console.log('\n=== Techniciens ===', emps.map((e) => e.lastname));

for (const { year, month } of [{ year: 2024, month: 2 }, { year: 2026, month: 3 }, { year: 2026, month: 6 }]) {
  const bounds = bornesMois(year, month);
  console.log(`\n=== Test paiement ${month}/${year} (${bounds.start} -> ${bounds.end}) ===`);
  const result = await genererPaiementsMensuelsEnMasse({
    month,
    year,
    budget: 20000,
    priority_job: 'Technicien',
  });
  console.log({
    created: result.created,
    total_paid: result.total_paid,
    budget_remaining: result.budget_remaining,
    errors: result.errors,
    salaries_found: result.payments?.length,
    failures: result.failures,
  });
}
