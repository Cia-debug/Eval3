import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="page-center">
      <div className="card">
        <h1>NewApp</h1>
        <p className="muted">Application connectée à Dolibarr.</p>
        <div className="home-links">
          <Link className="button-link" to="/frontoffice/salaries/liste">
            Ouvrir le frontoffice
          </Link>
          <Link className="button-link btn-secondary-link" to="/backoffice">
            Ouvrir le backoffice
          </Link>
        </div>
      </div>
    </div>
  );
}
