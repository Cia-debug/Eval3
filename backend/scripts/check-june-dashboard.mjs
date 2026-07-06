import 'dotenv/config';
import mysql from 'mysql2/promise';
import { listHolidays, listHolidaysInMonth } from '../src/services/holidayService.js';

const c = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dolibarr',
});

const [salaries] = await c.query(`
  SELECT s.rowid, s.ref, s.amount, s.datesp, s.dateep, u.lastname
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1
  ORDER BY s.rowid DESC
  LIMIT 15
`);

console.log('Salaires:');
for (const s of salaries) {
  const start = s.datesp ? new Date(s.datesp).toISOString().slice(0, 10) : null;
  const end = s.dateep ? new Date(s.dateep).toISOString().slice(0, 10) : null;
  console.log(`  ref=${s.ref} ${s.lastname} amount=${s.amount} ${start} -> ${end}`);
}

const [juneTotal] = await c.query(`
  SELECT SUM(s.amount) AS total, COUNT(*) AS cnt
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1 AND DATE_FORMAT(s.datesp, '%Y-%m') = '2026-06'
`);
console.log('\nTotal dashboard juin 2026:', juneTotal[0]);

await c.end();

console.log('\nTous jours feries SQLite:');
console.log(listHolidays());
console.log('\nFeries juin 2026:');
console.log(listHolidaysInMonth(2026, 6));
