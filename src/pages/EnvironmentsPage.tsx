import { useEffect, useState } from 'react';
import { Globe, Star, Lock, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { sidecar, type Environment } from '@/services/sidecarClient';

// ── helpers ───────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  baseUrl: '',
  description: '',
  isDefault: false,
};

type FormState = typeof EMPTY_FORM;

// ── environment card ──────────────────────────────────────────────────────────

function EnvCard({
  env,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  env: Environment;
  onEdit: (env: Environment) => void;
  onDelete: (env: Environment) => void;
  onSetDefault: (env: Environment) => void;
}) {
  return (
    <div className={`card flex items-start gap-4 ${env.isDefault ? 'border-primary/40' : ''}`}>
      <div className="mt-0.5 flex-shrink-0 rounded-full bg-surface-alt p-2">
        {env.isBuiltIn ? <Lock size={16} className="text-text-muted" /> : <Globe size={16} className="text-info" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{env.name}</span>
          {env.isDefault && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <Star size={10} /> Default
            </span>
          )}
          {env.isBuiltIn && (
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] text-text-muted">built-in</span>
          )}
        </div>
        <code className="mt-0.5 block text-xs text-text-muted">{env.baseUrl}</code>
        {env.description && <p className="mt-1 text-xs text-text-muted">{env.description}</p>}
        {Object.keys(env.headers ?? {}).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(env.headers).map(([k, v]) => (
              <code key={k} className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px]">
                {k}: {v}
              </code>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {!env.isDefault && (
          <button
            className="btn text-xs"
            title="Set as default environment"
            onClick={() => onSetDefault(env)}
          >
            <Star size={13} />
          </button>
        )}
        {!env.isBuiltIn && (
          <>
            <button className="btn text-xs" title="Edit" onClick={() => onEdit(env)}>
              <Pencil size={13} />
            </button>
            <button
              className="btn text-xs text-danger"
              title="Delete"
              onClick={() => onDelete(env)}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── environment form ──────────────────────────────────────────────────────────

function EnvForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState & { id?: string };
  onSave: (form: FormState & { id?: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [headersRaw, setHeadersRaw] = useState(
    Object.entries((initial as { headers?: Record<string, string> }).headers ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n'),
  );
  const [headersErr, setHeadersErr] = useState('');

  function parseHeaders(raw: string): Record<string, string> | null {
    const result: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(':');
      if (colon < 1) return null;
      result[trimmed.slice(0, colon).trim()] = trimmed.slice(colon + 1).trim();
    }
    return result;
  }

  const handleSave = () => {
    const headers = parseHeaders(headersRaw);
    if (headers === null) { setHeadersErr('Invalid format — use "Key: Value" per line.'); return; }
    setHeadersErr('');
    onSave({ ...form, headers } as FormState & { id?: string; headers: Record<string, string> });
  };

  return (
    <div className="card space-y-4 border-primary/30">
      <div className="flex items-center justify-between">
        <span className="font-medium">{form.id ? 'Edit Environment' : 'New Environment'}</span>
        <button className="btn text-xs" onClick={onCancel}><X size={13} /></button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input
            className="input"
            placeholder="Production"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Base URL *</label>
          <input
            className="input"
            placeholder="https://api.example.com"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <input
          className="input"
          placeholder="Live banking backend"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Default headers (optional — one per line, format: Key: Value)</label>
        <textarea
          className="input font-mono text-xs"
          rows={3}
          placeholder={`Authorization: Bearer {{token}}\nX-Tenant-ID: acme`}
          value={headersRaw}
          onChange={(e) => { setHeadersRaw(e.target.value); setHeadersErr(''); }}
        />
        {headersErr && <p className="mt-1 text-xs text-danger">{headersErr}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
        />
        Set as default environment
      </label>

      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.baseUrl.trim()}
        >
          {saving ? 'Saving…' : <><Check size={13} className="mr-1" />Save</>}
        </button>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function EnvironmentsPage() {
  const [envs, setEnvs]       = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<(FormState & { id?: string }) | null>(null);
  const [saving, setSaving]   = useState(false);

  async function load() {
    try {
      setEnvs(await sidecar.listEnvironments());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const handleNew = () =>
    setEditTarget({ ...EMPTY_FORM, isDefault: envs.length === 0 });

  const handleEdit = (env: Environment) =>
    setEditTarget({
      id:          env.id,
      name:        env.name,
      baseUrl:     env.baseUrl,
      description: env.description ?? '',
      isDefault:   env.isDefault,
      headers:     env.headers as unknown as string,
    } as FormState & { id: string });

  const handleSetDefault = async (env: Environment) => {
    setSaving(true);
    try {
      await sidecar.updateEnvironment(env.id, { isDefault: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (env: Environment) => {
    if (!confirm(`Delete environment "${env.name}"?`)) return;
    setSaving(true);
    try {
      await sidecar.deleteEnvironment(env.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (form: FormState & { id?: string; headers?: Record<string, string> }) => {
    setSaving(true);
    setError(null);
    try {
      if (form.id) {
        await sidecar.updateEnvironment(form.id, {
          name:        form.name,
          baseUrl:     form.baseUrl,
          description: form.description || null,
          headers:     form.headers ?? {},
          isDefault:   form.isDefault,
        });
      } else {
        await sidecar.createEnvironment({
          name:        form.name,
          baseUrl:     form.baseUrl,
          description: form.description || null,
          headers:     form.headers ?? {},
          isDefault:   form.isDefault,
        });
      }
      setEditTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Environments"
        subtitle="Named execution targets — pick one when running a BotJob. The built-in Mock Server environment always exists."
        actions={
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={14} className="mr-1" /> New Environment
          </button>
        }
      />

      {error && <div className="mb-4"><ErrorAlert message={error} /></div>}
      {loading && <LoadingSpinner text="Loading environments…" />}

      {editTarget && (
        <div className="mb-4">
          <EnvForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => setEditTarget(null)}
            saving={saving}
          />
        </div>
      )}

      {!loading && envs.length === 0 && !editTarget && (
        <EmptyState
          icon={<Globe size={28} />}
          title="No environments yet"
          body="Create your first environment to run BotJobs against a real API."
        />
      )}

      <div className="space-y-3">
        {envs.map((env) => (
          <EnvCard
            key={env.id}
            env={env}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>
    </div>
  );
}
