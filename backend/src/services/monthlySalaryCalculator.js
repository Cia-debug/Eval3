function roundAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function eachDayInMonth(year, month) {
  const count = getDaysInMonth(year, month);
  const days = [];

  for (let day = 1; day <= count; day += 1) {
    days.push(toIsoDate(year, month, day));
  }

  return days;
}

function compareIsoDates(left, right) {
  return left.localeCompare(right);
}

function eachDayInRange(startIso, endIso) {
  if (!startIso || !endIso || startIso > endIso) {
    return [];
  }

  const days = [];
  const cursor = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function getMonthBounds(year, month) {
  const lastDay = getDaysInMonth(year, month);
  return {
    start: toIsoDate(year, month, 1),
    end: toIsoDate(year, month, lastDay),
  };
}

/**
 * Retourne l'ensemble des dates ISO (YYYY-MM-DD) déjà couvertes par des salaires existants
 * pour le mois donné.
 */
export function getPaidDaysInMonth(salaries, year, month) {
  const { start: monthStart, end: monthEnd } = getMonthBounds(year, month);
  const paidDays = new Set();

  for (const salary of salaries) {
    const periodStart = salary.date_start;
    const periodEnd = salary.date_end || salary.date_start;

    if (!periodStart) {
      continue;
    }

    const overlapStart = compareIsoDates(periodStart, monthStart) > 0 ? periodStart : monthStart;
    const overlapEnd = compareIsoDates(periodEnd, monthEnd) < 0 ? periodEnd : monthEnd;

    if (overlapStart > overlapEnd) {
      continue;
    }

    for (const day of eachDayInRange(overlapStart, overlapEnd)) {
      paidDays.add(day);
    }
  }

  return paidDays;
}

/**
 * Calcule le montant du salaire mensuel :
 * - chaque jour non payé : salaireParJour
 * - chaque jour férié non payé : + salaireParJour (paiement double)
 */
export function calculateMonthlySalaryAmount({
  year,
  month,
  salaryPerDay,
  holidayDates = [],
  paidDays = new Set(),
}) {
  const holidaySet = new Set(holidayDates);
  const allDays = eachDayInMonth(year, month);
  const unpaidDays = allDays.filter((day) => !paidDays.has(day));

  let amount = 0;
  let holidayBonusDays = 0;

  for (const day of unpaidDays) {
    amount += salaryPerDay;
    if (holidaySet.has(day)) {
      amount += salaryPerDay;
      holidayBonusDays += 1;
    }
  }

  return {
    amount: roundAmount(amount),
    unpaidDays,
    unpaidDayCount: unpaidDays.length,
    paidDayCount: allDays.length - unpaidDays.length,
    totalDaysInMonth: allDays.length,
    holidayBonusDays,
    date_start: unpaidDays[0] || null,
    date_end: unpaidDays[unpaidDays.length - 1] || null,
  };
}
