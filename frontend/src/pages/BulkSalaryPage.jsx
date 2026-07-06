import { useEffect, useMemo, useState } from 'react';
import { generateBulkSalaries, listEmployees, searchEmployees } from '../api/client';

const EMPTY_FILTERS = {
  poste: '',
  genre: '',
  heure_min: '',
  heure_max: '',
};

function firstDayOfMonthFr() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `01/${month}/${now.getFullYear()}`;
}

function lastDayOfMonthFr() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const day = String(last.getDate()).padStart(2, '0');
  const month = String(last.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${last.getFullYear()}`;
}

function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BulkSalaryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [salaryForm, setSalaryForm] = useState({
    date_start: firstDayOfMonthFr(),
    date_end: lastDayOfMonthFr(),
    amount: '',
  });
  const [jobOptions, setJobOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
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

  const allSelected = employees.length > 0 && selectedIds.size === employees.length;

  const selectedCount = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)).length,
    [employees, selectedIds],
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSalaryChange(event) {
    const { name, value } = event.target;
    setSalaryForm((current) => ({ ...current, [name]: value }));
  }

  function toggleEmployee(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(employees.map((employee) => employee.id)));
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
      setSelectedIds(new Set(data.employees.map((employee) => employee.id)));
      setHasSearched(true);
    } catch (err) {
      setError(err.message);
      setEmployees([]);
      setSelectedIds(new Set());
      setHasSearched(true);
    } finally {
      setLoadingFilter(false);
    }
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (!hasSearched) {
      setError('Cliquez d\'abord sur « Rechercher » pour afficher les employés.');
      return;
    }

    if (selectedCount === 0) {
      setError('Sélectionnez au moins un employé.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);

    try {
      const data = await generateBulkSalaries({
        ...salaryForm,
        employee_ids: [...selectedIds],
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
        <h2>Génération de salaires</h2>
      </header>

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Filtres</h3>
        <form onSubmit={applyFilters} className="bulk-salary-filters">
          <div className="bulk-salary-field">
            <label htmlFor="poste">Poste</label>
            <select id="poste" name="poste" value={filters.poste} onChange={handleFilterChange}>
              <option value="">Tous</option>
              {jobOptions.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>

          <div className="bulk-salary-field">
            <label htmlFor="genre">Genre</label>
            <select id="genre" name="genre" value={filters.genre} onChange={handleFilterChange}>
              <option value="">Tous</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>

          <div className="bulk-salary-field bulk-salary-field--hours">
            <span className="bulk-salary-field-label">Heures de travail</span>
            <div className="bulk-salary-hours-row">
              <label htmlFor="heure_min">
                Min
                <input
                  id="heure_min"
                  name="heure_min"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_min}
                  onChange={handleFilterChange}
                  placeholder=""
                />
              </label>
              <label htmlFor="heure_max">
                Max
                <input
                  id="heure_max"
                  name="heure_max"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_max}
                  onChange={handleFilterChange}
                  placeholder=""
                />
              </label>
            </div>
          </div>

          <div className="bulk-salary-filter-action">
            <button type="submit" disabled={loadingFilter}>
              {loadingFilter ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
        </form>
      </section>

      <hr className="bulk-salary-divider" />

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">
          Employés trouvés ({hasSearched ? employees.length : '—'})
        </h3>

        {!hasSearched ? (
          <p className="muted bulk-salary-hint">Utilisez les filtres puis cliquez sur « Rechercher ».</p>
        ) : employees.length === 0 ? (
          <p className="muted bulk-salary-hint">Aucun employé ne correspond aux filtres.</p>
        ) : (
          <>
            <label className="bulk-salary-select-all">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              <span>Tout sélectionner</span>
            </label>

            <ul className="bulk-salary-employees">
              {employees.map((employee) => (
                <li key={employee.id}>
                  <label className="bulk-salary-employee-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                    />
                    <span>{employee.lastname}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <hr className="bulk-salary-divider" />

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Informations du salaire</h3>
        <form onSubmit={handleGenerate} className="bulk-salary-salary-form">
          <div className="bulk-salary-salary-grid">
            <div className="bulk-salary-field">
              <label htmlFor="date_start">Date début</label>
              <input
                id="date_start"
                name="date_start"
                type="text"
                value={salaryForm.date_start}
                onChange={handleSalaryChange}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div className="bulk-salary-field">
              <label htmlFor="date_end">Date fin</label>
              <input
                id="date_end"
                name="date_end"
                type="text"
                value={salaryForm.date_end}
                onChange={handleSalaryChange}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div className="bulk-salary-field">
              <label htmlFor="amount">Montant</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="1"
                value={salaryForm.amount}
                onChange={handleSalaryChange}
                placeholder="900000"
                required
              />
            </div>
          </div>

          <div className="bulk-salary-submit">
            <button type="submit" disabled={generating || selectedCount === 0}>
              {generating ? 'Génération…' : 'Générer les salaires'}
            </button>
          </div>
        </form>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {result?.success?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Salaires créés</h3>
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
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Échecs</h3>
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
