import { arrondirMontant, parserDateIsoStricte } from './utilitairesSalaire.js';

const formater = (n) => String(n).padStart(2, '0');
export const joursDansMois = (annee, mois) => new Date(annee, mois, 0).getDate();
export const versDateIso = (annee, mois, jour) => `${annee}-${formater(mois)}-${formater(jour)}`;
export const chaqueJourDuMois = (annee, mois) =>
  Array.from({ length: joursDansMois(annee, mois) }, (_, i) => versDateIso(annee, mois, i + 1));

const chaqueJourDePlage = (debut, fin) => {
  if (!debut || !fin || debut > fin) return [];
  const jours = [], curseur = new Date(`${debut}T12:00:00`), dernier = new Date(`${fin}T12:00:00`);
  while (curseur <= dernier) {
    jours.push(`${curseur.getFullYear()}-${formater(curseur.getMonth() + 1)}-${formater(curseur.getDate())}`);
    curseur.setDate(curseur.getDate() + 1);
  }
  return jours;
};

export const bornesMois = (annee, mois) => ({
  start: versDateIso(annee, mois, 1),
  end: versDateIso(annee, mois, joursDansMois(annee, mois)),
});

export function joursPayesDuMois(salaires, annee, mois) {
  const { start: debutMois, end: finMois } = bornesMois(annee, mois);
  const payes = new Set();
  for (const { date_start: debut, date_end: fin } of salaires) {
    if (!debut) continue;
    const debutChev = debut > debutMois ? debut : debutMois;
    const finChev = (fin || debut) < finMois ? (fin || debut) : finMois;
    if (debutChev <= finChev) chaqueJourDePlage(debutChev, finChev).forEach((j) => payes.add(j));
  }
  return payes;
}

const typeJourWeekend = (iso) => {
  const jour = parserDateIsoStricte(iso)?.getDay();
  return jour === 6 ? 'saturday' : jour === 0 ? 'sunday' : null;
};

export const estSamedi = (iso) => typeJourWeekend(iso) === 'saturday';
export const estDimanche = (iso) => typeJourWeekend(iso) === 'sunday';
export const obtenirTypeJourWeekend = typeJourWeekend;

const MULTIPLICATEUR_WEEKEND = 3;

export function calculerMontantSalaireMensuel({
  year, month, salaryPerDay, holidayDates = [], paidDays = new Set(),
  workedSaturday = false, workedSunday = false,
}) {
  const feries = new Set(holidayDates);
  const tousLesJours = chaqueJourDuMois(year, month);
  const joursNonPayes = tousLesJours.filter((j) => !paidDays.has(j));
  let montant = 0, joursFeriesBonus = 0, bonusWeekend = 0;
  const samedis = [], dimanches = [];

  for (const jour of joursNonPayes) {
    const type = typeJourWeekend(jour);
    let montantJour = salaryPerDay;
    if (type === 'saturday' && workedSaturday) {
      montantJour = salaryPerDay * MULTIPLICATEUR_WEEKEND;
      samedis.push(jour);
      bonusWeekend += salaryPerDay * (MULTIPLICATEUR_WEEKEND - 1);
    } else if (type === 'sunday' && workedSunday) {
      montantJour = salaryPerDay * MULTIPLICATEUR_WEEKEND;
      dimanches.push(jour);
      bonusWeekend += salaryPerDay * (MULTIPLICATEUR_WEEKEND - 1);
    }

    let montantDuJour = montantJour;
    if (feries.has(jour)) {
      montantDuJour = montantJour * 2;
      joursFeriesBonus += 1;
    }
    montant += montantDuJour;
  }

  return {
    amount: arrondirMontant(montant), unpaidDays: joursNonPayes, unpaidDayCount: joursNonPayes.length,
    paidDayCount: tousLesJours.length - joursNonPayes.length, totalDaysInMonth: tousLesJours.length,
    holidayBonusDays: joursFeriesBonus,
    worked_saturday: workedSaturday, worked_sunday: workedSunday,
    weekend_saturday_days: samedis, weekend_sunday_days: dimanches,
    weekend_saturday_count: samedis.length, weekend_sunday_count: dimanches.length,
    weekend_bonus_amount: arrondirMontant(bonusWeekend),
    date_start: joursNonPayes[0] || null, date_end: joursNonPayes.at(-1) || null,
  };
}
