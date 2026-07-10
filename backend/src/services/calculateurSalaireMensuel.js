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

const MULTIPLICATEUR_FERIE = 2;
const MULTIPLICATEUR_WEEKEND = 3;

const estJourRemunerable = (jour, workedSaturday, workedSunday) => {
  const type = typeJourWeekend(jour);
  if (type === 'saturday') return workedSaturday;
  if (type === 'sunday') return workedSunday;
  return true;
};

const obtenirMultiplicateur = (jour, type, feries) => {
  const ferie = feries.has(jour);
  if (type === 'saturday' || type === 'sunday') {
    return ferie
      ? Math.max(MULTIPLICATEUR_FERIE, MULTIPLICATEUR_WEEKEND)
      : MULTIPLICATEUR_WEEKEND;
  }
  return ferie ? MULTIPLICATEUR_FERIE : 1;
};

export function calculerMontantSalaireMensuel({
  year, month, salaryPerDay, holidayDates = [], paidDays = new Set(),
  workedSaturday = false, workedSunday = false,
}) {
  const feries = new Set(holidayDates);
  const tousLesJours = chaqueJourDuMois(year, month);
  const joursNonPayesCalendaires = tousLesJours.filter((j) => !paidDays.has(j));
  const joursRemunerables = tousLesJours.filter((j) => estJourRemunerable(j, workedSaturday, workedSunday));
  const joursARemunere = joursNonPayesCalendaires.filter((j) => estJourRemunerable(j, workedSaturday, workedSunday));

  let montant = 0, joursFeriesBonus = 0, bonusWeekend = 0;
  const samedis = [], dimanches = [];

  for (const jour of joursARemunere) {
    const type = typeJourWeekend(jour);
    const multiplicateur = obtenirMultiplicateur(jour, type, feries);
    const montantDuJour = salaryPerDay * multiplicateur;
    montant += montantDuJour;

    if (type === 'saturday') {
      samedis.push(jour);
      bonusWeekend += salaryPerDay * (multiplicateur - 1);
    } else if (type === 'sunday') {
      dimanches.push(jour);
      bonusWeekend += salaryPerDay * (multiplicateur - 1);
    }

    if (feries.has(jour) && multiplicateur === MULTIPLICATEUR_FERIE) {
      joursFeriesBonus += 1;
    }
  }

  const joursRemunerablesDejaPayes = joursRemunerables.filter((j) => paidDays.has(j)).length;

  return {
    amount: arrondirMontant(montant),
    unpaidDays: joursARemunere,
    unpaidDayCount: joursARemunere.length,
    paidDayCount: joursRemunerablesDejaPayes,
    totalDaysInMonth: joursRemunerables.length,
    holidayBonusDays: joursFeriesBonus,
    worked_saturday: workedSaturday,
    worked_sunday: workedSunday,
    weekend_saturday_days: samedis,
    weekend_sunday_days: dimanches,
    weekend_saturday_count: samedis.length,
    weekend_sunday_count: dimanches.length,
    weekend_bonus_amount: arrondirMontant(bonusWeekend),
    date_start: joursARemunere[0] || null,
    date_end: joursARemunere.at(-1) || null,
  };
}
