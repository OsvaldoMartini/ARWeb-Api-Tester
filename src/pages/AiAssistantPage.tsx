import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type AgentInfo, type AgentAnswer } from '@/services/sidecarClient';
import { useAppStore } from '@/store/appStore';

// ── evidence pill ─────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-info/10 text-info',
  POST:   'bg-success/10 text-success',
  PUT:    'bg-warning/10 text-warning',
  PATCH:  'bg-warning/10 text-warning',
  DELETE: 'bg-danger/10 text-danger',
};

function EvidencePill({ method, path }: { method: string; path: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono ${METHOD_COLOR[method] ?? 'bg-surface-alt text-text-muted'}`}>
      <span className="font-semibold">{method}</span>
      <span className="opacity-80">{path}</span>
    </span>
  );
}

// ── conversation turn ─────────────────────────────────────────────────────────

interface Turn {
  role: 'user' | 'agent';
  text: string;
  agentName?: string;
  evidence?: AgentAnswer['evidence'];
  limitations?: string[];
}

function AgentBubble({ turn }: { turn: Turn }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const hasEvidence = (turn.evidence?.length ?? 0) > 0;
  const hasLimitations = (turn.limitations?.length ?? 0) > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm">
          {turn.agentName && (
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {turn.agentName}
            </div>
          )}
          <div className="whitespace-pre-wrap">{turn.text}</div>

          {hasLimitations && (
            <div className="mt-2 space-y-0.5">
              {turn.limitations!.map((l, i) => (
                <p key={i} className="text-xs text-warning">⚠ {l}</p>
              ))}
            </div>
          )}
        </div>

        {hasEvidence && (
          <div>
            <button
              className="text-[10px] text-text-muted underline-offset-2 hover:underline"
              onClick={() => setShowEvidence((v) => !v)}
            >
              {showEvidence ? '▲ hide' : '▼ show'} {turn.evidence!.length} endpoint{turn.evidence!.length !== 1 ? 's' : ''} used
            </button>
            {showEvidence && (
              <div className="mt-1 flex flex-wrap gap-1">
                {turn.evidence!.map((e) => (
                  <EvidencePill key={e.endpointId} method={e.method} path={e.path} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── capabilities panel ────────────────────────────────────────────────────────

function CapabilitiesPanel({ agents }: { agents: AgentInfo[] }) {
  const wired = agents.filter((a) => a.capabilityCount > 0);
  const unwired = agents.filter((a) => a.capabilityCount === 0);

  return (
    <div className="card mb-4 text-xs">
      <div className="mb-2 font-medium text-sm">Agent catalog coverage</div>
      {wired.length === 0 ? (
        <p className="text-text-muted">No endpoints assigned yet — import an OpenAPI spec first.</p>
      ) : (
        <div className="space-y-1">
          {wired.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span className="flex-1">{a.name}</span>
              <span className="text-text-muted">{a.capabilityCount} endpoint{a.capabilityCount !== 1 ? 's' : ''}</span>
            </div>
          ))}
          {unwired.map((a) => (
            <div key={a.id} className="flex items-center gap-2 opacity-40">
              <span className="text-text-muted">○</span>
              <span className="flex-1">{a.name}</span>
              <span className="text-text-muted">no match</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const mode = useAppStore((s) => s.mode);
  const [agents, setAgents]       = useState<AgentInfo[]>([]);
  const [agentId, setAgentId]     = useState('');
  const [question, setQuestion]   = useState('');
  const [turns, setTurns]         = useState<Turn[]>([]);
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showCaps, setShowCaps]   = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sidecar.getAgents().then(setAgents).catch(() => undefined);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  async function send() {
    const q = question.trim();
    if (!q || busy) return;
    setTurns((t) => [...t, { role: 'user', text: q }]);
    setQuestion('');
    setBusy(true);
    setError(null);
    try {
      const ans = await sidecar.ask(q, mode, agentId || undefined);
      setTurns((t) => [
        ...t,
        {
          role: 'agent',
          text: ans.answer,
          agentName: ans.agentName || ans.agentId,
          evidence: ans.evidence,
          limitations: ans.limitations,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const totalCaps = agents.reduce((s, a) => s + a.capabilityCount, 0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle={`Multi-agent banking router · ${mode} mode · ${totalCaps} endpoints wired across ${agents.filter(a => a.capabilityCount > 0).length} agents`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn text-xs" onClick={() => setShowCaps((v) => !v)}>
              Coverage
            </button>
            <select
              className="input w-52"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">Auto-route</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.capabilityCount > 0 ? ` (${a.capabilityCount})` : ' ○'}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {showCaps && <CapabilitiesPanel agents={agents} />}

      <div className="card flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <p className="text-sm text-text-muted">
              Ask something like "Which endpoints let me check a client's cash balance?" or "How do I initiate a SEPA transfer?"
            </p>
          ) : (
            turns.map((t, i) =>
              t.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-md bg-primary px-3 py-2 text-sm text-white">
                    {t.text}
                  </div>
                </div>
              ) : (
                <AgentBubble key={i} turn={t} />
              )
            )
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="input"
            placeholder="Ask the banking agents…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn btn-primary" onClick={send} disabled={busy}>
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
