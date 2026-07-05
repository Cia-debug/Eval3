import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchEmployees } from '../api/client';
import { formatWeeklyHours } from '../utils/formatWeeklyHours';

const EMPTY_FILTERS = {
  ref_employee: '',
  nom: '',
  login: '',
  genre: '',
  poste: '',
};

export default function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    ref_employee: searchParams.get('ref_employee') || '',
    nom: searchParams.get('nom') || '',
    login: searchParams.get('login') || '',
    genre: searchParams.get('genre') || '',
    poste: searchParams.get('poste') || '',
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const params = Object.fromEntries(searchParams.entries());
        const data = await searchEmployees(params);
        if (!cancelled) {
          setEmployees(data.employees);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) {
        nextParams.set(key, value.trim());
      }
    });

    setSearchParams(nextParams);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setSearchParams({});
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Liste des salariés</h2>
        <Link className="button-link inline-button" to="/frontoffice/salaires/nouveau">
          Créer un salaire
        </Link>
      </div>

        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-grid">
            <div>
              <label htmlFor="ref_employee">Ref employé</label>
              <input
                id="ref_employee"
                name="ref_employee"
                value={filters.ref_employee}
                onChange={handleChange}
                placeholder="1"
              />
            </div>
            <div>
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                name="nom"
                value={filters.nom}
                onChange={handleChange}
                placeholder="Rakotobe"
              />
            </div>
            <div>
              <label htmlFor="login">Identifiant</label>
              <input
                id="login"
                name="login"
                value={filters.login}
                onChange={handleChange}
                placeholder="rakoto1"
              />
            </div>
            <div>
              <label htmlFor="genre">Genre</label>
              <select id="genre" name="genre" value={filters.genre} onChange={handleChange}>
                <option value="">Tous</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </div>
            <div>
              <label htmlFor="poste">Poste</label>
              <input
                id="poste"
                name="poste"
                value={filters.poste}
                onChange={handleChange}
                placeholder="Comptable"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit">Rechercher</button>
            <button type="button" className="btn-secondary" onClick={handleReset}>
              Réinitialiser
            </button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Chargement…</p> : null}

        {!loading && !error ? (
          <>
            <p className="muted result-count">{employees.length} salarié(s) trouvé(s)</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Nom</th>
                    <th>Identifiant</th>
                    <th>Genre</th>
                    <th>Poste</th>
                    <th>Heures/sem.</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-cell">
                        Aucun salarié ne correspond aux critères.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.ref_employee}</td>
                        <td>{employee.lastname}</td>
                        <td>{employee.login}</td>
                        <td>{employee.gender_label || '—'}</td>
                        <td>{employee.job || '—'}</td>
                        <td>{formatWeeklyHours(employee.weeklyhours)}</td>
                        <td>
                          <Link
                            to={`/frontoffice/salaires/nouveau?employeeId=${employee.id}`}
                            className="table-link"
                          >
                            Salaire
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
    </div>
  );
}
