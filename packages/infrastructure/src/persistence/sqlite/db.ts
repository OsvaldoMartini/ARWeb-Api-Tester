import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Open (or create) the SQLite database, apply migrations, and return the
 * synchronous connection. Called once at sidecar startup.
 */
export function openDatabase(dbPath: string): Database.Database {
  const abs = resolve(dbPath);
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(abs);
  // WAL mode: readers never block writers; critical for the React UI polling
  // while the engine is running a BotJob.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}
