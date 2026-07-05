# Layout Sidebar (FrontOffice + BackOffice)

## Fonctionnalité

Navbar horizontale remplacée par sidebar fixe + contenu pleine largeur.

## Code — layout backoffice

`frontend/src/components/BackofficeLayout.jsx` :

```javascript
import { Outlet } from 'react-router-dom';
import BackofficeNav from './BackofficeNav';

export default function BackofficeLayout() {
  return (
    <div className="app-shell">
      <BackofficeNav />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
```

## Code — sidebar navigation

`frontend/src/components/BackofficeNav.jsx` :

```javascript
const links = [
  { to: '/backoffice', label: 'Tableau de bord' },
  { to: '/backoffice/import-employes', label: 'Import employés' },
  { to: '/backoffice/import-salaires', label: 'Import salaires' },
  { to: '/backoffice/import-images', label: 'Import images' },
  { to: '/backoffice/jours-feries', label: 'Jours fériés' },
  { to: '/backoffice/reinitialisation', label: 'Réinitialisation' },
];

return (
  <aside className="sidebar">
    <nav className="sidebar-nav">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={isLinkActive(...) ? 'active' : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  </aside>
);
```

## Code — routes imbriquées

`frontend/src/App.jsx` :

```javascript
<Route element={<ProtectedBackofficeRoute />}>
  <Route element={<BackofficeLayout />}>
    <Route path="/backoffice" element={<BackofficeDashboardPage />} />
    <Route path="/backoffice/import-employes" element={<ImportEmployeesPage />} />
    {/* ... */}
  </Route>
</Route>

<Route element={<FrontofficeLayout />}>
  <Route path="/frontoffice/salaries/liste" element={<EmployeeSimpleListPage />} />
  {/* ... */}
</Route>
```

## Code — CSS shell

`frontend/src/styles.css` :

```css
.app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.app-main {
  flex: 1;
  min-width: 0;
  background: #f3f4f6;
}

.page-content {
  width: 100%;
  min-height: 100vh;
  padding: 2rem;
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #111827;
  color: #f9fafb;
  min-height: 100vh;
}
```

## Fichiers touchés

| Fichier |
|---------|
| `frontend/src/components/BackofficeLayout.jsx` |
| `frontend/src/components/FrontofficeLayout.jsx` |
| `frontend/src/components/BackofficeNav.jsx` |
| `frontend/src/components/FrontofficeNav.jsx` |
| `frontend/src/App.jsx` |
| `frontend/src/styles.css` |
| Toutes les pages (`page-content` au lieu de `page` + `card`) |
