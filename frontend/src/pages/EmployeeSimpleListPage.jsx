import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEmployees } from '../api/client';
import { formatWeeklyHours } from '../utils/formatWeeklyHours';

export default function EmployeeSimpleListPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadEmployees() {
    setLoading(true);
    setError('');

    listEmployees()
      .then((data) => setEmployees(data.employees))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <div className="page-content">
      <div className="page-header-row">
        <h2>Liste des salariés</h2>
        <button type="button" className="btn-secondary" onClick={loadEmployees} disabled={loading}>
          Actualiser
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Chargement…</p> : null}

      {!loading && !error ? (
        <>
          <p className="muted result-count">{employees.length} salarié(s)</p>
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
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <Link to={`/frontoffice/salaries/${employee.id}`} className="table-link">
                        {employee.ref_employee}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/frontoffice/salaries/${employee.id}`} className="table-link">
                        {employee.lastname}
                      </Link>
                    </td>
                    <td>{employee.login}</td>
                    <td>{employee.gender_label || '—'}</td>
                    <td>{employee.job || '—'}</td>
                    <td>{formatWeeklyHours(employee.weeklyhours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
