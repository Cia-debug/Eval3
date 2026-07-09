import { importEmployeesCsv } from '../api/client';
import FormulaireImportFichier from '../components/FormulaireImportFichier';

export default function ImportEmployeesPage() {
  return (
    <FormulaireImportFichier
      titre="Import employés"
      description={(
        <>
          Colonnes attendues : ref_employe, nom, genre, identifiant, mdp, <strong>heure_travai</strong>, poste
        </>
      )}
      accept=".csv"
      messageErreurAucunFichier="Choisissez un fichier CSV."
      messageErreurFallback="Erreur lors de l'import."
      importer={importEmployeesCsv}
      buildSuccessMessage={(result) => {
        const parts = [result.message || 'Import terminé.'];
        if (result.weeklyhoursWarning) {
          parts.push(result.weeklyhoursWarning);
        }
        return parts.join(' ');
      }}
    />
  );
}
