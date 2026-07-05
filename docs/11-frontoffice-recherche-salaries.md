# FrontOffice — Recherche multi-critères salariés

## Fonctionnalité

Recherche par ref, nom, login, genre, poste (filtres en query string).

## Code — filtres côté serveur

`backend/src/services/employeeService.js` :

```javascript
function matchesGenre(employee, genreFilter) {
  const genderMap = {
    homme: 'man', h: 'man', man: 'man',
    femme: 'woman', f: 'woman', woman: 'woman',
  };
  const expected = genderMap[normalize(genreFilter)];
  return !expected || employee.gender === expected;
}

function matchesWeeklyHours(employee, minHours, maxHours) {
  if (minHours != null && employee.weeklyhours < minHours) return false;
  if (maxHours != null && employee.weeklyhours > maxHours) return false;
  return true;
}

return employees.filter((employee) => {
  if (refFilter && !normalize(employee.ref_employee).includes(refFilter)) return false;
  if (nameFilter && !normalize(employee.lastname).includes(nameFilter)) return false;
  if (loginFilter && !normalize(employee.login).includes(loginFilter)) return false;
  if (jobFilter && !normalize(employee.job).includes(jobFilter)) return false;
  if (!matchesGenre(employee, filters.genre)) return false;
  if (!matchesWeeklyHours(employee, minHours, maxHours)) return false;
  return true;
});
```

## Code — frontend formulaire + URL

`frontend/src/pages/EmployeeListPage.jsx` :

```javascript
const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  const params = Object.fromEntries(searchParams.entries());
  const data = await searchEmployees(params);
  setEmployees(data.employees);
}, [searchParams]);

function handleSubmit(event) {
  event.preventDefault();
  const nextParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value.trim()) nextParams.set(key, value.trim());
  });
  setSearchParams(nextParams);
}
```

## Code — formulaire recherche

```javascript
<form className="search-form" onSubmit={handleSubmit}>
  <input name="ref_employee" value={filters.ref_employee} onChange={handleChange} />
  <input name="nom" value={filters.nom} onChange={handleChange} />
  <select name="genre" value={filters.genre} onChange={handleChange}>
    <option value="">Tous</option>
    <option value="homme">Homme</option>
    <option value="femme">Femme</option>
  </select>
  <button type="submit">Rechercher</button>
</form>
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/employeeService.js` |
| `backend/src/routes/frontoffice.js` |
| `frontend/src/pages/EmployeeListPage.jsx` |
| `frontend/src/api/client.js` |
