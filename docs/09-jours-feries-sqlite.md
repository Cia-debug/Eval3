# Jours fériés (SQLite CRUD)

## Fonctionnalité

CRUD jours fériés dans SQLite local (indépendant de Dolibarr).

## Code — schéma SQLite

`backend/src/db/sqlite.js` :

```javascript
function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS jours_feries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function sqliteRun(sql, params = []) {
  getSqliteDb().run(sql, params);
  const lastId = sqliteGet('SELECT last_insert_rowid() AS id')?.id ?? null;
  persistSqliteDb();
  return lastId;
}
```

## Code — création jour férié

`backend/src/services/holidayService.js` :

```javascript
export function createHoliday(input) {
  const parsed = validateHolidayInput(input);
  if (parsed.errors.length > 0) {
    return { ok: false, errors: parsed.errors };
  }

  const insertedId = sqliteRun(
    'INSERT INTO jours_feries (date, libelle) VALUES (?, ?)',
    [parsed.date, parsed.libelle],
  );

  return {
    ok: true,
    holiday: getHolidayById(insertedId),
  };
}
```

## Code — routes REST

`backend/src/routes/backoffice.js` :

```javascript
router.get('/holidays', (_req, res) => {
  res.json({ holidays: listHolidays() });
});

router.post('/holidays', (req, res) => {
  const result = createHoliday(req.body ?? {});
  if (!result.ok) {
    return res.status(400).json({ error: result.errors.join(' ; ') });
  }
  res.status(201).json(result);
});

router.put('/holidays/:id', (req, res) => { /* updateHoliday */ });
router.delete('/holidays/:id', (req, res) => { /* deleteHoliday */ });
```

## Code — frontend API

`frontend/src/api/client.js` :

```javascript
export function createHoliday(payload) {
  return apiFetch('/api/backoffice/holidays', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteHoliday(id) {
  return apiFetch(`/api/backoffice/holidays/${id}`, {
    method: 'DELETE',
  });
}
```

## Code — page React

`frontend/src/pages/HolidaysPage.jsx` :

```javascript
async function handleSubmit(event) {
  event.preventDefault();
  if (editingId) {
    await updateHoliday(editingId, form);
  } else {
    await createHoliday(form);
  }
  await loadHolidays();
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/db/sqlite.js` |
| `backend/src/services/holidayService.js` |
| `backend/src/routes/backoffice.js` |
| `backend/src/index.js` |
| `frontend/src/pages/HolidaysPage.jsx` |
| `frontend/src/api/client.js` |
| `backend/data/newapp.sqlite` |
