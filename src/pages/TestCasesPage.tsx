import { PageHeader } from '@/components/ui/PageHeader';

export function TestCasesPage() {
  return (
    <div>
      <PageHeader
        title="Test Cases"
        subtitle="Reusable test definitions that target catalog endpoints. Each case is validated against the real-API catalog before it can be saved."
        actions={<button className="btn btn-primary" disabled>New test case</button>}
      />

      <div className="card text-sm text-text-muted">
        No test cases yet. Once endpoints are imported, test cases created here become the
        building blocks for BotJobs in the <strong>Designer</strong>.
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Bound to a single endpoint (method + path from the catalog).</li>
          <li>Captures expected status, assertions and extracted variables.</li>
          <li>Reusable across multiple BotJobs (CALL_COMPONENT).</li>
        </ul>
      </div>
    </div>
  );
}
