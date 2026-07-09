import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import BackofficeLayout from './components/BackofficeLayout';
import FrontofficeLayout from './components/FrontofficeLayout';
import ProtectedBackofficeRoute from './components/ProtectedBackofficeRoute';
import { BackofficeAuthProvider } from './context/BackofficeAuthContext';
import BackofficeAccessPage from './pages/BackofficeAccessPage';
import BackofficeDashboardPage from './pages/BackofficeDashboardPage';
import EmployeeListPage from './pages/EmployeeListPage';
import EmployeeSimpleListPage from './pages/EmployeeSimpleListPage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import HomePage from './pages/HomePage';
import ResetDataPage from './pages/ResetDataPage';
import ImportEmployeesPage from './pages/ImportEmployeesPage';
import ImportSalariesPage from './pages/ImportSalariesPage';
import ImportImagesPage from './pages/ImportImagesPage';
import HolidaysPage from './pages/HolidaysPage';
import PageCreationSalaire from './pages/PageCreationSalaire';
import PageSalairesMasse from './pages/PageSalairesMasse';
import PageGenerationSalairesMensuels from './pages/PageGenerationSalairesMensuels';
import PagePaiementsMensuelsMasse from './pages/PagePaiementsMensuelsMasse';

export default function App() {
  return (
    <BackofficeAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/backoffice/acces" element={<BackofficeAccessPage />} />

          <Route element={<FrontofficeLayout />}>
            <Route path="/frontoffice/salaries/liste" element={<EmployeeSimpleListPage />} />
            <Route path="/frontoffice/salaries/recherche" element={<EmployeeListPage />} />
            <Route path="/frontoffice/salaries/:id" element={<EmployeeDetailPage />} />
            <Route path="/frontoffice/salaries" element={<Navigate to="/frontoffice/salaries/liste" replace />} />
            <Route path="/frontoffice/salaires/nouveau" element={<PageCreationSalaire />} />
            <Route path="/frontoffice/salaires/generer" element={<PageSalairesMasse />} />
            <Route path="/frontoffice/salaires/generer-mois" element={<PageGenerationSalairesMensuels />} />
            <Route path="/frontoffice/salaires/paiement-mois" element={<PagePaiementsMensuelsMasse />} />
          </Route>

          <Route element={<ProtectedBackofficeRoute />}>
            <Route element={<BackofficeLayout />}>
              <Route path="/backoffice" element={<BackofficeDashboardPage />} />
              <Route path="/backoffice/reinitialisation" element={<ResetDataPage />} />
              <Route path="/backoffice/import-employes" element={<ImportEmployeesPage />} />
              <Route path="/backoffice/import-salaires" element={<ImportSalariesPage />} />
              <Route path="/backoffice/import-images" element={<ImportImagesPage />} />
              <Route path="/backoffice/jours-feries" element={<HolidaysPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </BackofficeAuthProvider>
  );
}
