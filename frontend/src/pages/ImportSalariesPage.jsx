import { useState } from 'react';
import { importSalariesCsv } from '../api/client';

export default function ImportSalariesPage() {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleImport(event) {
    event.preventDefault();

    if (!file) {
      setMessage('Choisissez un fichier CSV.');
      return;
    }

    setMessage('');
    setSubmitting(true);

    try {
      const result = await importSalariesCsv(file);
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
      <h2>Import salaires</h2>
      <p className="muted">Import CSV salaires employés (Dolibarr)</p>
        <form onSubmit={handleImport}>
          <input
            type="file"
            accept=".csv"
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
