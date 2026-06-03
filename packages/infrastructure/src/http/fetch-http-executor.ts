import type { HttpExecutorPort, HttpRequest, HttpResponse } from '@arweb/application';

/**
 * HTTP executor used by the BotJob engine for API_CALL. Uses Node's global fetch
 * (undici under the hood in Node 18+). Swap for `undici.request` for streaming.
 */
export class FetchHttpExecutor implements HttpExecutorPort {
  async send(req: HttpRequest): Promise<HttpResponse> {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 30_000);
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      const body = await res.text();
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k] = v));
      return { status: res.status, headers, body, durationMs: Date.now() - started };
    } finally {
      clearTimeout(timeout);
    }
  }
}
