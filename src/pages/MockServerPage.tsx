import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type MockStatus } from '@/services/sidecarClient';

export function MockServerPage() {
  const [status, setStatus] = useState<MockStatus | null>(null);
  const [log, setLog] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await sidecar.mockStatus();
      setStatus(s);
      if (s.running) {
        const entries = await sidecar.mockLog();
        setLog(entries);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 3000);
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
      // Stop returns no port; re-fetch authoritative status either way.
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const running = status?.running ?? false;

  return (
    <div>
      <PageHeader
        title="Mock Server"
        subtitle="A local mock server (bound to 127.0.0.1) replays catalog endpoints so you can build and run tests with no real backend."
        actions={
          <button
            className={'btn ' + (running ? '' : 'btn-primary')}
            onClick={toggle}
            disabled={busy}
          >
            {busy ? '…' : running ? 'Stop' : 'Start'}
          </button>
        }
      />

      <div className="card mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className={'badge ' + (running ? 'badge-passed' : 'badge-unmapped')}>
            {running ? 'running' : 'stopped'}
          </span>
          {status ? (
            <span className="text-text-muted">
              port <code>{status.port}</code> · base{' '}
              <code>http://127.0.0.1:{status.port}</code>
            </span>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>

      <div className="card p-0">
        <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-text-muted">
          Request log
        </div>
        {log.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">No requests captured yet.</p>
        ) : (
          <pre className="max-h-96 overflow-auto p-4 text-xs">
            {JSON.stringify(log, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
