import { useEffect, useState} from 'react';
import { obtenirRecapRestesParMois } from '../api/salaires.api';
import { MOIS_OPTIONS } from '../constants/mois';
import { formatDateFr, formatMontantEuro } from '../utils/formatters';

function libelleMoisAnnee(year, month) {
    const libelle = MOIS_OPTIONS.find((m) => m.value === month)?.label || month;
    return `${libelle} ${year}`;
}

function trierPaiementsParDate(payments) {
    return [...payments].sort((a, b) => a.date.localeCompare(b.date));
}


export default function PageRecapRestesMensuels() {
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    obtenirRecapRestesParMois() 
    .then(setData)
    .catch((err) => setError(err.message));
  }, []);

  if(error) return <div className="page-content"><p className="error">{error}</p></div>;
  if(!data) return <div className="page-content"><p>Chargement...</p></div>;

  return (
      <div className="page-content">
          <h2>Recapitulatif des reste a payer</h2>

          <div className="table-wrap">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Mois/Annee</th>
                        {data.employees.map((e) => (
                        <th key={e.id}>{e.lastname}</th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.months.map((row) => (
                        <tr key={row.key}>
                            <td>{libelleMoisAnnee(row.year, row.month)}</td>
                            {data.employees.map((e) => {
                                const cell = row.cells[e.id];
                                if(!cell) return <td key={e.id}>-</td>;
                                return(
                                    <td key={e.id}>
                                        <button type="button" onClick={() => setDetail({ ...cell, employee: e, period: libelleMoisAnnee(row.year, row.month) })}>
                                            {formatMontantEuro(cell.remaining)}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    </tbody>
            </table>
            </div>

{detail ?(
    <section className="card" style={{ marginTop: '1rem'}}>  
    <h3>{detail.employee.lastname} - {detail.period}</h3>
    <p>Total salaires: <strong>{formatMontantEuro(detail.total_amount)}</strong></p>
    <p>Total paiement: <strong>{formatMontantEuro(detail.total_paid)}</strong></p>
    {detail.payments.length ? (
        <ul className="muted-list" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
            {trierPaiementsParDate(detail.payments).map((p, i) => (
                <li key={`${p.salary_ref}-${p.date}-${i}`}>
                    Le {formatDateFr(p.date)} : paiement de {formatMontantEuro(p.amount)}
                </li>
            ))}
        </ul>
    ) : (
        <p className="muted" style={{ marginTop: '0.25rem' }}>Aucun paiement enregistré.</p>
    )}
    <p>Reste a payer: <strong>{formatMontantEuro(detail.remaining)}</strong></p>
    <button type="button" onClick={() => setDetail(null)}>Fermer</button>
    </section>
) : null}
</div>
  );
}

  