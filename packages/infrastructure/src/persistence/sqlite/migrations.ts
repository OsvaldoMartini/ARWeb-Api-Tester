import type Database from 'better-sqlite3';

/**
 * Schema migrations — idempotent CREATE TABLE IF NOT EXISTS.
 * Called once on every startup; safe to re-run on an existing DB.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    -- ── Catalog ──────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS api_specs (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL,
      version        TEXT NOT NULL,
      source_path    TEXT NOT NULL,
      raw_format     TEXT NOT NULL,
      imported_at    TEXT NOT NULL,
      endpoint_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS api_endpoints (
      id           TEXT PRIMARY KEY,
      spec_id      TEXT NOT NULL REFERENCES api_specs(id) ON DELETE CASCADE,
      operation_id TEXT,
      method       TEXT NOT NULL,
      path         TEXT NOT NULL,
      summary      TEXT,
      description  TEXT,
      tags         TEXT NOT NULL DEFAULT '[]',
      category_id  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ep_method_path ON api_endpoints(method, path);
    CREATE INDEX IF NOT EXISTS idx_ep_spec        ON api_endpoints(spec_id);

    CREATE TABLE IF NOT EXISTS api_parameters (
      id          TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL REFERENCES api_endpoints(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      location    TEXT NOT NULL,
      required    INTEGER NOT NULL DEFAULT 0,
      schema_type TEXT,
      example     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_param_ep ON api_parameters(endpoint_id);

    CREATE TABLE IF NOT EXISTS api_output_fields (
      id          TEXT PRIMARY KEY,
      endpoint_id TEXT NOT NULL REFERENCES api_endpoints(id) ON DELETE CASCADE,
      json_path   TEXT NOT NULL,
      schema_type TEXT,
      description TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_output_ep ON api_output_fields(endpoint_id);

    CREATE TABLE IF NOT EXISTS api_dependencies (
      id                     TEXT PRIMARY KEY,
      endpoint_id            TEXT NOT NULL REFERENCES api_endpoints(id) ON DELETE CASCADE,
      depends_on_endpoint_id TEXT NOT NULL REFERENCES api_endpoints(id),
      reason                 TEXT
    );

    -- ── Banking Taxonomy ─────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS business_categories (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      keywords    TEXT NOT NULL DEFAULT '[]',
      ord         INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS business_subcategories (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      keywords    TEXT NOT NULL DEFAULT '[]',
      ord         INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sub_cat ON business_subcategories(category_id);

    -- ── BotJobs ───────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS bot_jobs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_job_blocks (
      id         TEXT PRIMARY KEY,
      bot_job_id TEXT NOT NULL REFERENCES bot_jobs(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      ord        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_block_job ON bot_job_blocks(bot_job_id);

    CREATE TABLE IF NOT EXISTS bot_job_commands (
      id       TEXT PRIMARY KEY,
      block_id TEXT NOT NULL REFERENCES bot_job_blocks(id) ON DELETE CASCADE,
      ord      INTEGER NOT NULL DEFAULT 0,
      type     TEXT NOT NULL,
      config   TEXT NOT NULL DEFAULT '{}',
      enabled  INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_cmd_block ON bot_job_commands(block_id);

    CREATE TABLE IF NOT EXISTS bot_variables (
      id            TEXT PRIMARY KEY,
      bot_job_id    TEXT NOT NULL REFERENCES bot_jobs(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      initial_value TEXT,
      secret        INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_var_job ON bot_variables(bot_job_id);

    CREATE TABLE IF NOT EXISTS components (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS component_commands (
      id           TEXT PRIMARY KEY,
      component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
      ord          INTEGER NOT NULL DEFAULT 0,
      type         TEXT NOT NULL,
      config       TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_comp_cmd ON component_commands(component_id);

    CREATE TABLE IF NOT EXISTS dataset_definitions (
      id          TEXT PRIMARY KEY,
      bot_job_id  TEXT NOT NULL REFERENCES bot_jobs(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_path TEXT NOT NULL,
      columns     TEXT NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IF NOT EXISTS idx_dataset_job ON dataset_definitions(bot_job_id);

    -- ── Execution History ────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS execution_runs (
      id           TEXT PRIMARY KEY,
      bot_job_id   TEXT NOT NULL REFERENCES bot_jobs(id),
      started_at   TEXT NOT NULL,
      finished_at  TEXT,
      status       TEXT NOT NULL,
      target       TEXT NOT NULL,
      total_steps  INTEGER NOT NULL DEFAULT 0,
      passed_steps INTEGER NOT NULL DEFAULT 0,
      failed_steps INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_run_job ON execution_runs(bot_job_id);

    CREATE TABLE IF NOT EXISTS execution_step_results (
      id                TEXT PRIMARY KEY,
      run_id            TEXT NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
      step_id           TEXT NOT NULL,
      command_type      TEXT NOT NULL,
      status            TEXT NOT NULL,
      request           TEXT,
      response          TEXT,
      duration_ms       INTEGER NOT NULL DEFAULT 0,
      error_message     TEXT,
      assertion_results TEXT NOT NULL DEFAULT '[]',
      created_at        TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_step_run ON execution_step_results(run_id);

    -- ── Settings ─────────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS configuration_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_provider_settings (
      id                TEXT PRIMARY KEY,
      provider          TEXT NOT NULL,
      label             TEXT NOT NULL,
      base_url          TEXT,
      model             TEXT,
      encrypted_api_key TEXT,
      is_default        INTEGER NOT NULL DEFAULT 0,
      enabled           INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      mode       TEXT NOT NULL,
      template   TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
