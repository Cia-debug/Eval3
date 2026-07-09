import { apiFetch } from './http';

export function genererSalairesEnMasse(payload) {
  return apiFetch('/api/frontoffice/salaries/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function genererSalairesMensuelsEnMasse(payload) {
  return apiFetch('/api/frontoffice/salaries/bulk-monthly', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function genererPaiementsMensuelsEnMasse(payload) {
  return apiFetch('/api/frontoffice/payments/bulk-monthly', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function creerSalaire(payload) {
  return apiFetch('/api/frontoffice/salaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function payerSalaire(salaryId, payload) {
  return apiFetch(`/api/frontoffice/salaries/${salaryId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
