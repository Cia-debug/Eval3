# FrontOffice — Génération salaires en masse

## Fonctionnalité

Filtrer salariés (poste, genre, heures) puis créer un salaire identique pour chacun.

## Code — route backend

`backend/src/routes/frontoffice.js` :

```javascript
router.post('/salaries/bulk', async (req, res) => {
  const result = await generateBulkSalaries(req.body ?? {});

  if (!result.total && result.errors) {
    return res.status(400).json({ error: result.errors.join(' ; ') });
  }

  res.status(201).json({
    ok: result.ok,
    message: `${result.created} salaire(s) généré(s) sur ${result.total}`,
    ...result,
  });
});
```

## Code — génération en boucle

`backend/src/services/salaryService.js` :

```javascript
export async function generateBulkSalaries(body) {
  const parsed = validateBulkPayload(body);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const employees = await searchEmployees({
    poste: body.poste,
    genre: body.genre,
    heure_min: body.heure_min,
    heure_max: body.heure_max,
  });

  if (employees.length === 0) {
    return { ok: false, errors: ['Aucun salarié ne correspond aux filtres'] };
  }

  const refs = await allocateSalaryRefs(employees.length);

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const ref = refs[index];

    const salaryPayload = {
      ref,
      fk_user: Number(employee.id),
      label: `Salaire ${ref} - ${employee.lastname}`,
      amount: parsed.amount,
      datesp: dateToTimestamp(parsed.dateStart),
      dateep: dateToTimestamp(parsed.dateEnd),
      paye: 0,
    };

    const salaryId = await dolibarr.createSalary(salaryPayload);
    created.push({ salary_id: String(salaryId), ref, employee, amount: parsed.amount });
  }

  return { ok: failed.length === 0, total: employees.length, created: created.length, success: created, failures: failed };
}
```

## Code — frontend

`frontend/src/pages/BulkSalaryPage.jsx` :

```javascript
async function applyFilters(event) {
  event.preventDefault();
  const data = await searchEmployees(filters);
  setEmployees(data.employees);
}

async function handleGenerate(event) {
  event.preventDefault();
  const data = await generateBulkSalaries({ ...filters, ...salaryForm });
  setResult(data);
  setMessage(`${data.created} salaire(s) généré(s).`);
}
```

## Code — client API

```javascript
export function generateBulkSalaries(payload) {
  return apiFetch('/api/frontoffice/salaries/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/salaryService.js` |
| `backend/src/services/employeeService.js` |
| `backend/src/routes/frontoffice.js` |
| `frontend/src/pages/BulkSalaryPage.jsx` |
| `frontend/src/api/client.js` |
