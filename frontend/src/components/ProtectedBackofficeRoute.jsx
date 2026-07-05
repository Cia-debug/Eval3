import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useBackofficeAuth } from '../context/BackofficeAuthContext';

export default function ProtectedBackofficeRoute() {
  const { authenticated, loading } = useBackofficeAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-center">
        <p>Vérification de l&apos;accès…</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/backoffice/acces" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
