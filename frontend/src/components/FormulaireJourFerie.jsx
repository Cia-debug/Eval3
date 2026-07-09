export default function FormulaireJourFerie({
  form,
  editingId,
  submitting,
  onChange,
  onSubmit,
  onCancelEdit,
}) {
  return (
    <form className="holiday-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <div>
          <label htmlFor="date">Date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={onChange}
            required
          />
        </div>
        <div>
          <label htmlFor="libelle">Libellé</label>
          <input
            id="libelle"
            name="libelle"
            value={form.libelle}
            onChange={onChange}
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
          <button type="button" className="btn-secondary" onClick={onCancelEdit}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}
