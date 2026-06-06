import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type BotJob, type BotJobDetail, type BotJobCommand, type BotVariable, type CatalogEndpoint } from '@/services/sidecarClient';

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MVP_RUNNABLE = ['API_CALL', 'SET_VARIABLE', 'ASSERT_STATUS_CODE', 'ASSERT_FIELD_VALUE', 'ASSERT_JSON_PATH_EXISTS', 'EXTRACT_JSON_PATH', 'WAIT', 'STOP_ON_FAILURE'] as const;
const ALL_TYPES = [
  ...MVP_RUNNABLE,
  'IF', 'ELSE', 'LOOP', 'FOR_EACH', 'READ_CSV', 'READ_EXCEL', 'AI_GENERATE_DATA', 'CALL_COMPONENT',
];

const TYPE_LABELS: Record<string, string> = {
  API_CALL: 'API Call',
  SET_VARIABLE: 'Set Variable',
  ASSERT_STATUS_CODE: 'Assert Status Code',
  ASSERT_FIELD_VALUE: 'Assert Field Value',
  ASSERT_JSON_PATH_EXISTS: 'Assert JSON Path Exists',
  EXTRACT_JSON_PATH: 'Extract JSON Path',
  WAIT: 'Wait',
  STOP_ON_FAILURE: 'Stop on Failure',
  IF: 'IF (Phase 9)',
  ELSE: 'ELSE (Phase 9)',
  LOOP: 'Loop (Phase 9)',
  FOR_EACH: 'For Each (Phase 9)',
  READ_CSV: 'Read CSV (Phase 9)',
  READ_EXCEL: 'Read Excel (Phase 9)',
  AI_GENERATE_DATA: 'AI Generate Data (Phase 9)',
  CALL_COMPONENT: 'Call Component (Phase 9)',
};

// ── command config editors ────────────────────────────────────────────────────

function ApiCallConfig({ config, onChange, endpoints }: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  endpoints: CatalogEndpoint[];
}) {
  const ep = endpoints.find((e) => e.id === config['endpointId']);
  return (
    <div className="space-y-2">
      <div>
        <label className="label">Endpoint</label>
        <select
          className="input"
          value={(config['endpointId'] as string) ?? ''}
          onChange={(e) => onChange({ ...config, endpointId: e.target.value })}
        >
          <option value="">— select —</option>
          {endpoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.method} {e.path}
            </option>
          ))}
        </select>
        {ep && <p className="mt-1 text-xs text-text-muted">{ep.summary ?? ''}</p>}
      </div>
      <div>
        <label className="label">Body (JSON, optional — supports ${'{'}varName{'}'} tokens)</label>
        <textarea
          className="input font-mono text-xs"
          rows={3}
          placeholder='{"key": "${myVar}"}'
          value={(config['body'] as string) ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            let parsed: unknown = v || undefined;
            try { if (v) parsed = JSON.parse(v); } catch { parsed = v; }
            onChange({ ...config, body: parsed });
          }}
        />
      </div>
      <div>
        <label className="label">Headers (JSON object, optional)</label>
        <textarea
          className="input font-mono text-xs"
          rows={2}
          placeholder='{"Authorization": "Bearer ${token}"}'
          value={config['headers'] ? JSON.stringify(config['headers'], null, 2) : ''}
          onChange={(e) => {
            const v = e.target.value;
            let parsed: unknown = undefined;
            try { if (v) parsed = JSON.parse(v); } catch { parsed = undefined; }
            onChange({ ...config, headers: parsed });
          }}
        />
      </div>
    </div>
  );
}

function SetVariableConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label">Variable name</label>
        <input className="input" placeholder="myVar" value={(config['name'] as string) ?? ''} onChange={(e) => onChange({ ...config, name: e.target.value })} />
      </div>
      <div>
        <label className="label">Value (supports ${'{'}tokens{'}'})</label>
        <input className="input" placeholder="hello" value={(config['value'] as string) ?? ''} onChange={(e) => onChange({ ...config, value: e.target.value })} />
      </div>
    </div>
  );
}

function AssertStatusConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className="label">Expected status code</label>
      <input className="input w-32" type="number" min={100} max={599} placeholder="200" value={(config['expected'] as number) ?? ''} onChange={(e) => onChange({ ...config, expected: Number(e.target.value) })} />
    </div>
  );
}

function AssertFieldConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label">JSON path</label>
        <input className="input font-mono" placeholder="$.data.id" value={(config['jsonPath'] as string) ?? ''} onChange={(e) => onChange({ ...config, jsonPath: e.target.value })} />
      </div>
      <div>
        <label className="label">Expected value</label>
        <input className="input" placeholder='"active"' value={(config['expected'] as string) ?? ''} onChange={(e) => {
          let v: unknown = e.target.value;
          try { v = JSON.parse(e.target.value); } catch { /* keep as string */ }
          onChange({ ...config, expected: v });
        }} />
      </div>
    </div>
  );
}

function AssertExistsConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className="label">JSON path (must exist)</label>
      <input className="input font-mono" placeholder="$.data.id" value={(config['jsonPath'] as string) ?? ''} onChange={(e) => onChange({ ...config, jsonPath: e.target.value })} />
    </div>
  );
}

function ExtractConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="label">JSON path</label>
        <input className="input font-mono" placeholder="$.data.token" value={(config['jsonPath'] as string) ?? ''} onChange={(e) => onChange({ ...config, jsonPath: e.target.value })} />
      </div>
      <div>
        <label className="label">Store in variable</label>
        <input className="input" placeholder="token" value={(config['variable'] as string) ?? ''} onChange={(e) => onChange({ ...config, variable: e.target.value })} />
      </div>
    </div>
  );
}

function WaitConfig({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div>
      <label className="label">Wait (ms)</label>
      <input className="input w-32" type="number" min={0} max={10000} placeholder="500" value={(config['ms'] as number) ?? ''} onChange={(e) => onChange({ ...config, ms: Number(e.target.value) })} />
    </div>
  );
}

function CommandConfigEditor({ cmd, onChange, endpoints }: {
  cmd: BotJobCommand;
  onChange: (c: Record<string, unknown>) => void;
  endpoints: CatalogEndpoint[];
}) {
  if (!MVP_RUNNABLE.includes(cmd.type as typeof MVP_RUNNABLE[number])) {
    return <p className="text-xs text-warning">This command type is not available in the Phase 8 MVP. It will be recorded as skipped during execution.</p>;
  }
  switch (cmd.type) {
    case 'API_CALL':          return <ApiCallConfig config={cmd.config} onChange={onChange} endpoints={endpoints} />;
    case 'SET_VARIABLE':      return <SetVariableConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_STATUS_CODE':return <AssertStatusConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_FIELD_VALUE':return <AssertFieldConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_JSON_PATH_EXISTS': return <AssertExistsConfig config={cmd.config} onChange={onChange} />;
    case 'EXTRACT_JSON_PATH': return <ExtractConfig config={cmd.config} onChange={onChange} />;
    case 'WAIT':              return <WaitConfig config={cmd.config} onChange={onChange} />;
    case 'STOP_ON_FAILURE':   return <p className="text-xs text-text-muted">Stops the run if any previous step failed. No configuration needed.</p>;
    default:                  return null;
  }
}

// ── main component ────────────────────────────────────────────────────────────

