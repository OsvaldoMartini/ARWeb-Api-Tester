import { PageHeader } from '@/components/ui/PageHeader';

const EXPORTS = [
  { name: 'HTML report', desc: 'Human-readable run summary with pass/fail breakdown.' },
  { name: 'CSV export', desc: 'Tabular results for spreadsheets and BI tools.' },
  { name: 'Bash script', desc: 'curl-based reproduction of the executed calls.' },
];

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Export the latest execution results. Secrets are redacted from generated artifacts."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {EXPORTS.map((e) => (
          <div key={e.name} className="card">
            <div className="mb-1 font-medium">{e.name}</div>
            <p className="mb-3 text-sm text-text-muted">{e.desc}</p>
            <button className="btn" disabled>
              Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
