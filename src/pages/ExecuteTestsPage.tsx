import { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  sidecar,
  type BotJob,
  type ExecutionRun,
  type ExecutionStep,
  type AssertionResult,
  type Environment,
} from '@/services/sidecarClient';

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_BG: Record<string, string> = {
  passed:  'bg-success/10 text-success border-success/30',
  failed:  'bg-danger/10 text-danger border-danger/30',
  error:   'bg-warning/10 text-warning border-warning/30',
  skipped: 'bg-surface-alt text-text-muted border-border',
  running: 'bg-info/10 text-info border-info/30',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_BG[status] ?? 'bg-surface-alt text-text-muted border-border'}`}>
      {status}
    </span>
  );
}

// ── assertion row ─────────────────────────────────────────────────────────────

function AssertionRow({ ar }: { ar: AssertionResult }) {
  return (
    <div className={`flex items-start gap-2 text-xs ${ar.passed ? 'text-success' : 'text-danger'}`}>
      <span>{ar.passed ? '✓' : '✗'}</span>
      <span className="flex-1">{ar.description}</span>
      {!ar.passed && ar.expected !== undefined && (
        <span className="text-text-muted">
          expected <code>{JSON.stringify(ar.expected)}</code>, got <code>{JSON.stringify(ar.actual)}</code>
        </span>
      )}
    </div>
  );
}

// ── step card ─────────────────────────────────────────────────────────────────

function StepCard({ step, idx }: { step: ExecutionStep; idx: number }) {
  const [open, setOpen] = useState(step.status === 'failed' || step.status === 'error');

  return (
    <div className={`rounded border bg-surface-alt ${step.status === 'failed' || step.status === 'error' ? 'border-danger/30' : 'border-border'}`}>
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="w-5 text-center text-xs text-text-muted">{idx + 1}</span>
        <StatusBadge status={step.status} />
        <span className="flex-1 font-mono text-xs">{step.commandType}</span>
        <span className="text-xs text-text-muted">{step.durationMs} ms</span>
        <span className="text-xs text-text-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-3 py-3 text-xs">
          {step.errorMessage && (
            <p className="text-warning">{step.errorMessage}</p>
          )}
          {step.assertionResults.length > 0 && (
            <div className="space-y-1">
              {step.assertionResults.map((ar, i) => <AssertionRow key={i} ar={ar} />)}
            </div>
          )}
          {step.request && (
            <details>
              <summary className="cursor-pointer text-text-muted">Request</summary>
              <pre className="mt-1 overflow-auto rounded bg-surface p-2 text-[10px]">{JSON.stringify(JSON.parse(step.request), null, 2)}</pre>
            </details>
          )}
          {step.response && (
            <details>
              <summary className="cursor-pointer text-text-muted">Response</summary>
              <pre className="mt-1 overflow-auto rounded bg-surface p-2 text-[10px]">{JSON.stringify(JSON.parse(step.response), null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── run summary ───────────────────────────────────────────────────────────────

function RunSummary({ run }: { run: ExecutionRun }) {
  const duration = run.finishedAt
    ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()))
    : null;

  return (
    <div className="card flex flex-wrap items-center gap-6 text-sm">
      <div>
        <div className="label">Status</div>
        <StatusBadge status={run.status} />
      </div>
      <div>
        <div className="label">Target</div>
        <code>{run.target}</code>
      </div>
      <div>
        <div className="label">Steps</div>
        <span>
          <span className="text-success">{run.passedSteps} passed</span>
          {run.failedSteps > 0 && <>, <span className="text-danger">{run.failedSteps} failed</span></>}
          {' '}/ {run.totalSteps} total
        </span>
      </div>
      {duration !== null && (
        <div>
          <div className="label">Duration</div>
          <span>{duration} ms</span>
        </div>
      )}
      <div>
        <div className="label">Run ID</div>
        <code className="text-xs text-text-muted">{run.id.slice(0, 8)}…</code>
      </div>
    </div>
  );
}

// ── history list ──────────────────────────────────────────────────────────────

function HistoryList({ jobs, onSelect }: { jobs: BotJob[]; onSelect: (runId: string, run: ExecutionRun, steps: ExecutionStep[]) => void }) {
  const [runs, setRuns]         = useState<ExecutionRun[]>([]);
  const [filterJobId, setFilterJobId] = useState('');
  const [histError, setHistError] = useState<string | null>(null);

  useEffect(() => {
    setHistError(null);
    sidecar.listExecutions(filterJobId || undefined)
      .then(setRuns)
      .catch((e) => setHistError(e instanceof Error ? e.message : String(e)));
  }, [filterJobId]);

  const loadRun = async (run: ExecutionRun) => {
    const steps = await sidecar.getExecutionSteps(run.id);
    onSelect(run.id, run, steps);
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Execution History</span>
        <select
          className="input text-xs"
          value={filterJobId}
          onChange={(e) => setFilterJobId(e.target.value)}
        >
          <option value="">All BotJobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
      </div>
      {histError && <ErrorAlert message={histError} />}
      {!histError && runs.length === 0 ? (
        <p className="text-xs text-text-muted">No executions yet.</p>
      ) : (
        <ul className="space-y-1">
          {runs.map((r) => {
            const jobName = jobs.find((j) => j.id === r.botJobId)?.name ?? r.botJobId.slice(0, 8);
            return (
              <li key={r.id}>
                <button
                  className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-surface-alt"
                  onClick={() => loadRun(r)}
                >
                  <StatusBadge status={r.status} />
                  <span className="flex-1">{jobName}</span>
                  <span className="text-text-muted">{r.target}</span>
                  <span className="text-text-muted">{new Date(r.startedAt).toLocaleTimeString()}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export function ExecuteTestsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs]         = useState<BotJob[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [envs, setEnvs]         = useState<Environment[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [environmentId, setEnvironmentId] = useState('mock');
  const [running, setRunning]   = useState(false);
  const [run, setRun]           = useState<ExecutionRun | null>(null);
  const [steps, setSteps]       = useState<ExecutionStep[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    sidecar.listBotJobs()
      .then(setJobs)
      .catch((e) => setJobsError(e instanceof Error ? e.message : String(e)));
    sidecar.listEnvironments()
      .then((list) => {
        setEnvs(list);
        const def = list.find((e) => e.isDefault);
        if (def) setEnvironmentId(def.id);
      })
      .catch(() => {});
  }, []);

  const handleRun = async () => {
    if (!selectedJobId) return;
    setRunning(true);
    setError(null);
    setRun(null);
    setSteps([]);
    try {
      const result = await sidecar.executeBotJob(selectedJobId, environmentId);
      setRun(result.run);
      setSteps(result.steps);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const handleHistorySelect = (_runId: string, r: ExecutionRun, s: ExecutionStep[]) => {
    setRun(r);
    setSteps(s);
    setShowHistory(false);
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div>
      <PageHeader
        title="Execute Tests"
        subtitle="Run BotJobs against the mock server or a real base URL, and watch the step-by-step audit trail."
        actions={
          <>
            <button
              className="btn text-xs"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Hide History' : 'History'}
            </button>
            <select
              className="input w-44 text-sm"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              title="Execution environment"
            >
              {envs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.isDefault ? ' ★' : ''}
                </option>
              ))}
              {envs.length === 0 && <option value="mock">Mock Server</option>}
            </select>
            {selectedJobId && (
              <button
                className="btn flex items-center gap-1.5"
                onClick={() => navigate(
                  `/scripts?botJobId=${encodeURIComponent(selectedJobId)}&environmentId=${encodeURIComponent(environmentId)}`,
                )}
              >
                <Terminal size={16} />
                Create Scripts
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={handleRun}
              disabled={!selectedJobId || running}
            >
              {running ? 'Running…' : 'Run'}
            </button>
          </>
        }
      />

      {error     && <div className="mb-3"><ErrorAlert message={error} /></div>}
      {jobsError && <div className="mb-3"><ErrorAlert message={`Could not load BotJobs: ${jobsError}`} /></div>}

      {/* job selector */}
      <div className="mb-4 flex items-center gap-3">
        <label className="label whitespace-nowrap">BotJob</label>
        <select
          className="input max-w-sm"
          value={selectedJobId}
          onChange={(e) => { setSelectedJobId(e.target.value); setRun(null); setSteps([]); setError(null); }}
        >
          <option value="">— select a BotJob —</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
        </select>
        {selectedJob && (() => {
          const env = envs.find((e) => e.id === environmentId);
          return env ? (
            <span className="text-xs text-text-muted">
              Environment: <strong>{env.name}</strong>
              {' · '}<code className="text-[11px]">{env.baseUrl}</code>
            </span>
          ) : null;
        })()}
      </div>

      {/* history panel */}
      {showHistory && (
        <div className="mb-4">
          <HistoryList jobs={jobs} onSelect={handleHistorySelect} />
        </div>
      )}

      {/* results */}
      {run && (
        <div className="space-y-4">
          <RunSummary run={run} />
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <StepCard key={step.id} step={step} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {!run && !running && !showHistory && (
        <EmptyState
          icon={selectedJobId ? '▶' : '🤖'}
          title={selectedJobId ? 'Ready to run' : 'No BotJob selected'}
          body={selectedJobId
            ? 'Press Run to execute. Every step records request, response, assertions, and timing.'
            : 'Select a BotJob above, then press Run. Create BotJobs in the Designer page first.'}
        />
      )}

      {running && (
        <EmptyState icon="⏳" title="Running…" body="Steps execute sequentially. Results will appear here." />
      )}
    </div>
  );
}
