import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type TaxonomyResponse } from '@/services/sidecarClient';

export function BusinessCategoriesPage() {
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sidecar.getTaxonomy();
        if (!cancelled) setTaxonomy(data);
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

  const subsFor = (categoryId: string) =>
    taxonomy?.subcategories.filter((s) => s.categoryId === categoryId) ?? [];

  return (
    <div>
      <PageHeader
        title="Business Categories"
        subtitle="25 banking categories (each with sub-categories). Endpoints from the catalog map here so non-technical users navigate by business domain, not raw URLs."
      />

      {loading ? (
        <p className="text-sm text-text-muted">Loading taxonomy…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taxonomy?.categories.map((cat) => (
            <div key={cat.id} className="card">
              <div className="mb-2 font-medium">{cat.name}</div>
              <ul className="space-y-1 text-sm text-text-muted">
                {subsFor(cat.id).map((s) => (
                  <li key={s.id}>• {s.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
