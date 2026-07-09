export default function FormulaireCreationSalaire({
  form,
  employees,
  loadingEmployees,
  creating,
  onChange,
  onSubmit,
}) {
  return (
    <form className="salary-form" onSubmit={onSubmit}>
      <h3>Créer un salaire</h3>
      <div className="form-grid">
        <div className="full-width">
          <label htmlFor="employee_id">Salarié</label>
          <select
            id="employee_id"
            name="employee_id"
            value={form.employee_id}
            onChange={onChange}
            required
          >
            <option value="">Choisir un salarié</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.ref_employee} — {employee.lastname} ({employee.login})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ref">Réf. salaire (optionnel)</label>
          <input
            id="ref"
            name="ref"
            value={form.ref}
            onChange={onChange}
            placeholder="Auto"
          />
        </div>

        <div>
          <label htmlFor="label">Libellé (optionnel)</label>
          <input
            id="label"
            name="label"
            value={form.label}
            onChange={onChange}
            placeholder="Salaire mensuel"
          />
        </div>

        <div>
          <label htmlFor="date_start">Date début</label>
          <input
            id="date_start"
            name="date_start"
            type="date"
            value={form.date_start}
            onChange={onChange}
            required
          />
        </div>

        <div>
          <label htmlFor="date_end">Date fin</label>
          <input
            id="date_end"
            name="date_end"
            type="date"
            value={form.date_end}
            onChange={onChange}
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
            value={form.amount}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={creating || loadingEmployees || !form.employee_id}>
        {creating ? 'Création…' : 'Créer le salaire'}
      </button>
    </form>
  );
}
