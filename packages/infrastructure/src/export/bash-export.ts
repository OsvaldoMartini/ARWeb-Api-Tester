import type { ApiEndpoint } from '@arweb/domain';

/**
 * Bash/curl export (Pilot 1, Phase 12). Generates a runnable script of curl
 * commands for the imported endpoints. A warning is prepended because the script
 * may embed auth tokens once variables are resolved.
 */
export function endpointsToBashScript(baseUrl: string, endpoints: ApiEndpoint[]): string {
  const lines = [
    '#!/usr/bin/env bash',
    '# WARNING: this script may contain authentication tokens once variables are filled in.',
    '# Review before sharing. Do not commit with real secrets.',
    'set -euo pipefail',
    `BASE_URL="${baseUrl}"`,
    '',
  ];
  for (const ep of endpoints) {
    lines.push(`# ${ep.method} ${ep.path}${ep.summary ? ` — ${ep.summary}` : ''}`);
    lines.push(`curl -sS -X ${ep.method} "$BASE_URL${ep.path}" \\`);
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push('');
  }
  return lines.join('\n');
}
