import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createSalary, getEmployeeSalaryHistory, paySalary, searchEmployees } from '../api/client';

const EMPTY_PAYMENT = { date: '', amount: '' };

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatAmount(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SalaryCreatePage() {
  const [searchParams] = useSearchParams();
  const preselectedEmployeeId = searchParams.get('employeeId') || '';

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    employee_id: preselectedEmployeeId,
    ref: '',
    label: '',
    date_start: '',
    date_end: '',
    amount: '',
  });
  const [payments, setPayments] = useState([{ ...EMPTY_PAYMENT, date: todayIsoDate() }]);
  const [unpaidSalaries, setUnpaidSalaries] = useState([]);
  const [selectedSalaryId, setSelectedSalaryId] = useState('');
  const [loadingSalaries, setLoadingSalaries] = useState(false);

  useEffect(() => {
    searchEmployees({})
      .then((data) => setEmployees(data.employees))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingEmployees(false));
  }, []);

  useEffect(() => {
    if (preselectedEmployeeId) {
      setForm((current) => ({ ...current, employee_id: preselectedEmployeeId }));
    }
  }, [preselectedEmployeeId]);

  useEffect(() => {
    if (!form.employee_id) {
      setUnpaidSalaries([]);
      setSelectedSalaryId('');
      return;
    }

    let cancelled = false;
    setLoadingSalaries(true);

    getEmployeeSalaryHistory(form.employee_id)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const openSalaries = data.salaries.filter((salary) => salary.remaining > 0);
        setUnpaidSalaries(openSalaries);

        setSelectedSalaryId((current) => {
          if (current && openSalaries.some((salary) => salary.id === current)) {
            return current;
          }
          return openSalaries[0]?.id || '';
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSalaries(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.employee_id]);

  const selectedSalary = unpaidSalaries.find((salary) => salary.id === selectedSalaryId) || null;

  const paymentsTotal = useMemo(
    () =>
      payments.reduce((sum, payment) => {
        const amount = Number(String(payment.amount).replace(',', '.'));
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0),
    [payments],
  );

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handlePaymentChange(index, field, value) {
    setPayments((current) =>
      current.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, [field]: value } : payment,
      ),
    );
  }

  function addPaymentRow() {
    setPayments((current) => [...current, { ...EMPTY_PAYMENT, date: todayIsoDate() }]);
  }

  function removePaymentRow(index) {
    setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index));
  }

  function resetPaymentRows() {
    setPayments([{ ...EMPTY_PAYMENT, date: todayIsoDate() }]);
  }

  async function handleCreateSalary(event) {
    event.preventDefault();
    setCreating(true);
    setMessage('');
    setError('');

    try {
      const result = await createSalary(form);
      setMessage(`Salaire ${result.ref} créé pour ${result.employee.lastname}. Vous pouvez le payer ci-dessous.`);
      setSelectedSalaryId(result.salary_id);
      setForm({
        employee_id: form.employee_id,
        ref: '',
        label: '',
        date_start: '',
        date_end: '',
        amount: '',
      });

      const history = await getEmployeeSalaryHistory(form.employee_id);
      setUnpaidSalaries(history.salaries.filter((salary) => salary.remaining > 0));
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handlePaySalary(event) {
    event.preventDefault();

    if (!selectedSalaryId) {
      setError('Sélectionnez un salaire à payer ou créez-en un d\'abord.');
      return;
    }

    setPaying(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        payments: payments.filter((payment) => payment.date || payment.amount),
      };

      const result = await paySalary(selectedSalaryId, payload);
      setMessage(
        `${result.payments.length} paiement(s) enregistré(s) pour le salaire ${result.ref}. Reste à payer : ${formatAmount(result.remaining)}.`,
      );
      resetPaymentRows();

      if (form.employee_id) {
        const history = await getEmployeeSalaryHistory(form.employee_id);
        const openSalaries = history.salaries.filter((salary) => salary.remaining > 0);
        setUnpaidSalaries(openSalaries);
        setSelectedSalaryId(openSalaries[0]?.id || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Créer et payer un salaire</h2>
        <Link className="button-link inline-button" to="/frontoffice/salaries/liste">
          Retour salariés
        </Link>
      </div>

      {loadingEmployees ? <p>Chargement des employés…</p> : null}

      <form className="salary-form" onSubmit={handleCreateSalary}>
        <h3>Créer un salaire</h3>
        <div className="form-grid">
          <div className="full-width">
            <label htmlFor="employee_id">Salarié</label>
            <select
              id="employee_id"
              name="employee_id"
              value={form.employee_id}
              onChange={handleFormChange}
              required
            >
              <option value="">Choisir un salarié</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.ref_employee} — {employee.lastname} ({employee.login})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ref">Réf. salaire (optionnel)</label>
            <input
              id="ref"
              name="ref"
              value={form.ref}
              onChange={handleFormChange}
              placeholder="Auto"
            />
          </div>

          <div>
            <label htmlFor="label">Libellé (optionnel)</label>
            <input
              id="label"
              name="label"
              value={form.label}
              onChange={handleFormChange}
              placeholder="Salaire mensuel"
            />
          </div>

          <div>
            <label htmlFor="date_start">Date début</label>
            <input
              id="date_start"
              name="date_start"
              type="date"
              value={form.date_start}
              onChange={handleFormChange}
              required
            />
          </div>

          <div>
            <label htmlFor="date_end">Date fin</label>
            <input
              id="date_end"
              name="date_end"
              type="date"
              value={form.date_end}
              onChange={handleFormChange}
              required
            />
          </div>

          <div>
            <label htmlFor="amount">Montant</label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleFormChange}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={creating || loadingEmployees || !form.employee_id}>
          {creating ? 'Création…' : 'Créer le salaire'}
        </button>
      </form>

      <form className="salary-form payments-section" onSubmit={handlePaySalary}>
        <div className="section-header">
          <h3>Payer un salaire</h3>
        </div>

        {!form.employee_id ? (
          <p className="muted">Choisissez d&apos;abord un salarié pour voir ses salaires à payer.</p>
        ) : null}

        {form.employee_id && loadingSalaries ? <p>Chargement des salaires…</p> : null}

        {form.employee_id && !loadingSalaries && unpaidSalaries.length === 0 ? (
          <p className="muted">Aucun salaire avec reste à payer pour ce salarié. Créez un salaire ci-dessus.</p>
        ) : null}

        {form.employee_id && unpaidSalaries.length > 0 ? (
          <>
            <div className="full-width">
              <label htmlFor="salary_id">Salaire à payer</label>
              <select
                id="salary_id"
                value={selectedSalaryId}
                onChange={(event) => setSelectedSalaryId(event.target.value)}
              >
                {unpaidSalaries.map((salary) => (
                  <option key={salary.id} value={salary.id}>
                    {salary.ref} — {salary.label} ({formatAmount(salary.remaining)} restant)
                  </option>
                ))}
              </select>
            </div>

            {selectedSalary ? (
              <p className="muted">
                Montant : {formatAmount(selectedSalary.amount)} · Déjà payé :{' '}
                {formatAmount(selectedSalary.paid_total)} · Reste :{' '}
                {formatAmount(selectedSalary.remaining)}
              </p>
            ) : null}

            <div className="section-header">
              <h4>Paiements (plusieurs fois)</h4>
              <button type="button" className="btn-secondary" onClick={addPaymentRow}>
                Ajouter un paiement
              </button>
            </div>

            {payments.map((payment, index) => (
              <div key={`payment-${index}`} className="payment-row">
                <div>
                  <label htmlFor={`payment-date-${index}`}>Date paiement</label>
                  <input
                    id={`payment-date-${index}`}
                    type="date"
                    value={payment.date}
                    onChange={(event) =>
                      handlePaymentChange(index, 'date', event.target.value)
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`payment-amount-${index}`}>Montant</label>
                  <input
                    id={`payment-amount-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment.amount}
                    onChange={(event) =>
                      handlePaymentChange(index, 'amount', event.target.value)
                    }
                  />
                </div>
                <div className="payment-actions">
                  <button
                    type="button"
                    className="btn-danger compact-button"
                    onClick={() => removePaymentRow(index)}
                    disabled={payments.length === 1}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <p className="muted">
              Total paiements : {paymentsTotal.toFixed(2)} €
              {selectedSalary ? ` / ${selectedSalary.remaining.toFixed(2)} € restant` : ''}
            </p>

            <button type="submit" disabled={paying || !selectedSalaryId}>
              {paying ? 'Enregistrement…' : 'Enregistrer les paiements'}
            </button>
          </>
        ) : null}
      </form>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
