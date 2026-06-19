import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FlaskConical, Key, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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

interface ProviderState {
  hasKey:    boolean;
  isDefault: boolean;
  enabled:   boolean;
  model:     string;
  baseUrl:   string;
}

type TestResult = { ok: boolean; ms: number; text?: string; error?: string } | null;

function DefaultToggle({
  isDefault,
  hasKey,
  busy,
  onToggle,
}: {
  isDefault: boolean;
  hasKey: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const canToggle = hasKey && !isDefault && !busy;

  return (
    <button
      type="button"
      onClick={canToggle ? onToggle : undefined}
      disabled={!canToggle}
      title={
        !hasKey      ? 'Add an API key first to enable this provider'
        : isDefault  ? 'This provider is the active default for the whole app'
        : 'Set as the default AI provider for the whole app'
      }
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-all select-none
        ${isDefault
          ? 'border-success/40 bg-success text-white cursor-default shadow-sm'
          : !hasKey
            ? 'border-destructive/30 bg-destructive/10 text-destructive cursor-not-allowed'
            : 'border-border bg-surface text-text-muted hover:border-success/50 hover:bg-success/10 hover:text-success cursor-pointer'
        }
      `}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
        isDefault ? 'bg-white' : !hasKey ? 'bg-destructive/60' : 'bg-text-muted/40'
      }`} />
      {busy
        ? <Loader2 size={11} className="animate-spin" />
        : isDefault ? 'DEFAULT' : !hasKey ? 'NO KEY' : 'SET DEFAULT'
      }
    </button>
  );
}

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
  const [open,       setOpen]       = useState(false);
  const [apiKey,     setApiKey]     = useState('');
  const [model,      setModel]      = useState(state.model);
  const [baseUrl,    setBaseUrl]    = useState(state.baseUrl);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null);
  const [saveErr,    setSaveErr]    = useState<string | null>(null);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  const [settingDef, setSettingDef] = useState(false);

  useEffect(() => { setModel(state.model); setBaseUrl(state.baseUrl); }, [state.model, state.baseUrl]);

  async function handleSave() {
    setSaving(true); setSaveErr(null); setSaveMsg(null);
    try {
      const willHaveKey = state.hasKey || !!apiKey;
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
      onSaved(provider, { hasKey: willHaveKey, model, baseUrl, enabled: true });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
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
    setSettingDef(true);
    try {
      await sidecar.setDefaultAiProvider(`${provider}-default`);
      onSetDefault(provider);
    } finally {
      setSettingDef(false);
    }
  }

  return (
    <div className={`card transition-all ${
      state.isDefault
        ? 'ring-2 ring-success/50 shadow-sm'
        : !state.hasKey
          ? 'opacity-80'
          : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="font-semibold">{PROVIDER_LABELS[provider] ?? provider}</span>
          {state.model && (
            <span className="ml-2 text-xs text-text-muted">{state.model}</span>
          )}
          {state.hasKey && !state.isDefault && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-muted">
              <Key size={10} /> key configured
            </span>
          )}
        </div>

        {state.hasKey && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs hover:bg-surface-alt disabled:opacity-50"
            title="Test connection"
          >
            {testing ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />}
            Test
          </button>
        )}

        <DefaultToggle
          isDefault={state.isDefault}
          hasKey={state.hasKey}
          busy={settingDef}
          onToggle={handleSetDefault}
        />

        <button
          className="rounded p-1.5 text-text-muted hover:bg-surface-alt"
          onClick={() => { setOpen(v => !v); setTestResult(null); setSaveMsg(null); setSaveErr(null); }}
          title={open ? 'Collapse' : 'Edit key / model'}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {testResult && (
        <div className={`mt-3 flex items-center gap-2 rounded border px-3 py-2 text-xs ${
          testResult.ok
            ? 'border-success/30 bg-success/5 text-success'
            : 'border-destructive/30 bg-destructive/5 text-destructive'
        }`}>
          {testResult.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          {testResult.ok
            ? `Connected — ${testResult.ms} ms${testResult.text ? ` · "${testResult.text.slice(0, 60)}"` : ''}`
            : `Failed — ${testResult.error ?? 'unknown error'} (${testResult.ms} ms)`
          }
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="label">Model <span className="text-text-muted">(optional)</span></label>
            <input
              className="input"
              placeholder={DEFAULT_MODELS[provider] ?? 'default'}
              value={model}
              onChange={e => setModel(e.target.value)}
            />
          </div>

          {NEEDS_BASE_URL.has(provider) && (
            <div>
              <label className="label">Base URL</label>
              <input
                className="input"
                placeholder={provider === 'ollama' ? 'http://localhost:11434' : 'https://your-endpoint'}
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
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
              onChange={e => { setApiKey(e.target.value); setSaveMsg(null); }}
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

export function SettingsPage() {
  const [states,  setStates]  = useState<Record<string, ProviderState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sidecar.getAiProviders().then(({ providers }) => {
      const map: Record<string, ProviderState> = {};
      for (const p of AI_PROVIDERS) {
        const existing = providers.find(x => x.provider === p);
        map[p] = {
          hasKey:    existing?.hasApiKey  ?? false,
          isDefault: existing?.isDefault  ?? false,
          enabled:   existing?.enabled    ?? false,
          model:     existing?.model      ?? '',
          baseUrl:   existing?.baseUrl    ?? '',
        };
      }
      const withKey = AI_PROVIDERS.filter(p => map[p]!.hasKey);
      const hasDefault = AI_PROVIDERS.some(p => map[p]!.isDefault);
      if (withKey.length === 1 && !hasDefault) {
        map[withKey[0]!]!.isDefault = true;
        sidecar.setDefaultAiProvider(`${withKey[0]}-default`).catch(() => {});
      }
      setStates(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function handleSaved(provider: string, updated: Partial<ProviderState>) {
    setStates(prev => {
      const next = { ...prev, [provider]: { ...prev[provider]!, ...updated } };
      const withKey = AI_PROVIDERS.filter(p => next[p]!.hasKey);
      const hasDefault = AI_PROVIDERS.some(p => next[p]!.isDefault);
      if (withKey.length === 1 && !hasDefault) {
        const only = withKey[0]!;
        next[only] = { ...next[only]!, isDefault: true };
        sidecar.setDefaultAiProvider(`${only}-default`).catch(() => {});
      }
      return next;
    });
  }

  function handleSetDefault(provider: string) {
    setStates(prev => {
      const next = { ...prev };
      for (const p of AI_PROVIDERS) next[p] = { ...next[p]!, isDefault: p === provider };
      return next;
    });
  }

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>;

  const activeDefault = AI_PROVIDERS.find(p => states[p]?.isDefault && states[p]?.hasKey);
  const anyKey        = AI_PROVIDERS.some(p => states[p]?.hasKey);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure AI providers. Settings are shared between ARAPI Tester and AR Conversational. The DEFAULT toggle sets which provider is used across both apps."
      />

      <div className="max-w-2xl space-y-5">

        {!anyKey ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>
              <strong>No AI provider configured.</strong> Expand any provider below, enter your API key, and click Save.
              The DEFAULT toggle will turn green automatically.
            </span>
          </div>
        ) : activeDefault ? (
          <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/8 px-4 py-3 text-sm text-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>
              <strong>{PROVIDER_LABELS[activeDefault] ?? activeDefault}</strong> is the active default —
              all AI features across both apps use this provider.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/8 px-4 py-3 text-sm text-warning">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span>
              A key is configured but no provider is set as default. Click <strong>SET DEFAULT</strong> on one of the providers below.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {AI_PROVIDERS.map(p => (
            <ProviderCard
              key={p}
              provider={p}
              state={states[p]!}
              onSaved={handleSaved}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>

        <div className="card">
          <div className="mb-3 font-medium">Local services</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="label">ARAPI backend</div><code>8787</code></div>
            <div><div className="label">AR Conversational client</div><code>5174</code></div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Override the backend port via <code>ARAPI_PORT</code> or <code>SIDECAR_PORT</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
