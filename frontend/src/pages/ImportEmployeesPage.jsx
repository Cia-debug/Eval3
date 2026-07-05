import { useState } from 'react';
import { importEmployeesCsv } from '../api/client';

export default function ImportEmployeesPage() {
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
      const result = await importEmployeesCsv(file);
      const parts = [result.message || 'Import terminé.'];
      if (result.weeklyhoursWarning) {
        parts.push(result.weeklyhoursWarning);
      }
      setMessage(parts.join(' '));
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
      <h2>Import employés</h2>
      <p className="muted">
        Colonnes attendues : ref_employe, nom, genre, identifiant, mdp, <strong>heure_travai</strong>, poste
      </p>
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
