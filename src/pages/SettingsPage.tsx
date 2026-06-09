import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Star, StarOff, FlaskConical, Key, ChevronDown, ChevronUp } from 'lucide-react';
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

// ── per-provider state ────────────────────────────────────────────────────────

interface ProviderState {
  hasKey:    boolean;
  isDefault: boolean;
  enabled:   boolean;
  model:     string;
  baseUrl:   string;
}

type TestResult = { ok: boolean; ms: number; text?: string; error?: string } | null;

// ── Provider card ─────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  state,
  onSaved,
  onSetDefault,
}: {
  provider: string;
  state: ProviderState;
  onSaved: (p: string, updated: Partial<ProviderState>) => void;
  onSetDefault: (p: string) => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [apiKey,  setApiKey]  = useState('');
  const [model,   setModel]   = useState(state.model);
  const [baseUrl, setBaseUrl] = useState(state.baseUrl);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [settingDefault, setSettingDefault] = useState(false);

  // Sync if parent state changes (e.g. default toggled on another card).
  useEffect(() => {
    setModel(state.model);
    setBaseUrl(state.baseUrl);
  }, [state.model, state.baseUrl]);

  async function handleSave() {
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      const setting: AiProviderSetting = {
        id:              `${provider}-default`,
        provider,
        label:           PROVIDER_LABELS[provider] ?? provider,
        encryptedApiKey: apiKey || null,
        model:           model || null,
        baseUrl:         baseUrl || null,
        isDefault:       state.isDefault,
        enabled:         true,
      };
      await sidecar.saveAiProvider(setting);
      setSaveMsg('Saved.');
      setApiKey('');
      onSaved(provider, { hasKey: state.hasKey || !!apiKey, model, baseUrl, enabled: true });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await sidecar.testAiProvider(provider);
      setTestResult(r);
    } catch (e) {
      setTestResult({ ok: false, ms: 0, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  async function handleSetDefault() {
    if (state.isDefault) return;
    setSettingDefault(true);
    try {
      await sidecar.setDefaultAiProvider(`${provider}-default`);
      onSetDefault(provider);
    } finally {
      setSettingDefault(false);
    }
  }

  return (
    <div className={`card transition-shadow ${state.isDefault ? 'ring-2 ring-primary/40' : ''}`}>
      {/* header row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{PROVIDER_LABELS[provider] ?? provider}</span>
            {state.isDefault && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Default
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
            {state.hasKey ? (
              <span className="flex items-center gap-1 text-success"><CheckCircle2 size={11} /> Key configured</span>
            ) : (
              <span className="flex items-center gap-1"><Key size={11} /> No key</span>
            )}
            {state.model && <span>· {state.model}</span>}
          </div>
        </div>

        {/* Default toggle */}
        <button
          title={state.isDefault ? 'This is the default provider' : 'Set as default provider'}
          onClick={handleSetDefault}
          disabled={state.isDefault || settingDefault}
          className={`rounded-full p-1.5 transition-colors ${
            state.isDefault
              ? 'text-primary cursor-default'
              : 'text-text-muted hover:text-primary hover:bg-primary/10'
          }`}
        >
          {settingDefault
            ? <Loader2 size={16} className="animate-spin" />
            : state.isDefault
              ? <Star size={16} className="fill-primary" />
              : <StarOff size={16} />
          }
        </button>

        {/* Test button */}
        {state.hasKey && (
          <button
            title="Test connection"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-alt disabled:opacity-50"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
            Test
          </button>
        )}

        {/* Expand / collapse edit form */}
        <button
          className="rounded p-1.5 text-text-muted hover:bg-surface-alt"
          onClick={() => { setOpen((v) => !v); setTestResult(null); setSaveMsg(null); setSaveErr(null); }}
          title={open ? 'Collapse' : 'Edit key / model'}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* test result inline */}
      {testResult && (
        <div className={`mt-3 flex items-center gap-2 rounded border px-3 py-2 text-xs ${
          testResult.ok ? 'border-success/30 bg-success/5 text-success' : 'border-destructive/30 bg-destructive/5 text-destructive'
        }`}>
          {testResult.ok
            ? <CheckCircle2 size={13} />
            : <XCircle      size={13} />
          }
          {testResult.ok
            ? `Connected — response in ${testResult.ms} ms${testResult.text ? ` · "${testResult.text.slice(0, 60)}"` : ''}`
            : `Failed — ${testResult.error ?? 'unknown error'} (${testResult.ms} ms)`
          }
        </div>
      )}

      {/* edit form */}
      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="label">Model <span className="text-text-muted">(optional)</span></label>
            <input
              className="input"
              placeholder={DEFAULT_MODELS[provider] ?? 'default'}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          {NEEDS_BASE_URL.has(provider) && (
            <div>
              <label className="label">Base URL</label>
              <input
                className="input"
                placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://your-endpoint'}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">
              API key{provider === 'ollama' ? ' (not required for local Ollama)' : ''}
            </label>
            <input
              className="input"
              type="password"
              placeholder={state.hasKey ? '••••••••  (key saved — enter new key to replace)' : 'Enter API key'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Encrypted at rest (AES-256-GCM) — never returned to the browser.
            </p>
          </div>

          {saveErr && <ErrorAlert message={saveErr} />}
          {saveMsg && <p className="text-sm text-success">{saveMsg}</p>}

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sidecar.getAiProviders().then(({ providers }) => {
      const map: Record<string, ProviderState> = {};
      for (const p of AI_PROVIDERS) {
        const existing = providers.find((x) => x.provider === p);
        map[p] = {
          hasKey:    existing?.hasApiKey ?? false,
          isDefault: existing?.isDefault ?? false,
          enabled:   existing?.enabled ?? false,
          model:     existing?.model ?? '',
          baseUrl:   existing?.baseUrl ?? '',
        };
      }
      setProviderStates(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function handleSaved(provider: string, updated: Partial<ProviderState>) {
    setProviderStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider]!, ...updated },
    }));
  }

  function handleSetDefault(provider: string) {
    setProviderStates((prev) => {
      const next = { ...prev };
      for (const p of Object.keys(next)) {
        next[p] = { ...next[p]!, isDefault: p === provider };
      }
      return next;
    });
  }

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>;

  const configured = AI_PROVIDERS.filter((p) => providerStates[p]?.hasKey || providerStates[p]?.enabled);
  const unconfigured = AI_PROVIDERS.filter((p) => !configured.includes(p));

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure AI providers. The app works fully offline — a key is optional. Click ★ to set the active default; click Test to verify connectivity."
      />

      <div className="max-w-2xl space-y-6">
        {/* configured providers */}
        {configured.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-text-muted">Configured providers</h3>
            <div className="space-y-3">
              {configured.map((p) => (
                <ProviderCard
                  key={p}
                  provider={p}
                  state={providerStates[p]!}
                  onSaved={handleSaved}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          </section>
        )}

        {/* unconfigured providers */}
        {unconfigured.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium text-text-muted">
              {configured.length > 0 ? 'Add another provider' : 'Available providers'}
            </h3>
            <div className="space-y-3">
              {unconfigured.map((p) => (
                <ProviderCard
                  key={p}
                  provider={p}
                  state={providerStates[p]!}
                  onSaved={handleSaved}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          </section>
        )}

        {/* local services */}
        <div className="card">
          <div className="mb-3 font-medium">Local services</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="label">Sidecar port</div><code>8787</code></div>
            <div><div className="label">Mock server port</div><code>8855</code></div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Override via environment variables (<code>SIDECAR_PORT</code>, <code>MOCK_SERVER_PORT</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
