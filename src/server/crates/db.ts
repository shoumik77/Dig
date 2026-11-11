import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { cratesDbPath } from "./config";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS crate_items (
  crate_id TEXT NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  entity_json TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (crate_id, entity_id)
);
`;

export function openDb(path: string): Database.Database {
  if (path !== ":memory:") {
    const resolved = isAbsolute(path)
      ? path
      : join(/*turbopackIgnore: true*/ process.cwd(), path);
    mkdirSync(dirname(resolved), { recursive: true });
    path = resolved;
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

// Cache on globalThis so Next dev HMR doesn't leak a handle per reload.
const globalForDb = globalThis as unknown as { __digCratesDb?: Database.Database };

export function getDb(): Database.Database {
  globalForDb.__digCratesDb ??= openDb(cratesDbPath);
  return globalForDb.__digCratesDb;
}
