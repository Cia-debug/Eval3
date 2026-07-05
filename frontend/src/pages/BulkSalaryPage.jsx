import { useState } from 'react';
import { generateBulkSalaries, searchEmployees } from '../api/client';
import { formatWeeklyHours } from '../utils/formatWeeklyHours';

const EMPTY_FILTERS = {
  poste: '',
  genre: '',
  heure_min: '',
  heure_max: '',
};

const EMPTY_SALARY = {
  date_start: '',
  date_end: '',
  amount: '',
};

function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BulkSalaryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [salaryForm, setSalaryForm] = useState(EMPTY_SALARY);
  const [employees, setEmployees] = useState([]);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSalaryChange(event) {
    const { name, value } = event.target;
    setSalaryForm((current) => ({ ...current, [name]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    setLoadingFilter(true);
    setError('');
    setMessage('');
    setResult(null);

    try {
      const data = await searchEmployees(filters);
      setEmployees(data.employees);
    } catch (err) {
      setError(err.message);
      setEmployees([]);
    } finally {
      setLoadingFilter(false);
    }
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (employees.length === 0) {
      setError('Appliquez d\'abord les filtres pour sélectionner des salariés.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);

    try {
      const data = await generateBulkSalaries({
        ...filters,
        ...salaryForm,
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
    <div className="page-content">
      <h2>Génération de salaires en masse</h2>
      <p className="muted">
        Filtrez les salariés, puis générez un salaire identique pour chacun d&apos;entre eux.
      </p>

        <section className="dashboard-section">
          <h3>Filtres salariés</h3>
          <form onSubmit={applyFilters}>
            <div className="search-grid">
              <div>
                <label htmlFor="poste">Poste</label>
                <input
                  id="poste"
                  name="poste"
                  value={filters.poste}
                  onChange={handleFilterChange}
                  placeholder="Comptable"
                />
              </div>
              <div>
                <label htmlFor="genre">Genre</label>
                <select id="genre" name="genre" value={filters.genre} onChange={handleFilterChange}>
                  <option value="">Tous</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
              </div>
              <div>
                <label htmlFor="heure_min">Heures/semaine min</label>
                <input
                  id="heure_min"
                  name="heure_min"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_min}
                  onChange={handleFilterChange}
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="heure_max">Heures/semaine max</label>
                <input
                  id="heure_max"
                  name="heure_max"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_max}
                  onChange={handleFilterChange}
                  placeholder="35"
                />
              </div>
            </div>
            <button type="submit" disabled={loadingFilter}>
              {loadingFilter ? 'Recherche…' : 'Appliquer les filtres'}
            </button>
          </form>
        </section>

        <section className="dashboard-section">
          <h3>Salariés sélectionnés ({employees.length})</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Nom</th>
                  <th>Genre</th>
                  <th>Poste</th>
                  <th>Heures/sem.</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-cell">
                      Aucun salarié sélectionné. Utilisez les filtres ci-dessus.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.ref_employee}</td>
                      <td>{employee.lastname}</td>
                      <td>{employee.gender_label || '—'}</td>
                      <td>{employee.job || '—'}</td>
                      <td>{formatWeeklyHours(employee.weeklyhours)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-section">
          <h3>Générer les salaires</h3>
          <form onSubmit={handleGenerate}>
            <div className="form-grid">
              <div>
                <label htmlFor="date_start">Date début</label>
                <input
                  id="date_start"
                  name="date_start"
                  type="date"
                  value={salaryForm.date_start}
                  onChange={handleSalaryChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="date_end">Date fin</label>
                <input
                  id="date_end"
                  name="date_end"
                  type="date"
                  value={salaryForm.date_end}
                  onChange={handleSalaryChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="amount">Montant</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryForm.amount}
                  onChange={handleSalaryChange}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={generating || employees.length === 0}>
              {generating
                ? 'Génération…'
                : `Générer ${employees.length} salaire(s)`}
            </button>
          </form>
        </section>

        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {result?.success?.length > 0 ? (
          <section className="dashboard-section">
            <h3>Salaires créés</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref salaire</th>
                    <th>Salarié</th>
                    <th>Montant</th>
                    <th>Période</th>
                  </tr>
                </thead>
                <tbody>
                  {result.success.map((item) => (
                    <tr key={item.salary_id}>
                      <td>{item.ref}</td>
                      <td>{item.employee.lastname}</td>
                      <td>{formatAmount(item.amount)}</td>
                      <td>
                        {item.date_start} → {item.date_end}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {result?.failures?.length > 0 ? (
          <section className="dashboard-section">
            <h3>Échecs</h3>
            <ul className="error-list">
              {result.failures.map((item) => (
                <li key={item.employee.id}>
                  {item.employee.lastname} : {item.errors.join(', ')}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
    </div>
  );
}
