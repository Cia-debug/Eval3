import { useEffect, useState } from 'react';
import { getBackofficeDashboard } from '../api/client';

function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const GENRE_BAR_COLORS = {
  man: 'linear-gradient(90deg, #3b82f6, #2563eb)',
  woman: 'linear-gradient(90deg, #f472b6, #db2777)',
  unknown: 'linear-gradient(90deg, #9ca3af, #6b7280)',
};

const GENRE_PIE_COLORS = {
  man: '#2563eb',
  woman: '#db2777',
  unknown: '#6b7280',
};

const MONTH_PIE_COLORS = [
  '#2563eb',
  '#0891b2',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#0d9488',
];

function getItemColor(item, colorKey, index) {
  if (colorKey && item[colorKey]) {
    return GENRE_PIE_COLORS[item[colorKey]] || GENRE_PIE_COLORS.man;
  }
  return MONTH_PIE_COLORS[index % MONTH_PIE_COLORS.length];
}

function PieDiagram({ items, valueKey, labelKey, colorKey, formatValue = formatAmount }) {
  const total = items.reduce((sum, item) => sum + item[valueKey], 0) || 1;
  let angle = 0;
  const gradientStops = items
    .map((item, index) => {
      const pct = (item[valueKey] / total) * 100;
      const start = angle;
      angle += pct;
      const color = getItemColor(item, colorKey, index);
      return `${color} ${start}% ${angle}%`;
    })
    .join(', ');

  return (
    <div className="pie-diagram">
      <div
        className="pie-chart"
        style={{ background: `conic-gradient(${gradientStops})` }}
        role="img"
        aria-label="Diagramme circulaire"
      />
      <ul className="pie-legend">
        {items.map((item, index) => {
          const pct = ((item[valueKey] / total) * 100).toFixed(1);
          return (
            <li key={item[labelKey] || item.genre || item.month}>
              <span
                className="pie-legend-dot"
                style={{ background: getItemColor(item, colorKey, index) }}
              />
              <span className="pie-legend-label">{item[labelKey]}</span>
              <span className="pie-legend-value">
                {formatValue(item[valueKey])} ({pct}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BarGraph({ items, valueKey, labelKey, colorKey, formatValue = formatAmount }) {
  const max = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="bar-chart">
      {items.map((item, index) => {
        const fillStyle = colorKey
          ? { background: GENRE_BAR_COLORS[item[colorKey]] || GENRE_BAR_COLORS.man }
          : { background: MONTH_PIE_COLORS[index % MONTH_PIE_COLORS.length] };

        return (
          <div key={item[labelKey] || item.genre || item.month} className="bar-row">
            <div className="bar-label">{item[labelKey]}</div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(item[valueKey] / max) * 100}%`,
                  ...fillStyle,
                }}
              />
            </div>
            <div className="bar-value">{formatValue(item[valueKey])}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatsTable({ columns, rows }) {
  return (
    <div className="table-wrap dashboard-table-wrap">
      <table className="data-table dashboard-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BackofficeDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getBackofficeDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const stats = data?.stats;
  const genreTotal = stats?.byGenre.reduce((sum, item) => sum + item.total, 0) ?? 0;
  const monthTotal = stats?.byMonth.reduce((sum, item) => sum + item.total, 0) ?? 0;
  const monthItems = stats?.byMonth.map((item) => ({
    ...item,
    label: formatMonthLabel(item.month),
  })) ?? [];

  return (
    <div className="page-content">
      <h2>Tableau de bord salaires</h2>

      {error ? <p className="error">{error}</p> : null}

      {!data && !error ? <p>Chargement…</p> : null}

      {stats ? (
        <>
          <div className="dashboard-summary">
            <div className="summary-item">
              <span className="summary-label">Salaires enregistrés</span>
              <strong>{stats.salaryCount}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">Montant total</span>
              <strong>{formatAmount(stats.totalAmount)}</strong>
            </div>
            <div className="summary-item summary-item--man">
              <span className="summary-label">Hommes</span>
              <strong>{stats.manCount ?? 0}</strong>
            </div>
            <div className="summary-item summary-item--woman">
              <span className="summary-label">Femmes</span>
              <strong>{stats.womanCount ?? 0}</strong>
            </div>
          </div>

          <section className="dashboard-section">
            <h3>Montant de salaire par genre</h3>
            {stats.byGenre.length > 0 ? (
              <>
                <div className="chart-duo">
                  <div className="chart-panel">
                    <h4>Diagramme</h4>
                    <PieDiagram
                      items={stats.byGenre}
                      valueKey="total"
                      labelKey="label"
                      colorKey="genre"
                    />
                  </div>
                  <div className="chart-panel">
                    <h4>Graphe</h4>
                    <BarGraph
                      items={stats.byGenre}
                      valueKey="total"
                      labelKey="label"
                      colorKey="genre"
                    />
                  </div>
                </div>
                <p className="chart-total">
                  Total : <strong>{formatAmount(genreTotal)}</strong>
                </p>
                <StatsTable
                  columns={[
                    { key: 'label', label: 'Genre' },
                    { key: 'count', label: 'Nb salaires' },
                    { key: 'total', label: 'Montant', render: (row) => formatAmount(row.total) },
                  ]}
                  rows={stats.byGenre.map((item) => ({ ...item, id: item.genre }))}
                />
              </>
            ) : (
              <p className="muted">Aucune donnée disponible.</p>
            )}
          </section>

          <section className="dashboard-section">
            <h3>Montant de salaire par mois</h3>
            <p className="muted dashboard-hint">Référence : date de début du salaire</p>
            {stats.byMonth.length > 0 ? (
              <>
                <div className="chart-duo">
                  <div className="chart-panel">
                    <h4>Diagramme</h4>
                    <PieDiagram
                      items={monthItems}
                      valueKey="total"
                      labelKey="label"
                    />
                  </div>
                  <div className="chart-panel">
                    <h4>Graphe</h4>
                    <BarGraph items={monthItems} valueKey="total" labelKey="label" />
                  </div>
                </div>
                <p className="chart-total">
                  Total : <strong>{formatAmount(monthTotal)}</strong>
                </p>
                <StatsTable
                  columns={[
                    { key: 'month', label: 'Mois', render: (row) => formatMonthLabel(row.month) },
                    { key: 'count', label: 'Nb salaires' },
                    { key: 'total', label: 'Montant', render: (row) => formatAmount(row.total) },
                  ]}
                  rows={stats.byMonth.map((item) => ({ ...item, id: item.month }))}
                />
              </>
            ) : (
              <p className="muted">Aucune donnée disponible.</p>
            )}
          </section>
        </>
      ) : null}

      {data?.dolibarrError ? (
        <p className="error">Dolibarr : {data.dolibarrError}</p>
      ) : null}
    </div>
  );
}
