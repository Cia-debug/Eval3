export default function BulkEmployeeSelection({
  filters,
  jobOptions,
  employees,
  selectedIds,
  allSelected,
  hasSearched,
  loadingFilter,
  onFilterChange,
  onApplyFilters,
  onToggleEmployee,
  onToggleSelectAll,
  idPrefix = 'bulk',
}) {
  return (
    <>
      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Filtres</h3>
        <form onSubmit={onApplyFilters} className="bulk-salary-filters">
          <div className="bulk-salary-field">
            <label htmlFor={`${idPrefix}-poste`}>Poste</label>
            <select
              id={`${idPrefix}-poste`}
              name="poste"
              value={filters.poste}
              onChange={onFilterChange}
            >
              <option value="">Tous</option>
              {jobOptions.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
          </div>

          <div className="bulk-salary-field">
            <label htmlFor={`${idPrefix}-genre`}>Genre</label>
            <select
              id={`${idPrefix}-genre`}
              name="genre"
              value={filters.genre}
              onChange={onFilterChange}
            >
              <option value="">Tous</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>

          <div className="bulk-salary-field bulk-salary-field--hours">
            <span className="bulk-salary-field-label">Heures de travail</span>
            <div className="bulk-salary-hours-row">
              <label htmlFor={`${idPrefix}-heure_min`}>
                Min
                <input
                  id={`${idPrefix}-heure_min`}
                  name="heure_min"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_min}
                  onChange={onFilterChange}
                />
              </label>
              <label htmlFor={`${idPrefix}-heure_max`}>
                Max
                <input
                  id={`${idPrefix}-heure_max`}
                  name="heure_max"
                  type="number"
                  min="0"
                  step="1"
                  value={filters.heure_max}
                  onChange={onFilterChange}
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
              <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
              <span>Tout sélectionner</span>
            </label>

            <ul className="bulk-salary-employees">
              {employees.map((employee) => (
                <li key={employee.id}>
                  <label className="bulk-salary-employee-item">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => onToggleEmployee(employee.id)}
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
    </>
  );
}
