import FormulairePaiementMensuel from '../components/FormulairePaiementMensuel';
import ResultatsPaiementsMasse from '../components/ResultatsPaiementsMasse';
import { usePaiementMensuelMasse } from '../hooks/usePaiementMensuelMasse';

export default function PagePaiementsMensuelsMasse() {
  const paiement = usePaiementMensuelMasse();

  return (
    <div className="page-content page-content--narrow bulk-salary-page">
      <header className="bulk-salary-header">
        <h2>Génération de paiements en masse</h2>
        <p className="muted bulk-salary-subtitle">
          Répartition automatique du budget selon le poste prioritaire et la date de début des salaires.
        </p>
      </header>

      <section className="bulk-salary-block">
        <h3 className="bulk-salary-block-title">Paramètres du paiement</h3>
        <FormulairePaiementMensuel
          form={paiement.form}
          jobOptions={paiement.jobOptions}
          generating={paiement.generating}
          onChange={paiement.handleFormChange}
          onSubmit={paiement.handleGenerate}
        />
      </section>

      {paiement.message ? (
        <p className={paiement.result?.warning ? 'error' : 'success-message'}>{paiement.message}</p>
      ) : null}
      {paiement.error ? <p className="error">{paiement.error}</p> : null}

      <ResultatsPaiementsMasse result={paiement.result} />
    </div>
  );
}
