import type Database from 'better-sqlite3';
import type { Environment } from '@arweb/domain';
import { nowIso } from '@arweb/common';

interface EnvRow {
  id: string;
  name: string;
  base_url: string;
  description: string | null;
  headers: string;
  is_default: number;
  is_built_in: number;
  created_at: string;
  updated_at: string;
}

function toEnv(row: EnvRow): Environment {
  return {
    id:          row.id,
    name:        row.name,
    baseUrl:     row.base_url,
    description: row.description,
    headers:     JSON.parse(row.headers) as Record<string, string>,
    isDefault:   row.is_default === 1,
    isBuiltIn:   row.is_built_in === 1,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export class SqliteEnvironmentRepository {
  constructor(private readonly db: Database.Database) {}

  list(): Environment[] {
    const rows = this.db
      .prepare<[], EnvRow>('SELECT * FROM environments ORDER BY is_built_in DESC, name ASC')
      .all();
    return rows.map(toEnv);
  }

  getById(id: string): Environment | null {
    const row = this.db
      .prepare<[string], EnvRow>('SELECT * FROM environments WHERE id = ?')
      .get(id);
    return row ? toEnv(row) : null;
  }

  upsert(env: Environment): void {
    const now = nowIso();
    this.db.prepare<[string, string, string, string | null, string, number, number, string, string]>(`
      INSERT INTO environments (id, name, base_url, description, headers, is_default, is_built_in, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name       = excluded.name,
        base_url   = excluded.base_url,
        description= excluded.description,
        headers    = excluded.headers,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at
    `).run(
      env.id,
      env.name,
      env.baseUrl,
      env.description ?? null,
      JSON.stringify(env.headers ?? {}),
      env.isDefault ? 1 : 0,
      env.isBuiltIn ? 1 : 0,
      env.createdAt || now,
      now,
    );

    if (env.isDefault) {
      this.db
        .prepare('UPDATE environments SET is_default = 0 WHERE id != ?')
        .run(env.id);
    }
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM environments WHERE id = ? AND is_built_in = 0').run(id);
  }

  /** Returns the URL for the given environment id, or null if not found. */
  resolveBaseUrl(id: string): string | null {
    const row = this.db
      .prepare<[string], { base_url: string }>('SELECT base_url FROM environments WHERE id = ?')
      .get(id);
    return row?.base_url ?? null;
  }
}
