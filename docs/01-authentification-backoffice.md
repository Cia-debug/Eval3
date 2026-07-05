# Authentification Backoffice

## Fonctionnalité

Code à 8 chiffres → cookie JWT httpOnly → protection routes `/api/backoffice/*`.

## Code — middleware JWT + cookie

`backend/src/middleware/auth.js` :

```javascript
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'newapp_backoffice';

export function createBackofficeToken() {
  return jwt.sign({ role: 'backoffice' }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

export function setBackofficeCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export function requireBackoffice(req, res, next) {
  const token = readBackofficeToken(req);

  if (!token || !verifyBackofficeToken(token)) {
    return res.status(401).json({ error: 'Accès backoffice refusé' });
  }

  next();
}
```

## Code — routes login

`backend/src/routes/auth.js` :

```javascript
router.post('/backoffice/login', (req, res) => {
  const { code } = req.body ?? {};

  if (!code || code !== getBackofficeCode()) {
    return res.status(401).json({ error: 'Code d\'accès incorrect' });
  }

  const token = createBackofficeToken();
  setBackofficeCookie(res, token);

  return res.json({ ok: true });
});
```

## Code — protection routes backoffice

`backend/src/routes/backoffice.js` :

```javascript
router.use(requireBackoffice);
```

## Code — garde côté React

`frontend/src/components/ProtectedBackofficeRoute.jsx` :

```javascript
export default function ProtectedBackofficeRoute() {
  const { authenticated, loading } = useBackofficeAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-center"><p>Vérification de l&apos;accès…</p></div>;
  }

  if (!authenticated) {
    return <Navigate to="/backoffice/acces" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
```

## Code — contexte auth React

`frontend/src/context/BackofficeAuthContext.jsx` :

```javascript
const refresh = useCallback(async () => {
  setLoading(true);
  try {
    const session = await getBackofficeSession();
    setAuthenticated(Boolean(session.authenticated));
  } catch {
    setAuthenticated(false);
  } finally {
    setLoading(false);
  }
}, []);
```

## Code — appel login frontend

`frontend/src/api/client.js` :

```javascript
export function loginBackoffice(code) {
  return apiFetch('/api/auth/backoffice/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/middleware/auth.js` |
| `backend/src/routes/auth.js` |
| `backend/src/routes/backoffice.js` |
| `frontend/src/context/BackofficeAuthContext.jsx` |
| `frontend/src/components/ProtectedBackofficeRoute.jsx` |
| `frontend/src/pages/BackofficeAccessPage.jsx` |
| `frontend/src/api/client.js` |
| `frontend/src/App.jsx` |
