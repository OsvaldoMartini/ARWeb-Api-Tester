import type {
  BotJob,
  BotJobBlock,
  BotJobCommand,
  BotVariable,
  ExecutionRun,
  ExecutionStepResult,
  AssertionResult,
} from '@arweb/domain';
import type { HttpExecutorPort, HttpRequest, RealApiCatalogValidator, CatalogReadPort } from '@arweb/application';
import { type Logger, uuid, nowIso } from '@arweb/common';
import { VariableResolver } from './variable-resolver.js';
import { jsonPathQuery } from './json-path.js';

export interface BotJobBundle {
  job: BotJob;
  blocks: BotJobBlock[];
  commands: BotJobCommand[]; // already ordered across blocks
  variables: BotVariable[];
}

export interface EngineDeps {
  http: HttpExecutorPort;
  validator: RealApiCatalogValidator;
  catalog: CatalogReadPort;
  logger: Logger;
  /** Fallback base URL when none is supplied per-run (kept for backward compat). */
  resolveBaseUrl: (target: string) => string;
}

/**
 * BotJobExecutionEngine — executes the MVP command set:
 * API_CALL, SET_VARIABLE, ASSERT_STATUS_CODE, ASSERT_FIELD_VALUE,
 * ASSERT_JSON_PATH_EXISTS, EXTRACT_JSON_PATH, WAIT, STOP_ON_FAILURE.
 *
 * Control-flow commands (IF/ELSE/LOOP/FOR_EACH) and data commands
 * (READ_CSV/READ_EXCEL/AI_GENERATE_DATA/CALL_COMPONENT) are recognized and
 * stubbed for the MVP — they record a skipped step until implemented.
 */
export class BotJobExecutionEngine {
  constructor(private readonly deps: EngineDeps) {}

  async run(bundle: BotJobBundle, target: string, baseUrl?: string): Promise<{ run: ExecutionRun; steps: ExecutionStepResult[] }> {
    const resolvedBaseUrl = baseUrl ?? this.deps.resolveBaseUrl(target);
    const { logger, validator } = this.deps;
    const run: ExecutionRun = {
      id: uuid(),
      botJobId: bundle.job.id,
      startedAt: nowIso(),
      finishedAt: null,
      status: 'running',
      target,
      totalSteps: bundle.commands.length,
      passedSteps: 0,
      failedSteps: 0,
    };

    // Gate the whole job through the validator BEFORE running anything.
    const issues = await validator.validateAiGeneratedBotJob(bundle.job, bundle.commands);
    if (issues.length > 0) {
      logger.warn('BotJob failed catalog validation', { issues });
      run.status = 'error';
      run.finishedAt = nowIso();
      const step: ExecutionStepResult = {
        id: uuid(),
        runId: run.id,
        stepId: 'validation',
        commandType: 'API_CALL',
        status: 'error',
        request: null,
        response: null,
        durationMs: 0,
        errorMessage: `Catalog validation failed: ${issues.map((i) => i.message).join('; ')}`,
        assertionResults: [],
        createdAt: nowIso(),
      };
      return { run, steps: [step] };
    }

    const resolver = new VariableResolver(
      Object.fromEntries(bundle.variables.map((v) => [v.name, v.initialValue ?? ''])),
    );
    const steps: ExecutionStepResult[] = [];
    let stopRequested = false;

    for (const cmd of bundle.commands) {
      if (!cmd.enabled) {
        steps.push(this.skipped(run.id, cmd, 'disabled'));
        continue;
      }
      if (stopRequested) {
        steps.push(this.skipped(run.id, cmd, 'stopped by earlier failure'));
        continue;
      }

      const started = Date.now();
      try {
        const step = await this.executeCommand(cmd, resolver, run.id, resolvedBaseUrl);
        steps.push(step);
        if (step.status === 'passed') run.passedSteps++;
        else if (step.status === 'failed' || step.status === 'error') {
          run.failedSteps++;
          if (cmd.type === 'STOP_ON_FAILURE' || cmd.config['stopOnFailure'] === true) stopRequested = true;
        }
      } catch (e) {
        run.failedSteps++;
        steps.push({
          id: uuid(),
          runId: run.id,
          stepId: cmd.id,
          commandType: cmd.type,
          status: 'error',
          request: null,
          response: null,
          durationMs: Date.now() - started,
          errorMessage: e instanceof Error ? e.message : String(e),
          assertionResults: [],
          createdAt: nowIso(),
        });
      }
    }

    run.status = run.failedSteps > 0 ? 'failed' : 'passed';
    run.finishedAt = nowIso();
    return { run, steps };
  }

