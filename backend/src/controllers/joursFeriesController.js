import {
  createHoliday,
  deleteHoliday,
  getHolidayById,
  listHolidays,
  updateHoliday,
} from '../services/holidayService.js';

export function listerJoursFeries(_req, res) {
  try {
    const holidays = listHolidays();
    res.json({
      total: holidays.length,
      holidays,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export function obtenirJourFerie(req, res) {
  try {
    const holiday = getHolidayById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ error: 'Jour férié introuvable' });
    }

    return res.json(holiday);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export function creerJourFerie(req, res) {
  try {
    const result = createHoliday(req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json(result.holiday);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export function modifierJourFerie(req, res) {
  try {
    const result = updateHoliday(req.params.id, req.body ?? {});
    if (!result.ok) {
      const status = result.errors[0] === 'Jour férié introuvable' ? 404 : 400;
      return res.status(status).json({ error: result.errors.join(' ; ') });
    }

    return res.json(result.holiday);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export function supprimerJourFerie(req, res) {
  try {
    const result = deleteHoliday(req.params.id);
    if (!result.ok) {
      return res.status(404).json({ error: result.errors.join(' ; ') });
    }

    return res.json({ ok: true, deleted: result.deleted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
