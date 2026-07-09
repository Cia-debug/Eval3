import { creerSalaireSeul, genererSalairesEnMasse, payerSalaire } from '../services/serviceSalaire.js';
import { genererSalairesMensuelsEnMasse } from '../services/serviceSalairesMensuelsMasse.js';
import { genererPaiementsMensuelsEnMasse } from '../services/servicePaiementsMensuelsMasse.js';

function messageGenerationMensuelle(result) {
  const parts = [`${result.created} salaire(s) généré(s) sur ${result.total}`];
  if (result.skipped > 0) {
    parts.push(`${result.skipped} ignoré(s) (mois déjà couvert)`);
  }
  return parts.join(' — ');
}

async function repondreGenerationMensuelle(req, res, serviceFn) {
  try {
    const result = await serviceFn(req.body ?? {});
    if (result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json({
      ok: result.ok,
      message: messageGenerationMensuelle(result),
      ...result,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}

export async function genererSalairesMasse(req, res) {
  try {
    const result = await genererSalairesEnMasse(req.body ?? {});
    if (!result.total && result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json({
      ok: result.ok,
      message: `${result.created} salaire(s) généré(s) sur ${result.total}`,
      ...result,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}

export async function genererSalairesMensuelsMasse(req, res) {
  return repondreGenerationMensuelle(req, res, genererSalairesMensuelsEnMasse);
}

export async function genererPaiementsMensuelsMasse(req, res) {
  try {
    const result = await genererPaiementsMensuelsEnMasse(req.body ?? {});
    if (result.errors) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json({
      ok: result.ok,
      message: result.warning
        || `${result.created} paiement(s) généré(s) — total payé ${result.total_paid} €`
        + (result.budget_remaining > 0 ? ` — budget non utilisé ${result.budget_remaining} €` : ''),
      ...result,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}

export async function creerSalaire(req, res) {
  try {
    const result = await creerSalaireSeul(req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json({
      ok: true,
      message: 'Salaire créé',
      ...result,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}

export async function payerSalaireEmploye(req, res) {
  try {
    const result = await payerSalaire(req.params.id, req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ error: result.errors.join(' ; ') });
    }

    return res.status(201).json({
      ok: true,
      message: `${result.payments.length} paiement(s) enregistré(s)`,
      ...result,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
}
