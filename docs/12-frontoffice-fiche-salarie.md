# FrontOffice — Fiche salarié et historique salaires

## Fonctionnalité

Fiche employé + historique salaires/paiements + reste à payer.

## Code — route backend

`backend/src/routes/frontoffice.js` :

```javascript
router.get('/employees/:id/salary-history', async (req, res) => {
  const history = await getEmployeeSalaryHistory(req.params.id);
  if (!history) {
    return res.status(404).json({ error: 'Salarié introuvable' });
  }
  res.json(history);
});
```

## Code — agrégation historique

`backend/src/services/employeeSalaryHistoryService.js` :

```javascript
function mapSalaryWithPayments(salary, paymentsBySalaryId) {
  const payments = paymentsBySalaryId.get(String(salary.id)) || [];
  const amount = roundAmount(salary.amount);
  const paidTotal = roundAmount(payments.reduce((sum, p) => sum + p.amount, 0));
  const remainingFromApi = salary.resteapayer != null ? roundAmount(salary.resteapayer) : null;
  const remaining = remainingFromApi ?? roundAmount(Math.max(0, amount - paidTotal));

  return {
    id: String(salary.id),
    ref: salary.ref,
    amount,
    date_start: timestampToDateString(salary.datesp),
    date_end: timestampToDateString(salary.dateep),
    payments,
    paid_total: paidTotal,
    remaining,
  };
}

export async function getEmployeeSalaryHistory(employeeId) {
  const employee = await getEmployeeById(employeeId);
  if (!employee) return null;

  const [allSalaries, allPayments] = await Promise.all([
    dolibarr.listSalaries({ limit: 500 }),
    dolibarr.listSalaryPayments({ limit: 500 }),
  ]);

  const salaries = allSalaries
    .filter((salary) => String(salary.fk_user) === String(employeeId))
    .map((salary) => mapSalaryWithPayments(salary, paymentsBySalaryId));

  return { employee, salaries, totals };
}
```

## Code — frontend fiche

`frontend/src/pages/EmployeeDetailPage.jsx` :

```javascript
useEffect(() => {
  getEmployeeSalaryHistory(id)
    .then(setData)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, [id]);

// affichage reste à payer
<span className={salary.remaining > 0 ? 'remaining-due' : 'remaining-paid'}>
  Reste à payer : {formatAmount(salary.remaining)}
</span>
```

## Code — client API

```javascript
export function getEmployeeSalaryHistory(id) {
  return apiFetch(`/api/frontoffice/employees/${id}/salary-history`);
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/employeeSalaryHistoryService.js` |
| `backend/src/services/employeeService.js` |
| `backend/src/routes/frontoffice.js` |
| `frontend/src/pages/EmployeeDetailPage.jsx` |
| `frontend/src/api/client.js` |
| `frontend/src/styles.css` |
