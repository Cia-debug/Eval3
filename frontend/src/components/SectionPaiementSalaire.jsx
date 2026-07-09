import { formatMontantEuro } from '../utils/formatters';

export default function SectionPaiementSalaire({
  employeeId,
  loadingSalaries,
  unpaidSalaries,
  selectedSalaryId,
  selectedSalary,
  payments,
  paymentsTotal,
  paying,
  onSubmit,
  onSelectSalary,
  onAddPaymentRow,
  onRemovePaymentRow,
  onPaymentChange,
}) {
  return (
    <form className="salary-form payments-section" onSubmit={onSubmit}>
      <div className="section-header">
        <h3>Payer un salaire</h3>
      </div>

      {!employeeId ? (
        <p className="muted">Choisissez d&apos;abord un salarié pour voir ses salaires à payer.</p>
      ) : null}

      {employeeId && loadingSalaries ? <p>Chargement des salaires…</p> : null}

      {employeeId && !loadingSalaries && unpaidSalaries.length === 0 ? (
        <p className="muted">Aucun salaire avec reste à payer pour ce salarié. Créez un salaire ci-dessus.</p>
      ) : null}

      {employeeId && unpaidSalaries.length > 0 ? (
        <>
          <div className="full-width">
            <label htmlFor="salary_id">Salaire à payer</label>
            <select
              id="salary_id"
              value={selectedSalaryId}
              onChange={(event) => onSelectSalary(event.target.value)}
            >
              {unpaidSalaries.map((salary) => (
                <option key={salary.id} value={salary.id}>
                  {salary.ref} — {salary.label} ({formatMontantEuro(salary.remaining)} restant)
                </option>
              ))}
            </select>
          </div>

          {selectedSalary ? (
            <p className="muted">
              Montant : {formatMontantEuro(selectedSalary.amount)} · Déjà payé :{' '}
              {formatMontantEuro(selectedSalary.paid_total)} · Reste :{' '}
              {formatMontantEuro(selectedSalary.remaining)}
            </p>
          ) : null}

          <div className="section-header">
            <h4>Paiements (plusieurs fois)</h4>
            <button type="button" className="btn-secondary" onClick={onAddPaymentRow}>
              Ajouter un paiement
            </button>
          </div>

          {payments.map((payment, index) => (
            <div key={`payment-${index}`} className="payment-row">
              <div>
                <label htmlFor={`payment-date-${index}`}>Date paiement</label>
                <input
                  id={`payment-date-${index}`}
                  type="date"
                  value={payment.date}
                  onChange={(event) => onPaymentChange(index, 'date', event.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`payment-amount-${index}`}>Montant</label>
                <input
                  id={`payment-amount-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.amount}
                  onChange={(event) => onPaymentChange(index, 'amount', event.target.value)}
                />
              </div>
              <div className="payment-actions">
                <button
                  type="button"
                  className="btn-danger compact-button"
                  onClick={() => onRemovePaymentRow(index)}
                  disabled={payments.length === 1}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}

          <p className="muted">
            Total paiements : {paymentsTotal.toFixed(2)} €
            {selectedSalary ? ` / ${selectedSalary.remaining.toFixed(2)} € restant` : ''}
          </p>

          <button type="submit" disabled={paying || !selectedSalaryId}>
            {paying ? 'Enregistrement…' : 'Enregistrer les paiements'}
          </button>
        </>
      ) : null}
    </form>
  );
}
