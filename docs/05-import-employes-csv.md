# Import employés CSV

## Fonctionnalité

Upload CSV → parse → création ou mise à jour employés via API Dolibarr `/users`.

## Code — route upload

`backend/src/routes/backoffice.js` :

```javascript
router.post('/import/employees', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  const content = req.file.buffer.toString('utf8');
  const result = await importEmployeesFromCsv(content);

  res.json({
    ok: result.failed.length === 0,
    message: `${result.created} créé(s), ${result.updated} mis à jour`,
    ...result,
  });
});
```

## Code — sauvegarde employé (create ou update)

`backend/src/services/csvEmployeeImport.js` :

```javascript
async function saveEmployee(row) {
  const existing = await findExistingUser(row);
  const payload = buildUserPayload(row, { isUpdate: Boolean(existing) });

  if (existing) {
    await dolibarr.updateUser(existing.id, payload);
    return {
      ok: true,
      action: 'updated',
      dolibarr_id: existing.id,
    };
  }

  const userId = await dolibarr.createUser(payload);
  return {
    ok: true,
    action: 'created',
    dolibarr_id: userId,
  };
}

export async function importEmployeesFromCsv(content) {
  const rows = parseEmployeeCsv(content);
  const results = { total: rows.length, created: 0, updated: 0, failed: [], success: [] };

  for (const row of rows) {
    const result = await saveEmployee(row);
    if (!result.ok) {
      results.failed.push(result);
    } else {
      results.success.push(result);
      result.action === 'created' ? results.created++ : results.updated++;
    }
  }

  return results;
}
```

## Code — mapping genre CSV → Dolibarr

```javascript
const GENRE_MAP = {
  homme: { gender: 'man', civility_code: 'MR' },
  femme: { gender: 'woman', civility_code: 'MME' },
};
```

## Code — frontend upload

`frontend/src/api/client.js` :

```javascript
export async function importEmployeesCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/backoffice/import/employees`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  // ...
}
```

`frontend/src/pages/ImportEmployeesPage.jsx` :

```javascript
async function handleImport(event) {
  event.preventDefault();
  const result = await importEmployeesCsv(file);
  setMessage(result.message || 'Import terminé.');
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/csvEmployeeImport.js` |
| `backend/src/services/dolibarr.js` |
| `backend/src/routes/backoffice.js` |
| `frontend/src/pages/ImportEmployeesPage.jsx` |
| `frontend/src/api/client.js` |
| `backend/test-data/employes-exemple.csv` |
