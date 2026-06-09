import { useEffect, useState, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  sidecar,
  type BotJob, type BotJobDetail, type BotJobCommand, type BotVariable, type CatalogEndpoint,
} from '@/services/sidecarClient';

// ── helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const TYPE_LABELS: Record<string, string> = {
  API_CALL: 'API Call',
  SET_VARIABLE: 'Set Variable',
  ASSERT_STATUS_CODE: 'Assert Status Code',
  ASSERT_FIELD_VALUE: 'Assert Field Value',
  ASSERT_JSON_PATH_EXISTS: 'Assert JSON Path Exists',
  EXTRACT_JSON_PATH: 'Extract JSON Path',
  WAIT: 'Wait',
  STOP_ON_FAILURE: 'Stop on Failure',
  IF: 'IF',
  ELSE: 'ELSE',
  LOOP: 'Loop',
  FOR_EACH: 'For Each',
  READ_CSV: 'Read CSV',
  READ_EXCEL: 'Read Excel',
  AI_GENERATE_DATA: 'AI Generate Data',
  CALL_COMPONENT: 'Call Component',
};

// left-border + bg tint per command category
const TYPE_STYLE: Record<string, string> = {
  API_CALL:                'border-l-blue-500 bg-blue-500/5',
  SET_VARIABLE:            'border-l-purple-500 bg-purple-500/5',
  EXTRACT_JSON_PATH:       'border-l-teal-500 bg-teal-500/5',
  ASSERT_STATUS_CODE:      'border-l-green-500 bg-green-500/5',
  ASSERT_FIELD_VALUE:      'border-l-green-500 bg-green-500/5',
  ASSERT_JSON_PATH_EXISTS: 'border-l-green-500 bg-green-500/5',
  WAIT:                    'border-l-slate-400 bg-slate-500/5',
  STOP_ON_FAILURE:         'border-l-red-500 bg-red-500/5',
  IF:                      'border-l-orange-500 bg-orange-500/5',
  ELSE:                    'border-l-orange-400 bg-orange-400/5',
  LOOP:                    'border-l-orange-500 bg-orange-500/5',
  FOR_EACH:                'border-l-orange-500 bg-orange-500/5',
  READ_CSV:                'border-l-yellow-500 bg-yellow-500/5',
  READ_EXCEL:              'border-l-yellow-500 bg-yellow-500/5',
  AI_GENERATE_DATA:        'border-l-pink-500 bg-pink-500/5',
  CALL_COMPONENT:          'border-l-indigo-500 bg-indigo-500/5',
};

const TYPE_DOT: Record<string, string> = {
  API_CALL: 'bg-blue-500', SET_VARIABLE: 'bg-purple-500',
  EXTRACT_JSON_PATH: 'bg-teal-500',
  ASSERT_STATUS_CODE: 'bg-green-500', ASSERT_FIELD_VALUE: 'bg-green-500', ASSERT_JSON_PATH_EXISTS: 'bg-green-500',
  WAIT: 'bg-slate-400', STOP_ON_FAILURE: 'bg-red-500',
  IF: 'bg-orange-500', ELSE: 'bg-orange-400', LOOP: 'bg-orange-500', FOR_EACH: 'bg-orange-500',
  READ_CSV: 'bg-yellow-500', READ_EXCEL: 'bg-yellow-500',
  AI_GENERATE_DATA: 'bg-pink-500', CALL_COMPONENT: 'bg-indigo-500',
};

// palette: grouped command types shown in the right panel
const PALETTE_GROUPS = [
  { label: 'API', color: 'text-blue-400',   types: ['API_CALL'] },
  { label: 'Variables', color: 'text-purple-400', types: ['SET_VARIABLE', 'EXTRACT_JSON_PATH'] },
  { label: 'Assertions', color: 'text-green-400', types: ['ASSERT_STATUS_CODE', 'ASSERT_FIELD_VALUE', 'ASSERT_JSON_PATH_EXISTS'] },
  { label: 'Control', color: 'text-orange-400',  types: ['IF', 'ELSE', 'LOOP', 'FOR_EACH', 'WAIT', 'STOP_ON_FAILURE'] },
  { label: 'Data', color: 'text-yellow-400', types: ['READ_CSV', 'READ_EXCEL', 'AI_GENERATE_DATA', 'CALL_COMPONENT'] },
];

