import { useEffect, useMemo, useState } from 'react';
import { listEmployees, searchEmployees } from '../api/client';

export const EMPTY_BULK_FILTERS = {
  poste: '',
  genre: '',
  heure_min: '',
  heure_max: '',
};

export function useSelectionEmployesMasse() {
  const [filters, setFilters] = useState(EMPTY_BULK_FILTERS);
  const [jobOptions, setJobOptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [filterError, setFilterError] = useState('');

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

  const allSelected = employees.length > 0 && selectedIds.size === employees.length;

  const selectedCount = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)).length,
    [employees, selectedIds],
  );

  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedIds.has(employee.id)),
    [employees, selectedIds],
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function toggleEmployee(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(employees.map((employee) => employee.id)));
  }

  async function applyFilters(event) {
    event.preventDefault();
    setLoadingFilter(true);
    setFilterError('');

    try {
      const data = await searchEmployees(filters);
      setEmployees(data.employees);
      setSelectedIds(new Set(data.employees.map((employee) => employee.id)));
      setHasSearched(true);
    } catch (err) {
      setFilterError(err.message);
      setEmployees([]);
      setSelectedIds(new Set());
      setHasSearched(true);
    } finally {
      setLoadingFilter(false);
    }
  }

  function resetSelectionState() {
    setFilterError('');
  }

  return {
    filters,
    jobOptions,
    employees,
    selectedIds,
    selectedEmployees,
    selectedCount,
    allSelected,
    hasSearched,
    loadingFilter,
    filterError,
    handleFilterChange,
    toggleEmployee,
    toggleSelectAll,
    applyFilters,
    resetSelectionState,
  };
}
