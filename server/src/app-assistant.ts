/**
 * App-level AI assistant (Phase 19).
 *
 * This assistant knows the ARWeb API Tester platform architecture and can
 * take real actions (search the catalog, create BotJobs, run tests) through
 * Anthropic tool use.  It is completely separate from the banking Q&A router.
 */

import type { Container } from './bootstrap/container.js';
import { uuid, nowIso } from '@arweb/common';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AppAction {
  type: 'catalog_search' | 'botjob_created' | 'botjobs_listed' | 'botjob_executed' | 'envs_listed';
  label: string;
  data: Record<string, unknown>;
}

export interface AppAssistantResponse {
  answer: string;
  actions: AppAction[];
  /** Which AI provider was used (or null when offline). */
  provider: string | null;
}

// ── Project knowledge (system prompt) ─────────────────────────────────────────

const SYSTEM_PROMPT = `You are the ARWeb Builder — an action-taking AI assistant built into ARWeb API Tester.
Your job is to help users understand the platform, create BotJobs, and run API tests.
You speak the same language as the user (Italian or English).

## What is ARWeb API Tester?
A no-code banking/fintech API test automation platform. It lets teams:
- Import OpenAPI/Swagger specifications (single files or entire folder trees with sub-folders)
- Browse an API Catalog of all imported endpoints organised by method, path, summary, and tags
- Organise endpoints into Business Categories (Client Management, Payments, Portfolio, etc.)
- Design BotJobs — automated test workflows — using a visual Designer (no coding required)
- Run BotJobs against different Environments (built-in Mock Server, staging, production…)
- View execution results, export reports, and share test collections

## BotJob structure
A BotJob is a reusable, ordered test workflow.
  ┌─ BotJob  (name, description)
  │   ├─ Block  (logical group, e.g. "Setup", "Create Client", "Verify", "Cleanup")
  │   │   ├─ Command: API_CALL    — HTTP request to an imported endpoint (uses endpointId)
  │   │   ├─ Command: EXTRACT     — extracts a field from the last response (e.g. clientId)
  │   │   ├─ Command: ASSERT      — validates status code / field value
  │   │   ├─ Command: SET_VARIABLE — sets a workflow variable (referenced as \${varName})
  │   │   └─ Command: WAIT        — pauses N milliseconds

## API Catalog
Every imported OpenAPI endpoint has: method (GET/POST/…), path, summary, and tags.
Use search_catalog to find endpoint IDs before building a BotJob.

## Environments
Named test targets:
- Mock Server (id: "mock"): built-in safe sandbox at localhost:8855
- Custom: production, staging, dev — each has its own base URL

## Your responsibilities
1. When the user asks to create a BotJob → search the catalog first, then call create_botjob.
2. When asked to run tests → call execute_botjob with the right botJobId and environmentId.
3. Always tell the user the BotJob ID after creation and suggest opening it in the Designer.
4. If no relevant endpoints are in the catalog, say so and suggest importing the right specs first.
5. Be proactive: if the user mentions a workflow concept, map it to catalog endpoints automatically.
`;

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_catalog',
    description:
      'Search the imported API catalog for endpoints matching a keyword or concept. ' +
      'Always call this before creating a BotJob to discover relevant endpoint IDs.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms, e.g. "client create", "account balance", "payment transfer"',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10, max 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_botjobs',
    description: 'List all BotJobs with their IDs, names and descriptions.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_botjob',
    description:
      'Create a new BotJob in the database. Returns the new BotJob ID. ' +
      'The BotJob starts with one empty "Main" block; the user opens the Designer to add commands.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'A clear, descriptive name, e.g. "Create Client and Open Account"',
        },
        description: {
          type: 'string',
          description: 'What this BotJob tests or automates',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_environments',
    description: 'List all available test environments (Mock Server, staging, production, etc.).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'execute_botjob',
    description: 'Execute a BotJob against a target environment and return pass/fail results.',
    input_schema: {
      type: 'object',
      properties: {
        botJobId: {
          type: 'string',
          description: 'The BotJob ID to execute',
        },
        environmentId: {
          type: 'string',
          description: 'Target environment ID (default: "mock" for the Mock Server)',
        },
      },
      required: ['botJobId'],
    },
  },
];

// ── Internal Anthropic types ───────────────────────────────────────────────────

