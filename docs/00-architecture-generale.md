# Architecture générale NewApp ↔ Dolibarr

## Principe

Le frontend React appelle le backend Node.js. Le backend parle à Dolibarr via l’**API REST** et parfois **MySQL direct**.

## Code — point d’entrée backend

`backend/src/index.js` :

```javascript
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.js';
import backofficeRoutes from './routes/backoffice.js';
import frontofficeRoutes from './routes/frontoffice.js';
import { initSqliteDb } from './db/sqlite.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/backoffice', backofficeRoutes);
app.use('/api/frontoffice', frontofficeRoutes);

await initSqliteDb();
app.listen(port, () => {
  console.log(`NewApp backend: http://localhost:${port}`);
});
```

## Code — client HTTP frontend

`frontend/src/api/client.js` :

```javascript
const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur API');
    error.status = response.status;
    throw error;
  }

  return data;
}
```

## Configuration `.env`

```env
DOLIBARR_API_URL=http://localhost/dolibarr/htdocs/api/index.php
DOLIBARR_API_KEY=...
MYSQL_DATABASE=dolibarr
BACKOFFICE_ACCESS_CODE=12345678
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Fichiers touchés

| Fichier | Rôle |
|---------|------|
| `backend/src/index.js` | Serveur Express |
| `frontend/src/api/client.js` | Appels API |
| `frontend/src/App.jsx` | Routes React |
| `backend/.env` | Configuration |
