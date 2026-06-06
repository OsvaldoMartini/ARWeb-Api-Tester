import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type MockStatus, type MockLogEntry } from '@/services/sidecarClient';

// ── method badge ──────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET:     'bg-info/10 text-info border-info/30',
  POST:    'bg-success/10 text-success border-success/30',
  PUT:     'bg-warning/10 text-warning border-warning/30',
  PATCH:   'bg-warning/10 text-warning border-warning/30',
  DELETE:  'bg-danger/10 text-danger border-danger/30',
  HEAD:    'bg-surface-alt text-text-muted border-border',
  OPTIONS: 'bg-surface-alt text-text-muted border-border',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${METHOD_COLOR[method] ?? 'bg-surface-alt text-text-muted border-border'}`}>
      {method}
    </span>
  );
}

function statusColor(code: number): string {
  if (code < 300) return 'text-success';
  if (code < 400) return 'text-info';
  if (code < 500) return 'text-warning';
  return 'text-danger';
}

// ── stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ log }: { log: MockLogEntry[] }) {
  if (log.length === 0) return null;
  const matched = log.filter((e) => e.matched).length;
  const pct = Math.round((matched / log.length) * 100);
  const pathCounts = log.reduce<Record<string, number>>((acc, e) => {
    acc[e.path] = (acc[e.path] ?? 0) + 1;
    return acc;
  }, {});
  const topPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <div>
        <div className="label">Total</div>
        <span className="font-medium">{log.length}</span>
      </div>
      <div>
        <div className="label">Matched</div>
        <span className={`font-medium ${matched === log.length ? 'text-success' : 'text-warning'}`}>
          {matched} / {log.length} ({pct}%)
        </span>
      </div>
      {topPath && (
        <div>
          <div className="label">Most hit</div>
          <code className="text-xs">{topPath[0]} ({topPath[1]}×)</code>
        </div>
      )}
    </div>
  );
}

// ── request log table ─────────────────────────────────────────────────────────

function RequestLog({ log, onClear }: { log: MockLogEntry[]; onClear: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="card p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Request log{log.length > 0 && <span className="ml-1 normal-case font-normal">({log.length})</span>}
        </span>
        {log.length > 0 && (
          <button className="btn text-xs" onClick={onClear}>Clear</button>
        )}
      </div>

      {log.length === 0 ? (
        <p className="p-4 text-sm text-text-muted">
          No requests yet. Start the server then run a BotJob with{' '}
          <strong>Target: Mock</strong> to send traffic.
        </p>
      ) : (
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface-alt">
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Path</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-center">Match</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-border/50 hover:bg-surface-alt ${!entry.matched ? 'opacity-60' : ''}`}
                >
                  <td className="px-3 py-1.5 text-text-muted">{entry.id}</td>
                  <td className="px-3 py-1.5 text-text-muted whitespace-nowrap">
                    {new Date(entry.at).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-1.5"><MethodBadge method={entry.method} /></td>
                  <td className="px-3 py-1.5 font-mono max-w-xs truncate" title={entry.path}>{entry.path}</td>
                  <td className={`px-3 py-1.5 font-mono font-medium ${statusColor(entry.status)}`}>
                    {entry.status}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {entry.matched
                      ? <span className="text-success" title="Matched an imported endpoint">✓</span>
                      : <span className="text-danger" title="No imported endpoint matched">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function MockServerPage() {
  const [status, setStatus] = useState<MockStatus | null>(null);
  const [log, setLog]       = useState<MockLogEntry[]>([]);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await sidecar.mockStatus();
      setStatus(s);
      if (s.running) setLog(await sidecar.mockLog());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 2000);
    return () => window.clearInterval(id);
  }, []);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (status?.running) {
        await sidecar.mockStop();
      } else {
        await sidecar.mockStart();
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    try { await sidecar.mockClearLog(); } catch { /* ignore */ }
    setLog([]);
  }

  const running = status?.running ?? false;

  return (
    <div>
      <PageHeader
        title="Mock Server"
        subtitle="Replays imported catalog endpoints locally — run BotJobs without a live banking backend."
        actions={
          <button className={`btn ${running ? '' : 'btn-primary'}`} onClick={toggle} disabled={busy}>
            {busy ? '…' : running ? '■ Stop' : '▶ Start'}
          </button>
        }
      />

      <div className="card mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${running ? 'bg-success/10 text-success' : 'bg-surface-alt text-text-muted'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
            {running ? 'Running' : 'Stopped'}
          </span>
          {status && (
            <span className="text-sm text-text-muted">
              port <code>{status.port}</code> · <code>http://127.0.0.1:{status.port}</code>
            </span>
          )}
        </div>

        {running && <StatsBar log={log} />}

        {!running && (
          <p className="text-xs text-text-muted">
            Starting loads all imported catalog endpoints. Unrecognised paths return{' '}
            <code>404</code> and appear as <span className="text-danger font-bold">✗</span> in the log.
            Use <strong>Execute Tests → Target: Mock</strong> to send traffic.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <RequestLog log={log} onClear={handleClear} />
    </div>
  );
}
