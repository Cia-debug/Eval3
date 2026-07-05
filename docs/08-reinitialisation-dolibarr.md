# Réinitialisation données Dolibarr

## Fonctionnalité

Vider les tables métier Dolibarr (sauf admin, config, dictionnaires) via MySQL direct.

## Code — confirmation obligatoire

`backend/src/routes/backoffice.js` :

```javascript
const RESET_CONFIRMATION = 'REINITIALISER';

router.post('/reset/dolibarr', async (req, res) => {
  const { confirm } = req.body ?? {};

  if (confirm !== RESET_CONFIRMATION) {
    return res.status(400).json({
      error: `Confirmation requise : saisir "${RESET_CONFIRMATION}"`,
    });
  }

  const result = await resetDolibarrData();
  res.json({
    ok: true,
    message: 'Données Dolibarr réinitialisées',
    ...result,
  });
});
```

## Code — tables protégées

`backend/src/services/dolibarrReset.js` :

```javascript
const UNTOUCHABLE_TABLES = new Set([
  'llx_const',
  'llx_usergroup',
  'llx_rights_def',
  'llx_menu',
  'llx_module',
]);

const USER_MANAGED_TABLES = new Set([
  'llx_user',
  'llx_usergroup_user',
  'llx_user_rights',
  // ...
]);

function shouldPreserveTable(tableName) {
  if (UNTOUCHABLE_TABLES.has(tableName)) return true;
  if (USER_MANAGED_TABLES.has(tableName)) return true;
  if (tableName.startsWith('llx_c_')) return true;
  return false;
}
```

## Code — preview avant reset

```javascript
router.get('/reset/dolibarr/preview', async (_req, res) => {
  const preview = await getDolibarrResetPreview();
  res.json(preview);
});
```

## Code — frontend

`frontend/src/api/client.js` :

```javascript
export function resetDolibarrData(confirm) {
  return apiFetch('/api/backoffice/reset/dolibarr', {
    method: 'POST',
    body: JSON.stringify({ confirm }),
  });
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/dolibarrReset.js` |
| `backend/src/routes/backoffice.js` |
| `frontend/src/pages/ResetDataPage.jsx` |
| `frontend/src/api/client.js` |
