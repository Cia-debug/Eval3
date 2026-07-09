import { apiFetch } from './http';

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
