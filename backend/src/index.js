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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'newapp-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/backoffice', backofficeRoutes);
app.use('/api/frontoffice', frontofficeRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

try {
  await initSqliteDb();
  app.listen(port, () => {
    console.log(`NewApp backend: http://localhost:${port}`);
  });
} catch (error) {
  console.error('Erreur initialisation SQLite:', error);
  process.exit(1);
}
