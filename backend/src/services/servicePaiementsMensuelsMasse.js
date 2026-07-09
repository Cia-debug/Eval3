import { dolibarr } from './dolibarr.js';
import { searchEmployees } from './employeeService.js';
import { payerSalaire } from './serviceSalaire.js';
import { bornesMois } from './calculateurSalaireMensuel.js';
import { arrondirMontant, horodatageVersDate, parserMoisAnnee, parserMontant } from './utilitairesSalaire.js';

const chevaucheMois = (debut, fin, annee, mois) => {
  if (!debut) return false;
  const { start: debutMois, end: finMois } = bornesMois(annee, mois);
  return debut <= finMois && (fin || debut) >= debutMois;
};

const normaliserPoste = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const trierParDateDebut = (entrees) =>
  [...entrees].sort((a, b) => a.date_start.localeCompare(b.date_start) || a.ref.localeCompare(b.ref));

const parserEntreePaiementMasse = (body) => {
  const parse = parserMoisAnnee(body);
  const budget = parserMontant(body.budget);
  const priorityJob = String(body.priority_job ?? '').trim();
  if (budget == null || budget <= 0) parse.errors.push('Montant budget invalide');
  if (!priorityJob) parse.errors.push('Poste prioritaire obligatoire');
  return { ...parse, budget, priorityJob };
};

function calculerResteReel(salaire, paiements) {
  const paye = arrondirMontant(paiements.reduce((sum, p) => sum + Number(p.amount || 0), 0));
  const montant = arrondirMontant(salaire.amount);
  return arrondirMontant(Math.max(0, montant - paye));
}

async function chargerSalairesAvecReste(employesParId) {
  const [salaires, paiements] = await Promise.all([
    dolibarr.listSalaries({ limit: 500 }), dolibarr.listSalaryPayments({ limit: 500 }),
  ]);
  const parSalaire = new Map();
  paiements.forEach((p) => {
    const id = String(p.fk_salary);
    (parSalaire.get(id) || parSalaire.set(id, []).get(id)).push(p);
  });

  return salaires.flatMap((salaire) => {
    const employee = employesParId.get(String(salaire.fk_user));
    if (!employee) return [];

    const paiementsSalaire = parSalaire.get(String(salaire.id)) || [];
    const reste = calculerResteReel(salaire, paiementsSalaire);
    if (reste <= 0) return [];

    return [{
      salary_id: String(salaire.id),
      ref: salaire.ref,
      remaining: reste,
      date_start: horodatageVersDate(salaire.datesp),
      date_end: horodatageVersDate(salaire.dateep),
      employee,
    }];
  });
}

function preparerPhasesPaiement(tous, postePrioritaire, year, month) {
  const prioriteMois = trierParDateDebut(
    tous.filter((e) => normaliserPoste(e.employee.job) === postePrioritaire
      && chevaucheMois(e.date_start, e.date_end, year, month)),
  );

  const reliquatAutresPostes = trierParDateDebut(
    tous.filter((e) => normaliserPoste(e.employee.job) !== postePrioritaire),
  );

  return { prioriteMois, reliquatAutresPostes };
}

export async function genererPaiementsMensuelsEnMasse(body) {
  const parse = parserEntreePaiementMasse(body);
  if (parse.errors.length) return { ok: false, errors: parse.errors };

  const employesParId = new Map((await searchEmployees({})).map((e) => [e.id, e]));
  const tous = await chargerSalairesAvecReste(employesParId);
  const postePrioritaire = normaliserPoste(parse.priorityJob);
  const { prioriteMois, reliquatAutresPostes } = preparerPhasesPaiement(
    tous,
    postePrioritaire,
    parse.year,
    parse.month,
  );
  const { end: datePaiement } = bornesMois(parse.year, parse.month);
  const eligibleCount = prioriteMois.length + reliquatAutresPostes.length;

  if (!eligibleCount) {
    return {
      ok: true, month: parse.month, year: parse.year, budget: parse.budget,
      budget_remaining: parse.budget, total_paid: 0, priority_job: parse.priorityJob,
      created: 0, failed: 0, eligible_count: 0, payments: [], failures: [],
      warning: 'Aucun salaire avec reste à payer trouvé (poste prioritaire pour le mois choisi '
        + 'ou autres postes en attente).',
    };
  }

  let budgetRestant = parse.budget;
  const payments = [];
  const failures = [];
  let reliquatDuBudget = null;

  const phases = [
    { entrees: prioriteMois, source: 'priority_job' },
    { entrees: reliquatAutresPostes, source: 'budget_remainder' },
  ];

  for (const phase of phases) {
    for (const entree of phase.entrees) {
      if (budgetRestant <= 0) break;

      const montant = arrondirMontant(Math.min(entree.remaining, budgetRestant));
      if (montant <= 0) continue;

      const estReliquatBudget = phase.source === 'budget_remainder' && !reliquatDuBudget;

      try {
        const resultat = await payerSalaire(entree.salary_id, {
          payments: [{ date: datePaiement, amount: montant }],
        });
        if (!resultat.ok) {
          failures.push({ employee: entree.employee, salary_id: entree.salary_id, errors: resultat.errors });
          continue;
        }

        budgetRestant = arrondirMontant(budgetRestant - montant);
        payments.push({
          date: datePaiement,
          employee: entree.employee,
          job: entree.employee.job || '—',
          amount: montant,
          salary_id: entree.salary_id,
          salary_ref: entree.ref,
          salary_date_start: entree.date_start,
          remaining_after: resultat.remaining,
          payment_source: phase.source,
        });

        if (estReliquatBudget) {
          reliquatDuBudget = {
            employee: entree.employee,
            job: entree.employee.job || '—',
            amount: montant,
            salary_date_start: entree.date_start,
          };
        } else if (phase.source === 'budget_remainder' && reliquatDuBudget?.employee.id === entree.employee.id) {
          reliquatDuBudget.amount = arrondirMontant(reliquatDuBudget.amount + montant);
        }
      } catch (error) {
        failures.push({ employee: entree.employee, salary_id: entree.salary_id, errors: [error.message] });
      }
    }
  }

  return {
    ok: !failures.length,
    month: parse.month,
    year: parse.year,
    budget: parse.budget,
    budget_remaining: budgetRestant,
    total_paid: arrondirMontant(parse.budget - budgetRestant),
    priority_job: parse.priorityJob,
    budget_remainder_recipient: reliquatDuBudget,
    created: payments.length,
    failed: failures.length,
    eligible_count: eligibleCount,
    payments,
    failures,
  };
}
