# Documentation NewApp — Index

Chaque fichier contient le **code réel** écrit pour la fonctionnalité (extraits backend + frontend).

| Fichier | Fonctionnalité |
|---------|----------------|
| [00-architecture-generale.md](./00-architecture-generale.md) | Serveur Express + client fetch |
| [01-authentification-backoffice.md](./01-authentification-backoffice.md) | JWT, cookie, routes protégées |
| [02-client-dolibarr-api.md](./02-client-dolibarr-api.md) | `DolibarrClient` + DOLAPIKEY |
| [03-layout-sidebar.md](./03-layout-sidebar.md) | Layouts, sidebar, CSS |
| [04-dashboard-backoffice.md](./04-dashboard-backoffice.md) | SQL stats + charts React |
| [05-import-employes-csv.md](./05-import-employes-csv.md) | Import CSV employés |
| [06-import-salaires-csv.md](./06-import-salaires-csv.md) | Import CSV salaires |
| [07-import-images-zip.md](./07-import-images-zip.md) | Import ZIP photos |
| [08-reinitialisation-dolibarr.md](./08-reinitialisation-dolibarr.md) | Reset MySQL Dolibarr |
| [09-jours-feries-sqlite.md](./09-jours-feries-sqlite.md) | CRUD SQLite |
| [10-frontoffice-liste-salaries.md](./10-frontoffice-liste-salaries.md) | Liste employés |
| [11-frontoffice-recherche-salaries.md](./11-frontoffice-recherche-salaries.md) | Recherche filtres |
| [12-frontoffice-fiche-salarie.md](./12-frontoffice-fiche-salarie.md) | Historique salaires |
| [13-frontoffice-creation-salaire.md](./13-frontoffice-creation-salaire.md) | Créer + payer |
| [14-frontoffice-generation-salaires-masse.md](./14-frontoffice-generation-salaires-masse.md) | Bulk salaires |
| [15-tables-bases-de-donnees.md](./15-tables-bases-de-donnees.md) | Tables SQLite + MySQL utilisées |

## Lancer le projet

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```
