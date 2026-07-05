import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, '../../data/newapp.sqlite');

let db;
let initPromise;

function getDbPath() {
  const configured = process.env.SQLITE_PATH?.trim();
  return configured ? path.resolve(configured) : defaultDbPath;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS jours_feries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      libelle TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function persistSqliteDb() {
  if (!db) {
    return;
  }

  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

export async function initSqliteDb() {
  if (db) {
    return db;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const SQL = await initSqlJs();
      const dbPath = getDbPath();
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });

      if (fs.existsSync(dbPath)) {
        db = new SQL.Database(fs.readFileSync(dbPath));
      } else {
        db = new SQL.Database();
      }

      initSchema();
      persistSqliteDb();
      return db;
    })();
  }

  return initPromise;
}

export function getSqliteDb() {
  if (!db) {
    throw new Error('Base SQLite non initialisée');
  }

  return db;
}

export function sqliteAll(sql, params = []) {
  const statement = getSqliteDb().prepare(sql);
  if (params.length > 0) {
    statement.bind(params);
  }

  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }

  statement.free();
  return rows;
}

export function sqliteGet(sql, params = []) {
  const rows = sqliteAll(sql, params);
  return rows[0] || null;
}

export function sqliteRun(sql, params = []) {
  getSqliteDb().run(sql, params);
  const lastId = sqliteGet('SELECT last_insert_rowid() AS id')?.id ?? null;
  persistSqliteDb();
  return lastId;
}

export function sqliteLastInsertId() {
  return sqliteGet('SELECT last_insert_rowid() AS id')?.id ?? null;
}
