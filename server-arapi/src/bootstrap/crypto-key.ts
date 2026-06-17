import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KEY_FILE = '.arweb.key';

/**
 * Resolve the master encryption key used by CryptoService.
 *
 * Priority:
 *  1. ARWEB_MASTER_KEY env var — set this in Docker / CI / managed deployments.
 *  2. Key file next to the SQLite database — auto-generated on first run,
 *     persisted with 0600 permissions so only the process owner can read it.
 *
 * The key file approach is appropriate for desktop installs where the security
 * model already relies on OS file-system permissions (same as the DB itself).
 */
export function resolveMasterKey(dataDir: string): string {
  if (process.env['ARWEB_MASTER_KEY']) {
    return process.env['ARWEB_MASTER_KEY'];
  }

  const keyPath = join(dataDir, KEY_FILE);
  if (existsSync(keyPath)) {
    return readFileSync(keyPath, 'utf8').trim();
  }

  mkdirSync(dataDir, { recursive: true });
  const key = randomBytes(32).toString('hex');
  writeFileSync(keyPath, key, { mode: 0o600 });
  return key;
}
