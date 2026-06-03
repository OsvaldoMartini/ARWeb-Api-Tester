import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type AgentInfo } from '@/services/sidecarClient';
import { useAppStore } from '@/store/appStore';

interface Turn {
  role: 'user' | 'agent';
  text: string;
  agentId?: string;
}

export function AiAssistantPage() {
  const mode = useAppStore((s) => s.mode);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // Empty agentId => let the router pick the best agent.
      const ans = await sidecar.ask(q, mode, agentId || undefined);
      const text =
        ans.limitations.length > 0
          ? `${ans.answer}\n\n⚠ ${ans.limitations.join('\n⚠ ')}`
          : ans.answer;
      setTurns((t) => [...t, { role: 'agent', text, agentId: ans.agentName || ans.agentId }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Assistant"
        subtitle={`Multi-agent banking router (${mode} mode). Answers are grounded in the imported catalog — no invented endpoints or data.`}
        actions={
          <select
            className="input w-56"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Auto-route</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="card flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <p className="text-sm text-text-muted">
              Ask something like “Which endpoints let me check a client’s cash balance?”
            </p>
          ) : (
            turns.map((t, i) => (
              <div
                key={i}
                className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    'max-w-[80%] rounded-md px-3 py-2 text-sm ' +
                    (t.role === 'user'
                      ? 'bg-primary text-white'
                      : 'border border-border bg-surface-alt')
                  }
                >
                  {t.role === 'agent' && t.agentId ? (
                    <div className="mb-1 text-xs text-text-muted">{t.agentId}</div>
                  ) : null}
                  <div className="whitespace-pre-wrap">{t.text}</div>
                </div>
              </div>
            ))
          )}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
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
