/**
 * Minimal logger abstraction. The Node sidecar wires this to Pino;
 * the browser/desktop falls back to console. Keep secrets out of logs:
 * `redact` masks anything that looks like a key/token before printing.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

const SECRET_KEY_RE = /(api[_-]?key|authorization|token|secret|password|bearer)/i;

export function redact(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return meta;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEY_RE.test(k) ? '«redacted»' : v;
  }
  return out;
}

export class ConsoleLogger implements Logger {
  constructor(
    private readonly bindings: Record<string, unknown> = {},
    private readonly minLevel: LogLevel = 'info',
  ) {}

  private order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (this.order[level] < this.order[this.minLevel]) return;
    const payload = { level, msg, ...this.bindings, ...(redact(meta) ?? {}) };
    // eslint-disable-next-line no-console
    (console[level === 'debug' ? 'log' : level] as (...a: unknown[]) => void)(JSON.stringify(payload));
  }

  debug(m: string, meta?: Record<string, unknown>) { this.log('debug', m, meta); }
  info(m: string, meta?: Record<string, unknown>) { this.log('info', m, meta); }
  warn(m: string, meta?: Record<string, unknown>) { this.log('warn', m, meta); }
  error(m: string, meta?: Record<string, unknown>) { this.log('error', m, meta); }
  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings }, this.minLevel);
  }
}

export const defaultLogger: Logger = new ConsoleLogger();
