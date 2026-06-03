import { PageHeader } from '@/components/ui/PageHeader';

export function ExecuteTestsPage() {
  return (
    <div>
      <PageHeader
        title="Execute Tests"
        subtitle="Run BotJobs against the mock server or a real base URL, and watch the step-by-step audit trail."
        actions={
          <>
            <button className="btn" disabled>
              Target: Mock
            </button>
            <button className="btn btn-primary" disabled>
              Run
            </button>
          </>
        }
      />

      <div className="card text-sm text-text-muted">
        Select a BotJob to execute. Every step records request, response, assertions and timing
        into an immutable audit trail (Pilot 1). Results feed straight into{' '}
        <strong>Reports</strong>.
      </div>
    </div>
  );
}
