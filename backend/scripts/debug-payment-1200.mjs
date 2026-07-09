import 'dotenv/config';
import mysql from 'mysql2/promise';
import { initSqliteDb } from '../src/db/sqlite.js';
import { genererPaiementsMensuelsEnMasse } from '../src/services/servicePaiementsMensuelsMasse.js';
import { bornesMois } from '../src/services/calculateurSalaireMensuel.js';

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

const [rows] = await c.query(`
  SELECT s.rowid, s.ref, s.amount, s.datesp, s.dateep, u.rowid as user_id, u.lastname, u.job,
    COALESCE((SELECT SUM(p.amount) FROM llx_payment_salary p WHERE p.fk_salary=s.rowid),0) as paid
  FROM llx_salary s JOIN llx_user u ON u.rowid=s.fk_user
  WHERE u.employee=1 AND u.ref_employee IS NOT NULL AND u.ref_employee <> ''
  ORDER BY u.lastname, s.datesp
`);

console.log('=== SALAIRES FEV 2024 overlap avec reste > 0 ===');
const bounds = bornesMois(2024, 2);
console.log('Bounds:', bounds);

const eligible = [];
for (const s of rows) {
  const debut = tsToIso(s.datesp);
  const fin = tsToIso(s.dateep);
  const overlap = debut && debut <= bounds.end && (fin || debut) >= bounds.start;
  const reste = Math.max(0, Number(s.amount) - Number(s.paid));
  if (overlap && reste > 0) {
    const entry = {
      name: s.lastname,
      job: s.job,
      ref: s.ref,
      amount: Number(s.amount),
      paid: Number(s.paid),
      reste,
      debut,
      fin,
      isTechnicien: s.job === 'Technicien',
    };
    eligible.push(entry);
    console.log(entry);
  }
}

eligible.sort((a, b) =>
  (a.job === 'Technicien' ? 0 : 1) - (b.job === 'Technicien' ? 0 : 1) || a.debut.localeCompare(b.debut),
);

console.log('\n=== ORDRE DE PAIEMENT ATTENDU ===');
let budget = 1200;
for (const e of eligible) {
  const pay = Math.min(e.reste, budget);
  console.log(`${e.name} (${e.job}): pay ${pay}, reste salaire ${e.reste}, budget avant ${budget}`);
  budget -= pay;
}

const r = await genererPaiementsMensuelsEnMasse({
  month: 2,
  year: 2024,
  budget: 1200,
  priority_job: 'Technicien',
});
console.log('\n=== RESULTAT API (dry - may have already paid) ===');
console.log({
  created: r.created,
  total_paid: r.total_paid,
  budget_remaining: r.budget_remaining,
  warning: r.warning,
  payments: r.payments?.map((p) => ({
    name: p.employee.lastname,
    job: p.job,
    amount: p.amount,
    remaining_after: p.remaining_after,
  })),
  failures: r.failures,
});

await c.end();
