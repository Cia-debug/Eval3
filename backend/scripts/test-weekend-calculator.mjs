import {
  calculerMontantSalaireMensuel,
  chaqueJourDuMois,
  estSamedi,
  estDimanche,
  obtenirTypeJourWeekend,
} from '../src/services/calculateurSalaireMensuel.js';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`OK ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

assert('2026-03-07 est samedi', estSamedi('2026-03-07'));
assert('2026-03-08 est dimanche', estDimanche('2026-03-08'));
assert('2026-03-09 est ni sam ni dim', obtenirTypeJourWeekend('2026-03-09') === null);
assert('date invalide est null', obtenirTypeJourWeekend('pas-une-date') === null);

const mars2026 = calculerMontantSalaireMensuel({
  year: 2026,
  month: 3,
  salaryPerDay: 10,
  holidayDates: [],
  paidDays: new Set(),
  workedSaturday: true,
  workedSunday: false,
});

assert('mars 2026 a des samedis bonus', mars2026.weekend_saturday_count > 0);
assert('mars 2026 dimanche bonus desactive', mars2026.weekend_sunday_count === 0);
assert('bonus weekend positif', mars2026.weekend_bonus_amount > 0);

const joursMars2026 = chaqueJourDuMois(2026, 3);
const seulementSamedi = new Set(joursMars2026.filter((jour) => jour !== '2026-03-07'));

const samediNormal = calculerMontantSalaireMensuel({
  year: 2026,
  month: 3,
  salaryPerDay: 10,
  holidayDates: [],
  paidDays: seulementSamedi,
  workedSaturday: false,
  workedSunday: false,
});
assert('samedi non coché = jour normal (10)', samediNormal.amount === 10);

const samediTriple = calculerMontantSalaireMensuel({
  year: 2026,
  month: 3,
  salaryPerDay: 10,
  holidayDates: [],
  paidDays: seulementSamedi,
  workedSaturday: true,
  workedSunday: false,
});
assert('samedi coché = ×3 (30)', samediTriple.amount === 30);

const samediFerie = calculerMontantSalaireMensuel({
  year: 2026,
  month: 3,
  salaryPerDay: 10,
  holidayDates: ['2026-03-07'],
  paidDays: seulementSamedi,
  workedSaturday: true,
  workedSunday: false,
});
assert('samedi coché + férié = 10*3*2', samediFerie.amount === 60);

const seulementLundi = new Set(joursMars2026.filter((jour) => jour !== '2026-03-09'));
const lundiFerie = calculerMontantSalaireMensuel({
  year: 2026,
  month: 3,
  salaryPerDay: 10,
  holidayDates: ['2026-03-09'],
  paidDays: seulementLundi,
  workedSaturday: false,
  workedSunday: false,
});
assert('lundi férié = 10*2', lundiFerie.amount === 20);

console.log(`\n${passed} passed, ${failed} failed`);
