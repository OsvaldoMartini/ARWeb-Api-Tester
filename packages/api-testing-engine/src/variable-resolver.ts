/**
 * VariableResolver — substitutes ${name} tokens in strings using the run context.
 * Also supports ${a.b.c} dotted lookups into extracted JSON values.
 */
export type VariableContext = Record<string, unknown>;

const TOKEN_RE = /\$\{([^}]+)\}/g;

export class VariableResolver {
  constructor(private readonly context: VariableContext = {}) {}

  set(name: string, value: unknown): void {
    this.context[name] = value;
  }

  get(name: string): unknown {
    return this.lookup(name);
  }

  snapshot(): VariableContext {
    return { ...this.context };
  }

  /** Replace all ${...} tokens in a string. Missing vars resolve to empty string. */
  resolve(input: string): string {
    return input.replace(TOKEN_RE, (_m, expr: string) => {
      const v = this.lookup(expr.trim());
      return v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
    });
  }

  /** Deep-resolve every string in an object/array. */
  resolveDeep<T>(value: T): T {
    if (typeof value === 'string') return this.resolve(value) as unknown as T;
    if (Array.isArray(value)) return value.map((v) => this.resolveDeep(v)) as unknown as T;
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.resolveDeep(v);
      return out as T;
    }
    return value;
  }

  private lookup(path: string): unknown {
    const parts = path.split('.');
    let cur: unknown = this.context;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }
}
