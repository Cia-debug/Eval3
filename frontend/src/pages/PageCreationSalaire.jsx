import { Link } from 'react-router-dom';
import FormulaireCreationSalaire from '../components/FormulaireCreationSalaire';
import SectionPaiementSalaire from '../components/SectionPaiementSalaire';
import { useCreationEtPaiementSalaire } from '../hooks/useCreationEtPaiementSalaire';

export default function PageCreationSalaire() {
  const salaire = useCreationEtPaiementSalaire();

  return (
    <div className="page-content">
      <div className="page-header">
        <h2>Créer et payer un salaire</h2>
        <Link className="button-link inline-button" to="/frontoffice/salaries/liste">
          Retour salariés
        </Link>
      </div>

      {salaire.loadingEmployees ? <p>Chargement des employés…</p> : null}

      <FormulaireCreationSalaire
        form={salaire.form}
        employees={salaire.employees}
        loadingEmployees={salaire.loadingEmployees}
        creating={salaire.creating}
        onChange={salaire.handleFormChange}
        onSubmit={salaire.handleCreateSalary}
      />

      <SectionPaiementSalaire
        employeeId={salaire.form.employee_id}
        loadingSalaries={salaire.loadingSalaries}
        unpaidSalaries={salaire.unpaidSalaries}
        selectedSalaryId={salaire.selectedSalaryId}
        selectedSalary={salaire.selectedSalary}
        payments={salaire.payments}
        paymentsTotal={salaire.paymentsTotal}
        paying={salaire.paying}
        onSubmit={salaire.handlePaySalary}
        onSelectSalary={salaire.setSelectedSalaryId}
        onAddPaymentRow={salaire.addPaymentRow}
        onRemovePaymentRow={salaire.removePaymentRow}
        onPaymentChange={salaire.handlePaymentChange}
      />

      {salaire.message ? <p className="success-message">{salaire.message}</p> : null}
      {salaire.error ? <p className="error">{salaire.error}</p> : null}
    </div>
  );
}
