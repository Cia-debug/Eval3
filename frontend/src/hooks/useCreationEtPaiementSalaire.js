import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { creerSalaire, getEmployeeSalaryHistory, payerSalaire, searchEmployees } from '../api/client';
import { formatMontantEuro } from '../utils/formatters';

const EMPTY_PAYMENT = { date: '', amount: '' };

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function filterUnpaidSalaries(salaries) {
  return salaries.filter((salary) => salary.remaining > 0);
}

export function useCreationEtPaiementSalaire() {
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

        const openSalaries = filterUnpaidSalaries(data.salaries);
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

  async function refreshUnpaidSalaries(employeeId, preferredSalaryId) {
    const history = await getEmployeeSalaryHistory(employeeId);
    const openSalaries = filterUnpaidSalaries(history.salaries);
    setUnpaidSalaries(openSalaries);
    setSelectedSalaryId(preferredSalaryId ?? openSalaries[0]?.id ?? '');
  }

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
      const result = await creerSalaire(form);
      setMessage(`Salaire ${result.ref} créé pour ${result.employee.lastname}. Vous pouvez le payer ci-dessous.`);
      setForm({
        employee_id: form.employee_id,
        ref: '',
        label: '',
        date_start: '',
        date_end: '',
        amount: '',
      });
      await refreshUnpaidSalaries(form.employee_id, result.salary_id);
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

      const result = await payerSalaire(selectedSalaryId, payload);
      setMessage(
        `${result.payments.length} paiement(s) enregistré(s) pour le salaire ${result.ref}. Reste à payer : ${formatMontantEuro(result.remaining)}.`,
      );
      resetPaymentRows();

      if (form.employee_id) {
        await refreshUnpaidSalaries(form.employee_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return {
    form,
    employees,
    loadingEmployees,
    creating,
    paying,
    message,
    error,
    loadingSalaries,
    unpaidSalaries,
    selectedSalaryId,
    selectedSalary,
    payments,
    paymentsTotal,
    handleFormChange,
    handleCreateSalary,
    handlePaySalary,
    setSelectedSalaryId,
    addPaymentRow,
    removePaymentRow,
    handlePaymentChange,
  };
}
