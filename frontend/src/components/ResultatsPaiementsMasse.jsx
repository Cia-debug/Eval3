import { useMemo } from 'react';
import { formatMontantEuro, formatDateFr } from '../utils/formatters';

function normaliserPoste(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function agregerPaiementsParEmploye(payments, priorityJob, budgetRemainderRecipient) {
  const parEmploye = new Map();
  const postePrioritaire = normaliserPoste(priorityJob);

  for (const item of payments) {
    const id = item.employee.id;
    const existant = parEmploye.get(id);
    const estPrioritaire = postePrioritaire && normaliserPoste(item.job) === postePrioritaire;

    if (!existant) {
      parEmploye.set(id, {
        employee: item.employee,
        job: item.job,
        amount: Number(item.amount) || 0,
        repartition: budgetRemainderRecipient?.employee?.id === id
          ? 'Reliquat du budget'
          : estPrioritaire
            ? 'Poste prioritaire'
            : 'Autre poste',
      });
      continue;
    }

    existant.amount += Number(item.amount) || 0;
  }

  return [...parEmploye.values()];
}

export default function ResultatsPaiementsMasse({ result }) {
  const paiementsParEmploye = useMemo(
    () => agregerPaiementsParEmploye(
      result?.payments ?? [],
      result?.priority_job,
      result?.budget_remainder_recipient,
    ),
    [result?.payments, result?.priority_job, result?.budget_remainder_recipient],
  );

  if (!result) {
    return null;
  }

  const reliquat = result.budget_remainder_recipient;

  return (
    <>
      {paiementsParEmploye.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Paiements effectués</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Salarié</th>
                  <th>Poste</th>
                  <th>Total payé</th>
                  <th>Répartition</th>
                </tr>
              </thead>
              <tbody>
                {paiementsParEmploye.map((item) => (
                  <tr key={item.employee.id}>
                    <td>{item.employee.lastname}</td>
                    <td>{item.job}</td>
                    <td>{formatMontantEuro(item.amount)}</td>
                    <td>{item.repartition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reliquat ? (
            <p className="muted bulk-salary-hint">
              Reliquat du budget après les postes prioritaires :{' '}
              <strong>{formatMontantEuro(reliquat.amount)}</strong>
              {' → '}
              <strong>{reliquat.employee.lastname}</strong>
              {' '}
              ({reliquat.job}
              {reliquat.salary_date_start ? `, salaire du ${formatDateFr(reliquat.salary_date_start)}` : ''}
              )
            </p>
          ) : null}

          {Number(result.budget_remaining) > 0 ? (
            <p className="error bulk-salary-hint">
              Budget non utilisé : {formatMontantEuro(result.budget_remaining)}
            </p>
          ) : null}
        </section>
      ) : null}

      {result.failures?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Échecs</h3>
          <ul className="error-list">
            {result.failures.map((item) => (
              <li key={`${item.salary_id}-${item.employee.id}`}>
                {item.employee.lastname} : {item.errors.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
