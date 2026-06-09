import { useRef, useState } from 'react';
import { FolderOpen, Upload, FileText, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { sidecar } from '@/services/sidecarClient';

const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ── upload mode (works in browser + Tauri) ────────────────────────────────────

function UploadMode() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles]   = useState<File[]>([]);
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const accepted = Array.from(incoming).filter((f) =>
      /\.(ya?ml|json)$/i.test(f.name),
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...accepted.filter((f) => !names.has(f.name))];
    });
    setResult(null);
    setError(null);
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleImport() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const parsed = await Promise.all(
        files.map(
          (f) =>
            new Promise<{ name: string; content: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: f.name, content: reader.result as string });
              reader.onerror = () => reject(new Error(`Could not read ${f.name}`));
              reader.readAsText(f, 'utf-8');
            }),
        ),
      );
      const r = await sidecar.uploadSpecs(parsed);
      let msg = `Imported ${r.endpointsImported} endpoint${r.endpointsImported === 1 ? '' : 's'} from ${r.specsImported} spec${r.specsImported === 1 ? '' : 's'}.`;
      if (r.failures.length > 0) {
        msg += ` ${r.failures.length} file(s) failed: ${r.failures.map((f) => f.file).join(', ')}.`;
      }
      setResult(msg);
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* drop zone */}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface-alt'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <Upload size={28} className="text-text-muted" />
        <div>
          <p className="text-sm font-medium">Drop OpenAPI files here or click to browse</p>
          <p className="mt-0.5 text-xs text-text-muted">Accepts .yaml · .yml · .json — multiple files allowed</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".yaml,.yml,.json"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* file list */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded border border-border bg-surface-alt px-3 py-1.5 text-xs">
              <FileText size={13} className="flex-shrink-0 text-text-muted" />
              <span className="flex-1 truncate font-mono">{f.name}</span>
              <span className="text-text-muted">{(f.size / 1024).toFixed(1)} KB</span>
              <button
                className="ml-1 rounded p-0.5 hover:bg-surface"
                onClick={() => removeFile(f.name)}
                title="Remove"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error  && <ErrorAlert message={error} />}
      {result && <p className="text-sm text-success">{result}</p>}

      <button
        className="btn btn-primary"
        onClick={handleImport}
        disabled={busy || !files.length}
      >
        {busy ? 'Importing…' : `Import${files.length > 0 ? ` ${files.length} file${files.length === 1 ? '' : 's'}` : ''}`}
      </button>
    </div>
  );
}

// ── folder path mode (Tauri primary, web fallback for server paths) ────────────

function FolderMode() {
  const [rootPath, setRootPath] = useState('');
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const tauri = isTauri();

  async function handleBrowse() {
    if (!tauri) return;
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false, title: 'Select API specs folder' });
      if (typeof selected === 'string') setRootPath(selected);
    } catch (e) {
      console.error('Folder picker failed:', e);
    }
  }

  async function handleImport() {
    if (!rootPath.trim()) { setError('Enter a folder path first.'); return; }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await sidecar.import(rootPath.trim());
      let msg = `Imported ${r.endpointsImported} endpoint${r.endpointsImported === 1 ? '' : 's'} from ${r.specsImported} spec${r.specsImported === 1 ? '' : 's'}.`;
      if (r.failures.length > 0) {
        msg += ` ${r.failures.length} file(s) failed: ${r.failures.map((f) => f.file).join(', ')}.`;
      }
      setResult(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={tauri ? 'C:\\Users\\you\\specs  or  /home/you/specs' : '/server/path/to/openapi-specs'}
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        />
        <button
          type="button"
          className="btn flex items-center gap-1.5 px-3"
          onClick={handleBrowse}
          disabled={!tauri}
          title={tauri ? 'Browse for folder' : 'Only available in the desktop app — paste a server path manually'}
        >
          <FolderOpen size={16} />
          <span className="hidden sm:inline">Browse</span>
        </button>
      </div>

      {!tauri && (
        <p className="text-xs text-text-muted">
          On the web version, enter a path on the <strong>server</strong> (e.g.{' '}
          <code>/app/data/specs</code>). To import your local files, use the{' '}
          <strong>Upload Files</strong> tab above.
        </p>
      )}

      {error  && <ErrorAlert message={error} />}
      {result && <p className="text-sm text-success">{result}</p>}

      <button
        className="btn btn-primary"
        onClick={handleImport}
        disabled={busy || !rootPath.trim()}
      >
        {busy ? 'Importing…' : 'Import'}
      </button>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'folder';

export function ImportApisPage() {
  const [tab, setTab] = useState<Tab>(isTauri() ? 'folder' : 'upload');

  return (
    <div>
      <PageHeader
        title="Import APIs"
        subtitle="Load OpenAPI/Swagger specs into the catalog. Upload files from your browser, or point to a folder path."
      />

      <div className="max-w-2xl">
        {/* tab bar */}
        <div className="mb-4 flex gap-1 border-b border-border">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'upload'
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text'
            }`}
            onClick={() => setTab('upload')}
          >
            Upload Files
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'folder'
                ? 'border-b-2 border-primary text-primary'
                : 'text-text-muted hover:text-text'
            }`}
            onClick={() => setTab('folder')}
          >
            {isTauri() ? 'Folder (Desktop)' : 'Server Path'}
          </button>
        </div>

        <div className="card">
          {tab === 'upload' ? <UploadMode /> : <FolderMode />}
        </div>

        <p className="mt-3 text-xs text-text-muted">
          The importer ignores <code>node_modules</code>, <code>dist</code>, <code>build</code>,{' '}
          <code>.git</code>, <code>bin</code> and <code>obj</code>. Only endpoints found in real
          specs become available — nothing is invented.
        </p>
      </div>
    </div>
  );
}
