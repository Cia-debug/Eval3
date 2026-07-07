import { useEffect, useState } from 'react';
import { generateMonthlyBulkPayments, listEmployees } from '../api/client';
import BulkPaymentResults from '../components/BulkPaymentResults';

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const currentDate = new Date();

export default function BulkMonthlyPaymentPage() {
  const [form, setForm] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    budget: '',
    priority_job: '',
  });
  const [jobOptions, setJobOptions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    listEmployees()
      .then((data) => {
        const jobs = [...new Set(data.employees.map((employee) => employee.job).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, 'fr'),
        );
        setJobOptions(jobs);
      })
      .catch(() => {});
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'month' || name === 'year' ? Number(value) : value,
    }));
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (!form.priority_job) {
      setError('Sélectionnez un poste prioritaire.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);

    try {
      const data = await generateMonthlyBulkPayments({
        month: form.month,
        year: form.year,
        budget: form.budget,
        priority_job: form.priority_job,
      });

      setResult(data);
      if (data.warning) {
        setMessage(data.warning);
      } else {
        setMessage(
          data.message
            || `${data.created} paiement(s) généré(s) — total ${data.total_paid} € — reste ${data.budget_remaining} €`,
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="page-content page-content--narrow bulk-salary-page">
      <header className="bulk-salary-header">
        <h2>Génération de paiements en masse</h2>
        <p className="muted bulk-salary-subtitle">
          Répartition automatique du budget selon le poste prioritaire et la date de début des salaires.
        </p>
      </header>

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Paramètres du paiement</h3>
        <form onSubmit={handleGenerate} className="bulk-salary-salary-form">
          <div className="bulk-salary-salary-grid">
            <div className="bulk-salary-field">
              <label htmlFor="month">Mois</label>
              <select id="month" name="month" value={form.month} onChange={handleFormChange} required>
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bulk-salary-field">
              <label htmlFor="year">Année</label>
              <input
                id="year"
                name="year"
                type="number"
                min="2000"
                max="2100"
                value={form.year}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="bulk-salary-field">
              <label htmlFor="budget">Montant (budget)</label>
              <input
                id="budget"
                name="budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={handleFormChange}
                placeholder="20000"
                required
              />
            </div>

            <div className="bulk-salary-field">
              <label htmlFor="priority_job">Poste prioritaire</label>
              <select
                id="priority_job"
                name="priority_job"
                value={form.priority_job}
                onChange={handleFormChange}
                required
              >
                <option value="">Choisir un poste</option>
                {jobOptions.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="muted bulk-salary-hint bulk-salary-formula">
            Le poste prioritaire est payé en premier (par date de début de salaire), puis les autres postes.
            Le mois et l&apos;année doivent correspondre à des salaires déjà créés avec un reste à payer.
          </p>

          <div className="bulk-salary-submit">
            <button type="submit" disabled={generating}>
              {generating ? 'Génération…' : 'Générer les paiements'}
            </button>
          </div>
        </form>
      </section>

      {message ? (
        <p className={result?.warning ? 'error' : 'success-message'}>{message}</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <BulkPaymentResults result={result} />
    </div>
  );
}
