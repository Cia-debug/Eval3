# Dashboard Backoffice (statistiques salaires)

## Fonctionnalité

4 cards (salaires, montant, hommes, femmes) + stats par genre/mois via MySQL + charts React.

## Code — route dashboard

`backend/src/routes/backoffice.js` :

```javascript
router.get('/dashboard', async (_req, res) => {
  try {
    const [status, stats] = await Promise.all([
      dolibarr.status(),
      getSalaryDashboardStats(),
    ]);

    res.json({
      message: 'Backoffice NewApp',
      dolibarr: status,
      stats,
    });
  } catch (error) {
    res.status(502).json({
      dolibarr: null,
      stats: null,
      dolibarrError: error.message,
    });
  }
});
```

## Code — requêtes SQL agrégées

`backend/src/services/dashboardStats.js` :

```javascript
const [byGenreRows] = await connection.query(`
  SELECT
    CASE
      WHEN u.gender = 'man' OR u.civility = 'MR' THEN 'man'
      WHEN u.gender = 'woman' OR u.civility = 'MME' THEN 'woman'
      ELSE 'unknown'
    END AS genre,
    SUM(s.amount) AS total,
    COUNT(s.rowid) AS count
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1
    AND u.ref_employee IS NOT NULL
    AND u.ref_employee <> ''
  GROUP BY genre
  ORDER BY total DESC
`);

const [byMonthRows] = await connection.query(`
  SELECT
    DATE_FORMAT(s.datesp, '%Y-%m') AS month,
    SUM(s.amount) AS total,
    COUNT(s.rowid) AS count
  FROM llx_salary s
  INNER JOIN llx_user u ON u.rowid = s.fk_user
  WHERE u.employee = 1 AND s.datesp IS NOT NULL
  GROUP BY DATE_FORMAT(s.datesp, '%Y-%m')
  ORDER BY month ASC
`);

return {
  salaryCount: Number(summary.salaryCount),
  totalAmount: roundAmount(summary.totalAmount),
  manCount: genderCounts.man,
  womanCount: genderCounts.woman,
  byGenre: byGenreRows.map(mapGenderRow),
  byMonth: byMonthRows.map((row) => ({
    month: row.month,
    total: roundAmount(row.total),
    count: Number(row.count),
  })),
};
```

## Code — camembert (frontend)

`frontend/src/pages/BackofficeDashboardPage.jsx` :

```javascript
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
      />
      {/* légende */}
    </div>
  );
}
```

## Code — barres horizontales (frontend)

```javascript
function BarGraph({ items, valueKey, labelKey, colorKey, formatValue = formatAmount }) {
  const max = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="bar-chart">
      {items.map((item, index) => (
        <div key={item[labelKey]} className="bar-row">
          <div className="bar-label">{item[labelKey]}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(item[valueKey] / max) * 100}%`, ...fillStyle }}
            />
          </div>
          <div className="bar-value">{formatValue(item[valueKey])}</div>
        </div>
      ))}
    </div>
  );
}
```

## Code — appel API frontend

`frontend/src/api/client.js` :

```javascript
export function getBackofficeDashboard() {
  return apiFetch('/api/backoffice/dashboard');
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/dashboardStats.js` |
| `backend/src/routes/backoffice.js` |
| `backend/src/services/dolibarr.js` |
| `frontend/src/pages/BackofficeDashboardPage.jsx` |
| `frontend/src/api/client.js` |
| `frontend/src/styles.css` |
