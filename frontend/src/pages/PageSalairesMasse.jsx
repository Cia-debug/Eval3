import { useState } from 'react';
import { genererSalairesEnMasse } from '../api/client';
import SelectionEmployesMasse from '../components/SelectionEmployesMasse';
import ResultatsSalairesTableau from '../components/ResultatsSalairesTableau';
import { useGenerationSalairesMasse } from '../hooks/useGenerationSalairesMasse';
import { useSelectionEmployesMasse } from '../hooks/useSelectionEmployesMasse';

function firstDayOfMonthFr() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `01/${month}/${now.getFullYear()}`;
}

function lastDayOfMonthFr() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const day = String(last.getDate()).padStart(2, '0');
  const month = String(last.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${last.getFullYear()}`;
}

export default function PageSalairesMasse() {
  const selection = useSelectionEmployesMasse();
  const [salaryForm, setSalaryForm] = useState({
    date_start: firstDayOfMonthFr(),
    date_end: lastDayOfMonthFr(),
    amount: '',
  });
  const generation = useGenerationSalairesMasse({
    selection,
    generateFn: genererSalairesEnMasse,
    buildPayload: () => ({
      ...salaryForm,
      employee_ids: [...selection.selectedIds],
    }),
  });

  function handleSalaryChange(event) {
    const { name, value } = event.target;
    setSalaryForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="page-content page-content--narrow bulk-salary-page">
      <header className="bulk-salary-header">
        <h2>Génération de salaires</h2>
      </header>

      <SelectionEmployesMasse
        idPrefix="classic"
        filters={selection.filters}
        jobOptions={selection.jobOptions}
        employees={selection.employees}
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        hasSearched={selection.hasSearched}
        loadingFilter={selection.loadingFilter}
        onFilterChange={selection.handleFilterChange}
        onApplyFilters={selection.applyFilters}
        onToggleEmployee={selection.toggleEmployee}
        onToggleSelectAll={selection.toggleSelectAll}
      />

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Informations du salaire</h3>
        <form onSubmit={generation.handleGenerate} className="bulk-salary-salary-form">
          <div className="bulk-salary-salary-grid">
            <div className="bulk-salary-field">
              <label htmlFor="date_start">Date début</label>
              <input
                id="date_start"
                name="date_start"
                type="text"
                value={salaryForm.date_start}
                onChange={handleSalaryChange}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div className="bulk-salary-field">
              <label htmlFor="date_end">Date fin</label>
              <input
                id="date_end"
                name="date_end"
                type="text"
                value={salaryForm.date_end}
                onChange={handleSalaryChange}
                placeholder="JJ/MM/AAAA"
                required
              />
            </div>
            <div className="bulk-salary-field">
              <label htmlFor="amount">Montant</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="1"
                value={salaryForm.amount}
                onChange={handleSalaryChange}
                placeholder="900000"
                required
              />
            </div>
          </div>

          <div className="bulk-salary-submit">
            <button type="submit" disabled={generation.generating || selection.selectedCount === 0}>
              {generation.generating ? 'Génération…' : 'Générer les salaires'}
            </button>
          </div>
        </form>
      </section>

      {selection.filterError ? <p className="error">{selection.filterError}</p> : null}
      {generation.message ? <p className="success-message">{generation.message}</p> : null}
      {generation.error ? <p className="error">{generation.error}</p> : null}

      <ResultatsSalairesTableau result={generation.result} />
    </div>
  );
}
