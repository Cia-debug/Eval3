import { useEffect, useState } from 'react';
import { listEmployees } from '../api/client';
import TableauEmployes from '../components/TableauEmployes';

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
          <TableauEmployes employees={employees} linkToDetail />
        </>
      ) : null}
    </div>
  );
}
