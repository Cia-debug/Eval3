function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BulkSalaryResults({ result }) {
  if (!result) {
    return null;
  }

  return (
    <>
      {result.success?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Salaires créés</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref salaire</th>
                  <th>Salarié</th>
                  <th>Montant</th>
                  <th>Période</th>
                  {result.month ? <th>Jours payés</th> : null}
                </tr>
              </thead>
              <tbody>
                {result.success.map((item) => (
                  <tr key={item.salary_id}>
                    <td>{item.ref}</td>
                    <td>{item.employee.lastname}</td>
                    <td>{formatAmount(item.amount)}</td>
                    <td>
                      {item.date_start} → {item.date_end}
                    </td>
                    {result.month ? (
                      <td>
                        {item.unpaid_day_count != null
                          ? `${item.unpaid_day_count} jour(s)`
                          : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {result.skipped_items?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Ignorés</h3>
          <ul className="muted-list">
            {result.skipped_items.map((item) => (
              <li key={item.employee.id}>
                {item.employee.lastname} : {item.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.failures?.length > 0 ? (
        <section className="bulk-salary-block bulk-salary-results">
          <h3 className="bulk-salary-block-title">Échecs</h3>
          <ul className="error-list">
            {result.failures.map((item) => (
              <li key={item.employee.id}>
                {item.employee.lastname} : {item.errors.join(', ')}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
