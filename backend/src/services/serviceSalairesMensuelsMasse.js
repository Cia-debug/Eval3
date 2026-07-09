import { listHolidaysInMonth } from './holidayService.js';

import { calculerMontantSalaireMensuel, joursPayesDuMois } from './calculateurSalaireMensuel.js';

import {

  chargerSalairesParEmploye, construirePayloadSalaire, creerEnregistrementSalaire, erreurValidation,

  executerMasseEmployes, parserMoisAnnee, parserMontant, prochainesRefsSalaire, resoudreEmployes,

  resultatMasse, verifierRefUnique,

} from './utilitairesSalaire.js';



const parserEntreeMensuelle = (body) => {

  const parse = parserMoisAnnee(body);

  const salaryPerDay = parserMontant(body.salary_per_day);

  if (salaryPerDay == null || salaryPerDay <= 0) parse.errors.push('Salaire par jour invalide');

  return { ...parse, salaryPerDay };

};



const optionsWeekendDepuisParse = (parse) => ({

  workedSaturday: parse.workedSaturday ?? false,

  workedSunday: parse.workedSunday ?? false,

});



const previsualiserCalcul = (salairesEmploye, year, month, salaryPerDay, holidayDates, optionsWeekend) =>

  calculerMontantSalaireMensuel({

    year, month, salaryPerDay, holidayDates,

    paidDays: joursPayesDuMois(salairesEmploye, year, month), ...optionsWeekend,

  });



const mapperSalaireCree = (calcul, employee, salaryId, ref, holidays) => ({

  salary_id: String(salaryId), ref, employee, amount: calcul.amount,

  date_start: calcul.date_start, date_end: calcul.date_end,

  unpaid_day_count: calcul.unpaidDayCount, paid_day_count: calcul.paidDayCount,

  holiday_bonus_days: calcul.holidayBonusDays,

  holidays: holidays.filter((h) => calcul.unpaidDays.includes(h.date)),

  worked_saturday: calcul.worked_saturday,

  worked_sunday: calcul.worked_sunday,

  weekend_saturday_count: calcul.weekend_saturday_count,

  weekend_sunday_count: calcul.weekend_sunday_count,

  weekend_bonus_amount: calcul.weekend_bonus_amount,

  weekend_saturday_days: calcul.weekend_saturday_days,

  weekend_sunday_days: calcul.weekend_sunday_days,

});



async function genererSalairesMensuelsCoeur(body) {

  const parse = parserEntreeMensuelle(body);

  if (parse.errors.length) return erreurValidation(parse.errors);

  const employees = await resoudreEmployes(body);

  if (!employees.length) return erreurValidation(['Aucun employé sélectionné']);



  const holidays = listHolidaysInMonth(parse.year, parse.month);

  const holidayDates = holidays.map((h) => h.date);

  const salairesParEmploye = await chargerSalairesParEmploye();

  const refs = await prochainesRefsSalaire(employees.length);

  const optionsWeekend = optionsWeekendDepuisParse(parse);



  const { created, skipped, failed } = await executerMasseEmployes(employees, refs, async (employee, ref) => {

    const calcul = previsualiserCalcul(

      salairesParEmploye.get(employee.id) || [], parse.year, parse.month, parse.salaryPerDay, holidayDates, optionsWeekend,

    );

    if (!calcul.unpaidDayCount) {

      return { skip: { employee, reason: 'Tous les jours du mois sont déjà rémunérés', calculation: calcul } };

    }

    await verifierRefUnique(ref);

    const salaryId = await creerEnregistrementSalaire(construirePayloadSalaire({

      ref, employeeId: employee.id, label: `Salaire ${parse.month}/${parse.year} - ${employee.lastname}`,

      amount: calcul.amount, dateStart: calcul.date_start, dateEnd: calcul.date_end,

    }));

    return mapperSalaireCree(calcul, employee, salaryId, ref, holidays);

  });



  return resultatMasse({

    total: employees.length, created, skipped, failed,

    month: parse.month, year: parse.year, salary_per_day: parse.salaryPerDay, holidays_in_month: holidays,

    worked_saturday: optionsWeekend.workedSaturday,

    worked_sunday: optionsWeekend.workedSunday,

  });

}



export const genererSalairesMensuelsEnMasse = (body) => genererSalairesMensuelsCoeur(body);



export async function previsualiserSalairesMensuelsEnMasse(body) {

  const parse = parserEntreeMensuelle(body);

  if (parse.errors.length) return erreurValidation(parse.errors);

  const employees = await resoudreEmployes(body);

  const holidays = listHolidaysInMonth(parse.year, parse.month);

  const holidayDates = holidays.map((h) => h.date);

  const parEmploye = await chargerSalairesParEmploye();

  const optionsWeekend = optionsWeekendDepuisParse(parse);

  return {

    ok: true, month: parse.month, year: parse.year, salary_per_day: parse.salaryPerDay, holidays_in_month: holidays,

    worked_saturday: optionsWeekend.workedSaturday,

    worked_sunday: optionsWeekend.workedSunday,

    previews: employees.map((employee) => {

      const calcul = previsualiserCalcul(

        parEmploye.get(employee.id) || [], parse.year, parse.month, parse.salaryPerDay, holidayDates, optionsWeekend,

      );

      return { employee, ...calcul, can_generate: calcul.unpaidDayCount > 0 };

    }),

  };

}

