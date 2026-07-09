import { useState } from 'react';
import { genererSalairesMensuelsEnMasse } from '../api/client';
import FormulaireSalaireMensuel from '../components/FormulaireSalaireMensuel';
import ResultatsSalairesTableau from '../components/ResultatsSalairesTableau';
import SelectionEmployesMasse from '../components/SelectionEmployesMasse';
import { useGenerationSalairesMasse } from '../hooks/useGenerationSalairesMasse';
import { useSelectionEmployesMasse } from '../hooks/useSelectionEmployesMasse';

const currentDate = new Date();

function handleFormChange(event, setForm) {
  const { name, value, type, checked } = event.target;
  setForm((current) => ({
    ...current,
    [name]: type === 'checkbox'
      ? checked
      : name === 'month' || name === 'year'
        ? Number(value)
        : value,
  }));
}

export default function PageGenerationSalairesMensuels() {
  const selection = useSelectionEmployesMasse();
  const [form, setForm] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    salary_per_day: '',
    worked_saturday: false,
    worked_sunday: false,
  });
  const generation = useGenerationSalairesMasse({
    selection,
    generateFn: genererSalairesMensuelsEnMasse,
    buildPayload: () => ({
      month: form.month,
      year: form.year,
      salary_per_day: form.salary_per_day,
      worked_saturday: form.worked_saturday,
      worked_sunday: form.worked_sunday,
      employee_ids: [...selection.selectedIds],
    }),
  });

  return (
    <div className="page-content page-content--narrow bulk-salary-page">
      <header className="bulk-salary-header">
        <h2>Génération de salaires en masse</h2>
        <p className="muted bulk-salary-subtitle">
          Calcul automatique selon le mois, les jours fériés et les périodes déjà payées.
          Les samedis et dimanches sont des jours normaux ; cochez-les pour appliquer le bonus ×3.
        </p>
      </header>

      <SelectionEmployesMasse
        idPrefix="monthly"
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
          <FormulaireSalaireMensuel
            form={form}
            onChange={(event) => handleFormChange(event, setForm)}
          />

          <p className="muted bulk-salary-hint bulk-salary-formula">
            Formule : jours non payés × salaire/jour.
            Jour férié : ×2 sur le montant du jour.
            Samedi/dimanche coché : ×3 sur ce jour (×6 si ce jour est aussi férié).
          </p>

          <div className="bulk-salary-submit">
            <button type="submit" disabled={generation.generating || selection.selectedCount === 0}>
              {generation.generating ? 'Génération…' : 'Générer'}
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
