function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BulkPaymentResults({ result }) {
  if (!result) {
    return null;
  }

  return (
    <>
      {result.payments?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Paiements effectués</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref salaire</th>
                  <th>Salarié</th>
                  <th>Poste</th>
                  <th>Montant payé</th>
                  <th>Reste à payer</th>
                </tr>
              </thead>
              <tbody>
                {result.payments.map((item) => (
                  <tr key={`${item.salary_id}-${item.amount}`}>
                    <td>{item.salary_ref}</td>
                    <td>{item.employee.lastname}</td>
                    <td>{item.job}</td>
                    <td>{formatAmount(item.amount)}</td>
                    <td>{formatAmount(item.remaining_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result.failures?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Échecs</h3>
          <ul className="error-list">
            {result.failures.map((item) => (
              <li key={`${item.salary_id}-${item.employee.id}`}>
                {item.employee.lastname} : {item.errors.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
