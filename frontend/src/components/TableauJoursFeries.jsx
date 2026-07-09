import { formatDateFr } from '../utils/formatters';

export default function TableauJoursFeries({ holidays, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Libellé</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {holidays.length === 0 ? (
            <tr>
              <td colSpan="3" className="empty-cell">
                Aucun jour férié enregistré.
              </td>
            </tr>
          ) : (
            holidays.map((holiday) => (
              <tr key={holiday.id}>
                <td>{formatDateFr(holiday.date)}</td>
                <td>{holiday.libelle}</td>
                <td className="table-actions">
                  <button type="button" className="btn-secondary compact-button" onClick={() => onEdit(holiday)}>
                    Modifier
                  </button>
                  <button type="button" className="btn-danger compact-button" onClick={() => onDelete(holiday)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
