export function formatWeeklyHours(value) {
  if (value == null || value === '') {
    return '—';
  }

  const hours = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(hours) ? String(hours) : '—';
}
