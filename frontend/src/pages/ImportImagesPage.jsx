import { useState } from 'react';
import { importImagesZip } from '../api/client';

export default function ImportImagesPage() {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleImport(event) {
    event.preventDefault();

    if (!file) {
      setMessage('Choisissez un fichier ZIP.');
      return;
    }

    setMessage('');
    setSubmitting(true);

    try {
      const result = await importImagesZip(file);
      setMessage(result.message || 'Import terminé.');
      setFile(null);
      event.target.reset();
    } catch (err) {
      setMessage(err.message || 'Erreur lors de l\'import.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content page-content--narrow">
      <h2>Import images</h2>
      <p className="muted">Import ZIP images employés (Dolibarr)</p>
      <form onSubmit={handleImport}>
        <input
          type="file"
          accept=".zip"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button type="submit" disabled={submitting || !file}>
          {submitting ? 'Import…' : 'Importer'}
        </button>
      </form>
      {message ? <p className="reset-message">{message}</p> : null}
    </div>
  );
}
