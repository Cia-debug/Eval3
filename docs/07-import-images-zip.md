# Import images employés ZIP

## Fonctionnalité

ZIP d’images nommées `{ref_employee}.jpg` → copie dans dossier Dolibarr + lookup MySQL.

## Code — import ZIP

`backend/src/services/zipImagesImport.js` :

```javascript
export async function importImagesFromZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter(
    (entry) => !entry.isDirectory && isImageFile(entry.entryName),
  );

  const connection = await mysql.createConnection(getMysqlConfig());
  const photosPath = getUserPhotosPath();

  for (const entry of entries) {
    const filename = path.basename(entry.entryName);
    const refEmployee = getRefFromFilename(filename);

    // lookup llx_user par ref_employee (MySQL)
    const user = await findUserByRefEmployee(connection, refEmployee);

    if (!user) {
      results.failed.push({ file: filename, errors: ['Employé introuvable'] });
      continue;
    }

    await writeUserPhotoFiles(user.rowid, user.photo, entry.getData());
    results.imported += 1;
  }

  return results;
}
```

## Code — route backend

`backend/src/routes/backoffice.js` :

```javascript
router.post('/import/images', uploadZip.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier ZIP requis' });
  }

  const result = await importImagesFromZip(req.file.buffer);
  res.json({ ok: result.failed.length === 0, ...result });
});
```

## Code — frontend

`frontend/src/api/client.js` :

```javascript
export async function importImagesZip(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/backoffice/import/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  // ...
}
```

## Configuration

```env
DOLIBARR_USER_PHOTOS_PATH=C:/xampp/htdocs/dolibarr/documents/users
MYSQL_DATABASE=dolibarr
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/zipImagesImport.js` |
| `backend/src/routes/backoffice.js` |
| `frontend/src/pages/ImportImagesPage.jsx` |
| `frontend/src/api/client.js` |
| `backend/.env` |
