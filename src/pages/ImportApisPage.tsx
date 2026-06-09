import { useRef, useState } from 'react';
import { FolderOpen, Upload, FileText, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { sidecar } from '@/services/sidecarClient';

const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ── upload mode (works in browser + Tauri) ────────────────────────────────────

interface FileEntry {
  /** Relative path used as filename sent to server (preserves subfolder structure). */
  key: string;
  file: File;
}

function fileKey(f: File): string {
  return f.webkitRelativePath || f.name;
}

function UploadMode() {
  const filesInputRef  = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const accepted: FileEntry[] = Array.from(incoming)
      .filter((f) => /\.(ya?ml|json)$/i.test(f.name))
      .map((f) => ({ key: fileKey(f), file: f }));

    setEntries((prev) => {
      const keys = new Set(prev.map((e) => e.key));
      return [...prev, ...accepted.filter((e) => !keys.has(e.key))];
    });
    setResult(null);
    setError(null);
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  }

  async function handleImport() {
    if (!entries.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const settled = await Promise.allSettled(
        entries.map(
          ({ key, file }) =>
            new Promise<{ name: string; content: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ name: key, content: reader.result as string });
              reader.onerror = () => reject(new Error(`Could not read ${key}`));
              reader.readAsText(file, 'utf-8');
            }),
        ),
      );

      const readOk: { name: string; content: string }[] = [];
      const readFailed: string[] = [];
      settled.forEach((s, i) => {
        if (s.status === 'fulfilled') {
          readOk.push(s.value);
        } else {
          const key = entries[i]!.key;
          console.error(`[upload] FileReader failed for "${key}":`, (s as PromiseRejectedResult).reason);
          readFailed.push(key);
        }
      });

      if (!readOk.length) {
        setError(`Could not read any of the selected files (${readFailed.length} failed).`);
        return;
      }

      const r = await sidecar.uploadSpecs(readOk);
      const totalFailed = r.failures.length + readFailed.length;
      let msg = `Imported ${r.endpointsImported} endpoint${r.endpointsImported === 1 ? '' : 's'} from ${r.specsImported} spec${r.specsImported === 1 ? '' : 's'}.`;
      if (totalFailed > 0) {
        const names = [...readFailed, ...r.failures.map((f) => f.file)];
        msg += ` ${totalFailed} file(s) skipped — check the browser console for details: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` … +${names.length - 5} more` : ''}.`;
      }
      setResult(msg);
      setEntries([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* drop zone — click opens file picker; folder button below opens folder picker */}
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface-alt'
        }`}
        onClick={() => filesInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <Upload size={28} className="text-text-muted" />
        <div>
          <p className="text-sm font-medium">Drop files or a folder here, or use the buttons below</p>
          <p className="mt-0.5 text-xs text-text-muted">Accepts .yaml · .yml · .json — subfolders are scanned automatically</p>
        </div>
      </div>

      {/* hidden inputs */}
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept=".yaml,.yml,.json"
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      {/* webkitdirectory is not in React's typings — spread it as a plain attribute */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept=".yaml,.yml,.json"
        className="hidden"
        {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* picker buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn flex items-center gap-1.5"
          onClick={() => filesInputRef.current?.click()}
        >
          <FileText size={15} /> Browse Files
        </button>
        <button
          type="button"
          className="btn flex items-center gap-1.5"
          onClick={() => folderInputRef.current?.click()}
          title="Select an entire folder — subfolders are included automatically"
        >
          <FolderOpen size={15} /> Browse Folder
        </button>
      </div>

      {/* file list */}
      {entries.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {entries.map(({ key, file }) => (
            <li key={key} className="flex items-center gap-2 rounded border border-border bg-surface-alt px-3 py-1.5 text-xs">
              <FileText size={13} className="flex-shrink-0 text-text-muted" />
              <span className="flex-1 truncate font-mono" title={key}>{key}</span>
              <span className="flex-shrink-0 text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
              <button
                className="ml-1 flex-shrink-0 rounded p-0.5 hover:bg-surface"
                onClick={() => removeEntry(key)}
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
        disabled={busy || !entries.length}
      >
        {busy ? 'Importing…' : `Import${entries.length > 0 ? ` ${entries.length} file${entries.length === 1 ? '' : 's'}` : ''}`}
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
