import 'dotenv/config';
import mysql from 'mysql2/promise';
import { initSqliteDb } from '../src/db/sqlite.js';
import { listHolidaysInMonth } from '../src/services/holidayService.js';
import { searchEmployees } from '../src/services/employeeService.js';
import {
  calculateMonthlySalaryAmount,
  getPaidDaysInMonth,
} from '../src/services/monthlySalaryCalculator.js';

await initSqliteDb();

const c = await mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'dolibarr',
});

const TIMEZONE = process.env.DOLIBARR_TIMEZONE || 'Europe/Berlin';

function tsToIso(ts) {
  if (!ts) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Number(ts) * 1000));
}

const [byGenre] = await c.query(`
  SELECT
    CASE
      WHEN u.gender = 'man' OR u.civility = 'MR' THEN 'man'
      WHEN u.gender = 'woman' OR u.civility = 'MME' THEN 'woman'
      ELSE 'unknown'
    END AS genre,
    SUM(s.amount) AS total,
    COUNT(s.rowid) AS count
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1 AND u.ref_employee IS NOT NULL AND u.ref_employee <> ''
  GROUP BY genre
`);
console.log('=== Dashboard par genre (tous mois) ===');
console.log(byGenre);

const [allSalaries] = await c.query(`
  SELECT s.rowid, s.ref, s.amount, s.datesp, s.dateep, s.fk_user, u.lastname, u.gender, u.job, u.ref_employee
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1
  ORDER BY u.gender, u.lastname, s.datesp
`);

console.log('\n=== Tous les salaires employés ===');
for (const s of allSalaries) {
  console.log({
    name: s.lastname,
    gender: s.gender,
    job: s.job,
    amount: Number(s.amount),
    start: tsToIso(s.datesp),
    end: tsToIso(s.dateep),
  });
}

const holidaysFeb2024 = listHolidaysInMonth(2024, 2);
console.log('\n=== Fériés février 2024 ===', holidaysFeb2024);

const techniciens = (await searchEmployees({ poste: 'Technicien' })).filter(
  (e) => e.job === 'Technicien' || e.job?.toLowerCase().includes('technicien'),
);
console.log('\n=== Techniciens ===', techniciens.map((e) => ({
  id: e.id,
  name: e.lastname,
  gender: e.gender,
  job: e.job,
})));

const holidayDates = holidaysFeb2024.map((h) => h.date);
const salaryPerDay = 10; // user example - we'll also try to infer from amounts

for (const emp of techniciens) {
  const empSalaries = allSalaries
    .filter((s) => String(s.fk_user) === String(emp.id))
    .map((s) => ({
      date_start: tsToIso(s.datesp),
      date_end: tsToIso(s.dateep),
      amount: Number(s.amount),
    }));

  const paidDays = getPaidDaysInMonth(empSalaries, 2024, 2);
  const calc = calculateMonthlySalaryAmount({
    year: 2024,
    month: 2,
    salaryPerDay: 10,
    holidayDates,
    paidDays,
  });

  const febSalaries = allSalaries.filter(
    (s) =>
      String(s.fk_user) === String(emp.id) &&
      s.datesp &&
      new Date(s.datesp).getFullYear() === 2024 &&
      new Date(s.datesp).getMonth() === 1,
  );

  console.log(`\n--- ${emp.lastname} (${emp.gender}) ---`);
  console.log('Salaires fév 2024 en base:', febSalaries.map((s) => Number(s.amount)));
  console.log('Calcul théorique @10/jour:', calc);
}

const [feb2024] = await c.query(`
  SELECT u.lastname, u.gender, u.job, s.amount, s.datesp, s.dateep
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1 AND DATE_FORMAT(s.datesp, '%Y-%m') = '2024-02'
`);

console.log('\n=== Salaires datesp en 2024-02 (MySQL DATE_FORMAT) ===');
for (const s of feb2024) {
  console.log({
    name: s.lastname,
    gender: s.gender,
    job: s.job,
    amount: Number(s.amount),
    datesp: s.datesp,
    dateep: s.dateep,
  });
}

const [rows] = await c.query(`
  SELECT u.lastname, u.gender, u.job, s.amount,
    DATE_FORMAT(s.datesp,'%Y-%m-%d') as debut,
    DATE_FORMAT(s.dateep,'%Y-%m-%d') as fin
  FROM llx_salary s JOIN llx_user u ON u.rowid=s.fk_user
  WHERE u.employee=1 ORDER BY u.gender, u.lastname, s.datesp
`);
let man = 0;
let woman = 0;
console.log('\n=== Détail lisible ===');
for (const r of rows) {
  const a = Number(r.amount);
  if (r.gender === 'man') man += a;
  else if (r.gender === 'woman') woman += a;
  console.log(`${r.gender === 'man' ? 'Homme' : 'Femme'} | ${r.lastname} | ${r.job} | ${a} | ${r.debut} -> ${r.fin}`);
}
console.log('\nTOTAL Homme:', man, '| Femme:', woman);

await c.end();
