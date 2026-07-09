import { MOIS_OPTIONS } from '../constants/mois';

export default function FormulairePaiementMensuel({ form, jobOptions, generating, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="bulk-salary-salary-form">
      <div className="bulk-salary-salary-grid">
        <div className="bulk-salary-field">
          <label htmlFor="month">Mois</label>
          <select id="month" name="month" value={form.month} onChange={onChange} required>
            {MOIS_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bulk-salary-field">
          <label htmlFor="year">Année</label>
          <input
            id="year"
            name="year"
            type="number"
            min="2000"
            max="2100"
            value={form.year}
            onChange={onChange}
            required
          />
        </div>

        <div className="bulk-salary-field">
          <label htmlFor="budget">Montant (budget)</label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="0.01"
            value={form.budget}
            onChange={onChange}
            placeholder="20000"
            required
          />
        </div>

        <div className="bulk-salary-field">
          <label htmlFor="priority_job">Poste prioritaire</label>
          <select
            id="priority_job"
            name="priority_job"
            value={form.priority_job}
            onChange={onChange}
            required
          >
            <option value="">Choisir un poste</option>
            {jobOptions.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="muted bulk-salary-hint bulk-salary-formula">
        Le poste prioritaire est payé en premier pour le mois choisi (par date de début de salaire).
        S&apos;il reste du budget, il est versé aux autres postes selon la date de début la plus ancienne,
        même si le salaire concerne un autre mois.
      </p>

      <div className="bulk-salary-submit">
        <button type="submit" disabled={generating}>
          {generating ? 'Génération…' : 'Générer les paiements'}
        </button>
      </div>
    </form>
  );
}
