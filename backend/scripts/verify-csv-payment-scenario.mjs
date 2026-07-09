import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  calculerMontantSalaireMensuel,
  joursPayesDuMois,
  bornesMois,
} from '../src/services/calculateurSalaireMensuel.js';
import { detectDelimiter, normalizeHeader, parseCsvContent, parseCsvLine } from '../src/services/csvParser.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseFrDate(value) {
  if (!value?.trim()) return null;
  const [day, month, yearRaw] = value.trim().split('/');
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseAmount(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function loadEmployees() {
  const text = readFileSync(join(root, 'ref_employe.csv'), 'utf8');
  const { lines, delimiter, rawHeaders } = parseCsvContent(text);
  const headers = rawHeaders.map((h) => normalizeHeader(h, { replaceSlashes: true }));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
    return {
      ref_employee: row.ref_employe,
      lastname: row.nom,
      job: row.poste,
      id: row.ref_employe,
    };
  });
}

function loadSalaries() {
  const text = readFileSync(join(root, 'ref_salaire.csv'), 'utf8');
  const { lines, delimiter, rawHeaders } = parseCsvContent(text);
  const headers = rawHeaders.map((h) => normalizeHeader(h));
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']));
    return {
      line: index + 2,
      ref: row.ref_salaire,
      ref_employee: row.ref_employe,
      date_start: parseFrDate(row.date_debut),
      date_end: parseFrDate(row.date_fin),
      amount: parseAmount(row.montant),
      payments: row.paiement,
    };
  });
}

function chevaucheMois(debut, fin, year, month) {
  const { start, end } = bornesMois(year, month);
  return debut && debut <= end && (fin || debut) >= start;
}

function normaliserPoste(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function simulerPaiementMasse(entrees, budget, priorityJob) {
  const poste = normaliserPoste(priorityJob);
  const tries = [...entrees].sort((a, b) => {
    const priA = normaliserPoste(a.job) === poste ? 0 : 1;
    const priB = normaliserPoste(b.job) === poste ? 0 : 1;
    if (priA !== priB) return priA - priB;
    return a.date_start.localeCompare(b.date_start);
  });

  let budgetRestant = budget;
  const payments = [];
  for (const entree of tries) {
    if (budgetRestant <= 0) break;
    const montant = Math.min(entree.remaining, budgetRestant);
    if (montant <= 0) continue;
    budgetRestant = Math.round((budgetRestant - montant) * 100) / 100;
    payments.push({ name: entree.name, job: entree.job, amount: montant, ref: entree.ref });
  }
  return payments;
}

const employees = loadEmployees();
const salaries = loadSalaries();
const year = 2024;
const month = 2;

console.log('=== EMPLOYES ===');
employees.forEach((e) => console.log(`${e.ref_employee} ${e.lastname} (${e.job})`));

console.log('\n=== SALAIRES CSV ===');
salaries.forEach((s) => {
  console.log(`ref ${s.ref} | emp ${s.ref_employee} | ${s.amount} | ${s.date_start} -> ${s.date_end} | paiement: ${s.payments || '—'}`);
});

// Jours fériés février 2024 — scénarios courants d'évaluation
const holidayScenarios = {
  aucun: [],
  un_ferie_13: ['2024-02-13'],
};

for (const [label, holidayDates] of Object.entries(holidayScenarios)) {
  console.log(`\n========== GÉNÉRATION MENSUELLE FEV 2024 (${label}) ==========`);

  const salaryPerDayCandidates = [10, 20, 15, 12, 8];

  for (const salaryPerDay of salaryPerDayCandidates) {
    const generated = [];
    for (const emp of employees) {
      const empSalaries = salaries
        .filter((s) => s.ref_employee === emp.ref_employee)
        .map((s) => ({ date_start: s.date_start, date_end: s.date_end }));

      const paidDays = joursPayesDuMois(empSalaries, year, month);
      const calc = calculerMontantSalaireMensuel({
        year,
        month,
        salaryPerDay,
        holidayDates,
        paidDays,
      });

      if (calc.unpaidDayCount === 0) {
        generated.push({ ...emp, skipped: true, reason: 'mois déjà couvert' });
        continue;
      }

      generated.push({
        ...emp,
        amount: calc.amount,
        unpaidDayCount: calc.unpaidDayCount,
        holidayBonusDays: calc.holidayBonusDays,
        date_start: calc.date_start,
        date_end: calc.date_end,
      });
    }

    const amounts = generated.filter((g) => !g.skipped).map((g) => g.amount);
    const total = Math.round(amounts.reduce((s, a) => s + a, 0) * 100) / 100;
    const match200420580 = generated
      .filter((g) => !g.skipped)
      .some((g) => g.lastname === 'Rakotobe' && g.amount === 200)
      && generated.some((g) => !g.skipped && g.lastname === 'Rasoabe' && g.amount === 420)
      && generated.some((g) => !g.skipped && g.lastname === 'Rajenja' && g.amount === 580);

    if (match200420580 || salaryPerDay === 10 || salaryPerDay === 20) {
      console.log(`\n--- salaire/jour = ${salaryPerDay} | total généré = ${total} ---`);
      generated.forEach((g) => {
        if (g.skipped) {
          console.log(`  ${g.lastname}: IGNORÉ (${g.reason})`);
        } else {
          console.log(`  ${g.lastname} (${g.job}): ${g.amount} € | ${g.unpaidDayCount} jours | fériés bonus ${g.holidayBonusDays} | ${g.date_start} -> ${g.date_end}`);
        }
      });

      if (match200420580) {
        console.log('\n>>> MATCH 200 / 420 / 580 trouvé <<<');
        const eligibles = generated
          .filter((g) => !g.skipped)
          .map((g) => ({
            name: g.lastname,
            job: g.job,
            ref: `gen-${g.ref_employee}`,
            remaining: g.amount,
            date_start: g.date_start,
          }));

        const paiements = simulerPaiementMasse(eligibles, 1200, 'Technicien');
        console.log('\nPaiement masse budget 1200 (priorité Technicien):');
        paiements.forEach((p) => console.log(`  ${p.name} (${p.job}): ${p.amount} €`));
        console.log(`  Total payé: ${paiements.reduce((s, p) => s + p.amount, 0)} €`);
      }
    }
  }
}

console.log('\n========== PAIEMENT MASSE SUR CSV SEUL (sans génération mensuelle) ==========');
const empByRef = new Map(employees.map((e) => [e.ref_employee, e]));
const eligiblesCsv = salaries
  .filter((s) => chevaucheMois(s.date_start, s.date_end, year, month))
  .map((s) => {
    const emp = empByRef.get(s.ref_employee);
    return {
      name: emp?.lastname || '?',
      job: emp?.job || '?',
      ref: s.ref,
      remaining: s.amount,
      date_start: s.date_start,
    };
  });

console.log('Éligibles février 2024 depuis CSV:');
eligiblesCsv.forEach((e) => console.log(`  ${e.name} (${e.job}) ref ${e.ref}: reste ${e.remaining} €`));

const paiementsCsv = simulerPaiementMasse(eligiblesCsv, 1200, 'Technicien');
console.log('\nPaiement simulé:');
paiementsCsv.forEach((p) => console.log(`  ${p.name}: ${p.amount} €`));
