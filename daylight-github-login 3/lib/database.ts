import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

type Params = string | number | null;
let database: DatabaseSync | null = null;

export function getDatabase() {
  if (database) return database;
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  database = new DatabaseSync(path.join(dataDir, "daylight.db"));
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_date_order_idx ON tasks(date, position);
  `);
  return database;
}

export function run(sql: string, ...params: Params[]) { return getDatabase().prepare(sql).run(...params); }
export function all<T>(sql: string, ...params: Params[]) { return getDatabase().prepare(sql).all(...params) as T[]; }