  private async executeCommand(
    cmd: BotJobCommand,
    resolver: VariableResolver,
    runId: string,
    baseUrl: string,
  ): Promise<ExecutionStepResult> {
    const started = Date.now();
    const base = (status: ExecutionStepResult['status'], extra: Partial<ExecutionStepResult> = {}): ExecutionStepResult => ({
      id: uuid(),
      runId,
      stepId: cmd.id,
      commandType: cmd.type,
      status,
      request: null,
      response: null,
      durationMs: Date.now() - started,
      errorMessage: null,
      assertionResults: [],
      createdAt: nowIso(),
      ...extra,
    });

    switch (cmd.type) {
      case 'SET_VARIABLE': {
        const name = String(cmd.config['name'] ?? '');
        const value = resolver.resolveDeep(cmd.config['value']);
        resolver.set(name, value);
        return base('passed');
      }

      case 'WAIT': {
        const ms = Number(cmd.config['ms'] ?? 0);
        await new Promise((r) => setTimeout(r, Math.min(ms, 10_000)));
        return base('passed');
      }

      case 'API_CALL': {
        const endpointId = String(cmd.config['endpointId']);
        const endpoint = await this.deps.catalog.getEndpointById(endpointId);
        if (!endpoint) return base('error', { errorMessage: `Endpoint ${endpointId} missing at runtime` });

        const url = baseUrl + resolver.resolve(endpoint.path);
        const req: HttpRequest = {
          method: endpoint.method,
          url,
          headers: resolver.resolveDeep((cmd.config['headers'] as Record<string, string>) ?? {}),
          body: cmd.config['body'] != null ? resolver.resolve(JSON.stringify(cmd.config['body'])) : undefined,
          timeoutMs: 30_000,
        };
        const res = await this.deps.http.send(req);
        // store last response for downstream assertions/extractions
        resolver.set('lastResponse', safeJson(res.body));
        resolver.set('lastStatus', res.status);
        return base('passed', {
          request: JSON.stringify(req),
          response: JSON.stringify({ status: res.status, body: res.body }),
        });
      }

      case 'ASSERT_STATUS_CODE': {
        const expected = Number(cmd.config['expected']);
        const actual = Number(resolver.get('lastStatus'));
        const passed = expected === actual;
        const ar: AssertionResult = { description: `status == ${expected}`, passed, expected, actual };
        return base(passed ? 'passed' : 'failed', { assertionResults: [ar] });
      }

      case 'ASSERT_FIELD_VALUE': {
        const path = String(cmd.config['jsonPath']);
        const expected = cmd.config['expected'];
        const actual = jsonPathQuery(resolver.get('lastResponse'), path);
        const passed = JSON.stringify(actual) === JSON.stringify(expected);
        const ar: AssertionResult = { description: `${path} == ${JSON.stringify(expected)}`, passed, expected, actual };
        return base(passed ? 'passed' : 'failed', { assertionResults: [ar] });
      }

      case 'ASSERT_JSON_PATH_EXISTS': {
        const path = String(cmd.config['jsonPath']);
        const actual = jsonPathQuery(resolver.get('lastResponse'), path);
        const passed = actual !== undefined;
        const ar: AssertionResult = { description: `${path} exists`, passed, actual };
        return base(passed ? 'passed' : 'failed', { assertionResults: [ar] });
      }

      case 'EXTRACT_JSON_PATH': {
        const path = String(cmd.config['jsonPath']);
        const varName = String(cmd.config['variable']);
        const value = jsonPathQuery(resolver.get('lastResponse'), path);
        resolver.set(varName, value);
        return base('passed');
      }

      case 'STOP_ON_FAILURE':
        return base('passed');

      // Recognized but not yet implemented in the MVP — recorded as skipped.
      case 'IF':
      case 'ELSE':
      case 'LOOP':
      case 'FOR_EACH':
      case 'READ_CSV':
      case 'READ_EXCEL':
      case 'AI_GENERATE_DATA':
      case 'CALL_COMPONENT':
        return base('skipped', { errorMessage: `${cmd.type} not implemented in MVP` });

      default:
        return base('skipped', { errorMessage: `Unknown command type: ${cmd.type}` });
    }
  }

  private skipped(runId: string, cmd: BotJobCommand, reason: string): ExecutionStepResult {
    return {
      id: uuid(),
      runId,
      stepId: cmd.id,
      commandType: cmd.type,
      status: 'skipped',
      request: null,
      response: null,
      durationMs: 0,
      errorMessage: reason,
      assertionResults: [],
      createdAt: nowIso(),
    };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
