import { apiFetch } from './http';

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
