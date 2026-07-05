import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEmployeeSalaryHistory } from '../api/client';
import { formatWeeklyHours } from '../utils/formatWeeklyHours';

function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateLabel(isoDate) {
  if (!isoDate) {
    return '—';
  }

  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    getEmployeeSalaryHistory(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const employee = data?.employee;

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Fiche salarié</h2>
        <Link className="button-link inline-button" to="/frontoffice/salaries/liste">
          Retour à la liste
        </Link>
      </div>

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Chargement…</p> : null}

        {employee ? (
          <>
            <section className="employee-info-grid">
              <div className="summary-item">
                <span className="summary-label">Ref employé</span>
                <strong>{employee.ref_employee}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">Nom</span>
                <strong>{employee.lastname}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">Identifiant</span>
                <strong>{employee.login}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">Genre</span>
                <strong>{employee.gender_label || '—'}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">Poste</span>
                <strong>{employee.job || '—'}</strong>
              </div>
              <div className="summary-item">
                <span className="summary-label">Heures / semaine</span>
                <strong>{formatWeeklyHours(employee.weeklyhours)}</strong>
              </div>
            </section>

            <section className="dashboard-section">
              <h3>Historique des salaires</h3>

              {data.salaries.length === 0 ? (
                <p className="muted">Aucun salaire enregistré pour ce salarié.</p>
              ) : (
                <div className="salary-history">
                  {data.salaries.map((salary) => (
                    <article key={salary.id} className="salary-card">
                      <div className="salary-card-header">
                        <div>
                          <strong>{salary.label}</strong>
                          <p className="muted">
                            Ref {salary.ref} · {formatDateLabel(salary.date_start)} → {formatDateLabel(salary.date_end)}
                          </p>
                        </div>
                        <div className="salary-amounts">
                          <span>Montant : {formatAmount(salary.amount)}</span>
                          <span className={salary.remaining > 0 ? 'remaining-due' : 'remaining-paid'}>
                            Reste à payer : {formatAmount(salary.remaining)}
                          </span>
                        </div>
                      </div>

                      {salary.payments.length > 0 ? (
                        <div className="table-wrap">
                          <table className="data-table nested-table">
                            <thead>
                              <tr>
                                <th>Date paiement</th>
                                <th>Montant payé</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salary.payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td>{formatDateLabel(payment.date)}</td>
                                  <td>{formatAmount(payment.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="muted nested-empty">Aucun paiement enregistré.</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {data.totals ? (
              <section className="dashboard-summary">
                <div className="summary-item">
                  <span className="summary-label">Total salaires</span>
                  <strong>{formatAmount(data.totals.amount)}</strong>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total payé</span>
                  <strong>{formatAmount(data.totals.paid)}</strong>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Reste à payer total</span>
                  <strong>{formatAmount(data.totals.remaining)}</strong>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
    </div>
  );
}
