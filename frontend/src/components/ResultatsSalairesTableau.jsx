import { formatMontantEuro } from '../utils/formatters';

export default function ResultatsSalairesTableau({ result }) {
  if (!result) {
    return null;
  }

  const afficherWeekend = Boolean(
    result.worked_saturday
    || result.worked_sunday
    || result.success?.some((item) => item.weekend_saturday_count || item.weekend_sunday_count),
  );

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
                  {afficherWeekend ? <th>Week-end</th> : null}
                </tr>
              </thead>
              <tbody>
                {result.success.map((item) => (
                  <tr key={item.salary_id}>
                    <td>{item.ref}</td>
                    <td>{item.employee.lastname}</td>
                    <td>{formatMontantEuro(item.amount)}</td>
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
                    {afficherWeekend ? (
                      <td>
                        {item.weekend_saturday_count > 0 ? `${item.weekend_saturday_count} sam.` : null}
                        {item.weekend_saturday_count > 0 && item.weekend_sunday_count > 0 ? ' · ' : null}
                        {item.weekend_sunday_count > 0 ? `${item.weekend_sunday_count} dim.` : null}
                        {item.weekend_bonus_amount > 0 ? ` (+${formatMontantEuro(item.weekend_bonus_amount)})` : null}
                        {!item.weekend_saturday_count && !item.weekend_sunday_count ? '—' : null}
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
