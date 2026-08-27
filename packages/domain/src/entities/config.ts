import type { AiProvider, ConversationMode } from '../enums/index.js';

/** App configuration & AI provider settings (Phase 3). */

export interface ConfigurationSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface AiProviderSetting {
  id: string;
  provider: AiProvider;
  label: string;
  baseUrl: string | null;
  model: string | null;
  /** Encrypted at rest. Never logged. Never returned raw to the UI. */
  encryptedApiKey: string | null;
  isDefault: boolean;
  enabled: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  mode: ConversationMode;
  template: string; // may contain {{placeholders}}
  updatedAt: string;
}
