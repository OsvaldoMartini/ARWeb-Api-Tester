import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { AI_PROVIDERS } from '@arweb/domain';
import { sidecar, type AiProviderSetting } from '@/services/sidecarClient';

const PROVIDER_LABELS: Record<string, string> = {
  'openai':        'OpenAI',
  'anthropic':     'Anthropic Claude',
  'gemini':        'Google Gemini',
  'azure-openai':  'Azure OpenAI',
  'ollama':        'Ollama (local)',
  'together':      'Together.ai',
  'custom-openai': 'Custom OpenAI-compatible',
};

const DEFAULT_MODELS: Record<string, string> = {
  'openai':        'gpt-4o-mini',
  'anthropic':     'claude-3-5-haiku-20241022',
  'gemini':        'gemini-1.5-flash',
  'azure-openai':  'gpt-4o-mini',
  'ollama':        'llama3.2',
  'together':      'meta-llama/Llama-3-8b-chat-hf',
  'custom-openai': 'gpt-4o-mini',
};

const NEEDS_BASE_URL = new Set(['ollama', 'azure-openai', 'custom-openai']);

export function SettingsPage() {
  const [provider, setProvider]   = useState<string>('openai');
  const [apiKey, setApiKey]       = useState('');
  const [model, setModel]         = useState('');
  const [baseUrl, setBaseUrl]     = useState('');
  const [hasKey, setHasKey]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Load the currently saved setting for the selected provider.
  useEffect(() => {
    sidecar.getAiProviders().then(({ providers }) => {
      const existing = providers.find((p) => p.provider === provider);
      setApiKey(''); // never pre-fill the key
      setHasKey(existing?.hasApiKey ?? false);
      setModel(existing?.model ?? '');
      setBaseUrl(existing?.baseUrl ?? '');
    }).catch(() => {});
  }, [provider]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const setting: AiProviderSetting = {
        id:              `${provider}-default`,
        provider,
        label:           PROVIDER_LABELS[provider] ?? provider,
        encryptedApiKey: apiKey || null,
        model:           model || null,
        baseUrl:         baseUrl || null,
        isDefault:       true,
        enabled:         true,
      };
      await sidecar.saveAiProvider(setting);
      setSaved(true);
      setHasKey(true);
      setApiKey(''); // clear after save
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure the AI provider. The app works fully offline — an API key is optional. Keys are stored locally and sent only to the chosen provider."
      />

      <div className="grid max-w-2xl grid-cols-1 gap-4">
        <div className="card">
          <div className="mb-3 font-medium">AI provider</div>

          <label className="label" htmlFor="provider">Provider</label>
          <select
            id="provider"
            className="input"
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setSaved(false); setError(null); }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>
            ))}
          </select>

          <label className="label mt-4" htmlFor="model">Model (optional)</label>
          <input
            id="model"
            className="input"
            placeholder={DEFAULT_MODELS[provider] ?? 'default'}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />

          {NEEDS_BASE_URL.has(provider) && (
            <>
              <label className="label mt-4" htmlFor="baseUrl">Base URL</label>
              <input
                id="baseUrl"
                className="input"
                placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://your-endpoint'}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </>
          )}

          <label className="label mt-4" htmlFor="apiKey">
            API key{provider === 'ollama' ? ' (not required for local Ollama)' : ''}
          </label>
          <input
            id="apiKey"
            className="input"
            type="password"
            placeholder={hasKey ? '••••••••  (key saved — enter new key to replace)' : 'Leave empty to use offline rule-based fallback'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
          />
          <p className="mt-2 text-xs text-text-muted">
            Keys are encrypted at rest (AES-256-GCM) and never returned to the browser.
          </p>

          {error && <div className="mt-2"><ErrorAlert message={error} /></div>}
          {saved && <p className="mt-2 text-sm text-success">Saved — AI provider is active.</p>}

          <button
            className="btn btn-primary mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="card">
          <div className="mb-3 font-medium">Local services</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="label">Sidecar port</div>
              <code>8787</code>
            </div>
            <div>
              <div className="label">Mock server port</div>
              <code>8855</code>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Override via environment variables (<code>SIDECAR_PORT</code>, <code>MOCK_SERVER_PORT</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