interface AnthropicTextBlock  { type: 'text';     text: string }
interface AnthropicToolBlock  { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
interface AnthropicToolResult { type: 'tool_result'; tool_use_id: string; content: string }
type AnyBlock = AnthropicTextBlock | AnthropicToolBlock | AnthropicToolResult;

interface AnthropicApiResponse { stop_reason: string; content: AnyBlock[] }

type ApiMessage = { role: 'user' | 'assistant'; content: string | AnyBlock[] };

// ── Tool execution ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: Container,
  actions: AppAction[],
): Promise<unknown> {
  switch (name) {

    case 'search_catalog': {
      const query = String(input['query'] ?? '');
      const limit = Math.min(Number(input['limit'] ?? 10), 20);
      const all   = await ctx.catalog.listEndpoints();
      const q     = query.toLowerCase();
      const hits  = all
        .map((ep) => {
          const haystack = [ep.method, ep.path, ep.summary ?? '', ...(ep.tags ?? [])].join(' ').toLowerCase();
          const score    = q.split(/\s+/).filter((w) => w && haystack.includes(w)).length;
          return { ep, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ ep }) => ({ id: ep.id, method: ep.method, path: ep.path, summary: ep.summary, tags: ep.tags }));

      actions.push({ type: 'catalog_search', label: `Found ${hits.length} endpoint(s) for "${query}"`, data: { query, results: hits } });
      return hits;
    }

    case 'list_botjobs': {
      const jobs = await ctx.botJobRepo.list();
      const rows = jobs.map((j) => ({ id: j.id, name: j.name, description: j.description }));
      actions.push({ type: 'botjobs_listed', label: `${jobs.length} BotJob(s) found`, data: { jobs: rows } });
      return rows;
    }

    case 'create_botjob': {
      const jobName = String(input['name'] ?? 'Untitled BotJob');
      const desc    = input['description'] != null ? String(input['description']) : null;
      const now     = nowIso();
      const job     = { id: uuid(), name: jobName, description: desc, categoryId: null, createdAt: now, updatedAt: now };
      const block   = { id: uuid(), botJobId: job.id, name: 'Main', order: 0 };
      await ctx.botJobRepo.save(job, [block], [], []);
      actions.push({ type: 'botjob_created', label: `Created BotJob "${jobName}"`, data: { id: job.id, name: jobName, description: desc } });
      return { id: job.id, name: jobName, description: desc };
    }

    case 'list_environments': {
      const envs = ctx.envRepo.list();
      const rows = envs.map((e) => ({ id: e.id, name: e.name, baseUrl: e.baseUrl, isDefault: e.isDefault }));
      actions.push({ type: 'envs_listed', label: `${envs.length} environment(s)`, data: { envs: rows } });
      return rows;
    }

    case 'execute_botjob': {
      const botJobId     = String(input['botJobId'] ?? '');
      const environmentId = String(input['environmentId'] ?? 'mock');
      const env = ctx.envRepo.getById(environmentId);
      if (!env) return { error: `Environment "${environmentId}" not found` };
      const job = await ctx.botJobRepo.getById(botJobId);
      if (!job) return { error: `BotJob "${botJobId}" not found` };
      const blocks         = await ctx.botJobRepo.getBlocks(botJobId);
      const commandsByBlock = await Promise.all(blocks.map((b) => ctx.botJobRepo.getCommands(b.id)));
      const commands       = commandsByBlock.flat().sort((a, b) => a.order - b.order);
      const variables      = await ctx.botJobRepo.getVariables(botJobId);
      const { run, steps } = await ctx.engine.run({ job, blocks, commands, variables }, env.name, env.baseUrl);
      await ctx.executionRepo.createRun(run);
      await Promise.all(steps.map((s) => ctx.executionRepo.addStepResult(s)));
      actions.push({
        type:  'botjob_executed',
        label: `Ran "${job.name}" — ${run.passedSteps}/${run.totalSteps} passed`,
        data:  { runId: run.id, status: run.status, passed: run.passedSteps, failed: run.failedSteps, total: run.totalSteps },
      });
      return { runId: run.id, status: run.status, passed: run.passedSteps, failed: run.failedSteps, total: run.totalSteps };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Agentic loop ───────────────────────────────────────────────────────────────

export async function runAppAssistant(
  messages: ChatMessage[],
  ctx: Container,
): Promise<AppAssistantResponse> {
  const active  = ctx.ai.getActiveProvider();
  const actions: AppAction[] = [];

  // No provider configured at all.
  if (!active) {
    return {
      answer: 'No AI provider is configured. Open Settings → AI Providers and add an API key to enable the Bot Builder.',
      actions,
      provider: null,
    };
  }

  // Non-Anthropic providers: use text completion (no tool use).
  // Tool use is Anthropic-specific in this implementation.
  if (active.provider !== 'anthropic') {
    const lastMsg = messages[messages.length - 1]?.content ?? '';
    const answer  = await ctx.ai.ask(SYSTEM_PROMPT, lastMsg).catch((e) => `AI error: ${e instanceof Error ? e.message : String(e)}`);
    return { answer, actions, provider: active.provider };
  }

  // Anthropic — full agentic loop with tool use.
  const apiMessages: ApiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const MAX_ITER = 8;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         active.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      active.model,
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        tools:      TOOLS,
        messages:   apiMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return { answer: `AI error ${res.status}: ${err}`, actions, provider: 'anthropic' };
    }

    const data      = await res.json() as AnthropicApiResponse;
    const toolCalls = data.content.filter((b): b is AnthropicToolBlock => b.type === 'tool_use');

    // No more tool calls or end of turn → return the final text.
    if (data.stop_reason === 'end_turn' || toolCalls.length === 0) {
      const text = data.content
        .filter((b): b is AnthropicTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      return { answer: text.trim(), actions, provider: 'anthropic' };
    }

    // Push the assistant turn (text + tool_use blocks).
    apiMessages.push({ role: 'assistant', content: data.content });

    // Execute all tool calls and collect results.
    const toolResults: AnthropicToolResult[] = await Promise.all(
      toolCalls.map(async (block) => {
        const result = await executeTool(block.name, block.input, ctx, actions).catch((e) => ({
          error: e instanceof Error ? e.message : String(e),
        }));
        ctx.logger.info('[app-assistant] tool', { name: block.name, result });
        return { type: 'tool_result' as const, tool_use_id: block.id, content: JSON.stringify(result) };
      }),
    );

    // Return tool results as the next user turn.
    apiMessages.push({ role: 'user', content: toolResults });
  }

  return { answer: 'Reached the maximum reasoning steps. Please try a more specific question.', actions, provider: 'anthropic' };
}
