/**
 * Minimal JSONPath-lite. Supports a practical subset:
 *   $              -> root
 *   $.a.b          -> nested object access
 *   $.a[0].b       -> array index
 *   $.items[*].id  -> wildcard over array (returns array of matches)
 *
 * Kept dependency-free on purpose. For full JSONPath, swap in `jsonpath-plus`
 * behind this same function signature later.
 */
export function jsonPathQuery(root: unknown, path: string): unknown {
  if (!path || path === '$') return root;
  const normalized = path.replace(/^\$\.?/, '');
  const tokens = tokenize(normalized);
  let current: unknown[] = [root];

  for (const token of tokens) {
    const next: unknown[] = [];
    for (const node of current) {
      if (node == null) continue;
      if (token.type === 'key') {
        if (typeof node === 'object' && !Array.isArray(node)) {
          next.push((node as Record<string, unknown>)[token.value]);
        }
      } else if (token.type === 'index') {
        if (Array.isArray(node)) next.push(node[token.value]);
      } else if (token.type === 'wildcard') {
        if (Array.isArray(node)) next.push(...node);
        else if (typeof node === 'object') next.push(...Object.values(node as object));
      }
    }
    current = next;
  }

  if (tokens.some((t) => t.type === 'wildcard')) return current;
  return current[0];
}

type Token =
  | { type: 'key'; value: string }
  | { type: 'index'; value: number }
  | { type: 'wildcard' };

function tokenize(path: string): Token[] {
  const tokens: Token[] = [];
  // Split on dots that are not inside brackets, then parse bracket segments.
  const segments = path.match(/[^.[\]]+|\[\*\]|\[\d+\]/g) ?? [];
  for (const seg of segments) {
    if (seg === '[*]') tokens.push({ type: 'wildcard' });
    else if (/^\[\d+\]$/.test(seg)) tokens.push({ type: 'index', value: Number(seg.slice(1, -1)) });
    else if (/^\d+$/.test(seg)) tokens.push({ type: 'index', value: Number(seg) });
    else tokens.push({ type: 'key', value: seg });
  }
  return tokens;
}
