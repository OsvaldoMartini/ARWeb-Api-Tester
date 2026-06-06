import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { uuid, nowIso } from '@arweb/common';
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
      if (!result.ok) return { error: result.error.message };

      // Auto-map endpoints that have no category yet.
      const [endpoints, categories] = await Promise.all([
        c.catalog.listEndpoints(),
        c.taxonomyRepo.listCategories(),
      ]);
      for (const ep of endpoints) {
        if (ep.categoryId) continue;
        const matched = findBestCategory(ep, categories);
        if (matched) await c.taxonomyRepo.setEndpointCategory(ep.id, matched.id);
      }

      return result.value;
    },

    // Phase 6: live taxonomy from SQLite (was static in-memory seed).
    'GET /taxonomy': async (c) => ({
      categories: await c.taxonomyRepo.listCategories(),
      subcategories: await c.taxonomyRepo.listSubcategories(),
    }),

    'GET /agents': (c) => c.router.list(),

    'POST /agents/ask': async (c, _req, _res, body) => {
      const { question, mode, agentId } = (body ?? {}) as {
        question?: string;
        mode?: 'employee' | 'client';
        agentId?: string;
      };
      if (!question) return { error: 'question required' };
      return c.router.ask(question, { mode: mode ?? 'employee', validator: c.validator, agentId, ai: c.ai });
    },

    'GET /settings/ai-providers': async (c) => ({
      providers: await c.settingsRepo.listAiProviders(),
    }),

    'POST /settings/ai-providers': async (c, _req, _res, body) => {
      const setting = body as import('@arweb/domain').AiProviderSetting;
      await c.settingsRepo.upsertAiProvider(setting);
      c.ai.configure(setting.provider, setting.encryptedApiKey, setting.baseUrl, setting.model);
      if (setting.isDefault) c.ai.setDefaultProvider(setting.provider);
      return { ok: true };
    },

    // ── BotJob CRUD ──────────────────────────────────────────────────────────
    'GET /botjobs': (c) => c.botJobRepo.list(),

    'POST /botjobs': async (c, _req, _res, body) => {
      const data = body as { name?: string; description?: string };
      if (!data?.name?.trim()) return { error: 'name required' };
      const job = {
        id: uuid(),
        name: data.name.trim(),
        description: data.description ?? null,
        categoryId: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      const block = { id: uuid(), botJobId: job.id, name: 'Main', order: 0 };
      await c.botJobRepo.save(job, [block], [], []);
      return { id: job.id };
    },

    // ── Execution history ────────────────────────────────────────────────────
    'GET /executions': async (c, req) => {
      const qs = (req.url ?? '').split('?')[1] ?? '';
      const botJobId = new URLSearchParams(qs).get('botJobId') ?? undefined;
      return c.executionRepo.listRuns(botJobId);
    },

    // ── Mock server ──────────────────────────────────────────────────────────
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

    'POST /mock/log/clear': (c) => { c.mockServer.clearLog(); return { ok: true }; },
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS for the Vite dev server / Tauri webview.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = (req.url ?? '/').split('?')[0] ?? '/';
    const key = `${req.method} ${url}`;

    res.setHeader('Content-Type', 'application/json');

    try {
      const body = await readJson(req);

      // Parameterized route: PUT /catalog/endpoints/:id/category
      const catMatch = req.method === 'PUT'
        ? url.match(/^\/catalog\/endpoints\/([^/]+)\/category$/)
        : null;
      if (catMatch) {
        const endpointId = catMatch[1]!;
        const categoryId = (body as { categoryId?: string | null })?.categoryId ?? null;
        await ctx.taxonomyRepo.setEndpointCategory(endpointId, categoryId);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true }));
      }

      // GET /botjobs/:id
      const botJobGetMatch = req.method === 'GET'
        ? url.match(/^\/botjobs\/([^/]+)$/)
        : null;
      if (botJobGetMatch) {
        const id = botJobGetMatch[1]!;
        const job = await ctx.botJobRepo.getById(id);
        if (!job) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
        const blocks = await ctx.botJobRepo.getBlocks(id);
        const commandsByBlock = await Promise.all(blocks.map((b) => ctx.botJobRepo.getCommands(b.id)));
        const commands = commandsByBlock.flat().sort((a, b) => a.order - b.order);
        const variables = await ctx.botJobRepo.getVariables(id);
        res.writeHead(200);
        return res.end(JSON.stringify({ job, blocks, commands, variables }));
      }

      // PUT /botjobs/:id  (full save: job + blocks + commands + vars)
      const botJobPutMatch = req.method === 'PUT'
        ? url.match(/^\/botjobs\/([^/]+)$/)
        : null;
      if (botJobPutMatch) {
        const id = botJobPutMatch[1]!;
        const d = body as { job?: Record<string, unknown>; blocks?: unknown[]; commands?: unknown[]; variables?: unknown[] };
        if (!d?.job) { res.writeHead(400); return res.end(JSON.stringify({ error: 'job required' })); }
        const existing = await ctx.botJobRepo.getById(id);
        const now = nowIso();
        const job = { ...existing, ...d.job, id, updatedAt: now } as import('@arweb/domain').BotJob;
        await ctx.botJobRepo.save(
          job,
          (d.blocks ?? []) as import('@arweb/domain').BotJobBlock[],
          (d.commands ?? []) as import('@arweb/domain').BotJobCommand[],
          (d.variables ?? []) as import('@arweb/domain').BotVariable[],
        );
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true }));
      }

      // DELETE /botjobs/:id
      const botJobDeleteMatch = req.method === 'DELETE'
        ? url.match(/^\/botjobs\/([^/]+)$/)
        : null;
      if (botJobDeleteMatch) {
        await ctx.botJobRepo.remove(botJobDeleteMatch[1]!);
        res.writeHead(200);
        return res.end(JSON.stringify({ ok: true }));
      }

      // POST /botjobs/:id/execute
      const executeMatch = req.method === 'POST'
        ? url.match(/^\/botjobs\/([^/]+)\/execute$/)
        : null;
      if (executeMatch) {
        const id = executeMatch[1]!;
        const { target = 'mock' } = (body ?? {}) as { target?: 'real' | 'mock' };
        const job = await ctx.botJobRepo.getById(id);
        if (!job) { res.writeHead(404); return res.end(JSON.stringify({ error: 'BotJob not found' })); }
        const blocks = await ctx.botJobRepo.getBlocks(id);
        const commandsByBlock = await Promise.all(blocks.map((b) => ctx.botJobRepo.getCommands(b.id)));
        const commands = commandsByBlock.flat().sort((a, b) => a.order - b.order);
        const variables = await ctx.botJobRepo.getVariables(id);
        const { run, steps } = await ctx.engine.run({ job, blocks, commands, variables }, target);
        await ctx.executionRepo.createRun(run);
        await Promise.all(steps.map((s) => ctx.executionRepo.addStepResult(s)));
        res.writeHead(200);
        return res.end(JSON.stringify({ run, steps }));
      }

      // GET /executions/:runId/steps
      const stepsMatch = req.method === 'GET'
        ? url.match(/^\/executions\/([^/]+)\/steps$/)
        : null;
      if (stepsMatch) {
        const steps = await ctx.executionRepo.getStepResults(stepsMatch[1]!);
        res.writeHead(200);
        return res.end(JSON.stringify(steps));
      }

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

/**
 * Score-based keyword matcher. Returns the category whose keywords best match
 * the endpoint's tags and path segments. Returns null if nothing matches.
 */
function findBestCategory(
  ep: { tags?: string[] | null; path: string },
  categories: Array<{ id: string; keywords: string[] }>,
): { id: string } | null {
  const tokens = [
    ...(ep.tags ?? []),
    ...ep.path.split('/').filter((s) => s && !s.startsWith('{')),
  ].map((s) => s.toLowerCase());

  let best: { id: string } | null = null;
  let bestScore = 0;

  for (const cat of categories) {
    let score = 0;
    for (const kw of cat.keywords) {
      const kwLower = kw.toLowerCase();
      if (tokens.some((t) => t.includes(kwLower) || kwLower.includes(t))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  return bestScore > 0 ? best : null;
}

function readJson(req: IncomingMessage): Promise<unknown> {
  if (req.method === 'GET' || req.method === 'HEAD') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => (data += chunk));
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
