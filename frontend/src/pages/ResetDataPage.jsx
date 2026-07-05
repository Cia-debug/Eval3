import { useState } from 'react';
import { resetDolibarrData } from '../api/client';

export default function ResetDataPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleReset() {
    if (!window.confirm('Réinitialiser les données Dolibarr ?')) {
      return;
    }

    setMessage('');
    setSubmitting(true);

    try {
      await resetDolibarrData('REINITIALISER');
      setMessage('Réinitialisation terminée.');
    } catch (err) {
      setMessage(err.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content page-content--narrow">
      <h2>Réinitialisation</h2>
      <p className="muted">Page de réinitialisation Dolibarr</p>
        <button
          type="button"
          className="btn-danger"
          onClick={handleReset}
          disabled={submitting}
        >
          {submitting ? 'En cours…' : 'Réinitialiser'}
        </button>
        {message ? <p className="reset-message">{message}</p> : null}
    </div>
  );
}
