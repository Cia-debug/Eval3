import { useEffect, useState } from 'react';
import { genererPaiementsMensuelsEnMasse, listEmployees } from '../api/client';
import { formatMontantEuro } from '../utils/formatters';

const currentDate = new Date();

export function usePaiementMensuelMasse() {
  const [form, setForm] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    budget: '',
    priority_job: '',
  });
  const [jobOptions, setJobOptions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    listEmployees()
      .then((data) => {
        const jobs = [...new Set(data.employees.map((employee) => employee.job).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, 'fr'),
        );
        setJobOptions(jobs);
      })
      .catch(() => {});
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'month' || name === 'year' ? Number(value) : value,
    }));
  }

  async function handleGenerate(event) {
    event.preventDefault();

    if (!form.priority_job) {
      setError('Sélectionnez un poste prioritaire.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');
    setResult(null);

    try {
      const data = await genererPaiementsMensuelsEnMasse({
        month: form.month,
        year: form.year,
        budget: form.budget,
        priority_job: form.priority_job,
      });

      setResult(data);
      if (data.warning) {
        setMessage(data.warning);
      } else {
        const budgetInutilise = Number(data.budget_remaining) > 0
          ? ` — budget non utilisé ${formatMontantEuro(data.budget_remaining)}`
          : '';
        setMessage(
          data.message
            || `${data.created} paiement(s) généré(s) — total payé ${formatMontantEuro(data.total_paid)}${budgetInutilise}`,
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return {
    form,
    jobOptions,
    generating,
    error,
    message,
    result,
    handleFormChange,
    handleGenerate,
  };
}
