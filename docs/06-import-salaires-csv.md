# Import salaires CSV

## Fonctionnalité

Upload CSV → création/mise à jour salaires + paiements via API Dolibarr.

## Code — sauvegarde salaire + paiements

`backend/src/services/csvSalaryImport.js` :

```javascript
async function saveSalary(row) {
  const user = await dolibarr.findUserByRefEmployee(row.ref_employee);
  if (!user) {
    return { ok: false, errors: [`Employé ref_employe=${row.ref_employee} introuvable`] };
  }

  const payload = buildSalaryPayload(row, user.id);
  const existing = await dolibarr.findSalaryByRef(row.ref_salary);

  let salaryId;
  let action;

  if (existing) {
    await dolibarr.updateSalary(existing.id, payload);
    salaryId = existing.id;
    action = 'updated';
  } else {
    salaryId = await dolibarr.createSalary(payload);
    action = 'created';
  }

  if (action === 'created') {
    for (const payment of row.payments) {
      await dolibarr.addSalaryPayment(salaryId, {
        datepaye: dateToTimestamp(payment.date),
        amount: payment.amount,
      });
    }
  }

  return { ok: true, action, dolibarr_id: salaryId };
}
```

## Code — payload salaire Dolibarr

```javascript
const salaryPayload = {
  ref: row.ref_salary,
  fk_user: Number(userId),
  label: row.label || `Salaire ${row.ref_salary}`,
  amount: row.amount,
  salary: row.amount,
  datesp: dateToTimestamp(row.date_start),
  dateep: dateToTimestamp(row.date_end),
  paye: row.payments.length > 0 ? 1 : 0,
};
```

## Code — route backend

`backend/src/routes/backoffice.js` :

```javascript
router.post('/import/salaries', upload.single('file'), async (req, res) => {
  const content = req.file.buffer.toString('utf8');
  const result = await importSalariesFromCsv(content);
  res.json({
    ok: result.failed.length === 0,
    message: `${result.created} créé(s), ${result.updated} mis à jour`,
    ...result,
  });
});
```

## Code — frontend

`frontend/src/pages/ImportSalariesPage.jsx` :

```javascript
const result = await importSalariesCsv(file);
setMessage(result.message || 'Import terminé.');
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/csvSalaryImport.js` |
| `backend/src/services/dolibarr.js` |
| `backend/src/routes/backoffice.js` |
| `frontend/src/pages/ImportSalariesPage.jsx` |
| `frontend/src/api/client.js` |
| `backend/test-data/salaires-exemple.csv` |
