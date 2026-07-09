export function formatMontantEuro(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateFr(isoDate, emptyLabel = '—') {
  if (!isoDate) {
    return emptyLabel;
  }

  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
