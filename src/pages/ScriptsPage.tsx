import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Terminal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type BotJob, type Environment } from '@/services/sidecarClient';

const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function downloadInBrowser(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/x-shellscript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ScriptsPage() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<BotJob[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [botJobId, setBotJobId] = useState(searchParams.get('botJobId') ?? '');
  const [environmentId, setEnvironmentId] = useState(searchParams.get('environmentId') ?? '');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const tauri = isTauri();

  useEffect(() => {
    let cancelled = false;
    Promise.all([sidecar.listBotJobs(), sidecar.listEnvironments()])
      .then(([loadedJobs, loadedEnvironments]) => {
        if (cancelled) return;
        setJobs(loadedJobs);
        setEnvironments(loadedEnvironments);
        setBotJobId((selected) =>
          selected && loadedJobs.some((job) => job.id === selected) ? selected : '',
        );
        setEnvironmentId((selected) => {
          if (selected && loadedEnvironments.some((environment) => environment.id === selected)) {
            return selected;
          }
          return loadedEnvironments.find((environment) => environment.isDefault)?.id
            ?? loadedEnvironments[0]?.id
            ?? '';
        });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : String(loadError)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === botJobId),
    [botJobId, jobs],
  );
  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === environmentId),
    [environmentId, environments],
  );

  async function selectOutputDirectory() {
    if (!tauri) return;
    setError(null);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        recursive: false,
        multiple: false,
        title: 'Select folder for ARAPI Bash scripts',
      });
      if (typeof selected === 'string') {
        setOutputDirectory(selected);
        setResult(null);
      }
    } catch (browseError) {
      setError(browseError instanceof Error ? browseError.message : String(browseError));
    }
  }

  async function createScript() {
    if (!botJobId || !environmentId || (tauri && !outputDirectory)) return;
    setCreating(true);
    setError(null);
    setResult(null);
    try {
      const generated = await sidecar.exportBotJobBash(botJobId, environmentId);
      if (tauri) {
        const [{ join }, { writeTextFile }] = await Promise.all([
          import('@tauri-apps/api/path'),
          import('@tauri-apps/plugin-fs'),
        ]);
        const outputPath = await join(outputDirectory, generated.fileName);
        await writeTextFile(outputPath, generated.content);
        setResult(`Created ${generated.apiCallCount} curl call${generated.apiCallCount === 1 ? '' : 's'} in ${outputPath}`);
      } else {
        downloadInBrowser(generated.fileName, generated.content);
        setResult(`Downloaded ${generated.fileName} with ${generated.apiCallCount} curl call${generated.apiCallCount === 1 ? '' : 's'}.`);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Scripts"
        subtitle="Create a runnable Bash script containing the selected BotJob's ordered curl API calls."
      />

      <div className="max-w-2xl space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">BotJob</label>
            <select
              className="input"
              value={botJobId}
              onChange={(event) => { setBotJobId(event.target.value); setResult(null); setError(null); }}
              disabled={loading}
            >
              <option value="">— select a BotJob —</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Environment</label>
            <select
              className="input"
              value={environmentId}
              onChange={(event) => { setEnvironmentId(event.target.value); setResult(null); setError(null); }}
              disabled={loading}
            >
              <option value="">— select an environment —</option>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}{environment.isDefault ? ' ★' : ''}
                </option>
              ))}
            </select>
            {selectedEnvironment && (
              <p className="mt-1 text-xs text-text-muted">
                Base URL: <code>{selectedEnvironment.baseUrl}</code>
              </p>
            )}
          </div>

          {tauri ? (
            <div>
              <label className="label">Save directory</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={outputDirectory}
                  readOnly
                  placeholder="Select where the .sh file will be saved"
                />
                <button
                  type="button"
                  className="btn flex items-center gap-1.5"
                  onClick={selectOutputDirectory}
                >
                  <FolderOpen size={16} />
                  Browse
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Recommended: a dedicated folder such as <code>Documents\ARAPI\Scripts</code>,
                outside the application installation directory.
              </p>
            </div>
          ) : (
            <p className="rounded border border-border bg-surface-alt p-3 text-xs text-text-muted">
              The web version downloads the generated file using your browser's download settings.
              The desktop app lets you select an exact output directory.
            </p>
          )}

          {selectedJob && (
            <div className="rounded border border-border bg-surface-alt p-3 text-xs text-text-muted">
              Script source: <strong className="text-text">{selectedJob.name}</strong>. Disabled commands are excluded.
              Secret headers and secret BotJob variables are emitted as required Bash environment variables.
            </div>
          )}

          {error && <ErrorAlert message={error} />}
          {result && <p className="text-sm text-success">{result}</p>}

          <button
            className="btn btn-primary flex items-center gap-2 self-start"
            onClick={createScript}
            disabled={loading || creating || !botJobId || !environmentId || (tauri && !outputDirectory)}
          >
            <Terminal size={16} />
            {creating ? 'Creating…' : 'Create Bash Script'}
          </button>
        </div>

        <p className="text-xs text-text-muted">
          Run the generated file with <code>bash script-name.sh</code>. Review it before execution,
          especially when targeting a non-mock environment.
        </p>
      </div>
    </div>
  );
}
