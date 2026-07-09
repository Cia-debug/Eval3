import { importImagesZip } from '../api/client';
import FormulaireImportFichier from '../components/FormulaireImportFichier';

export default function ImportImagesPage() {
  return (
    <FormulaireImportFichier
      titre="Import images"
      description="Import ZIP images employés (Dolibarr)"
      accept=".zip"
      messageErreurAucunFichier="Choisissez un fichier ZIP."
      messageErreurFallback="Erreur lors de l'import."
      importer={importImagesZip}
    />
  );
}
