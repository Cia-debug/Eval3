import FormulaireJourFerie from '../components/FormulaireJourFerie';
import TableauJoursFeries from '../components/TableauJoursFeries';
import { useJoursFeries } from '../hooks/useJoursFeries';

export default function HolidaysPage() {
  const joursFeries = useJoursFeries();

  return (
    <div className="page-content">
      <h2>Jours fériés (SQLite)</h2>
      <p className="muted">Gestion locale des jours fériés dans la base SQLite NewApp.</p>

      <FormulaireJourFerie
        form={joursFeries.form}
        editingId={joursFeries.editingId}
        submitting={joursFeries.submitting}
        onChange={joursFeries.handleChange}
        onSubmit={joursFeries.handleSubmit}
        onCancelEdit={joursFeries.cancelEdit}
      />

      {joursFeries.message ? <p className="success-message">{joursFeries.message}</p> : null}
      {joursFeries.error ? <p className="error">{joursFeries.error}</p> : null}

      {joursFeries.loading ? <p>Chargement…</p> : null}

      {!joursFeries.loading ? (
        <TableauJoursFeries
          holidays={joursFeries.holidays}
          onEdit={joursFeries.startEdit}
          onDelete={joursFeries.handleDelete}
        />
      ) : null}
    </div>
  );
}
