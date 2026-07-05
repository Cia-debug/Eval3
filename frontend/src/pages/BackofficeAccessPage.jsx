import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getBackofficeConfig, loginBackoffice } from '../api/client';
import { useBackofficeAuth } from '../context/BackofficeAuthContext';

export default function BackofficeAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated, refresh } = useBackofficeAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getBackofficeConfig()
      .then((config) => setCode(config.defaultCode || ''))
      .catch(() => setCode(''));
  }, []);

  if (authenticated) {
    const redirectTo = location.state?.from || '/backoffice';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await loginBackoffice(code.trim());
      await refresh();
      navigate(location.state?.from || '/backoffice', { replace: true });
    } catch (err) {
      setError(err.message || 'Code incorrect');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-center">
      <form className="card access-card" onSubmit={handleSubmit}>
        <h1>Backoffice NewApp</h1>
        <p className="muted">Entrez le code d&apos;accès unique.</p>

        <label htmlFor="access-code">Code d&apos;accès</label>
        <input
          id="access-code"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          required
        />

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Vérification…' : 'Accéder au backoffice'}
        </button>
      </form>
    </div>
  );
}
