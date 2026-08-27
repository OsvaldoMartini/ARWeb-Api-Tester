import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type CatalogEndpoint } from '@/services/sidecarClient';

const METHOD_COLOR: Record<string, string> = {
  GET: 'text-success',
  POST: 'text-primary',
  PUT: 'text-warning',
  PATCH: 'text-warning',
  DELETE: 'text-danger',
};

export function ApiCatalogPage() {
  const [endpoints, setEndpoints] = useState<CatalogEndpoint[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await sidecar.getEndpoints();
        if (!cancelled) setEndpoints(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return endpoints;
    return endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        (e.summary ?? '').toLowerCase().includes(q),
    );
  }, [endpoints, query]);

  return (
    <div>
      <PageHeader
        title="API Catalog"
        subtitle={`${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'} imported. This is the single source of truth — tests can only reference what exists here.`}
        actions={
          <input
            className="input w-64"
            placeholder="Search method / path…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      {loading ? (
        <p className="text-sm text-text-muted">Loading catalog…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : endpoints.length === 0 ? (
        <div className="card text-sm text-text-muted">
          No endpoints yet. Use <strong>Import APIs</strong> to scan a spec folder.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Path</th>
                <th className="px-4 py-2 font-medium">Summary</th>
                <th className="px-4 py-2 font-medium">Mapping</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className={`px-4 py-2 font-mono font-semibold ${METHOD_COLOR[e.method] ?? ''}`}>
                    {e.method}
                  </td>
                  <td className="px-4 py-2 font-mono">{e.path}</td>
                  <td className="px-4 py-2 text-text-muted">{e.summary ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span className={'badge badge-' + e.mappingStatus}>{e.mappingStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
