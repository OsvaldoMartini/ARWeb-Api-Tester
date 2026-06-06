import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { ApiEndpoint } from '@arweb/domain';
import { type Logger, nowIso } from '@arweb/common';

/**
 * MockServer (Pilot 2, Phase 10) — a localhost-only mock HTTP server so clients
 * can test without a live banking backend. Matches incoming requests against
 * imported endpoints and returns schema-aware placeholder responses.
 *
 * MVP uses Node's built-in http (zero deps, always runs). The roadmap's Fastify
 * upgrade can drop in behind the same start/stop/log surface.
 */
export interface MockRequestLogEntry {
  id: number;
  at: string;
  method: string;
  path: string;
  matched: boolean;
  status: number;
}

export interface MockServerOptions {
  port: number;
  /** localhost only by default for safety (Phase 14). */
  host?: string;
  logger: Logger;
  /** latency + error simulation */
  latencyMs?: number;
  errorRate?: number; // 0..1
}

export class MockServer {
  private server: Server | null = null;
  private endpoints: ApiEndpoint[] = [];
  private log: MockRequestLogEntry[] = [];
  private counter = 0;

  constructor(private readonly opts: MockServerOptions) {}

  setEndpoints(endpoints: ApiEndpoint[]): void {
    this.endpoints = endpoints;
  }

  getLog(): MockRequestLogEntry[] {
    return this.log.slice(-200);
  }

  clearLog(): void {
    this.log = [];
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  start(): Promise<void> {
    if (this.server) return Promise.resolve();
    const host = this.opts.host ?? '127.0.0.1';
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => this.handle(req, res));
      server.on('error', reject);
      server.listen(this.opts.port, host, () => {
        this.opts.logger.info('Mock server started', { host, port: this.opts.port });
        resolve();
      });
      this.server = server;
    });
  }

  stop(): Promise<void> {
    const server = this.server;
    if (!server) return Promise.resolve();
    return new Promise((resolve) => {
      server.close(() => {
        this.opts.logger.info('Mock server stopped');
        this.server = null;
        resolve();
      });
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.opts.latencyMs) await delay(this.opts.latencyMs);

    const method = (req.method ?? 'GET').toUpperCase();
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    const match = this.endpoints.find((e) => e.method === method && pathMatches(e.path, path));

    let status = match ? 200 : 404;
    if (this.opts.errorRate && Math.random() < this.opts.errorRate) status = 500;

    this.log.push({ id: ++this.counter, at: nowIso(), method, path, matched: Boolean(match), status });

    const body = match
      ? { ok: status < 400, endpoint: { method, path }, data: {}, _mock: true }
      : { ok: false, error: 'No imported endpoint matches this request', _mock: true };

    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }
}

/** Matches /accounts/{id} against /accounts/123. */
function pathMatches(template: string, actual: string): boolean {
  const t = template.split('/').filter(Boolean);
  const a = actual.split('/').filter(Boolean);
  if (t.length !== a.length) return false;
  return t.every((seg, i) => (seg.startsWith('{') && seg.endsWith('}')) || seg === a[i]);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