export function BotJobDesignerPage() {
  const [jobs, setJobs]         = useState<BotJob[]>([]);
  const [detail, setDetail]     = useState<BotJobDetail | null>(null);
  const [endpoints, setEndpoints] = useState<CatalogEndpoint[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refreshJobs = useCallback(() => {
    sidecar.listBotJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    refreshJobs();
    sidecar.getEndpoints().then(setEndpoints).catch(() => {});
  }, [refreshJobs]);

  const blockId = detail?.blocks[0]?.id ?? '';

  // ── mutations ───────────────────────────────────────────────────────────────

  const handleNew = async () => {
    const name = prompt('BotJob name?');
    if (!name?.trim()) return;
    const { id } = await sidecar.createBotJob(name.trim());
    const newDetail = await sidecar.getBotJob(id);
    setDetail(newDetail);
    refreshJobs();
    setSaved(false);
    setError(null);
  };

  const handleSelect = async (id: string) => {
    try {
      const d = await sidecar.getBotJob(id);
      setDetail(d);
      setExpanded(new Set());
      setSaved(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!detail || !confirm(`Delete "${detail.job.name}"?`)) return;
    await sidecar.deleteBotJob(detail.job.id);
    setDetail(null);
    refreshJobs();
  };

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await sidecar.saveBotJob(detail);
      setSaved(true);
      refreshJobs();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── command list helpers ─────────────────────────────────────────────────────

  const addCommand = (type: string) => {
    if (!detail) return;
    const newCmd: BotJobCommand = {
      id: uid(),
      blockId,
      order: detail.commands.length,
      type,
      config: {},
      enabled: true,
    };
    setDetail({ ...detail, commands: [...detail.commands, newCmd] });
    setExpanded((prev) => new Set([...prev, newCmd.id]));
    setSaved(false);
  };

  const updateCommand = (idx: number, patch: Partial<BotJobCommand>) => {
    if (!detail) return;
    const cmds = detail.commands.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setDetail({ ...detail, commands: cmds });
    setSaved(false);
  };

  const moveCommand = (idx: number, dir: -1 | 1) => {
    if (!detail) return;
    const cmds = [...detail.commands];
    const target = idx + dir;
    if (target < 0 || target >= cmds.length) return;
    [cmds[idx], cmds[target]] = [cmds[target]!, cmds[idx]!];
    setDetail({ ...detail, commands: cmds.map((c, i) => ({ ...c, order: i })) });
    setSaved(false);
  };

  const removeCommand = (idx: number) => {
    if (!detail) return;
    setDetail({ ...detail, commands: detail.commands.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })) });
    setSaved(false);
  };

  // ── variable helpers ─────────────────────────────────────────────────────────

  const addVariable = () => {
    if (!detail) return;
    const v: BotVariable = { id: uid(), botJobId: detail.job.id, name: '', initialValue: '', secret: false };
    setDetail({ ...detail, variables: [...detail.variables, v] });
    setSaved(false);
  };

  const updateVariable = (idx: number, patch: Partial<BotVariable>) => {
    if (!detail) return;
    setDetail({ ...detail, variables: detail.variables.map((v, i) => (i === idx ? { ...v, ...patch } : v)) });
    setSaved(false);
  };

  const removeVariable = (idx: number) => {
    if (!detail) return;
    setDetail({ ...detail, variables: detail.variables.filter((_, i) => i !== idx) });
    setSaved(false);
  };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="BotJob Designer"
        subtitle="Compose ordered command sequences from the palette. Every job is validated against the imported catalog before it can run."
        actions={
          <>
            {detail && (
              <>
                <button className="btn" onClick={handleDelete}>Delete</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={handleNew}>+ New BotJob</button>
          </>
        }
      />

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Job list ── */}
        <div className="card">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Saved BotJobs</div>
          {jobs.length === 0 ? (
            <p className="text-xs text-text-muted">No BotJobs yet. Click "+ New BotJob" to create one.</p>
          ) : (
            <ul className="space-y-1">
              {jobs.map((j) => (
                <li key={j.id}>
                  <button
                    className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-surface-alt ${detail?.job.id === j.id ? 'bg-surface-alt font-medium' : ''}`}
                    onClick={() => handleSelect(j.id)}
                  >
                    {j.name}
                    <span className="ml-1 text-xs text-text-muted">({(j as unknown as { commands?: unknown[] }).commands?.length ?? '?'} cmds)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Editor ── */}
        {!detail ? (
          <div className="card grid place-items-center text-center text-sm text-text-muted">
            <div>
              <p>Select a BotJob from the list or create a new one.</p>
              <p className="mt-1 text-xs">Each BotJob is a flat sequence of commands executed top-to-bottom.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Job name / description */}
            <div className="card space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={detail.job.name}
                  onChange={(e) => { setDetail({ ...detail, job: { ...detail.job, name: e.target.value } }); setSaved(false); }}
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input
                  className="input"
                  placeholder="What does this BotJob test?"
                  value={detail.job.description ?? ''}
                  onChange={(e) => { setDetail({ ...detail, job: { ...detail.job, description: e.target.value || null } }); setSaved(false); }}
                />
              </div>
            </div>

            {/* Variables */}
            <div className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Variables</span>
                <button className="btn text-xs" onClick={addVariable}>+ Add</button>
              </div>
              {detail.variables.length === 0 ? (
                <p className="text-xs text-text-muted">No variables. Use ${'{'}varName{'}'} tokens in command configs to reference them.</p>
              ) : (
                <div className="space-y-2">
                  {detail.variables.map((v, i) => (
                    <div key={v.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
                      <div>
                        <label className="label">Name</label>
                        <input className="input" placeholder="token" value={v.name} onChange={(e) => updateVariable(i, { name: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Initial value</label>
                        <input className="input" placeholder="(empty)" value={v.initialValue ?? ''} onChange={(e) => updateVariable(i, { initialValue: e.target.value || null })} />
                      </div>
                      <div className="pb-1">
                        <label className="label flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={v.secret} onChange={(e) => updateVariable(i, { secret: e.target.checked })} />
                          secret
                        </label>
                      </div>
                      <button className="btn mb-1 text-xs text-danger" onClick={() => removeVariable(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commands */}
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Commands ({detail.commands.length})</span>
                <div className="flex items-center gap-2">
                  <select
                    className="input text-xs"
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) { addCommand(e.target.value); e.target.value = ''; } }}
                  >
                    <option value="" disabled>+ Add command…</option>
                    {ALL_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {detail.commands.length === 0 ? (
                <p className="text-xs text-text-muted">No commands yet. Use the "+ Add command…" dropdown above to add the first step.</p>
              ) : (
                <div className="space-y-2">
                  {detail.commands.map((cmd, idx) => {
                    const isOpen = expanded.has(cmd.id);
                    return (
                      <div key={cmd.id} className={`rounded border ${cmd.enabled ? 'border-border' : 'border-border opacity-50'} bg-surface-alt`}>
                        {/* header row */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="w-5 text-center text-xs text-text-muted">{idx + 1}</span>
                          <input
                            type="checkbox"
                            title="enabled"
                            checked={cmd.enabled}
                            onChange={(e) => updateCommand(idx, { enabled: e.target.checked })}
                          />
                          <span className="flex-1 font-mono text-xs">{TYPE_LABELS[cmd.type] ?? cmd.type}</span>
                          <button className="btn text-xs" onClick={() => moveCommand(idx, -1)} disabled={idx === 0}>↑</button>
                          <button className="btn text-xs" onClick={() => moveCommand(idx, 1)} disabled={idx === detail.commands.length - 1}>↓</button>
                          <button
                            className="btn text-xs"
                            onClick={() => setExpanded((prev) => { const s = new Set(prev); s.has(cmd.id) ? s.delete(cmd.id) : s.add(cmd.id); return s; })}
                          >
                            {isOpen ? '▲' : '▼'}
                          </button>
                          <button className="btn text-xs text-danger" onClick={() => removeCommand(idx)}>✕</button>
                        </div>
                        {/* config panel */}
                        {isOpen && (
                          <div className="border-t border-border px-3 py-3">
                            <CommandConfigEditor
                              cmd={cmd}
                              onChange={(config) => updateCommand(idx, { config })}
                              endpoints={endpoints}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
