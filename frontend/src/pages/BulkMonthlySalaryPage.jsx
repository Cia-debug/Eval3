import { useState } from 'react';
import { generateMonthlyBulkSalaries } from '../api/client';
import BulkEmployeeSelection from '../components/BulkEmployeeSelection';
import BulkSalaryResults from '../components/BulkSalaryResults';
import { useBulkEmployeeSelection } from '../hooks/useBulkEmployeeSelection';

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

export default function BulkMonthlySalaryPage() {
  const selection = useBulkEmployeeSelection();
  const [form, setForm] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    salary_per_day: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'month' || name === 'year' ? Number(value) : value,
    }));
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (!selection.hasSearched) {
      setError('Cliquez d\'abord sur « Rechercher » pour afficher les employés.');
      return;
    }

    if (selection.selectedCount === 0) {
      setError('Sélectionnez au moins un employé.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);
    selection.resetSelectionState();

    try {
      const data = await generateMonthlyBulkSalaries({
        month: form.month,
        year: form.year,
        salary_per_day: form.salary_per_day,
        employee_ids: [...selection.selectedIds],
      });

      setResult(data);
      setMessage(data.message || `${data.created} salaire(s) généré(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="page-content page-content--narrow bulk-salary-page">
      <header className="bulk-salary-header">
        <h2>Génération de salaires en masse</h2>
        <p className="muted bulk-salary-subtitle">
          Calcul automatique selon le mois, les jours fériés et les périodes déjà payées.
        </p>
      </header>

      <BulkEmployeeSelection
        idPrefix="monthly"
        filters={selection.filters}
        jobOptions={selection.jobOptions}
        employees={selection.employees}
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        hasSearched={selection.hasSearched}
        loadingFilter={selection.loadingFilter}
        onFilterChange={selection.handleFilterChange}
        onApplyFilters={selection.applyFilters}
        onToggleEmployee={selection.toggleEmployee}
        onToggleSelectAll={selection.toggleSelectAll}
      />

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Informations du salaire</h3>
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
              <label htmlFor="salary_per_day">Salaire par jour</label>
              <input
                id="salary_per_day"
                name="salary_per_day"
                type="number"
                min="0"
                step="0.01"
                value={form.salary_per_day}
                onChange={handleFormChange}
                placeholder="10"
                required
              />
            </div>
          </div>

          <p className="muted bulk-salary-hint bulk-salary-formula">
            Formule : (jours non payés × salaire/jour) + (jours fériés non payés × salaire/jour).
          </p>

          <div className="bulk-salary-submit">
            <button type="submit" disabled={generating || selection.selectedCount === 0}>
              {generating ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </form>
      </section>

      {selection.filterError ? <p className="error">{selection.filterError}</p> : null}
      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <BulkSalaryResults result={result} />
    </div>
  );
}
