import { useEffect, useRef, useState } from 'react';
import { X, Info } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type AgentInfo, type AgentAnswer } from '@/services/sidecarClient';
import { useAppStore } from '@/store/appStore';

// ── constants ─────────────────────────────────────────────────────────────────

const INTRO_SEEN_KEY = 'arweb_assistant_intro_seen';

const EMPLOYEE_EXAMPLES = [
  'Show me the full customer 360 profile for client Mario Rossi.',
  'Check if this client has any compliance or tax remediation issues.',
  "Generate a summary of the client's portfolio exposure by asset class.",
  'Verify if there are pending payments, blocked transactions, or missing documents.',
  'Prepare a report for the relationship manager before the client meeting.',
];

const CLIENT_EXAMPLES = [
  'What is the current balance of my accounts?',
  'Show me my recent transactions.',
  'How much did I spend this month by category?',
  'Can you explain the performance of my investment portfolio?',
  'Do I have any upcoming payments or pending approvals?',
  'Can you help me understand the fees charged on my account?',
];

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
  const wired   = agents.filter((a) => a.capabilityCount > 0);
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

// ── welcome modal ─────────────────────────────────────────────────────────────

interface WelcomeModalProps {
  currentMode: 'employee' | 'client';
  onSelect: (mode: 'employee' | 'client') => void;
  onClose: () => void;
}

function WelcomeModal({ currentMode, onSelect, onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl rounded-lg border border-border bg-surface shadow-2xl">

        {/* header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">AR Conversational Banking</h2>
            <p className="mt-0.5 text-xs text-text-muted">Select a conversation perspective to begin</p>
          </div>
          <button
            className="ml-4 shrink-0 rounded p-1 text-text-muted hover:bg-surface-alt hover:text-text"
            onClick={onClose}
            title="Close without changing mode"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="space-y-4 px-6 py-4">
          <p className="text-sm leading-relaxed text-text-muted">
            In the AR Conversational Banking module, we also need the possibility to simulate requests
            coming either from a bank employee or from an end client, as if the client were interacting
            through the e-banking channel. This means the system should support different conversation
            scenarios, for example:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* employee */}
            <div className="rounded-md border border-border bg-surface-alt p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">👔</span>
                <span className="text-sm font-medium">Employee Mode</span>
              </div>
              <ul className="space-y-1.5">
                {EMPLOYEE_EXAMPLES.map((ex, i) => (
                  <li key={i} className="text-xs leading-snug text-text-muted">
                    <span className="mr-1 text-text-muted">›</span>
                    <span className="italic">"{ex}"</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* client */}
            <div className="rounded-md border border-border bg-surface-alt p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">📱</span>
                <span className="text-sm font-medium">Client / e-Banking Mode</span>
              </div>
              <ul className="space-y-1.5">
                {CLIENT_EXAMPLES.map((ex, i) => (
                  <li key={i} className="text-xs leading-snug text-text-muted">
                    <span className="mr-1 text-text-muted">›</span>
                    <span className="italic">"{ex}"</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="border-t border-border pt-3 text-xs leading-relaxed text-text-muted">
            The objective is to make AR Conversational Banking able to reproduce realistic banking
            conversations from both perspectives: internal bank staff and digital banking clients.
          </p>
        </div>

        {/* footer */}
        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
              currentMode === 'employee'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface-alt hover:bg-surface hover:border-primary hover:text-primary'
            }`}
            onClick={() => onSelect('employee')}
          >
            👔 Start as Bank Employee
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
              currentMode === 'client'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface-alt hover:bg-surface hover:border-primary hover:text-primary'
            }`}
            onClick={() => onSelect('client')}
          >
            📱 Start as e-Banking Client
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const mode    = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);

  const [agents, setAgents]         = useState<AgentInfo[]>([]);
  const [agentId, setAgentId]       = useState('');
  const [question, setQuestion]     = useState('');
  const [turns, setTurns]           = useState<Turn[]>([]);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showCaps, setShowCaps]     = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem(INTRO_SEEN_KEY)) {
      setShowWelcome(true);
    }
    sidecar.getAgents().then(setAgents).catch(() => undefined);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  function handleModeSelect(m: 'employee' | 'client') {
    setMode(m);
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setShowWelcome(false);
  }

  function handleWelcomeClose() {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setShowWelcome(false);
  }

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
  const modeLabel = mode === 'employee' ? '👔 Employee' : '📱 e-Banking Client';

  return (
    <>
      {showWelcome && (
        <WelcomeModal
          currentMode={mode}
          onSelect={handleModeSelect}
          onClose={handleWelcomeClose}
        />
      )}

      <div className="flex h-full flex-col">
        <PageHeader
          title="AR Conversational Banking"
          subtitle={`${modeLabel} · ${totalCaps} endpoints wired across ${agents.filter((a) => a.capabilityCount > 0).length} agents`}
          actions={
            <div className="flex items-center gap-2">
              <button
                className="btn text-xs gap-1"
                onClick={() => setShowWelcome(true)}
                title="Switch conversation mode"
              >
                <Info size={14} />
                Mode
              </button>
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
                {mode === 'employee'
                  ? 'Ask something like "Show me the full customer 360 profile for client Mario Rossi" or "Check for compliance issues."'
                  : 'Ask something like "What is the current balance of my accounts?" or "Show me my recent transactions."'}
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
              placeholder={
                mode === 'employee'
                  ? 'Ask as a bank employee…'
                  : 'Ask as an e-banking client…'
              }
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
    </>
  );
}
