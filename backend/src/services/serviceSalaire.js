import { dateToTimestamp, dolibarr } from './dolibarr.js';
import { getEmployeeById } from './employeeService.js';
import {
  arrondirMontant, construirePayloadSalaire, creerEnregistrementSalaire, erreurValidation,
  executerMasseEmployes, parserDate, parserMontant, parserPeriodeSalaire, prochainesRefsSalaire,
  resoudreEmployes, resultatMasse, verifierRefUnique,
} from './utilitairesSalaire.js';

const parserPaiements = (body) =>
  (Array.isArray(body.payments) ? body.payments : []).filter((p) => p.date || p.amount);

const validerPaiements = (paiements, { maxAmount = null, paidTotal = 0 } = {}) => {
  const errors = [];
  let paymentsTotal = 0;
  const parsed = [];
  paiements.forEach((p, i) => {
    const amount = parserMontant(p.amount), date = parserDate(p.date);
    if (amount == null || amount <= 0) errors.push(`Paiement ${i + 1} : montant invalide`);
    if (!date) errors.push(`Paiement ${i + 1} : date invalide`);
    if (amount == null) return;
    paymentsTotal += amount;
    parsed.push({ amount, date });
  });
  if (!parsed.length) errors.push('Au moins un paiement est requis');
  if (maxAmount != null && paidTotal + paymentsTotal > maxAmount + 0.001) {
    errors.push('La somme des paiements dépasse le montant restant du salaire');
  }
  return { errors, payments: parsed, paymentsTotal };
};

const ajouterPaiements = async (salaryId, paiements) => {
  const ajoutes = [];
  for (const p of paiements) {
    await dolibarr.addSalaryPayment(salaryId, { datepaye: dateToTimestamp(p.date), amount: p.amount });
    ajoutes.push(p);
  }
  return ajoutes;
};

const creerSalairePourEmploye = async ({ employee, ref, amount, dateStart, dateEnd, label, paye = 0, payments = [] }) => {
  await verifierRefUnique(ref);
  const salaryId = await creerEnregistrementSalaire(construirePayloadSalaire({
    ref, employeeId: employee.id, label: label || `Salaire ${ref} - ${employee.lastname}`,
    amount, dateStart, dateEnd, paye,
  }));
  return {
    salary_id: String(salaryId), ref, employee, amount,
    date_start: dateStart, date_end: dateEnd,
    payments: payments.length ? await ajouterPaiements(salaryId, payments) : [],
  };
};

export async function creerSalaireSeul(body) {
  const parse = parserPeriodeSalaire(body, { requireEmployee: true });
  if (parse.errors.length) return erreurValidation(parse.errors);
  const employee = await getEmployeeById(body.employee_id);
  if (!employee) return erreurValidation(['Employé introuvable']);
  return { ok: true, ...(await creerSalairePourEmploye({
    employee, ref: body.ref?.trim() || await prochainesRefsSalaire(),
    amount: parse.amount, dateStart: parse.dateStart, dateEnd: parse.dateEnd,
    label: body.label?.trim(),
  })), payments: [] };
}

export async function payerSalaire(salaryId, body) {
  const salary = await dolibarr.getSalary(salaryId);
  if (!salary) return erreurValidation(['Salaire introuvable']);
  const paidTotal = (await listerPaiementsDuSalaire(salaryId))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const parse = validerPaiements(parserPaiements(body), { maxAmount: Number(salary.amount), paidTotal });
  if (parse.errors.length) return erreurValidation(parse.errors);
  const payments = await ajouterPaiements(salaryId, parse.payments);
  const nouveauPaye = paidTotal + parse.paymentsTotal;
  return {
    ok: true, salary_id: String(salaryId), ref: salary.ref, amount: Number(salary.amount),
    paid_total: arrondirMontant(nouveauPaye),
    remaining: arrondirMontant(Math.max(0, Number(salary.amount) - nouveauPaye)),
    payments,
  };
}

export async function creerSalaireAvecPaiements(body) {
  const champs = parserPeriodeSalaire(body, { requireEmployee: true });
  const paiements = validerPaiements(parserPaiements(body), { maxAmount: champs.amount });
  const errors = [...champs.errors, ...paiements.errors];
  if (errors.length) return erreurValidation(errors);
  const employee = await getEmployeeById(body.employee_id);
  if (!employee) return erreurValidation(['Employé introuvable']);
  return { ok: true, ...(await creerSalairePourEmploye({
    employee, ref: body.ref?.trim() || await prochainesRefsSalaire(),
    amount: champs.amount, dateStart: champs.dateStart, dateEnd: champs.dateEnd,
    label: body.label?.trim(), paye: paiements.payments.length ? 1 : 0, payments: paiements.payments,
  })) };
}

export async function genererSalairesEnMasse(body) {
  const parse = parserPeriodeSalaire(body);
  if (parse.errors.length) return erreurValidation(parse.errors);
  const employees = await resoudreEmployes(body);
  if (!employees.length) return erreurValidation(['Aucun salarié sélectionné']);
  const refs = await prochainesRefsSalaire(employees.length);
  const { created, failed } = await executerMasseEmployes(employees, refs, (employee, ref) =>
    creerSalairePourEmploye({ employee, ref, amount: parse.amount, dateStart: parse.dateStart, dateEnd: parse.dateEnd }));
  return resultatMasse({ total: employees.length, created, failed });
}

export const listerPaiementsDuSalaire = async (salaryId) =>
  (await dolibarr.listSalaryPayments({ limit: 500 })).filter((p) => String(p.fk_salary) === String(salaryId));
