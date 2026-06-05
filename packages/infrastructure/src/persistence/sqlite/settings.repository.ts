import type Database from 'better-sqlite3';
import type { ConfigurationSetting, AiProviderSetting, AiProvider } from '@arweb/domain';
import type { SettingsRepository } from '@arweb/application';
import { nowIso } from '@arweb/common';

// ── Row shapes ───────────────────────────────────────────────────────────────

interface SettingRow {
  key: string; value: string; updated_at: string;
}
interface AiProviderRow {
  id: string; provider: string; label: string; base_url: string | null;
  model: string | null; encrypted_api_key: string | null;
  is_default: number; enabled: number;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  async getAll(): Promise<ConfigurationSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM configuration_settings ORDER BY key')
      .all() as SettingRow[];
    return rows.map(toSetting);
  }

  async get(key: string): Promise<string | null> {
    const row = this.db
      .prepare('SELECT value FROM configuration_settings WHERE key = ?')
      .get(key) as Pick<SettingRow, 'value'> | undefined;
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO configuration_settings (key,value,updated_at) VALUES (?,?,?)',
    ).run(key, value, nowIso());
  }

  async listAiProviders(): Promise<AiProviderSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM ai_provider_settings ORDER BY label')
      .all() as AiProviderRow[];
    return rows.map(toAiProvider);
  }

  async upsertAiProvider(setting: AiProviderSetting): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO ai_provider_settings (id,provider,label,base_url,model,encrypted_api_key,is_default,enabled) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      setting.id, setting.provider, setting.label, setting.baseUrl, setting.model,
      setting.encryptedApiKey, setting.isDefault ? 1 : 0, setting.enabled ? 1 : 0,
    );
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toSetting(r: SettingRow): ConfigurationSetting {
  return { key: r.key, value: r.value, updatedAt: r.updated_at };
}

function toAiProvider(r: AiProviderRow): AiProviderSetting {
  return {
    id: r.id, provider: r.provider as AiProvider, label: r.label,
    baseUrl: r.base_url, model: r.model, encryptedApiKey: r.encrypted_api_key,
    isDefault: r.is_default === 1, enabled: r.enabled === 1,
  };
}
