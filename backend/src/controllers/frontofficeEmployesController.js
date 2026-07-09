import { searchEmployees } from '../services/employeeService.js';
import { getEmployeeSalaryHistory } from '../services/employeeSalaryHistoryService.js';

export async function listerEmployes(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    const employees = await searchEmployees({
      ref_employee: req.query.ref_employee,
      nom: req.query.nom,
      login: req.query.login,
      genre: req.query.genre,
      poste: req.query.poste,
      heure_min: req.query.heure_min,
      heure_max: req.query.heure_max,
    });
    res.json({ total: employees.length, employees });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
}

export async function obtenirHistoriqueSalaire(req, res) {
  try {
    const history = await getEmployeeSalaryHistory(req.params.id);
    if (!history) {
      return res.status(404).json({ error: 'Salarié introuvable' });
    }

    return res.json(history);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}
