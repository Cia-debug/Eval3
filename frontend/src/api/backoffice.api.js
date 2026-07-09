import { apiFetch, apiUpload } from './http';

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

export function importEmployeesCsv(file) {
  return apiUpload('/api/backoffice/import/employees', file, 'Erreur import CSV');
}

export function importSalariesCsv(file) {
  return apiUpload('/api/backoffice/import/salaries', file, 'Erreur import CSV');
}

export function importImagesZip(file) {
  return apiUpload('/api/backoffice/import/images', file, 'Erreur import ZIP');
}
