import { useState } from 'react';

export function useGenerationSalairesMasse({ selection, generateFn, buildPayload }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  async function handleGenerate(event) {
    event.preventDefault();

    if (!selection.hasSearched) {
      setError('Cliquez d\'abord sur « Rechercher » pour afficher les employés.');
      return;
    }

    if (selection.selectedCount === 0) {
      setError('Sélectionnez au moins un employé.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);
    selection.resetSelectionState();

    try {
      const payload = buildPayload();
      const data = await generateFn(payload);
      setResult(data);
      setMessage(data.message || `${data.created} salaire(s) généré(s).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return {
    generating,
    error,
    message,
    result,
    handleGenerate,
  };
}