const MVP_RUNNABLE = new Set([
  'API_CALL', 'SET_VARIABLE', 'ASSERT_STATUS_CODE', 'ASSERT_FIELD_VALUE',
  'ASSERT_JSON_PATH_EXISTS', 'EXTRACT_JSON_PATH', 'WAIT', 'STOP_ON_FAILURE',
]);

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
            <option key={e.id} value={e.id}>{e.method} {e.path}</option>
          ))}
        </select>
        {ep && <p className="mt-1 text-xs text-text-muted">{ep.summary ?? ''}</p>}
      </div>
      <div>
        <label className="label">Body (JSON, optional — supports ${'{'}varName{'}'} tokens)</label>
        <textarea
          className="input font-mono text-xs" rows={3}
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
          className="input font-mono text-xs" rows={2}
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
  if (!MVP_RUNNABLE.has(cmd.type)) {
    return <p className="text-xs text-warning">Control flow / data commands are not yet executed (recorded as skipped). Configuration coming in a future phase.</p>;
  }
  switch (cmd.type) {
    case 'API_CALL':               return <ApiCallConfig config={cmd.config} onChange={onChange} endpoints={endpoints} />;
    case 'SET_VARIABLE':           return <SetVariableConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_STATUS_CODE':     return <AssertStatusConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_FIELD_VALUE':     return <AssertFieldConfig config={cmd.config} onChange={onChange} />;
    case 'ASSERT_JSON_PATH_EXISTS':return <AssertExistsConfig config={cmd.config} onChange={onChange} />;
    case 'EXTRACT_JSON_PATH':      return <ExtractConfig config={cmd.config} onChange={onChange} />;
    case 'WAIT':                   return <WaitConfig config={cmd.config} onChange={onChange} />;
    case 'STOP_ON_FAILURE':        return <p className="text-xs text-text-muted">Stops the run if any previous step failed. No configuration needed.</p>;
    default:                       return null;
  }
}

// ── sortable command node ─────────────────────────────────────────────────────

