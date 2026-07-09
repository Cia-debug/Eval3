import { importSalariesCsv } from '../api/client';
import FormulaireImportFichier from '../components/FormulaireImportFichier';

export default function ImportSalariesPage() {
  return (
    <FormulaireImportFichier
      titre="Import salaires"
      description="Import CSV salaires employés (Dolibarr)"
      accept=".csv"
      messageErreurAucunFichier="Choisissez un fichier CSV."
      messageErreurFallback="Erreur lors de l'import."
      importer={importSalariesCsv}
    />
  );
}
