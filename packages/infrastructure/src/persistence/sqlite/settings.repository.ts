import type Database from 'better-sqlite3';
import type { ConfigurationSetting, AiProviderSetting, AiProvider } from '@arweb/domain';
import type { SettingsRepository } from '@arweb/application';
import { nowIso } from '@arweb/common';
import type { CryptoService } from '../../crypto/crypto-service.js';

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
  constructor(
    private readonly db: Database.Database,
    private readonly crypto?: CryptoService,
  ) {}

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
    return rows.map((r) => this.toAiProvider(r));
  }

  async upsertAiProvider(setting: AiProviderSetting): Promise<void> {
    const keyToStore = setting.encryptedApiKey && this.crypto
      ? this.crypto.encrypt(setting.encryptedApiKey)
      : setting.encryptedApiKey;

    this.db.prepare(
      'INSERT OR REPLACE INTO ai_provider_settings (id,provider,label,base_url,model,encrypted_api_key,is_default,enabled) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      setting.id, setting.provider, setting.label, setting.baseUrl, setting.model,
      keyToStore, setting.isDefault ? 1 : 0, setting.enabled ? 1 : 0,
    );
    // Enforce exclusive default: clear other rows when this one is the default.
    if (setting.isDefault) {
      this.db.prepare(
        'UPDATE ai_provider_settings SET is_default = 0 WHERE id != ?',
      ).run(setting.id);
    }
  }

  /** Atomically make one provider the default and clear all others. */
  setAsDefault(id: string): void {
    const update = this.db.transaction(() => {
      this.db.prepare('UPDATE ai_provider_settings SET is_default = 0').run();
      this.db.prepare('UPDATE ai_provider_settings SET is_default = 1 WHERE id = ?').run(id);
    });
    update();
  }

  private toAiProvider(r: AiProviderRow): AiProviderSetting {
    const rawKey = r.encrypted_api_key;
    const decryptedKey = rawKey && this.crypto ? this.crypto.decrypt(rawKey) : rawKey;
    return {
      id: r.id, provider: r.provider as AiProvider, label: r.label,
      baseUrl: r.base_url, model: r.model, encryptedApiKey: decryptedKey,
      isDefault: r.is_default === 1, enabled: r.enabled === 1,
    };
  }
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function toSetting(r: SettingRow): ConfigurationSetting {
  return { key: r.key, value: r.value, updatedAt: r.updated_at };
}
