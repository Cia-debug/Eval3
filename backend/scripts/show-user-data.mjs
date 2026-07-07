import 'dotenv/config';
import mysql from 'mysql2/promise';
import { generateMonthlyBulkPayment } from '../src/services/monthlyBulkPaymentService.js';

const c = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'dolibarr',
});

const [emps] = await c.query(
  'SELECT ref_employee, lastname, gender, job, weeklyhours FROM llx_user WHERE employee=1 AND ref_employee IS NOT NULL ORDER BY ref_employee',
);
console.log('=== EMPLOYES ===');
emps.forEach((e) =>
  console.log(`ref ${e.ref_employee} | ${e.lastname} | ${e.gender} | ${e.job} | ${e.weeklyhours}h`),
);

const [sals] = await c.query(`
  SELECT s.ref, u.ref_employee, u.lastname, u.job, s.amount,
    DATE_FORMAT(s.datesp,'%d/%m/%Y') as debut,
    DATE_FORMAT(s.dateep,'%d/%m/%Y') as fin,
    s.paye
  FROM llx_salary s JOIN llx_user u ON u.rowid=s.fk_user
  WHERE u.employee=1 ORDER BY s.ref
`);
console.log('\n=== SALAIRES ===');
for (const s of sals) {
  console.log(
    `ref ${s.ref} | emp ${s.ref_employee} ${s.lastname} (${s.job}) | ${Number(s.amount)} | ${s.debut} -> ${s.fin} | paye=${s.paye}`,
  );
}

const [pays] = await c.query(`
  SELECT s.ref, u.lastname, u.job, s.amount, COALESCE(SUM(p.amount),0) as paye
  FROM llx_salary s
  JOIN llx_user u ON u.rowid=s.fk_user
  LEFT JOIN llx_payment_salary p ON p.fk_salary=s.rowid
  WHERE u.employee=1
  GROUP BY s.rowid, s.ref, u.lastname, u.job, s.amount
  ORDER BY s.ref
`);
console.log('\n=== RESTE A PAYER ===');
for (const p of pays) {
  const reste = Number(p.amount) - Number(p.paye);
  if (reste > 0.01) {
    console.log(`ref ${p.ref} | ${p.lastname} (${p.job}) | montant ${p.amount} | paye ${p.paye} | RESTE ${reste.toFixed(2)}`);
  }
}

await c.end();

console.log('\n=== SIMULATION PAIEMENT MASSE ===');
for (const { m, y, label } of [
  { m: 2, y: 2024, label: 'Fev 2024 Technicien' },
  { m: 3, y: 2026, label: 'Mars 2026 Technicien' },
  { m: 5, y: 2026, label: 'Mai 2026 Comptable' },
  { m: 7, y: 2026, label: 'Juillet 2026 (defaut page)' },
]) {
  const r = await generateMonthlyBulkPayment({
    month: m,
    year: y,
    budget: 20000,
    priority_job: 'Technicien',
  });
  console.log(`${label}: ${r.created} paiement(s), total ${r.total_paid} EUR${r.warning ? ' — ' + r.warning : ''}`);
}
