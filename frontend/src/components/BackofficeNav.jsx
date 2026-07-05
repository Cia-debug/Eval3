import { Link, useLocation } from 'react-router-dom';
import { useBackofficeAuth } from '../context/BackofficeAuthContext';

const links = [
  { to: '/backoffice', label: 'Tableau de bord' },
  { to: '/backoffice/import-employes', label: 'Import employés' },
  { to: '/backoffice/import-salaires', label: 'Import salaires' },
  { to: '/backoffice/import-images', label: 'Import images' },
  { to: '/backoffice/jours-feries', label: 'Jours fériés' },
  { to: '/backoffice/reinitialisation', label: 'Réinitialisation' },
];

function isLinkActive(pathname, linkTo) {
  if (linkTo === '/backoffice') {
    return pathname === linkTo;
  }

  return pathname === linkTo || pathname.startsWith(`${linkTo}/`);
}

export default function BackofficeNav() {
  const { logout } = useBackofficeAuth();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Backoffice</h1>
        <p className="sidebar-subtitle">NewApp</p>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={isLinkActive(location.pathname, link.to) ? 'active' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/" className="sidebar-link-muted">
          Accueil
        </Link>
        <button type="button" className="sidebar-logout" onClick={logout}>
          Quitter
        </button>
      </div>
    </aside>
  );
}
