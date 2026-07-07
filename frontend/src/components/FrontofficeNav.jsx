import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/frontoffice/salaries/liste', label: 'Liste salariés', match: /^\/frontoffice\/salaries(\/liste|\/\d+)?$/ },
  { to: '/frontoffice/salaries/recherche', label: 'Recherche' },
  { to: '/frontoffice/salaires/nouveau', label: 'Nouveau salaire' },
  { to: '/frontoffice/salaires/generer', label: 'Génération en masse' },
  { to: '/frontoffice/salaires/generer-mois', label: 'Génération mensuelle' },
  { to: '/frontoffice/salaires/paiement-mois', label: 'Paiement en masse' },
];

function isLinkActive(pathname, link) {
  if (link.match) {
    return link.match.test(pathname);
  }

  return pathname === link.to;
}

export default function FrontofficeNav() {
  const location = useLocation();

  return (
    <aside className="sidebar sidebar-frontoffice">
      <div className="sidebar-brand">
        <h1>FrontOffice</h1>
        <p className="sidebar-subtitle">Gestion salaires</p>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={isLinkActive(location.pathname, link) ? 'active' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/" className="sidebar-link-muted">
          Accueil
        </Link>
      </div>
    </aside>
  );
}
