const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur API');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getBackofficeConfig() {
  return apiFetch('/api/auth/backoffice/config');
}

export function loginBackoffice(code) {
  return apiFetch('/api/auth/backoffice/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function logoutBackoffice() {
  return apiFetch('/api/auth/backoffice/logout', { method: 'POST' });
}

export function getBackofficeSession() {
  return apiFetch('/api/auth/backoffice/me');
}

export function getBackofficeDashboard() {
  return apiFetch('/api/backoffice/dashboard');
}

export function getDolibarrResetPreview() {
  return apiFetch('/api/backoffice/reset/dolibarr/preview');
}

export function resetDolibarrData(confirm) {
  return apiFetch('/api/backoffice/reset/dolibarr', {
    method: 'POST',
    body: JSON.stringify({ confirm }),
  });
}

export async function importEmployeesCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/backoffice/import/employees`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur import CSV');
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function importSalariesCsv(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/backoffice/import/salaries`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur import CSV');
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function importImagesZip(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/backoffice/import/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur import ZIP');
    error.status = response.status;
    throw error;
  }

  return data;
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim()) {
      query.set(key, String(value).trim());
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export function searchEmployees(filters = {}) {
  return apiFetch(`/api/frontoffice/employees${buildQuery(filters)}`);
}

export function listEmployees() {
  return searchEmployees({});
}

export function getEmployeeSalaryHistory(id) {
  return apiFetch(`/api/frontoffice/employees/${id}/salary-history`);
}

export function generateBulkSalaries(payload) {
  return apiFetch('/api/frontoffice/salaries/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function generateMonthlyBulkSalaries(payload) {
  return apiFetch('/api/frontoffice/salaries/bulk-monthly', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createSalary(payload) {
  return apiFetch('/api/frontoffice/salaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function paySalary(salaryId, payload) {
  return apiFetch(`/api/frontoffice/salaries/${salaryId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getHolidays() {
  return apiFetch('/api/backoffice/holidays');
}

export function getHoliday(id) {
  return apiFetch(`/api/backoffice/holidays/${id}`);
}

export function createHoliday(payload) {
  return apiFetch('/api/backoffice/holidays', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateHoliday(id, payload) {
  return apiFetch(`/api/backoffice/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteHoliday(id) {
  return apiFetch(`/api/backoffice/holidays/${id}`, {
    method: 'DELETE',
  });
}
