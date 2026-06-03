import type { ExecutionRun, ExecutionStepResult } from '@arweb/domain';

/**
 * Reports & exports (Phase 12). MVP produces HTML/CSV in pure TS (no native deps).
 * PDF generation can be added later via PDFKit or Playwright behind this interface.
 */
export interface ReportExporter {
  executionRunHtml(run: ExecutionRun, steps: ExecutionStepResult[]): string;
  executionRunCsv(steps: ExecutionStepResult[]): string;
}

export class HtmlCsvReportExporter implements ReportExporter {
  executionRunHtml(run: ExecutionRun, steps: ExecutionStepResult[]): string {
    const rows = steps
      .map(
        (s) =>
          `<tr><td>${s.commandType}</td><td class="${s.status}">${s.status}</td><td>${s.durationMs}ms</td><td>${
            s.errorMessage ?? ''
          }</td></tr>`,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Execution Run ${run.id}</title>
<style>body{font-family:system-ui;padding:24px}.passed{color:#16a34a}.failed,.error{color:#dc2626}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #e5e7eb;padding:6px 10px;text-align:left}</style>
</head><body><h1>Execution Run</h1>
<p>Status: <b>${run.status}</b> · Passed ${run.passedSteps}/${run.totalSteps} · Target ${run.target}</p>
<table><thead><tr><th>Command</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
  }

  executionRunCsv(steps: ExecutionStepResult[]): string {
    const header = 'stepId,commandType,status,durationMs,errorMessage';
    const body = steps
      .map((s) => [s.stepId, s.commandType, s.status, s.durationMs, csvEscape(s.errorMessage ?? '')].join(','))
      .join('\n');
    return `${header}\n${body}\n`;
  }
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
