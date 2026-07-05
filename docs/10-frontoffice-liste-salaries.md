# FrontOffice — Liste simple des salariés

## Fonctionnalité

Liste tous les employés Dolibarr sans filtre.

## Code — route backend

`backend/src/routes/frontoffice.js` :

```javascript
router.get('/employees', async (req, res) => {
  const employees = await searchEmployees({
    ref_employee: req.query.ref_employee,
    nom: req.query.nom,
    login: req.query.login,
    genre: req.query.genre,
    poste: req.query.poste,
    heure_min: req.query.heure_min,
    heure_max: req.query.heure_max,
  });

  res.json({ total: employees.length, employees });
});
```

## Code — récupération via API Dolibarr

`backend/src/services/employeeService.js` :

```javascript
export async function searchEmployees(filters = {}) {
  const users = await dolibarr.listUsers({ limit: 500 });
  const employees = users.filter(isEmployee).map(mapEmployee);

  // sans filtre → retourne tous les employés
  return employees.filter((employee) => {
    if (refFilter && !normalize(employee.ref_employee).includes(refFilter)) return false;
    if (nameFilter && !normalize(employee.lastname).includes(nameFilter)) return false;
    // ...
    return true;
  });
}

function mapEmployee(user) {
  return {
    id: String(user.id),
    ref_employee: user.ref_employee || '',
    lastname: user.lastname || '',
    login: user.login || '',
    gender_label: GENDER_LABELS[user.gender] || '',
    job: user.job || '',
    weeklyhours: user.weeklyhours != null ? Number(user.weeklyhours) : null,
  };
}
```

## Code — frontend liste

`frontend/src/pages/EmployeeSimpleListPage.jsx` :

```javascript
useEffect(() => {
  listEmployees()
    .then((data) => setEmployees(data.employees))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);

// tableau avec liens
<Link to={`/frontoffice/salaries/${employee.id}`}>
  {employee.lastname}
</Link>
```

## Code — client API

`frontend/src/api/client.js` :

```javascript
export function listEmployees() {
  return searchEmployees({});
}

export function searchEmployees(filters = {}) {
  return apiFetch(`/api/frontoffice/employees${buildQuery(filters)}`);
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/employeeService.js` |
| `backend/src/routes/frontoffice.js` |
| `frontend/src/pages/EmployeeSimpleListPage.jsx` |
| `frontend/src/api/client.js` |
| `frontend/src/App.jsx` |
