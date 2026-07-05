# FrontOffice — Créer et payer un salaire

## Fonctionnalité

Création salaire + plusieurs paiements en une requête.

## Code — route backend

`backend/src/routes/frontoffice.js` :

```javascript
router.post('/salaries', async (req, res) => {
  const result = await createSalaryWithPayments(req.body ?? {});

  if (!result.ok) {
    return res.status(400).json({ error: result.errors.join(' ; ') });
  }

  res.status(201).json({ ok: true, message: 'Salaire créé', ...result });
});
```

## Code — création salaire + paiements

`backend/src/services/salaryService.js` :

```javascript
export async function createSalaryWithPayments(body) {
  const parsed = validatePayload(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employee = await getEmployeeById(body.employee_id);
  const ref = body.ref?.trim() || (await generateSalaryRef());

  const salaryPayload = {
    ref,
    fk_user: Number(employee.id),
    label: body.label?.trim() || `Salaire ${ref}`,
    amount: parsed.amount,
    salary: parsed.amount,
    datesp: dateToTimestamp(parsed.dateStart),
    dateep: dateToTimestamp(parsed.dateEnd),
    paye: parsed.payments.length > 0 ? 1 : 0,
  };

  const salaryId = await dolibarr.createSalary(salaryPayload);

  for (const payment of parsed.payments) {
    await dolibarr.addSalaryPayment(salaryId, {
      datepaye: dateToTimestamp(payment.date),
      amount: payment.amount,
    });
  }

  return { ok: true, salary_id: String(salaryId), ref, employee, payments: paymentsAdded };
}
```

## Code — frontend formulaire

`frontend/src/pages/SalaryCreatePage.jsx` :

```javascript
const [payments, setPayments] = useState([{ ...EMPTY_PAYMENT, date: todayIsoDate() }]);

async function handleSubmit(event) {
  event.preventDefault();
  const payload = {
    ...form,
    payments: payments.filter((payment) => payment.date || payment.amount),
  };
  const result = await createSalary(payload);
  setMessage(`Salaire ${result.ref} créé pour ${result.employee.lastname}`);
}

function addPaymentRow() {
  setPayments((current) => [...current, { ...EMPTY_PAYMENT, date: todayIsoDate() }]);
}
```

## Code — client API

```javascript
export function createSalary(payload) {
  return apiFetch('/api/frontoffice/salaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/salaryService.js` |
| `backend/src/services/dolibarr.js` |
| `backend/src/routes/frontoffice.js` |
| `frontend/src/pages/SalaryCreatePage.jsx` |
| `frontend/src/api/client.js` |
