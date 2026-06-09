import { useEffect, useState } from 'react';
import { Download, FileText, Table2, Braces, Terminal } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { sidecar, downloadUrl, type ExecutionRun } from '@/services/sidecarClient';

async function triggerDownload(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function fmt(run: ExecutionRun): string {
  const d = new Date(run.startedAt).toLocaleString();
  const badge = run.status === 'passed' ? '✓' : run.failedSteps > 0 ? '✗' : '·';
  return `${badge} ${d} — ${run.passedSteps}/${run.totalSteps} passed (${run.target})`;
}

export function ReportsPage() {
  const [runs, setRuns]         = useState<ExecutionRun[]>([]);
  const [runId, setRunId]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [busy, setBusy]         = useState<string | null>(null);
  const [dlError, setDlError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sidecar.listExecutions();
        if (!cancelled) {
          setRuns(data);
          if (data.length > 0) setRunId(data[0]!.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const download = async (key: string, url: string, filename: string) => {
    setBusy(key);
    setDlError(null);
    try {
      await triggerDownload(url, filename);
    } catch (e) {
      setDlError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const runExports = [
    {
      key: 'html',
      icon: <FileText size={20} />,
      name: 'HTML Report',
      desc: 'Human-readable run summary with pass/fail breakdown. Can be printed to PDF from the browser.',
      disabled: !runId,
      onExport: () => download('html', downloadUrl(`/executions/${runId}/report.html`), `run-${runId.slice(0, 8)}.html`),
    },
    {
      key: 'csv',
      icon: <Table2 size={20} />,
      name: 'CSV Export',
      desc: 'Tabular step results for spreadsheets and BI tools.',
      disabled: !runId,
      onExport: () => download('csv', downloadUrl(`/executions/${runId}/report.csv`), `run-${runId.slice(0, 8)}.csv`),
    },
  ];

  const catalogExports = [
    {
      key: 'postman',
      icon: <Braces size={20} />,
      name: 'Postman Collection',
      desc: 'Full API catalog as a Postman Collection v2.1 JSON. Import directly into Postman or Insomnia.',
      onExport: () => download('postman', downloadUrl('/catalog/export/postman'), 'arweb-postman-collection.json'),
    },
    {
      key: 'bash',
      icon: <Terminal size={20} />,
      name: 'Bash / curl Script',
      desc: 'One curl command per endpoint. Pipe to bash to replay all calls. Secrets are redacted.',
      onExport: () => download('bash', downloadUrl('/catalog/export/bash'), 'arweb-catalog.sh'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Exports"
        subtitle="Download execution results and API catalog in multiple formats. Secrets are redacted from all artifacts."
      />

      {/* run selector */}
      <div className="mb-6 card space-y-3">
        <div className="text-sm font-medium">Execution Run</div>
        {loading ? (
          <LoadingSpinner text="Loading execution history…" />
        ) : error ? (
          <ErrorAlert message={error} />
        ) : runs.length === 0 ? (
          <p className="text-sm text-text-muted">No execution runs yet. Run a BotJob first.</p>
        ) : (
          <select
            className="input max-w-xl"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{fmt(r)}</option>
            ))}
          </select>
        )}
      </div>

      {dlError && <div className="mb-4"><ErrorAlert message={dlError} /></div>}

      {/* run-based exports */}
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Run Exports</div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {runExports.map((e) => (
          <div key={e.key} className="card flex flex-col gap-3">
            <div className="flex items-center gap-2 text-text-muted">{e.icon}<span className="font-medium text-text">{e.name}</span></div>
            <p className="flex-1 text-sm text-text-muted">{e.desc}</p>
            <button
              className="btn btn-primary flex items-center gap-2 self-start"
              disabled={e.disabled || busy === e.key}
              onClick={e.onExport}
            >
              <Download size={14} />
              {busy === e.key ? 'Downloading…' : 'Download'}
            </button>
          </div>
        ))}
      </div>

      {/* catalog exports */}
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Catalog Exports</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {catalogExports.map((e) => (
          <div key={e.key} className="card flex flex-col gap-3">
            <div className="flex items-center gap-2 text-text-muted">{e.icon}<span className="font-medium text-text">{e.name}</span></div>
            <p className="flex-1 text-sm text-text-muted">{e.desc}</p>
            <button
              className="btn btn-primary flex items-center gap-2 self-start"
              disabled={busy === e.key}
              onClick={e.onExport}
            >
              <Download size={14} />
              {busy === e.key ? 'Downloading…' : 'Download'}
            </button>
          </div>
        ))}
      </div>

      {!loading && runs.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon="📊"
            title="No runs to export yet"
            body="Execute a BotJob from the Execute Tests page first, then come back here to download reports."
          />
        </div>
      )}
    </div>
  );
}
