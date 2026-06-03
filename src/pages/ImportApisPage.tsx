import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar } from '@/services/sidecarClient';

export function ImportApisPage() {
  const [rootPath, setRootPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!rootPath.trim()) {
      setError('Enter a folder or OpenAPI spec path first.');
      return;
    }
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
    <div>
      <PageHeader
        title="Import APIs"
        subtitle="Point the importer at a folder of OpenAPI/Swagger specs (or a single spec). Endpoints, parameters and output fields are extracted into the real-API catalog."
      />

      <div className="card max-w-2xl">
        <label className="label" htmlFor="rootPath">
          Folder or spec path
        </label>
        <input
          id="rootPath"
          className="input"
          placeholder="/path/to/openapi-specs"
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        />
        <p className="mt-2 text-xs text-text-muted">
          The scan ignores <code>node_modules</code>, <code>dist</code>, <code>build</code>,{' '}
          <code>.git</code>, <code>bin</code> and <code>obj</code>. Only endpoints found in real
          specs become available — nothing is invented.
        </p>

        <button className="btn btn-primary mt-4" onClick={handleImport} disabled={busy}>
          {busy ? 'Importing…' : 'Import'}
        </button>

        {result ? <p className="mt-4 text-sm text-success">{result}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
