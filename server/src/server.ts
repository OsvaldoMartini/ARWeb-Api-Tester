import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { uuid, nowIso } from '@arweb/common';
import { endpointsToBashScript, endpointsToPostmanCollection } from '@arweb/infrastructure';
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
      await autoMapAndPopulate(c);
      return result.value;
    },

    // Web upload: client sends file contents as JSON, server writes to a temp dir.
    'POST /import/upload': async (c, _req, _res, body) => {
      const data = body as { files?: { name: string; content: string }[] };
      if (!data?.files?.length) return { error: 'files array required' };

      const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join: pjoin } = await import('node:path');

      const tempDir = mkdtempSync(pjoin(tmpdir(), 'arweb-import-'));
      try {
        for (const file of data.files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          writeFileSync(pjoin(tempDir, safeName), file.content, 'utf8');
        }
        const result = await c.importUseCase.execute(tempDir);
        if (!result.ok) return { error: result.error.message };
        await autoMapAndPopulate(c);
        return result.value;
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },

    // Phase 6: live taxonomy from SQLite (was static in-memory seed).
    'GET /taxonomy': async (c) => ({
      categories: await c.taxonomyRepo.listCategories(),
      subcategories: await c.taxonomyRepo.listSubcategories(),
    }),

    'GET /agents': (c) => c.router.list(),

    'GET /agents/capabilities': (c) => c.router.capabilitySummary(),

    'POST /agents/ask': async (c, _req, _res, body) => {
      const { question, mode, agentId } = (body ?? {}) as {
        question?: string;
        mode?: 'employee' | 'client';
        agentId?: string;
      };
      if (!question) return { error: 'question required' };
      const result = await c.router.ask(question, { mode: mode ?? 'employee', validator: c.validator, agentId, ai: c.ai });
      // Enrich evidence with real method + path from the catalog.
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
      // Never return key material to the UI — replace with a boolean flag.
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

    // ── Environments ─────────────────────────────────────────────────────────
    'GET /environments': (c) => c.envRepo.list(),

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

      // POST /environments  (create)
      if (req.method === 'POST' && url === '/environments') {
        const data = body as Partial<import('@arweb/domain').Environment>;
        if (!data?.name?.trim() || !data?.baseUrl?.trim()) {
          res.writeHead(400); return res.end(JSON.stringify({ error: 'name and baseUrl required' }));
        }
        const { uuid: u, nowIso: n } = await import('@arweb/common');
        const env: import('@arweb/domain').Environment = {
          id:          u(),
          name:        data.name.trim(),
          baseUrl:     data.baseUrl.trim(),
          description: data.description ?? null,
          headers:     data.headers ?? {},
          isDefault:   data.isDefault ?? false,
          isBuiltIn:   false,
          createdAt:   n(),
          updatedAt:   n(),
        };
        ctx.envRepo.upsert(env);
        res.writeHead(201); return res.end(JSON.stringify(env));
      }

      // PUT /environments/:id
      const envPutMatch = req.method === 'PUT' ? url.match(/^\/environments\/([^/]+)$/) : null;
      if (envPutMatch) {
        const id = envPutMatch[1]!;
        const existing = ctx.envRepo.getById(id);
        if (!existing) { res.writeHead(404); return res.end(JSON.stringify({ error: 'not found' })); }
        const data = body as Partial<import('@arweb/domain').Environment>;
        ctx.envRepo.upsert({ ...existing, ...data, id, isBuiltIn: existing.isBuiltIn });
        res.writeHead(200); return res.end(JSON.stringify({ ok: true }));
      }

      // DELETE /environments/:id
      const envDelMatch = req.method === 'DELETE' ? url.match(/^\/environments\/([^/]+)$/) : null;
      if (envDelMatch) {
        ctx.envRepo.remove(envDelMatch[1]!);
        res.writeHead(200); return res.end(JSON.stringify({ ok: true }));
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
        const { environmentId = 'mock' } = (body ?? {}) as { environmentId?: string };
        const env = ctx.envRepo.getById(environmentId);
        if (!env) { res.writeHead(404); return res.end(JSON.stringify({ error: `Environment "${environmentId}" not found` })); }
        const job = await ctx.botJobRepo.getById(id);
        if (!job) { res.writeHead(404); return res.end(JSON.stringify({ error: 'BotJob not found' })); }
        const blocks = await ctx.botJobRepo.getBlocks(id);
        const commandsByBlock = await Promise.all(blocks.map((b) => ctx.botJobRepo.getCommands(b.id)));
        const commands = commandsByBlock.flat().sort((a, b) => a.order - b.order);
        const variables = await ctx.botJobRepo.getVariables(id);
        const { run, steps } = await ctx.engine.run({ job, blocks, commands, variables }, env.name, env.baseUrl);
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

      // GET /executions/:runId/report.html
      const reportHtmlMatch = req.method === 'GET'
        ? url.match(/^\/executions\/([^/]+)\/report\.html$/)
        : null;
      if (reportHtmlMatch) {
        const runId = reportHtmlMatch[1]!;
        const [run, steps] = await Promise.all([
          ctx.executionRepo.listRuns().then((runs) => runs.find((r) => r.id === runId) ?? null),
          ctx.executionRepo.getStepResults(runId),
        ]);
        if (!run) { res.writeHead(404); return res.end(JSON.stringify({ error: 'run not found' })); }
        const html = ctx.reporter.executionRunHtml(run, steps);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="run-${runId.slice(0, 8)}.html"`);
        res.writeHead(200);
        return res.end(html);
      }

      // GET /executions/:runId/report.csv
      const reportCsvMatch = req.method === 'GET'
        ? url.match(/^\/executions\/([^/]+)\/report\.csv$/)
        : null;
      if (reportCsvMatch) {
        const runId = reportCsvMatch[1]!;
        const steps = await ctx.executionRepo.getStepResults(runId);
        const csv = ctx.reporter.executionRunCsv(steps);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="run-${runId.slice(0, 8)}.csv"`);
        res.writeHead(200);
        return res.end(csv);
      }

      // GET /catalog/export/postman
      if (req.method === 'GET' && url === '/catalog/export/postman') {
        const endpoints = await ctx.catalog.listEndpoints();
        const json = endpointsToPostmanCollection('ARWeb API Catalog', endpoints);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="arweb-postman-collection.json"');
        res.writeHead(200);
        return res.end(json);
      }

      // GET /catalog/export/bash
      if (req.method === 'GET' && url === '/catalog/export/bash') {
        const qs = (req.url ?? '').split('?')[1] ?? '';
        const baseUrl = new URLSearchParams(qs).get('baseUrl') ?? 'http://localhost';
        const endpoints = await ctx.catalog.listEndpoints();
        const script = endpointsToBashScript(baseUrl, endpoints);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="arweb-catalog.sh"');
        res.writeHead(200);
        return res.end(script);
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

async function autoMapAndPopulate(ctx: Container) {
  const [endpoints, categories] = await Promise.all([
    ctx.catalog.listEndpoints(),
    ctx.taxonomyRepo.listCategories(),
  ]);
  for (const ep of endpoints) {
    if (ep.categoryId) continue;
    const matched = findBestCategory(ep, categories);
    if (matched) await ctx.taxonomyRepo.setEndpointCategory(ep.id, matched.id);
  }
  ctx.router.populateFromCatalog(endpoints);
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
