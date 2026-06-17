import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Container } from './bootstrap/container.js';

type Handler = (
  ctx: Container,
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
) => Promise<unknown> | unknown;

export function createSidecarServer(ctx: Container) {
  const routes: Record<string, Handler> = {
    'GET /health': () => ({ ok: true, ts: Date.now() }),

    'GET /catalog/endpoints': async (c) => {
      const eps = await c.catalog.listEndpoints();
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

    'GET /agents': (c) => c.router.list(),

    'GET /agents/capabilities': (c) => c.router.capabilitySummary(),

    'POST /agents/ask': async (c, _req, _res, body) => {
      const { question, mode, agentId } = (body ?? {}) as {
        question?: string;
        mode?: 'employee' | 'client';
        agentId?: string;
      };
      if (!question) return { error: 'question required' };
      const activeProvider = c.ai.getActiveProvider();
      const ai = activeProvider
        ? { ask: (sys: string, pmt: string) => c.ai.complete({ provider: activeProvider.provider, model: activeProvider.model, baseUrl: activeProvider.baseUrl, system: sys, prompt: pmt }) }
        : undefined;
      const result = await c.router.ask(question, { mode: mode ?? 'employee', validator: c.validator, agentId, ai });
      const evidence = await Promise.all(
        result.evidence.map(async (e) => {
          const ep = await c.catalog.getEndpointById(e.endpointId);
          return ep ? { endpointId: e.endpointId, method: ep.method, path: ep.path } : e;
        }),
      );
      return { ...result, evidence };
    },

    'GET /settings/ai-providers': async (c) => {
      const providers = await c.settingsRepo.listAiProviders();
      return {
        providers: providers.map((p) => ({
          ...p,
          encryptedApiKey: null,
          hasApiKey: p.encryptedApiKey != null,
        })),
      };
    },

    'POST /settings/ai-providers': async (c, _req, _res, body) => {
      const setting = body as import('@arweb/domain').AiProviderSetting;
      await c.settingsRepo.upsertAiProvider(setting);
      c.ai.configure(setting.provider, setting.encryptedApiKey, setting.baseUrl, setting.model);
      if (setting.isDefault) c.ai.setDefaultProvider(setting.provider);
      return { ok: true };
    },

    'POST /settings/ai-providers/set-default': async (c, _req, _res, body) => {
      const { id } = (body ?? {}) as { id?: string };
      if (!id) return { error: 'id required' };
      c.settingsRepo.setAsDefault(id);
      const providers = await c.settingsRepo.listAiProviders();
      for (const p of providers) {
        c.ai.configure(p.provider, p.encryptedApiKey, p.baseUrl, p.model);
      }
      const def = providers.find((p) => p.isDefault && p.enabled);
      if (def) c.ai.setDefaultProvider(def.provider);
      return { ok: true };
    },

    'POST /settings/ai-providers/test': async (c, _req, _res, body) => {
      const { provider } = (body ?? {}) as { provider?: string };
      if (!provider) return { error: 'provider required' };
      const start = Date.now();
      try {
        const text = await c.ai.completeForProvider(
          provider as import('@arweb/domain').AiProvider,
          'Say exactly: "OK"',
        );
        return { ok: true, ms: Date.now() - start, text };
      } catch (e) {
        return { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
      }
    },

    'GET /separation/progress': async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      return JSON.parse(readFileSync(join(process.cwd(), 'docs', 'progress.json'), 'utf8'));
    },
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url   = (req.url ?? '/').split('?')[0] ?? '/';
    const key   = `${req.method} ${url}`;
    res.setHeader('Content-Type', 'application/json');

    try {
      const body    = await readJson(req);
      const handler = routes[key];
      if (!handler) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: `No route for ${key}` }));
      }
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
    req.on('data', (chunk: Buffer | string) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve(undefined);
      try { resolve(JSON.parse(data)); } catch { resolve(undefined); }
    });
  });
}
