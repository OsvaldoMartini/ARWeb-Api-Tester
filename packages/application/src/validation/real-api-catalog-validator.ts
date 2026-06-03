import type { BotJob, BotJobCommand } from '@arweb/domain';
import { type Result, ok, err, AppError } from '@arweb/common';
import type { CatalogReadPort } from '../interfaces/ports.js';

/**
 * RealApiCatalogValidator — the single most important architectural invariant
 * across all three pilots (Phase 5). NOTHING may reference an endpoint, method,
 * path, parameter or output field that was not actually imported into the catalog.
 *
 * Every AI suggestion, agent plan, and BotJob command MUST pass through here
 * before it can run. There is no bypass.
 */

export interface ValidationIssue {
  code:
    | 'ENDPOINT_NOT_FOUND'
    | 'METHOD_PATH_NOT_FOUND'
    | 'PARAMETER_NOT_FOUND'
    | 'OUTPUT_FIELD_NOT_FOUND'
    | 'MISSING_ENDPOINT_REFERENCE';
  message: string;
  context?: Record<string, unknown>;
}

export interface AgentPlanStep {
  endpointId: string;
  parameters?: string[]; // parameter names the plan intends to use
}
export interface AgentPlan {
  steps: AgentPlanStep[];
}

export class RealApiCatalogValidator {
  constructor(private readonly catalog: CatalogReadPort) {}

  async validateEndpointExists(endpointId: string): Promise<Result<true>> {
    const ep = await this.catalog.getEndpointById(endpointId);
    if (!ep) {
      return err(
        new AppError('CATALOG_INVALID', `Endpoint "${endpointId}" does not exist in the imported catalog.`),
      );
    }
    return ok(true);
  }

  async validateMethodAndPath(method: string, path: string): Promise<Result<true>> {
    const ep = await this.catalog.findEndpointByMethodAndPath(method, path);
    if (!ep) {
      return err(
        new AppError('CATALOG_INVALID', `${method.toUpperCase()} ${path} is not a known imported endpoint.`),
      );
    }
    return ok(true);
  }

  async validateParameterExists(endpointId: string, parameterName: string): Promise<Result<true>> {
    const params = await this.catalog.getParameters(endpointId);
    if (!params.some((p) => p.name === parameterName)) {
      return err(
        new AppError(
          'CATALOG_INVALID',
          `Parameter "${parameterName}" is not defined on endpoint "${endpointId}".`,
        ),
      );
    }
    return ok(true);
  }

  async validateOutputFieldExists(endpointId: string, jsonPath: string): Promise<Result<true>> {
    const fields = await this.catalog.getOutputFields(endpointId);
    if (!fields.some((f) => f.jsonPath === jsonPath)) {
      return err(
        new AppError(
          'CATALOG_INVALID',
          `Output field "${jsonPath}" is not documented on endpoint "${endpointId}".`,
        ),
      );
    }
    return ok(true);
  }

  /**
   * Validate a single BotJob command. Only API_CALL is endpoint-bound in the MVP;
   * other command types are structurally checked by the engine, not here.
   */
  async validateBotJobCommand(command: BotJobCommand): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    if (command.type !== 'API_CALL') return issues;

    const endpointId = command.config['endpointId'];
    if (typeof endpointId !== 'string' || endpointId.length === 0) {
      issues.push({
        code: 'MISSING_ENDPOINT_REFERENCE',
        message: 'API_CALL command must reference a real endpointId from the catalog.',
        context: { commandId: command.id },
      });
      return issues;
    }
    const exists = await this.validateEndpointExists(endpointId);
    if (!exists.ok) {
      issues.push({
        code: 'ENDPOINT_NOT_FOUND',
        message: exists.error.message,
        context: { endpointId, commandId: command.id },
      });
    }
    return issues;
  }

  /** Validate an agent's execution plan: every referenced endpoint must be real. */
  async validateAgentPlan(plan: AgentPlan): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    for (const step of plan.steps) {
      const exists = await this.validateEndpointExists(step.endpointId);
      if (!exists.ok) {
        issues.push({
          code: 'ENDPOINT_NOT_FOUND',
          message: exists.error.message,
          context: { endpointId: step.endpointId },
        });
        continue;
      }
      for (const param of step.parameters ?? []) {
        const pOk = await this.validateParameterExists(step.endpointId, param);
        if (!pOk.ok) {
          issues.push({
            code: 'PARAMETER_NOT_FOUND',
            message: pOk.error.message,
            context: { endpointId: step.endpointId, parameter: param },
          });
        }
      }
    }
    return issues;
  }

  /** Validate an AI-generated BotJob in full before it is allowed to be saved/run. */
  async validateAiGeneratedBotJob(_job: BotJob, commands: BotJobCommand[]): Promise<ValidationIssue[]> {
    const all: ValidationIssue[] = [];
    for (const cmd of commands) {
      all.push(...(await this.validateBotJobCommand(cmd)));
    }
    return all;
  }
}
