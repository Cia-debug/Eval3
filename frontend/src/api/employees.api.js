import { apiFetch, buildQuery } from './http';

export function searchEmployees(filters = {}) {
  return apiFetch(`/api/frontoffice/employees${buildQuery(filters)}`);
}

export function listEmployees() {
  return searchEmployees({});
}

export function getEmployeeSalaryHistory(id) {
  return apiFetch(`/api/frontoffice/employees/${id}/salary-history`);
}
