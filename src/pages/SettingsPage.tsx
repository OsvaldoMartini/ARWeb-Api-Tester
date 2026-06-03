import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AI_PROVIDERS } from '@arweb/domain';

export function SettingsPage() {
  const [provider, setProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure the AI provider and ports. The app works fully offline — an API key is optional and there is no account or login."
      />

      <div className="grid max-w-2xl grid-cols-1 gap-4">
        <div className="card">
          <div className="mb-3 font-medium">AI provider</div>
          <label className="label" htmlFor="provider">
            Provider
          </label>
          <select
            id="provider"
            className="input"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <label className="label mt-4" htmlFor="apiKey">
            API key (optional)
          </label>
          <input
            id="apiKey"
            className="input"
            type="password"
            placeholder="Leave empty to use the offline rule-based fallback"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="mt-2 text-xs text-text-muted">
            Without a key, the AI Assistant uses a deterministic offline fallback so the app is
            never blocked. Keys are kept locally and never sent anywhere except the chosen
            provider.
          </p>
          <button className="btn btn-primary mt-4" disabled>
            Save (Phase 11)
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
            Override via environment variables (<code>SIDECAR_PORT</code>,{' '}
            <code>MOCK_SERVER_PORT</code>). See <code>.env.example</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
