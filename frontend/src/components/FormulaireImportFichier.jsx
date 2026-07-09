import { useState } from 'react';

export default function FormulaireImportFichier({
  titre,
  description,
  accept,
  etiquetteBouton = 'Importer',
  messageErreurAucunFichier,
  messageErreurFallback,
  importer,
  buildSuccessMessage,
}) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleImport(event) {
    event.preventDefault();

    if (!file) {
      setMessage(messageErreurAucunFichier);
      return;
    }

    setMessage('');
    setSubmitting(true);

    try {
      const result = await importer(file);
      setMessage(buildSuccessMessage ? buildSuccessMessage(result) : (result.message || 'Import terminé.'));
      setFile(null);
      event.target.reset();
    } catch (err) {
      setMessage(err.message || messageErreurFallback);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content page-content--narrow">
      <h2>{titre}</h2>
      <p className="muted">{description}</p>
      <form onSubmit={handleImport}>
        <input
          type="file"
          accept={accept}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button type="submit" disabled={submitting || !file}>
          {submitting ? 'Import…' : etiquetteBouton}
        </button>
      </form>
      {message ? <p className="reset-message">{message}</p> : null}
    </div>
  );
}