function SortableCommandNode({
  cmd, idx, isFirst, isLast, isExpanded,
  onToggle, onUpdate, onRemove, endpoints,
}: {
  cmd: BotJobCommand;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<BotJobCommand>) => void;
  onRemove: () => void;
  endpoints: CatalogEndpoint[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cmd.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const colorStyle = TYPE_STYLE[cmd.type] ?? 'border-l-slate-400 bg-slate-500/5';
  const dotColor   = TYPE_DOT[cmd.type] ?? 'bg-slate-400';

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'z-50 opacity-60' : ''}>
      {/* connector line above (except first node) */}
      {!isFirst && (
        <div className="flex justify-center">
          <div className="h-3 w-px bg-border" />
        </div>
      )}

      {/* node card */}
      <div className={`rounded-lg border border-border border-l-4 ${colorStyle} ${!cmd.enabled ? 'opacity-40' : ''}`}>
        {/* header */}
        <div className="flex items-center gap-2 px-2 py-2">
          {/* drag handle */}
          <button
            {...listeners} {...attributes}
            className="cursor-grab touch-none text-text-muted hover:text-text active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>

          <span className="w-5 text-center text-xs text-text-muted">{idx + 1}</span>
          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`} />
          <span className="flex-1 text-xs font-medium">{TYPE_LABELS[cmd.type] ?? cmd.type}</span>

          <input
            type="checkbox" title="Enabled"
            checked={cmd.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
          <button
            className="btn text-xs"
            onClick={onToggle}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
          <button className="btn text-xs text-danger" onClick={onRemove} title="Delete">✕</button>
        </div>

        {/* config panel */}
        {isExpanded && (
          <div className="border-t border-border px-3 py-3">
            <CommandConfigEditor
              cmd={cmd}
              onChange={(config) => onUpdate({ config })}
              endpoints={endpoints}
            />
          </div>
        )}
      </div>

      {/* connector arrow at bottom of last node */}
      {isLast && cmd.type !== 'STOP_ON_FAILURE' && (
        <div className="flex flex-col items-center">
          <div className="h-3 w-px bg-border" />
          <div className="text-xs text-text-muted">end</div>
        </div>
      )}
    </div>
  );
}

// ── palette panel ─────────────────────────────────────────────────────────────

function CommandPalette({ onAdd, disabled }: { onAdd: (type: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set(PALETTE_GROUPS.map((g) => g.label)));

  const toggleGroup = (label: string) =>
    setOpen((prev) => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });

  return (
    <div className="card h-fit">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Command Palette</div>
      <div className="space-y-2">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.label}>
            <button
              className={`flex w-full items-center justify-between text-xs font-semibold ${group.color} hover:opacity-80`}
              onClick={() => toggleGroup(group.label)}
            >
              <span>{group.label}</span>
              <span>{open.has(group.label) ? '▾' : '▸'}</span>
            </button>
            {open.has(group.label) && (
              <div className="mt-1 space-y-0.5 pl-1">
                {group.types.map((type) => (
                  <button
                    key={type}
                    disabled={disabled}
                    onClick={() => onAdd(type)}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[type] ?? 'bg-slate-400'}`} />
                    {TYPE_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function BotJobDesignerPage() {
  const [jobs, setJobs]             = useState<BotJob[]>([]);
  const [detail, setDetail]         = useState<BotJobDetail | null>(null);
  const [endpoints, setEndpoints]   = useState<CatalogEndpoint[]>([]);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // ── command helpers ─────────────────────────────────────────────────────────

  const addCommand = (type: string) => {
    if (!detail) return;
    const newCmd: BotJobCommand = {
      id: uid(), blockId, order: detail.commands.length,
      type, config: {}, enabled: true,
    };
    setDetail({ ...detail, commands: [...detail.commands, newCmd] });
    setExpanded((prev) => new Set([...prev, newCmd.id]));
    setSaved(false);
  };

  const updateCommand = (idx: number, patch: Partial<BotJobCommand>) => {
    if (!detail) return;
    setDetail({ ...detail, commands: detail.commands.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
    setSaved(false);
  };

  const removeCommand = (idx: number) => {
    if (!detail) return;
    setDetail({ ...detail, commands: detail.commands.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })) });
    setSaved(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !detail) return;
    const oldIdx = detail.commands.findIndex((c) => c.id === active.id);
    const newIdx = detail.commands.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(detail.commands, oldIdx, newIdx).map((c, i) => ({ ...c, order: i }));
    setDetail({ ...detail, commands: reordered });
    setSaved(false);
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

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
        subtitle="Drag commands to reorder. Click a type in the palette to add it to the canvas."
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_190px]">

        {/* ── Job list ── */}
        <div className="card h-fit">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Saved BotJobs</div>
          {jobs.length === 0 ? (
            <p className="text-xs text-text-muted">No BotJobs yet.</p>
          ) : (
            <ul className="space-y-1">
              {jobs.map((j) => (
                <li key={j.id}>
                  <button
                    className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-surface-alt ${detail?.job.id === j.id ? 'bg-surface-alt font-medium' : ''}`}
                    onClick={() => handleSelect(j.id)}
                  >
                    {j.name}
                    <span className="ml-1 text-xs text-text-muted">
                      ({(j as unknown as { commands?: unknown[] }).commands?.length ?? '?'} cmds)
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Canvas ── */}
        {!detail ? (
          <div className="card grid place-items-center text-center text-sm text-text-muted">
            <div>
              <p>Select a BotJob or create a new one.</p>
              <p className="mt-1 text-xs">Commands appear as a visual flow. Drag to reorder.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* job name / description */}
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

            {/* variables */}
            <div className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Variables</span>
                <button className="btn text-xs" onClick={addVariable}>+ Add</button>
              </div>
              {detail.variables.length === 0 ? (
                <p className="text-xs text-text-muted">No variables. Use ${'{'}varName{'}'} tokens in command configs.</p>
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

            {/* command canvas */}
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Flow Canvas</span>
                <span className="text-xs text-text-muted">{detail.commands.length} command{detail.commands.length !== 1 ? 's' : ''} — drag to reorder</span>
              </div>

              {detail.commands.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-text-muted">
                  Click a command type in the palette →<br />to add the first step
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={detail.commands.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0">
                      {detail.commands.map((cmd, idx) => (
                        <SortableCommandNode
                          key={cmd.id}
                          cmd={cmd}
                          idx={idx}
                          isFirst={idx === 0}
                          isLast={idx === detail.commands.length - 1}
                          isExpanded={expanded.has(cmd.id)}
                          onToggle={() => toggleExpanded(cmd.id)}
                          onUpdate={(patch) => updateCommand(idx, patch)}
                          onRemove={() => removeCommand(idx)}
                          endpoints={endpoints}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {/* ── Palette ── */}
        <CommandPalette onAdd={addCommand} disabled={!detail} />
      </div>
    </div>
  );
}
