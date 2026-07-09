import { useEffect, useState } from 'react';
import { createHoliday, deleteHoliday, getHolidays, updateHoliday } from '../api/client';
import { formatDateFr } from '../utils/formatters';

const EMPTY_FORM = { date: '', libelle: '' };

export function useJoursFeries() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  async function loadHolidays() {
    setLoading(true);
    setError('');

    try {
      const data = await getHolidays();
      setHolidays(data.holidays);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHolidays();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(holiday) {
    setEditingId(holiday.id);
    setForm({ date: holiday.date, libelle: holiday.libelle });
    setMessage('');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      if (editingId) {
        await updateHoliday(editingId, form);
        setMessage('Jour férié mis à jour.');
      } else {
        await createHoliday(form);
        setMessage('Jour férié ajouté.');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(holiday) {
    if (!window.confirm(`Supprimer "${holiday.libelle}" du ${formatDateFr(holiday.date, '')} ?`)) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await deleteHoliday(holiday.id);
      if (editingId === holiday.id) {
        cancelEdit();
      }
      setMessage('Jour férié supprimé.');
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    }
  }

  return {
    holidays,
    loading,
    submitting,
    error,
    message,
    form,
    editingId,
    handleChange,
    handleSubmit,
    startEdit,
    cancelEdit,
    handleDelete,
  };
}
