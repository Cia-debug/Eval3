import { useEffect, useState } from 'react';
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
} from '../api/client';

const EMPTY_FORM = { date: '', libelle: '' };

function formatDateLabel(isoDate) {
  if (!isoDate) {
    return '';
  }

  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  async function loadHolidays() {
    setLoading(true);
    setError('');

    try {
      const data = await getHolidays();
      setHolidays(data.holidays);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(holiday) {
    setEditingId(holiday.id);
    setForm({ date: holiday.date, libelle: holiday.libelle });
    setMessage('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      if (editingId) {
        await updateHoliday(editingId, form);
        setMessage('Jour férié mis à jour.');
      } else {
        await createHoliday(form);
        setMessage('Jour férié ajouté.');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(holiday) {
    if (!window.confirm(`Supprimer "${holiday.libelle}" du ${formatDateLabel(holiday.date)} ?`)) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await deleteHoliday(holiday.id);
      if (editingId === holiday.id) {
        cancelEdit();
      }
      setMessage('Jour férié supprimé.');
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-content">
      <h2>Jours fériés (SQLite)</h2>
      <p className="muted">Gestion locale des jours fériés dans la base SQLite NewApp.</p>

        <form className="holiday-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label htmlFor="date">Date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="libelle">Libellé</label>
              <input
                id="libelle"
                name="libelle"
                value={form.libelle}
                onChange={handleChange}
                placeholder="Fête nationale"
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingId ? (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                Annuler
              </button>
            ) : null}
          </div>
        </form>

        {message ? <p className="success-message">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {loading ? <p>Chargement…</p> : null}

        {!loading ? (
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
                      <td>{formatDateLabel(holiday.date)}</td>
                      <td>{holiday.libelle}</td>
                      <td className="table-actions">
                        <button type="button" className="btn-secondary compact-button" onClick={() => startEdit(holiday)}>
                          Modifier
                        </button>
                        <button type="button" className="btn-danger compact-button" onClick={() => handleDelete(holiday)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
    </div>
  );
}
