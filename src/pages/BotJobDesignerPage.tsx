import { PageHeader } from '@/components/ui/PageHeader';
import { MVP_COMMAND_TYPES } from '@arweb/domain';

export function BotJobDesignerPage() {
  return (
    <div>
      <PageHeader
        title="BotJob Designer"
        subtitle="Compose ordered command sequences (BotJobs) from the palette. The whole job is validated against the catalog before it can run."
        actions={<button className="btn btn-primary" disabled>New BotJob</button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="card">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Command palette (MVP)
          </div>
          <ul className="space-y-1 text-sm">
            {MVP_COMMAND_TYPES.map((c) => (
              <li
                key={c}
                className="rounded border border-border bg-surface-alt px-2 py-1 font-mono text-xs"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="card grid place-items-center text-center text-sm text-text-muted">
          <div>
            <p>Drag commands here to build a BotJob.</p>
            <p className="mt-1 text-xs">
              Canvas, drag-and-drop ordering and per-command editors land in Phase 8.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
