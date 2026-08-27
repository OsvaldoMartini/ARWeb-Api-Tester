/**
 * Input sanitization. Pilot 1's biggest gap was "no input sanitization for
 * BotJob name, category name, variable name". We close that here and reuse it
 * everywhere those names are accepted.
 */

/** Allow letters, numbers, space, dash, underscore, dot. Collapse whitespace. */
export function sanitizeName(input: string, maxLen = 120): string {
  return input
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} \-_.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Variable identifiers: must be a safe token usable in ${var} substitution. */
export function sanitizeVariableName(input: string, maxLen = 64): string {
  const cleaned = input.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  return cleaned.slice(0, maxLen) || '_var';
}

export function isBlank(s: string | null | undefined): boolean {
  return s == null || s.trim().length === 0;
}
