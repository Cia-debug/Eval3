import { Link } from 'react-router-dom';
import { formatWeeklyHours } from '../utils/formatWeeklyHours';

export default function TableauEmployes({
  employees,
  linkToDetail = false,
  showSalaryAction = false,
  emptyMessage = 'Aucun salarié.',
}) {
  const colSpan = showSalaryAction ? 7 : 6;

  return (
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
            {showSalaryAction ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  {linkToDetail ? (
                    <Link to={`/frontoffice/salaries/${employee.id}`} className="table-link">
                      {employee.ref_employee}
                    </Link>
                  ) : (
                    employee.ref_employee
                  )}
                </td>
                <td>
                  {linkToDetail ? (
                    <Link to={`/frontoffice/salaries/${employee.id}`} className="table-link">
                      {employee.lastname}
                    </Link>
                  ) : (
                    employee.lastname
                  )}
                </td>
                <td>{employee.login}</td>
                <td>{employee.gender_label || '—'}</td>
                <td>{employee.job || '—'}</td>
                <td>{formatWeeklyHours(employee.weeklyhours)}</td>
                {showSalaryAction ? (
                  <td>
                    <Link
                      to={`/frontoffice/salaires/nouveau?employeeId=${employee.id}`}
                      className="table-link"
                    >
                      Salaire
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
