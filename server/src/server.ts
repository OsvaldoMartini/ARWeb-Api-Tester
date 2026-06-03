import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Container } from './bootstrap/container.js';

type Handler = (
  ctx: Container,
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
) => Promise<unknown> | unknown;

/**
 * Tiny JSON HTTP API for the React app. Zero dependencies so it always runs.
 * Roadmap upgrade path: replace with Fastify for schema validation + plugins.
 *
 * IMPORTANT: bound to 127.0.0.1 only (Phase 14 — never expose externally).
 */
export function createSidecarServer(ctx: Container) {
  const routes: Record<string, Handler> = {
    'GET /health': () => ({ ok: true, ts: Date.now() }),

    'GET /catalog/endpoints': async () => {
      const eps = await ctx.catalog.listEndpoints();
      return eps.map((e) => ({
        id: e.id,
        method: e.method,
        path: e.path,
        summary: e.summary,
        tags: e.tags,
        categoryId: e.categoryId,
        mappingStatus: e.categoryId ? 'mapped' : 'unmapped',
      }));
    },

    'POST /import': async (c, _req, _res, body) => {
      const folderPath = (body as { folderPath?: string })?.folderPath;
      if (!folderPath) return { error: 'folderPath required' };
      const result = await c.importUseCase.execute(folderPath);
      return result.ok ? result.value : { error: result.error.message };
    },

    'GET /taxonomy': (c) => ({ categories: c.taxonomy.categories, subcategories: c.taxonomy.subcategories }),

    'GET /agents': (c) => c.router.list(),

    'POST /agents/ask': async (c, _req, _res, body) => {
      const { question, mode, agentId } = (body ?? {}) as {
        question?: string;
        mode?: 'employee' | 'client';
        agentId?: string;
      };
      if (!question) return { error: 'question required' };
      return c.router.ask(question, { mode: mode ?? 'employee', validator: c.validator, agentId });
    },

    'GET /mock/status': (c) => ({ running: c.mockServer.isRunning(), port: c.config.mockPort }),

    'POST /mock/start': async (c) => {
      const eps = await c.catalog.listEndpoints();
      c.mockServer.setEndpoints(eps);
      await c.mockServer.start();
      return { running: true, port: c.config.mockPort };
    },

    'POST /mock/stop': async (c) => {
      await c.mockServer.stop();
      return { running: false };
    },

    'GET /mock/log': (c) => c.mockServer.getLog(),
  };

  const server = createServer(async (req, res) => {
    // CORS for the Vite dev server / Tauri webview.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = (req.url ?? '/').split('?')[0];
    const key = `${req.method} ${url}`;
    const handler = routes[key];

    res.setHeader('Content-Type', 'application/json');
    if (!handler) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: `No route for ${key}` }));
    }

    try {
      const body = await readJson(req);
      const result = await handler(ctx, req, res, body);
      if (!res.headersSent) res.writeHead(200);
      res.end(JSON.stringify(result ?? null));
    } catch (e) {
      ctx.logger.error('Request failed', { key, error: e instanceof Error ? e.message : String(e) });
      res.writeHead(500);
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Internal error' }));
    }
  });

  return server;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve(undefined);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(undefined);
      }
    });
  });
}
